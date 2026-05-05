import type { APIRoute } from 'astro';
import { and, desc, isNotNull, lte, sql } from 'drizzle-orm';

import { getDb, schema } from '@/db/client';
import { getSiteUrl } from '@/lib/site-url';

const staticPaths = ['/', '/about', '/search'];

export const GET: APIRoute = async ({ locals, request }) => {
  const db = getDb(locals.runtime.env);
  const siteUrl = getSiteUrl(locals.runtime.env, request);
  const posts = await db
    .select({
      slug: schema.posts.slug,
      updatedAt: schema.posts.updatedAt,
    })
    .from(schema.posts)
    .where(
      and(
        isNotNull(schema.posts.publishedAt),
        lte(schema.posts.publishedAt, sql`datetime('now')`),
      ),
    )
    .orderBy(desc(schema.posts.publishedAt))
    .all();

  const urls = [
    ...staticPaths.map((path) => sitemapUrl(`${siteUrl}${path}`, 'weekly', '0.6')),
    ...posts.map((post) =>
      sitemapUrl(
        `${siteUrl}/posts/${encodeURIComponent(post.slug)}`,
        'monthly',
        '0.8',
        post.updatedAt.slice(0, 10),
      ),
    ),
  ].join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};

function sitemapUrl(loc: string, changefreq: string, priority: string, lastmod?: string): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmod ? `\n    <lastmod>${escapeXml(lastmod)}</lastmod>` : ''}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
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
