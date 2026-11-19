import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACCENTS, EXPERIMENTS, PROJECTS } from './projects.js';
import * as index from './projectIndex.js';
import { indexOf } from './projectIndexFields.js';

test('the project index is up to date with projects.js (run scripts/make-project-index.mjs)', () => {
  assert.deepEqual(index.PROJECT_INDEX, PROJECTS.map(indexOf));
  assert.deepEqual(index.EXPERIMENTS, EXPERIMENTS);
  assert.deepEqual(index.ACCENTS, ACCENTS);
});

test('the index lists the same projects as projects.js', async () => {
  const full = await import('./projects.js');
  assert.deepEqual(index.LISTED_PROJECTS.map((p) => p.slug), full.LISTED_PROJECTS.map((p) => p.slug));
  assert.deepEqual(index.OPEN_SOURCE_PROJECTS.map((p) => p.slug), full.OPEN_SOURCE_PROJECTS.map((p) => p.slug));
});
