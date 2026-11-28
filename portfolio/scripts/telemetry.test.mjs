import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseCode, parseHours } from './sync-telemetry.mjs';

const CODE = `<svg role="img" aria-label="Codebase telemetry: 896,133 lines of code written across 54 GitHub repositories."><text class="stat-val">1,512</text><text class="stat-lbl">COMMITS PUSHED</text></svg>`;
const HOURS = `<svg aria-label="Build hours: about 340+ hours spent building across GitHub repositories since Nov 2023."></svg>`;

test('reads the totals from the profile README cards', () => {
  assert.deepEqual(parseCode(CODE), { lines: 896133, repos: 54, commits: 1512 });
  assert.deepEqual(parseHours(HOURS), { hours: 340 });
});

test('the saved numbers are whole', async () => {
  const saved = JSON.parse(await readFile(new URL('../src/data/telemetry.json', import.meta.url), 'utf8'));
  for (const key of ['lines', 'repos', 'commits']) assert.ok(Number.isInteger(saved[key]) && saved[key] > 0, key);
});
