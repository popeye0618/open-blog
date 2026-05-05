import type { APIRoute } from 'astro';

import { getDb } from '@/db/client';
import { upsertSettings } from '@/lib/settings';

const allowedKeys = new Set([
  'site_title',
  'site_description',
  'about_md',
  'footer_md',
  'owner_name',
]);

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!locals.session) {
    return json({ error: 'unauthorized' }, 401);
  }

  const body = await readJson(request);

  if (!body) {
    return badRequest();
  }

  const kv: Record<string, string> = {};

  for (const [key, value] of Object.entries(body)) {
    if (allowedKeys.has(key) && typeof value === 'string') {
      kv[key] = value;
    }
  }

  try {
    await upsertSettings(getDb(locals.runtime.env), kv);
    return json({ ok: true });
  } catch {
    return badRequest();
  }
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
