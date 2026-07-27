// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// Where this build is being served from. Used for canonical URLs and social
// share tags, so it needs to match reality or link previews break.
//
//   SITE_URL      set this by hand for production, on the real domain.
//                 Setting it is also what makes the site indexable — see
//                 the robots meta tag in src/layouts/Base.astro.
//   CF_PAGES_URL  set automatically by Cloudflare Pages. Every branch and
//                 pull request preview gets its own, so shared preview links
//                 resolve correctly in Slack without any config.
const site = process.env.SITE_URL || process.env.CF_PAGES_URL || 'http://localhost:4321';

// https://astro.build/config
export default defineConfig({
  site,
  vite: {
    plugins: [tailwindcss()],
  },
});
