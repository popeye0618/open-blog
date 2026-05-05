INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_title', 'popeye0618 blog'),
  ('site_description', '기술과 생각을 기록하는 곳'),
  ('owner_name', 'popeye0618'),
  ('about_md', 'popeye0618의 기술과 생각을 차분히 기록하는 개인 블로그입니다.'),
  ('footer_md', '© popeye0618. Built with Astro + Cloudflare.');

INSERT OR IGNORE INTO posts (
  slug,
  title,
  description,
  body_md,
  tags,
  series,
  lang,
  cover_image,
  published_at,
  pinned,
  search_tokens
) VALUES
  (
    'hello-world',
    '안녕, 블로그',
    '한국어 샘플 글',
    '# 첫 글

안녕하세요. 한국 기술 블로그의 첫 샘플 글입니다.

```ts
console.log(''blog bootstrap'');
```
',
    '["blog","intro","ko"]',
    NULL,
    'ko',
    NULL,
    datetime('now', '-1 day'),
    1,
    '안녕 블로 로그 블로그 한국 국어 한국어 샘플 녕하 하세 세요 안녕하 녕하세 하세요 기술 그의 로그의 글입 입니 니다 글입니 입니다'
  ),
  (
    'hello-en',
    'Hello, world',
    'English sample post',
    '# First post

Hello from the English sample post. This keeps the bootstrap data bilingual.
',
    '["blog","intro","en"]',
    NULL,
    'en',
    NULL,
    datetime('now'),
    0,
    'hello world english sample post first from the this keeps bootstrap data bilingual'
  );
