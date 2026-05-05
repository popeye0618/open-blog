import { and, asc, desc, eq, gt, isNotNull, lt, lte, sql } from 'drizzle-orm';

import type { DB } from '@/db/client';
import { schema } from '@/db/client';
import type { Post } from '@/db/schema';
import { buildSearchTokens } from '@/lib/search-tokens';

const { posts } = schema;

const postSummaryFields = {
  id: posts.id,
  slug: posts.slug,
  title: posts.title,
  description: posts.description,
  tags: posts.tags,
  lang: posts.lang,
  coverImage: posts.coverImage,
  publishedAt: posts.publishedAt,
  pinned: posts.pinned,
};

export type PostSummary = Pick<
  Post,
  'id' | 'slug' | 'title' | 'description' | 'tags' | 'lang' | 'coverImage' | 'publishedAt' | 'pinned'
>;

export type SearchResult = PostSummary & {
  coverImage: string | null;
  snippet: string;
};

type SearchRow = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  tags: string;
  lang: string;
  cover_image: string | null;
  published_at: string | null;
  pinned: number;
  snippet: string | null;
};

export async function listPublishedPosts(
  db: DB,
  { limit = 20 }: { limit?: number } = {},
): Promise<PostSummary[]> {
  return db
    .select(postSummaryFields)
    .from(posts)
    .where(publishedFilter())
    .orderBy(desc(posts.pinned), desc(posts.publishedAt))
    .limit(limit)
    .all();
}

export async function listPublishedPostsByTag(db: DB, tag: string): Promise<PostSummary[]> {
  return db
    .select(postSummaryFields)
    .from(posts)
    .where(and(publishedFilter(), sql`${posts.tags} LIKE '%' || '"' || ${tag} || '"' || '%'`))
    .orderBy(desc(posts.pinned), desc(posts.publishedAt))
    .all();
}

export async function getPostBySlug(db: DB, slug: string): Promise<Post | null> {
  const rows = await db
    .select()
    .from(posts)
    .where(and(publishedFilter(), eq(posts.slug, slug)))
    .limit(1)
    .all();

  return rows[0] ?? null;
}

/**
 * Adjacent navigation follows the common blog convention:
 * prev is the next newer published post, next is the next older published post.
 */
export async function getAdjacentPosts(
  db: DB,
  post: Post,
): Promise<{ prev: PostSummary | null; next: PostSummary | null }> {
  if (!post.publishedAt) {
    return { prev: null, next: null };
  }

  const [prevRows, nextRows] = await Promise.all([
    db
      .select(postSummaryFields)
      .from(posts)
      .where(and(publishedFilter(), gt(posts.publishedAt, post.publishedAt)))
      .orderBy(asc(posts.publishedAt))
      .limit(1)
      .all(),
    db
      .select(postSummaryFields)
      .from(posts)
      .where(and(publishedFilter(), lt(posts.publishedAt, post.publishedAt)))
      .orderBy(desc(posts.publishedAt))
      .limit(1)
      .all(),
  ]);

  return {
    prev: prevRows[0] ?? null,
    next: nextRows[0] ?? null,
  };
}

export async function searchPublishedPosts(
  db: DB,
  query: string,
  { limit = 30 }: { limit?: number } = {},
): Promise<SearchResult[]> {
  const match = buildFtsMatch(query);

  if (!match) {
    return [];
  }

  const rows = await db.all<SearchRow>(sql`
    SELECT
      p.id,
      p.slug,
      p.title,
      p.description,
      p.tags,
      p.lang,
      p.cover_image,
      p.published_at,
      p.pinned,
      snippet(posts_fts, 2, '<mark>', '</mark>', '…', 12) AS snippet
    FROM posts_fts
    JOIN posts p ON p.id = posts_fts.rowid
    WHERE posts_fts MATCH ${match}
      AND p.published_at IS NOT NULL
      AND p.published_at <= datetime('now')
    ORDER BY p.pinned DESC, bm25(posts_fts) ASC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    tags: row.tags,
    lang: row.lang,
    coverImage: row.cover_image,
    publishedAt: row.published_at,
    pinned: row.pinned,
    snippet: row.snippet ?? '',
  }));
}

export async function listAllTags(db: DB): Promise<Array<{ tag: string; count: number }>> {
  const rows = await db
    .select({ tags: posts.tags })
    .from(posts)
    .where(publishedFilter())
    .all();
  const counts = new Map<string, number>();

  for (const row of rows) {
    for (const tag of parseTags(row.tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag),
  );
}

function publishedFilter() {
  return and(isNotNull(posts.publishedAt), lte(posts.publishedAt, sql`datetime('now')`));
}

function buildFtsMatch(query: string): string {
  const trimmed = query.trim();

  if (!trimmed) {
    return '';
  }

  const tokens = new Set<string>();

  for (const token of trimmed.split(/\s+/)) {
    addFtsPhrase(tokens, token);
  }

  for (const token of buildSearchTokens(trimmed).split(/\s+/)) {
    addFtsPhrase(tokens, token);
  }

  return Array.from(tokens).join(' OR ');
}

function addFtsPhrase(tokens: Set<string>, token: string): void {
  const normalized = token.trim();

  if (!normalized) {
    return;
  }

  tokens.add(`"${normalized.replaceAll('"', '""')}"`);
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === 'string') : [];
  } catch {
    return [];
  }
}
