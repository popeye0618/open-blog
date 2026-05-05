import type { APIRoute } from 'astro';

import {
  buildAdminCookieHeader,
  issueAdminToken,
  verifyAdminPassword,
} from '@/lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;

  if (env.AUTH_MODE !== 'password') {
    return new Response('not found', { status: 404 });
  }

  const form = await request.formData();
  const password = String(form.get('password') ?? '');

  if (!(await verifyAdminPassword(password, env))) {
    return redirect(request, '/admin/login?error=1');
  }

  const token = await issueAdminToken(env);

  return redirect(request, '/admin', buildAdminCookieHeader(token));
};

function redirect(request: Request, path: string, cookie?: string): Response {
  const headers = new Headers({ Location: new URL(path, request.url).toString() });

  if (cookie) {
    headers.set('Set-Cookie', cookie);
  }

  return new Response(null, { status: 303, headers });
}
