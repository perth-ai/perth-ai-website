// Copies the AI Disrupt Summit 2026 tab bar into the hand-made HTML pages under
// public/summit-2026/*/index.html, so they match the tabs on /summit-2026.
//
// The tabs live in one place: summit.tabs in src/data/site.json. Those pages are
// plain HTML and can't import JSON, so this script writes the tab bar into each
// one between <!-- summit-tabs --> and <!-- /summit-tabs -->. Runs before
// `npm run dev` and `npm run build` (predev / prebuild in package.json).
// Don't hand-edit the tab bar inside a page; edit site.json.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = join(root, 'public', 'summit-2026');
const { tabs } = JSON.parse(readFileSync(join(root, 'src', 'data', 'site.json'), 'utf8')).summit;

const START = '<!-- summit-tabs -->';
const END = '<!-- /summit-tabs -->';
const CSS = '<link rel="stylesheet" href="/summit-2026/tabs.css">';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function tabBar(pagePath) {
  const items = tabs.map(({ label, href }) => {
    if (!href) {
      return `      <li><span class="tab-off" aria-disabled="true">${esc(label)}<span class="sr-only"> (coming soon)</span></span></li>`;
    }
    const current = href === pagePath ? ' aria-current="page"' : '';
    return `      <li><a class="tab" href="${esc(href)}"${current}>${esc(label)}</a></li>`;
  });
  return [
    START,
    '<nav class="summit-tabs" aria-labelledby="summit-tabs-title">',
    '  <div class="summit-tabs-box">',
    '    <h2 id="summit-tabs-title">Event information</h2>',
    '    <ul>',
    ...items,
    '    </ul>',
    tabs.some((t) => !t.href) ? '    <p>Greyed-out sections are coming soon.</p>' : null,
    '  </div>',
    '</nav>',
    END,
  ]
    .filter((l) => l !== null)
    .join('\n');
}

let changed = 0;
for (const dir of readdirSync(pagesDir, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const file = join(pagesDir, dir.name, 'index.html');
  if (!existsSync(file)) continue;

  const original = readFileSync(file, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let html = original.replace(/\r\n/g, '\n');
  const bar = tabBar(`/summit-2026/${dir.name}`);

  if (html.includes(START) && html.includes(END)) {
    html = html.slice(0, html.indexOf(START)) + bar + html.slice(html.indexOf(END) + END.length);
  } else if (html.includes('<div class="wrap">')) {
    html = html.replace('<div class="wrap">', `${bar}\n\n<div class="wrap">`);
  } else {
    console.warn(`sync-summit-tabs: no <div class="wrap"> in ${dir.name}/index.html, skipped`);
    continue;
  }
  if (!html.includes(CSS)) html = html.replace('</head>', `${CSS}\n</head>`);

  html = html.replace(/\n/g, eol);
  if (html !== original) {
    writeFileSync(file, html);
    changed++;
  }
}
console.log(`sync-summit-tabs: ${changed} page(s) updated`);
