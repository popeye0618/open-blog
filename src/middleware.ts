import { defineMiddleware } from 'astro:middleware';

import { getOwnerSession } from '@/lib/auth';

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const { pathname } = url;

  if (!isProtectedPath(pathname)) {
    return next();
  }

  const session = await getOwnerSession(context.request, context.locals.runtime.env);

  if (session) {
    context.locals.session = session;
    return next();
  }

  if (pathname.startsWith('/api/')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  if (context.locals.runtime.env.AUTH_MODE === 'password') {
    return Response.redirect(new URL('/admin/login', url), 302);
  }

  return new Response('unauthorized', { status: 401 });
});

function isProtectedPath(pathname: string): boolean {
  if (pathname === '/admin/login' || pathname === '/api/auth/login' || pathname === '/api/auth/logout') {
    return false;
  }

  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    pathname === '/api/admin' ||
    pathname.startsWith('/api/admin/')
  );
}
