import { and, asc, desc, eq, sql } from 'drizzle-orm';

import type { DB } from '@/db/client';
import { schema } from '@/db/client';

const { comments, posts } = schema;

export type CommentStatus = 'visible' | 'hidden' | 'spam';

export type VisibleComment = {
  id: number;
  parent_id: number | null;
  author_name: string;
  body_md: string;
  created_at: string;
};

export async function listVisibleComments(db: DB, postId: number): Promise<VisibleComment[]> {
  return db
    .select({
      id: comments.id,
      parent_id: comments.parentId,
      author_name: comments.authorName,
      body_md: comments.bodyMd,
      created_at: comments.createdAt,
    })
    .from(comments)
    .where(and(eq(comments.postId, postId), eq(comments.status, 'visible')))
    .orderBy(asc(comments.createdAt))
    .all();
}

export async function countRecentCommentsByIpHash(
  db: DB,
  ipHash: string,
  withinMinutes = 10,
): Promise<number> {
  const minutes = Math.max(1, Math.floor(withinMinutes));
  const row = await db.get<{ count: number }>(sql`
    SELECT COUNT(*) AS count
    FROM comments
    WHERE ip_hash = ${ipHash}
      AND created_at >= datetime('now', ${`-${minutes} minutes`})
  `);

  return Number(row?.count ?? 0);
}

export async function createComment(
  db: DB,
  input: {
    postId: number;
    parentId?: number | null;
    authorName: string;
    bodyMd: string;
    ipHash: string;
  },
): Promise<number> {
  const row = await db
    .insert(comments)
    .values({
      postId: input.postId,
      parentId: input.parentId ?? null,
      authorName: input.authorName,
      bodyMd: input.bodyMd,
      ipHash: input.ipHash,
      status: 'visible',
    })
    .returning({ id: comments.id })
    .get();

  return row.id;
}

export type AdminComment = {
  id: number;
  post_id: number;
  parent_id: number | null;
  post_title: string | null;
  post_slug: string | null;
  author_name: string;
  body_md: string;
  ip_hash: string;
  status: CommentStatus;
  created_at: string;
};

export async function listAllComments(
  db: DB,
  options: { status?: CommentStatus; limit?: number } = {},
): Promise<AdminComment[]> {
  const limit = Math.min(500, Math.max(1, Math.floor(options.limit ?? 100)));

  return db
    .select({
      id: comments.id,
      post_id: comments.postId,
      parent_id: comments.parentId,
      post_title: posts.title,
      post_slug: posts.slug,
      author_name: comments.authorName,
      body_md: comments.bodyMd,
      ip_hash: comments.ipHash,
      status: comments.status,
      created_at: comments.createdAt,
    })
    .from(comments)
    .leftJoin(posts, eq(comments.postId, posts.id))
    .where(options.status ? eq(comments.status, options.status) : undefined)
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .all() as Promise<AdminComment[]>;
}

export async function updateCommentStatus(
  db: DB,
  id: number,
  status: CommentStatus,
): Promise<boolean> {
  const row = await db
    .update(comments)
    .set({ status })
    .where(eq(comments.id, id))
    .returning({ id: comments.id })
    .get();

  return Boolean(row);
}

export async function deleteComment(db: DB, id: number): Promise<boolean> {
  const row = await db
    .delete(comments)
    .where(eq(comments.id, id))
    .returning({ id: comments.id })
    .get();

  return Boolean(row);
}
