import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PROJECTS } from '../src/data/projects.js';

const slugs = ['agent-flight-recorder', 'storyera', 'site-recon', 'authorized-web-exposure-audit', 'reptrack', 'jarvis'];

test('share pages have their own URLs, case-study links and existing images', async () => {
  const sitemap = await readFile('public/sitemap.xml', 'utf8');
  for (const slug of slugs) {
    const html = await readFile(`public/p/${slug}/index.html`, 'utf8');
    assert.ok(sitemap.includes(`https://ansarbuilds.dev/p/${slug}/`), `${slug} missing from sitemap`);
    assert.ok(html.includes(`href="/#project/${slug}"`), `${slug} missing case study link`);
    assert.ok(html.includes(`rel="canonical" href="https://ansarbuilds.dev/p/${slug}/"`));
    const image = html.match(/property="og:image" content="https:\/\/ansarbuilds\.dev(\/[^"]+)"/);
    assert.ok(image, `${slug} missing image`);
    await access(resolve('public', `.${image[1]}`));
  }
});

test('project links point to existing case studies and local pages', async () => {
  const slugs = new Set(PROJECTS.map((project) => project.slug));
  const links = new Set();
  function collect(value) {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') {
      if (typeof value.href === 'string') links.add(value.href);
      Object.values(value).forEach(collect);
    }
  }
  collect(PROJECTS);
  for (const href of links) {
    if (href.startsWith('#project/')) {
      assert.ok(slugs.has(href.slice('#project/'.length)), `unknown case study: ${href}`);
    } else if (href.startsWith('/') && !href.startsWith('//')) {
      const pathname = new URL(href, 'https://ansarbuilds.dev').pathname;
      const file = resolve('public', `.${pathname}`);
      await access(pathname.endsWith('/') ? resolve(file, 'index.html') : file);
    }
  }
});
