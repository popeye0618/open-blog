import 'dotenv/config';

import { writeFileSync } from 'node:fs';

import { buildSearchTokens } from '../src/lib/search-tokens';

const ownerName = process.env.OWNER_NAME || 'popeye0618';

const koreanBody = `# 첫 글

안녕하세요. 한국 기술 블로그의 첫 샘플 글입니다.

\`\`\`ts
console.log('blog bootstrap');
\`\`\`
`;

const englishBody = `# First post

Hello from the English sample post. This keeps the bootstrap data bilingual.
`;

const koreanSearchTokens = buildSearchTokens('안녕, 블로그', '한국어 샘플 글', koreanBody);
const englishSearchTokens = buildSearchTokens('Hello, world', 'English sample post', englishBody);

const sql = `INSERT OR IGNORE INTO settings (key, value) VALUES
  ('site_title', 'popeye0618 blog'),
  ('site_description', '기술과 생각을 기록하는 곳'),
  ('owner_name', ${sqlString(ownerName)}),
  ('about_md', 'popeye0618의 기술과 생각을 차분히 기록하는 개인 블로그입니다.'),
  ('footer_md', ${sqlString(`© ${ownerName}. Built with Astro + Cloudflare.`)});

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
    ${sqlString(koreanBody)},
    '["blog","intro","ko"]',
    NULL,
    'ko',
    NULL,
    datetime('now', '-1 day'),
    1,
    ${sqlString(koreanSearchTokens)}
  ),
  (
    'hello-en',
    'Hello, world',
    'English sample post',
    ${sqlString(englishBody)},
    '["blog","intro","en"]',
    NULL,
    'en',
    NULL,
    datetime('now'),
    0,
    ${sqlString(englishSearchTokens)}
  );
`;

writeFileSync('drizzle/seed.sql', sql);

console.log('Wrote drizzle/seed.sql');
console.log('Run: wrangler d1 execute blog --local --file=./drizzle/seed.sql');

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
