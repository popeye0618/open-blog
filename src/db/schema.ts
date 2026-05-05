import { sql } from 'drizzle-orm';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

export const posts = sqliteTable(
  'posts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    bodyMd: text('body_md').notNull(),
    tags: text('tags').notNull().default('[]'),
    series: text('series'),
    lang: text('lang').notNull().default('ko'),
    coverImage: text('cover_image'),
    publishedAt: text('published_at'),
    pinned: integer('pinned').notNull().default(0),
    searchTokens: text('search_tokens').notNull().default(''),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
    updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [index('idx_posts_published').on(table.publishedAt)],
);

export const comments = sqliteTable(
  'comments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    postId: integer('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    parentId: integer('parent_id').references(
      (): AnySQLiteColumn => comments.id,
      { onDelete: 'cascade' },
    ),
    authorName: text('author_name').notNull(),
    bodyMd: text('body_md').notNull(),
    ipHash: text('ip_hash').notNull(),
    status: text('status').notNull().default('visible'),
    createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  },
  (table) => [index('idx_comments_post').on(table.postId, table.createdAt)],
);

export const views = sqliteTable('views', {
  slug: text('slug').primaryKey(),
  count: integer('count').notNull().default(0),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;
export type Comment = InferSelectModel<typeof comments>;
export type NewComment = InferInsertModel<typeof comments>;
export type View = InferSelectModel<typeof views>;
export type NewView = InferInsertModel<typeof views>;
export type Setting = InferSelectModel<typeof settings>;
export type NewSetting = InferInsertModel<typeof settings>;
