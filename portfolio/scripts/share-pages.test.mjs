import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PROJECTS } from '../src/data/projects.js';
import { PLAYGROUND } from '../src/lib/routes.js';
import { isListed } from '../src/data/site.js';

const slugs = ['agent-flight-recorder', 'storyera', 'reptrack', 'jarvis', 'saywhen'];

test('share pages have their own URLs, case-study links and existing images', async () => {
  const sitemap = await readFile('public/sitemap.xml', 'utf8');
  for (const slug of slugs) {
    const html = await readFile(`public/p/${slug}/index.html`, 'utf8');
    // Only the listed projects' share pages are offered to search engines.
    assert.equal(sitemap.includes(`https://ansarbuilds.dev/p/${slug}/`), isListed(slug), `${slug}: sitemap should ${isListed(slug) ? '' : 'not '}list it`);
    assert.ok(html.includes(`href="/work/${slug}/"`), `${slug} missing case study link`);
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
    const caseStudy = href.match(/^\/work\/([^/]+)\/$/);
    if (caseStudy) {
      assert.ok(slugs.has(caseStudy[1]), `unknown case study: ${href}`);
    } else if (href.startsWith('/playground/')) {
      assert.ok(PLAYGROUND.includes(href.split('/')[2]), `unknown playground view: ${href}`);
    } else if (href.startsWith('/') && !href.startsWith('//')) {
      const pathname = new URL(href, 'https://ansarbuilds.dev').pathname;
      const file = resolve('public', `.${pathname}`);
      await access(pathname.endsWith('/') ? resolve(file, 'index.html') : file);
    }
  }
});

// Repos and demos that are private, so a visitor would get a 404 or a
// sign-in wall. A project can mention them, but must not link to them: it
// shows a locked "walkthrough on request" link instead. If one is made
// public again, take it off this list and link it.
const PRIVATE = [
  /github\.com\/ansarbuilds\/(CPL-Dream-Team|NLP-Project-Smart-Category|Spotify-Data-Analysis|ai_knowledge_assistant|amazon-fine-food-sentiment-analysis|authorized-web-exposure-audit|catalogue-checker|data-delivery|high-value-customer-predictor|integration-in-a-box|mcp-analytics-stub|mv3-sidepanel-starter|site-recon|sitescout|sql-playground|yahoo-finance-news-scraper)\b/,
  /huggingface\.co\/spaces\/kmsmohamedansar\//,
  /ansarbuilds\.github\.io\/sql-playground/,
];

test('no project links to a private repo or demo', () => {
  const bad = [];
  function walk(value, where) {
    if (Array.isArray(value)) value.forEach((v) => walk(v, where));
    else if (value && typeof value === 'object') {
      if (typeof value.href === 'string' && !value.locked && PRIVATE.some((re) => re.test(value.href))) bad.push(`${where}: ${value.href}`);
      Object.values(value).forEach((v) => walk(v, where));
    }
  }
  for (const project of PROJECTS) walk(project, project.slug);
  assert.deepEqual(bad, []);
});
