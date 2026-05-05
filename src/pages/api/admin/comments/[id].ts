import type { APIRoute } from 'astro';

import { getDb } from '@/db/client';
import {
  deleteComment,
  updateCommentStatus,
  type CommentStatus,
} from '@/lib/comments';

const allowedStatuses = new Set<CommentStatus>(['visible', 'hidden', 'spam']);

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  if (!locals.session) {
    return json({ error: 'unauthorized' }, 401);
  }

  const id = parseId(params.id);

  if (!id) {
    return badRequest();
  }

  const body = await readJson(request);
  const status = body?.status;

  if (status !== 'visible' && status !== 'hidden' && status !== 'spam') {
    return badRequest();
  }

  if (!allowedStatuses.has(status)) {
    return badRequest();
  }

  const ok = await updateCommentStatus(getDb(locals.runtime.env), id, status);

  return ok ? json({ ok: true }) : json({ error: 'not_found' }, 404);
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals.session) {
    return json({ error: 'unauthorized' }, 401);
  }

  const id = parseId(params.id);

  if (!id) {
    return badRequest();
  }

  const ok = await deleteComment(getDb(locals.runtime.env), id);

  return ok ? json({ ok: true }) : json({ error: 'not_found' }, 404);
};

function parseId(value: string | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

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
