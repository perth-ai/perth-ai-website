// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Update this to the real domain once DNS is pointed at Cloudflare Pages.
  // It's used for canonical URLs, sitemap and social share tags.
  site: 'https://perthai.org',
  vite: {
    plugins: [tailwindcss()],
  },
});
