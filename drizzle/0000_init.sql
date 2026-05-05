-- Drizzle migration: 0000_init
CREATE TABLE `posts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`body_md` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`series` text,
	`lang` text DEFAULT 'ko' NOT NULL,
	`cover_image` text,
	`published_at` text,
	`pinned` integer DEFAULT 0 NOT NULL,
	`search_tokens` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
CREATE UNIQUE INDEX `posts_slug_unique` ON `posts` (`slug`);
CREATE INDEX `idx_posts_published` ON `posts` (`published_at`);

CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` integer NOT NULL,
	`parent_id` integer,
	`author_name` text NOT NULL,
	`body_md` text NOT NULL,
	`ip_hash` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `comments`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_comments_post` ON `comments` (`post_id`,`created_at`);

CREATE TABLE `views` (
	`slug` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);

CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);

CREATE VIRTUAL TABLE posts_fts USING fts5(title, description, body_md, search_tokens, content='posts', content_rowid='id', tokenize='unicode61 remove_diacritics 2');

CREATE TRIGGER posts_ai AFTER INSERT ON posts BEGIN
	INSERT INTO posts_fts(rowid, title, description, body_md, search_tokens)
	VALUES (new.id, new.title, coalesce(new.description, ''), new.body_md, new.search_tokens);
END;

CREATE TRIGGER posts_ad AFTER DELETE ON posts BEGIN
	INSERT INTO posts_fts(posts_fts, rowid, title, description, body_md, search_tokens)
	VALUES('delete', old.id, old.title, coalesce(old.description, ''), old.body_md, old.search_tokens);
END;

CREATE TRIGGER posts_au AFTER UPDATE ON posts BEGIN
	INSERT INTO posts_fts(posts_fts, rowid, title, description, body_md, search_tokens)
	VALUES('delete', old.id, old.title, coalesce(old.description, ''), old.body_md, old.search_tokens);
	INSERT INTO posts_fts(rowid, title, description, body_md, search_tokens)
	VALUES (new.id, new.title, coalesce(new.description, ''), new.body_md, new.search_tokens);
END;
