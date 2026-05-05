import type { APIRoute } from 'astro';

import { buildAdminClearCookieHeader } from '@/lib/auth';

export const POST: APIRoute = async ({ request, locals }) => {
  const destination = locals.runtime.env.AUTH_MODE === 'password' ? '/admin/login' : '/';

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(destination, request.url).toString(),
      'Set-Cookie': buildAdminClearCookieHeader(),
    },
  });
};
