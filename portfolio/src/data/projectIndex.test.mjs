import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCENTS, PROJECTS } from './projects.js';
import * as index from './projectIndex.js';
import { indexOf } from './projectIndexFields.js';
import { LISTED_SLUGS, SHIPPED, MORE, NOW, isPublicLink } from './site.js';

test('the project index is up to date with projects.js (run scripts/make-project-index.mjs)', () => {
  assert.deepEqual(index.PROJECT_INDEX, PROJECTS.map(indexOf));
  assert.deepEqual(index.ACCENTS, ACCENTS);
});

test('the site lists exactly the projects in LISTED_SLUGS, in that order', async () => {
  const full = await import('./projects.js');
  assert.deepEqual(index.LISTED_PROJECTS.map((p) => p.slug), LISTED_SLUGS);
  assert.deepEqual(full.LISTED_PROJECTS.map((p) => p.slug), LISTED_SLUGS);
});

test('every project the home page names exists and is listed', () => {
  for (const slug of [...SHIPPED.map((s) => s.slug), ...MORE.map((m) => m.slug), NOW.slug]) {
    assert.ok(PROJECTS.some((p) => p.slug === slug), `${slug} has no entry in projects.js`);
    assert.ok(LISTED_SLUGS.includes(slug), `${slug} is on the home page but not listed`);
  }
});

test('links to private repositories are recognised', () => {
  assert.equal(isPublicLink('https://github.com/ansarbuilds/Hermione/releases'), false);
  assert.equal(isPublicLink('https://github.com/ansarbuilds/Hermione.git'), false);
  assert.equal(isPublicLink('https://github.com/ansarbuilds/saywhen'), true);
  assert.equal(isPublicLink('https://github.com/ansarbuilds/hermione-models'), true);
});
