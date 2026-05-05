import type { APIRoute } from 'astro';
import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';

import { getDb, schema } from '@/db/client';
import { incrementViewCount } from '@/lib/views';

export const POST: APIRoute = async ({ params, locals }) => {
  const slug = params.slug;

  if (!slug || typeof slug !== 'string') {
    return badRequest();
  }

  const db = getDb(locals.runtime.env);
  const post = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.slug, slug),
        isNotNull(schema.posts.publishedAt),
        lte(schema.posts.publishedAt, sql`datetime('now')`),
      ),
    )
    .limit(1)
    .get();

  if (!post) {
    return badRequest();
  }

  const newCount = await incrementViewCount(db, slug);

  return new Response(JSON.stringify({ count: newCount }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};

function badRequest(): Response {
  return new Response(JSON.stringify({ error: 'bad_request' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
