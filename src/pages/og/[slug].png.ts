import type { APIRoute } from 'astro';

import { getDb } from '@/db/client';
import { formatKstDate } from '@/lib/datetime';
import { renderOgImage } from '@/lib/og';
import { getPostBySlug } from '@/lib/posts';
import { getSetting, getSettings } from '@/lib/settings';
import { getSiteUrl } from '@/lib/site-url';

export const GET: APIRoute = async ({ locals, params, request }) => {
  const slug = params.slug ?? '';
  const db = getDb(locals.runtime.env);
  const post = await getPostBySlug(db, slug);

  if (!post) {
    return new Response(null, { status: 404 });
  }

  const settings = await getSettings(db, locals);
  const siteTitle = getSetting(settings, 'site_title', 'popeye0618 blog');
  const siteUrl = getSiteUrl(locals.runtime.env, request);
  const buffer = await renderOgImage({
    title: post.title,
    siteTitle,
    lang: post.lang === 'en' ? 'en' : 'ko',
    date: formatKstDate(post.publishedAt),
    assetBaseUrl: siteUrl,
  });

  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
