// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from "@astrojs/cloudflare";

// Where this build is being served from. Used for canonical URLs and social
// share tags, so it needs to match reality or link previews break.
//
//   SITE_URL      set this by hand, to the real domain, as a build variable
//                 in the Cloudflare dashboard (Settings -> Build). It must be
//                 a *build* variable: this file runs at build time, so a
//                 runtime var in wrangler.jsonc would be ignored.
//
//                 It no longer decides whether the site is indexable. That is
//                 ALLOW_INDEXING, a separate switch in src/layouts/Base.astro,
//                 so setting the domain cannot publish the site by accident.
//   CF_PAGES_URL  set automatically by Cloudflare *Pages*, which we no longer
//                 use - the site moved to Workers, and Workers Builds does not
//                 set it. Kept as a harmless fallback. The consequence is that
//                 preview builds have no domain of their own and fall back to
//                 localhost, so a preview link pasted into Slack will not
//                 unfurl correctly until SITE_URL is set for that build.
const site = process.env.SITE_URL || process.env.CF_PAGES_URL || 'http://localhost:4321';

// https://astro.build/config
export default defineConfig({
  site,

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare()
});