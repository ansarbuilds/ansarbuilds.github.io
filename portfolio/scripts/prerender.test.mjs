// Runs after `npm run build`: checks what readers and crawlers that do not
// run scripts get from the built pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PROJECTS } from '../src/data/projects.js';
import { LISTED_SLUGS, PERSON as CONTACT, isListed } from '../src/data/site.js';

test('the home page carries its words and links for readers without scripts', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  assert.match(html, /<main class="prerendered"[^>]*><h1>Mohamed Ansar<\/h1>/);
  for (const slug of LISTED_SLUGS) assert.ok(html.includes(`href="/work/${slug}/"`), `${slug} not linked`);
  assert.ok(html.includes('href="https://github.com/ansarbuilds"'));
  // A browser that runs scripts hides it.
  assert.ok(html.includes('.js #root>.prerendered{display:none}'));
});

test('404.html stays the bare app', async () => {
  const html = await readFile('dist/404.html', 'utf8');
  assert.ok(html.includes('<div id="root"></div>'));
});

// Structured data: one block a page, whole on its own, with no email in it.
const graphOf = async (file) => {
  const html = await readFile(file, 'utf8');
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, `${file}: expected one block of structured data`);
  assert.ok(!blocks[0][1].includes(CONTACT.email), `${file}: structured data carries the email address`);
  const graph = JSON.parse(blocks[0][1])['@graph'];
  const ids = new Set(graph.map((node) => node['@id']).filter(Boolean));
  for (const ref of JSON.stringify(graph).match(/\{"@id":"[^"]+"\}/g) || []) {
    assert.ok(ids.has(JSON.parse(ref)['@id']), `${file}: ${ref} points to nothing on the page`);
  }
  assert.ok(graph.some((node) => node['@type'] === 'Person' && node.name === 'Mohamed Ansar'), `${file}: no Person`);
  return graph;
};
const nodeOf = (graph, type) => graph.find((node) => node['@type'] === type);

test('every page tells search engines what it is', async () => {
  assert.ok(nodeOf(await graphOf('dist/index.html'), 'ProfilePage'));

  const index = nodeOf(await graphOf('dist/work/index.html'), 'CollectionPage');
  assert.equal(index.mainEntity.itemListElement.length, LISTED_SLUGS.length);

  for (const project of PROJECTS) {
    const graph = await graphOf(`dist/work/${project.slug}/index.html`);
    const work = nodeOf(graph, 'CreativeWork');
    assert.equal(work.name, project.title);
    assert.equal(work.url, `https://ansarbuilds.dev/work/${project.slug}/`);
    assert.ok(project.hook.startsWith(work.description.replace(/…$/, '')), `${project.slug}: description is not the hook's opening`);
    assert.equal(nodeOf(graph, 'BreadcrumbList').itemListElement.at(-1).item, work.url);
    const html = await readFile(`dist/work/${project.slug}/index.html`, 'utf8');
    assert.equal(html.includes('content="noindex"'), !isListed(project.slug), `${project.slug}: noindex should match whether it is listed`);
  }
});
