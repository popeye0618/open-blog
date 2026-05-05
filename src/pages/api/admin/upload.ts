import type { APIRoute } from 'astro';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);

export const POST: APIRoute = async ({ request, locals }) => {
  const contentType = request.headers.get('Content-Type') ?? '';

  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    return json({ error: 'bad_request' }, 400);
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return json({ error: 'file 필드 없음' }, 400);
  }

  const extension = IMAGE_EXTENSIONS.get(file.type);

  if (!extension) {
    return json({ error: 'unsupported_media_type' }, 415);
  }

  if (file.size > MAX_FILE_SIZE) {
    return json({ error: 'payload_too_large' }, 413);
  }

  const key = `${crypto.randomUUID().replace(/-/g, '')}${extension}`;

  await locals.runtime.env.UPLOADS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return json({ url: `/uploads/${key}`, key });
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
