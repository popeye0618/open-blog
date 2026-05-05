// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'https://popeye0618-blog.pages.dev',
  output: 'server',
  adapter: cloudflare({ mode: 'directory' }),
  integrations: [tailwind()],
});
