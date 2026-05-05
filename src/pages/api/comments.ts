import type { APIRoute } from 'astro';
import { and, eq, isNotNull, lte, sql } from 'drizzle-orm';

import { getDb, schema } from '@/db/client';
import { sanitizeCommentMarkdownSource } from '@/lib/comment-markdown';
import { countRecentCommentsByIpHash, createComment } from '@/lib/comments';
import { getClientIp, hashIp } from '@/lib/ip';
import { verifyTurnstile } from '@/lib/turnstile';

const MAX_AUTHOR_LENGTH = 40;
const MAX_BODY_LENGTH = 2000;

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = getDb(env);
  const form = await request.formData();
  const postId = parsePositiveInt(form.get('post_id'));
  const parentId = parseOptionalPositiveInt(form.get('parent_id'));
  const authorName = getTextField(form, 'author_name').trim();
  const bodyMd = sanitizeCommentMarkdownSource(getTextField(form, 'body_md'));
  const token = getTextField(form, 'cf-turnstile-response').trim();

  if (
    !postId ||
    parentId === false ||
    !authorName ||
    !bodyMd ||
    authorName.length > MAX_AUTHOR_LENGTH ||
    bodyMd.length > MAX_BODY_LENGTH ||
    !token
  ) {
    return jsonError(400);
  }

  const post = await db
    .select({ id: schema.posts.id, slug: schema.posts.slug })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.id, postId),
        isNotNull(schema.posts.publishedAt),
        lte(schema.posts.publishedAt, sql`datetime('now')`),
      ),
    )
    .limit(1)
    .get();

  if (!post) {
    return jsonError(400);
  }

  if (typeof parentId === 'number') {
    const parent = await db
      .select({ id: schema.comments.id, parentId: schema.comments.parentId })
      .from(schema.comments)
      .where(and(eq(schema.comments.id, parentId), eq(schema.comments.postId, postId)))
      .limit(1)
      .get();

    if (!parent || parent.parentId !== null) {
      return jsonError(400);
    }
  }

  const ip = getClientIp(request);
  const turnstileOk = await verifyTurnstile(token, env.TURNSTILE_SECRET ?? '', ip);

  if (!turnstileOk) {
    return jsonError(400);
  }

  if (!env.IP_HASH_SALT) {
    return jsonError(500);
  }

  const ipHash = await hashIp(ip, env.IP_HASH_SALT);
  const recentCount = await countRecentCommentsByIpHash(db, ipHash, 10);

  if (recentCount >= 5) {
    return new Response('too_many_requests', { status: 429 });
  }

  await createComment(db, {
    postId,
    parentId: typeof parentId === 'number' ? parentId : null,
    authorName,
    bodyMd,
    ipHash,
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: `/posts/${encodeURIComponent(post.slug)}#comments`,
    },
  });
};

function getTextField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function parsePositiveInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseOptionalPositiveInt(value: FormDataEntryValue | null): number | null | false {
  if (value === null || value === '') {
    return null;
  }

  return parsePositiveInt(value) ?? false;
}

function jsonError(status: number): Response {
  return new Response(JSON.stringify({ error: status === 500 ? 'server_error' : 'bad_request' }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
