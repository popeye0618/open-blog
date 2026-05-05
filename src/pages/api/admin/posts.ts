import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';

import { getDb, schema } from '@/db/client';
import { buildSearchTokens } from '@/lib/search-tokens';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return json({ error: 'unauthorized' }, 401);
  }

  const db = getDb(locals.runtime.env);
  const body = await readJson(request);

  if (!body) {
    return badRequest();
  }

  const input = parsePostInput(body, false);

  if (!input.ok) {
    return badRequest(input.detail);
  }

  const existing = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(eq(schema.posts.slug, input.value.slug))
    .limit(1)
    .get();

  if (existing) {
    return json({ error: 'slug_conflict' }, 409);
  }

  const inserted = await db
    .insert(schema.posts)
    .values({
      title: input.value.title,
      slug: input.value.slug,
      description: input.value.description,
      bodyMd: input.value.bodyMd,
      tags: JSON.stringify(input.value.tags),
      series: input.value.series,
      lang: input.value.lang,
      coverImage: input.value.coverImage,
      publishedAt: input.value.publishedAt,
      pinned: input.value.pinned ? 1 : 0,
      searchTokens: buildSearchTokens(
        input.value.title,
        input.value.description ?? '',
        input.value.bodyMd,
      ),
    })
    .returning({ id: schema.posts.id })
    .get();

  return json({ id: inserted.id });
};

type JsonRecord = Record<string, unknown>;

type PostInput = {
  title: string;
  slug: string;
  description: string | null;
  tags: string[];
  series: string | null;
  lang: 'ko' | 'en';
  coverImage: string | null;
  pinned: boolean;
  publishedAt: string | null;
  bodyMd: string;
};

async function readJson(request: Request): Promise<JsonRecord | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null;
  } catch {
    return null;
  }
}

function parsePostInput(
  body: JsonRecord,
  partial: true,
): { ok: true; value: Partial<PostInput> } | { ok: false; detail: string };
function parsePostInput(
  body: JsonRecord,
  partial?: false,
): { ok: true; value: PostInput } | { ok: false; detail: string };
function parsePostInput(
  body: JsonRecord,
  partial = false,
): { ok: true; value: Partial<PostInput> } | { ok: false; detail: string } {
  const value: Partial<PostInput> = {};

  if (!partial || 'title' in body) {
    const title = cleanString(body.title, 200);
    if (!title) return { ok: false, detail: 'title' };
    value.title = title;
  }

  if (!partial || 'slug' in body) {
    const slug = cleanString(body.slug, 120);
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return { ok: false, detail: 'slug' };
    value.slug = slug;
  }

  if (!partial || 'bodyMd' in body) {
    const bodyMd = cleanString(body.bodyMd, 200000);
    if (!bodyMd) return { ok: false, detail: 'bodyMd' };
    value.bodyMd = bodyMd;
  }

  if (!partial || 'description' in body) {
    value.description = cleanNullableString(body.description, 300);
  }

  if (!partial || 'tags' in body) {
    if (!Array.isArray(body.tags)) return { ok: false, detail: 'tags' };
    value.tags = Array.from(
      new Set(body.tags.map((tag) => cleanString(tag, 60)).filter((tag): tag is string => Boolean(tag))),
    );
  }

  if (!partial || 'series' in body) {
    value.series = cleanNullableString(body.series, 120);
  }

  if (!partial || 'lang' in body) {
    if (body.lang !== 'ko' && body.lang !== 'en') return { ok: false, detail: 'lang' };
    value.lang = body.lang;
  }

  if (!partial || 'coverImage' in body) {
    value.coverImage = cleanNullableString(body.coverImage, 500);
  }

  if (!partial || 'pinned' in body) {
    if (typeof body.pinned !== 'boolean') return { ok: false, detail: 'pinned' };
    value.pinned = body.pinned;
  }

  if (!partial || 'publishedAt' in body) {
    const publishedAt = normalizePublishedAt(body.publishedAt);
    if (publishedAt === undefined) return { ok: false, detail: 'publishedAt' };
    value.publishedAt = publishedAt;
  }

  return { ok: true, value };
}

function cleanString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  return text && text.length <= max ? text : null;
}

function cleanNullableString(value: unknown, max: number): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const text = value.trim();
  return text && text.length <= max ? text : null;
}

function normalizePublishedAt(value: unknown): string | null | undefined {
  if (value === null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function badRequest(detail?: string): Response {
  return json(detail ? { error: 'bad_request', detail } : { error: 'bad_request' }, 400);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export { parsePostInput, readJson, json, badRequest };
