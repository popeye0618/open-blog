import type { APIRoute } from 'astro';

import { getDb } from '@/db/client';
import { listPublishedPosts } from '@/lib/posts';
import { getSetting, getSettings } from '@/lib/settings';
import { getSiteUrl } from '@/lib/site-url';

export const GET: APIRoute = async ({ locals, request }) => {
  const db = getDb(locals.runtime.env);
  const [posts, settings] = await Promise.all([
    listPublishedPosts(db, { limit: 20 }),
    getSettings(db, locals),
  ]);
  const siteUrl = getSiteUrl(locals.runtime.env, request);
  const siteTitle = getSetting(settings, 'site_title', 'popeye0618 blog');
  const siteDescription = getSetting(settings, 'site_description', '');
  const items = posts.map((post) => rssItem(post, siteUrl)).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(siteDescription)}</description>
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml"/>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};

type RssPost = Awaited<ReturnType<typeof listPublishedPosts>>[number];

function rssItem(post: RssPost, siteUrl: string): string {
  const postUrl = `${siteUrl}/posts/${encodeURIComponent(post.slug)}`;
  const pubDate = post.publishedAt ? new Date(`${post.publishedAt}Z`).toUTCString() : '';

  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <description>${escapeXml(post.description ?? '')}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&apos;';
      default:
        return char;
    }
  });
}
