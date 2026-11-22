// Runs after `npm run build`: checks what readers and crawlers that do not
// run scripts get from the built pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FLAGSHIPS } from '../src/data/showcase.js';

test('the home page carries its words and links for readers without scripts', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /<main class="prerendered"[^>]*><h1>Mohamed Ansar<\/h1>/);
  for (const flag of FLAGSHIPS) assert.ok(html.includes(`href="/work/${flag.slug}/"`), `${flag.slug} not linked`);
  assert.ok(html.includes('href="https://github.com/ansarbuilds"'));
  // A browser that runs scripts hides it, so the film opens on black.
  assert.ok(html.includes('.js #root>.prerendered{display:none}'));
});

test('404.html stays the bare app', async () => {
  const html = await readFile('dist/404.html', 'utf8');
  assert.ok(html.includes('<div id="root"></div>'));
});
