import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';

import { getDb, schema } from '@/db/client';
import { buildSearchTokens } from '@/lib/search-tokens';
import { badRequest, json, parsePostInput, readJson } from '../posts';

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return json({ error: 'unauthorized' }, 401);
  }

  const id = Number(params.id);

  if (!Number.isInteger(id) || id < 1) {
    return badRequest();
  }

  const db = getDb(locals.runtime.env);
  const existing = await db.select().from(schema.posts).where(eq(schema.posts.id, id)).limit(1).get();

  if (!existing) {
    return json({ error: 'not_found' }, 404);
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest();
  }

  const input = parsePostInput(body, true);

  if (!input.ok) {
    return badRequest(input.detail);
  }

  if (input.value.slug && input.value.slug !== existing.slug) {
    const conflict = await db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(eq(schema.posts.slug, input.value.slug))
      .limit(1)
      .get();

    if (conflict && conflict.id !== id) {
      return json({ error: 'slug_conflict' }, 409);
    }
  }

  const updates: Record<string, unknown> = {
    updatedAt: sql`datetime('now')`,
  };

  if ('title' in input.value) updates.title = input.value.title;
  if ('slug' in input.value) updates.slug = input.value.slug;
  if ('description' in input.value) updates.description = input.value.description;
  if ('bodyMd' in input.value) updates.bodyMd = input.value.bodyMd;
  if ('tags' in input.value) updates.tags = JSON.stringify(input.value.tags);
  if ('series' in input.value) updates.series = input.value.series;
  if ('lang' in input.value) updates.lang = input.value.lang;
  if ('coverImage' in input.value) updates.coverImage = input.value.coverImage;
  if ('pinned' in input.value) updates.pinned = input.value.pinned ? 1 : 0;
  if ('publishedAt' in input.value) updates.publishedAt = input.value.publishedAt;

  if ('title' in input.value || 'description' in input.value || 'bodyMd' in input.value) {
    const title = input.value.title ?? existing.title;
    const description = 'description' in input.value ? input.value.description : existing.description;
    const bodyMd = input.value.bodyMd ?? existing.bodyMd;
    updates.searchTokens = buildSearchTokens(title, description ?? '', bodyMd);
  }

  await db.update(schema.posts).set(updates).where(eq(schema.posts.id, id)).run();

  return json({ ok: true });
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return json({ error: 'unauthorized' }, 401);
  }

  const id = Number(params.id);

  if (!Number.isInteger(id) || id < 1) {
    return badRequest();
  }

  const db = getDb(locals.runtime.env);
  await db.delete(schema.posts).where(eq(schema.posts.id, id)).run();

  return json({ ok: true });
};
