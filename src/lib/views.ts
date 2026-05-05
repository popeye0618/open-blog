import { eq, sql } from 'drizzle-orm';

import type { DB } from '@/db/client';
import { schema } from '@/db/client';

const { posts, views } = schema;

export type AdminViewRow = {
  slug: string;
  count: number;
  updated_at: string;
  title: string | null;
};

export async function getViewCount(db: DB, slug: string): Promise<number> {
  const row = await db
    .select({ count: views.count })
    .from(views)
    .where(eq(views.slug, slug))
    .limit(1)
    .get();

  return row?.count ?? 0;
}

export async function incrementViewCount(db: DB, slug: string): Promise<number> {
  const row = await db
    .insert(views)
    .values({
      slug,
      count: 1,
      updatedAt: sql`datetime('now')`,
    })
    .onConflictDoUpdate({
      target: views.slug,
      set: {
        count: sql`${views.count} + 1`,
        updatedAt: sql`datetime('now')`,
      },
    })
    .returning({ count: views.count })
    .get();

  return row.count;
}

export async function listAllViewsWithPosts(db: DB): Promise<AdminViewRow[]> {
  return db
    .select({
      slug: views.slug,
      count: views.count,
      updated_at: views.updatedAt,
      title: posts.title,
    })
    .from(views)
    .leftJoin(posts, eq(views.slug, posts.slug))
    .orderBy(sql`${views.count} DESC`, views.slug)
    .all();
}

export async function setViewCount(db: DB, slug: string, count: number): Promise<number> {
  const row = await db
    .insert(views)
    .values({
      slug,
      count,
      updatedAt: sql`datetime('now')`,
    })
    .onConflictDoUpdate({
      target: views.slug,
      set: {
        count,
        updatedAt: sql`datetime('now')`,
      },
    })
    .returning({ count: views.count })
    .get();

  return row.count;
}
