import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';

import { getDb, schema } from '@/db/client';
import { setViewCount } from '@/lib/views';

const MAX_COUNT = 2 ** 31;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return json({ error: 'unauthorized' }, 401);
  }

  const slug = params.slug;

  if (!slug || typeof slug !== 'string') {
    return badRequest();
  }

  const body = await readJson(request);
  const count = body?.count;

  if (!Number.isInteger(count) || count < 0 || count >= MAX_COUNT) {
    return badRequest();
  }

  const db = getDb(locals.runtime.env);
  const post = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(eq(schema.posts.slug, slug))
    .limit(1)
    .get();

  if (!post) {
    return badRequest();
  }

  const savedCount = await setViewCount(db, slug, count);

  return json({ ok: true, count: savedCount });
};

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const value = await request.json();
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function badRequest(): Response {
  return json({ error: 'bad_request' }, 400);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
