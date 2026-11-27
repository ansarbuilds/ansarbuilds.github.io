import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstSentences, sentences, summarize } from './sentences.js';
import { PROJECTS } from '../data/projects.js';

test('numbers with points stay inside their sentence', () => {
  const text = 'My try at an LLM. It went from a MacBook Air to 286.7M parameters for $2.45. Version 0.3.0 is out!';
  assert.deepEqual(sentences(text), ['My try at an LLM.', 'It went from a MacBook Air to 286.7M parameters for $2.45.', 'Version 0.3.0 is out!']);
  assert.equal(firstSentences(text, 2), 'My try at an LLM. It went from a MacBook Air to 286.7M parameters for $2.45.');
});

test('text without a sentence break comes back whole', () => {
  assert.deepEqual(sentences('Product data whenever you need it'), ['Product data whenever you need it']);
  assert.equal(firstSentences('Product data whenever you need it'), 'Product data whenever you need it');
  assert.equal(firstSentences(undefined), '');
});

test('a summary keeps whole sentences that fit, and cuts a long first one at a word', () => {
  assert.equal(summarize('One. Two two. Three three three.', 14), 'One. Two two.');
  const long = 'word '.repeat(60).trim() + '.';
  const cut = summarize(long, 40);
  assert.ok(cut.length <= 40 && cut.endsWith('word…'), cut);
});

test("every project's description is the opening of its own hook", () => {
  for (const project of PROJECTS) {
    const description = summarize(project.hook);
    assert.ok(description.length <= 160, project.slug);
    if (!description.endsWith('…')) assert.ok(project.hook.startsWith(description), `${project.slug}: ${description}`);
  }
});
