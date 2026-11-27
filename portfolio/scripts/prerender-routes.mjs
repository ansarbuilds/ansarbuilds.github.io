// Runs after `vite build`. GitHub Pages serves files, so every view needs a
// file at its URL: this writes dist/work/<slug>/index.html (and the other
// views) from the built index.html, each with its own title, description,
// canonical URL and share image, plus a short static version of the page in
// #root for readers and crawlers that do not run scripts. React replaces it
// on load. 404.html is the same app, so an unknown URL still opens the site.
import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PROJECTS } from '../src/data/projects.js';
import { CONTACT, HERO } from '../src/data/content.js';
import { FLAGSHIPS } from '../src/data/showcase.js';
import { PLAYGROUND, pathForRoute } from '../src/lib/routes.js';
import { titleForRoute } from '../src/lib/routeTitle.js';

const ORIGIN = 'https://ansarbuilds.dev';
const DIST = resolve('dist');
const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const exists = (file) => access(file).then(() => true, () => false);

const VIEW_DESCRIPTIONS = {
  work: 'Every project on the site: agents, open-source tools, AI studies and apps, each with its code, numbers and write-up.',
  'lineage-demo': 'An interactive data lineage explorer: follow a column from source to report.',
};

const template = await readFile(resolve(DIST, 'index.html'), 'utf8');

// A search result shows about 160 characters. A description is the opening
// sentences of the project's own hook that fit, never a rewrite; a first
// sentence longer than that is cut at a word.
function summarize(text, limit = 160) {
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) || [text];
  let out = '';
  for (const sentence of sentences) { if ((out + sentence).trim().length > limit) break; out += sentence; }
  out = out.trim();
  if (out) return out;
  return text.slice(0, limit - 1).replace(/\s+\S*$/, '') + '…';
}

function page({ route, title, description, image, body, quiet = true }) {
  const url = ORIGIN + pathForRoute(route);
  const meta = (html, pattern, value) => {
    if (!pattern.test(html)) throw new Error(`prerender: ${pattern} not found in index.html`);
    return html.replace(pattern, (_, before, after) => before + escape(value) + after);
  };
  let html = template;
  html = meta(html, /(<title>)[^<]*(<\/title>)/, title);
  html = meta(html, /(<meta name="description" content=")[^"]*(")/, description);
  html = meta(html, /(<link rel="canonical" href=")[^"]*(")/, url);
  html = meta(html, /(<meta property="og:url" content=")[^"]*(")/, url);
  html = meta(html, /(<meta property="og:title" content=")[^"]*(")/, title);
  html = meta(html, /(<meta property="og:description" content=")[^"]*(")/, description);
  html = meta(html, /(<meta name="twitter:title" content=")[^"]*(")/, title);
  html = meta(html, /(<meta name="twitter:description" content=")[^"]*(")/, description);
  if (image) {
    html = meta(html, /(<meta property="og:image" content=")[^"]*(")/, ORIGIN + image);
    html = meta(html, /(<meta name="twitter:image" content=")[^"]*(")/, ORIGIN + image);
  }
  if (!html.includes('<div id="root"></div>')) throw new Error('prerender: #root not found in index.html');
  // The home page opens on the film, so a browser that runs scripts never
  // shows its static text: it is there for readers and crawlers that do not.
  if (quiet) html = html.replace('</head>', '<script>document.documentElement.classList.add("js")</script><style>.js #root>.prerendered{display:none}</style></head>');
  return html.replace('<div id="root"></div>', `<div id="root"><main${quiet ? ' class="prerendered"' : ''} style="max-width:48rem;margin:16vh auto;padding:0 1.5rem">${body}</main></div>`);
}

const pages = [];
// Hidden projects are left out of every list, but their pages still open.
for (const project of PROJECTS) {
  const route = `project/${project.slug}`;
  const shareImage = `/p/${project.slug}/og.jpg`;
  pages.push({
    route,
    listed: !project.hidden,
    title: titleForRoute(route),
    description: summarize(project.hook),
    image: (await exists(resolve('public', `.${shareImage}`))) ? shareImage : null,
    body: `<p>Mohamed Ansar / Selected work</p><h1>${escape(project.title)}</h1><p>${escape(project.hook)}</p><p><a href="/">Portfolio home</a></p>`,
  });
}
for (const route of ['work', ...PLAYGROUND]) {
  const title = titleForRoute(route);
  pages.push({ route, listed: true, title, description: VIEW_DESCRIPTIONS[route], image: null, body: `<h1>${escape(title.split(' · ')[0])}</h1><p>${escape(VIEW_DESCRIPTIONS[route])}</p><p><a href="/">Portfolio home</a></p>` });
}

for (const entry of pages) {
  if (!entry.description) throw new Error(`prerender: ${entry.route} has no description`);
  const file = resolve(DIST, `.${pathForRoute(entry.route)}`, 'index.html');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, page(entry));
}
await copyFile(resolve(DIST, 'index.html'), resolve(DIST, '404.html'));

// The home page, last, so 404.html above stays the bare app: who I am, the
// work with a link to each page, and how to reach me.
const listed = PROJECTS.filter((project) => !project.hidden);
const flagships = FLAGSHIPS.map((flag) => listed.find((project) => project.slug === flag.slug)).filter(Boolean);
const others = listed.filter((project) => !flagships.includes(project));
const item = (project) => `<li><a href="/work/${project.slug}/">${escape(project.title)}</a>: ${escape(project.kind || summarize(project.hook, 120))}</li>`;
const homeTitle = template.match(/<title>([^<]*)<\/title>/)[1];
const homeDescription = template.match(/<meta name="description" content="([^"]*)"/)[1];
await writeFile(resolve(DIST, 'index.html'), page({
  route: 'home',
  title: homeTitle,
  description: homeDescription,
  image: null,
  quiet: true,
  body: [
    `<h1>Mohamed Ansar</h1>`,
    `<p>${escape(HERO.title)}</p>`,
    ...HERO.lede.map((part) => `<p>${escape(part.text)}</p>`),
    `<h2>Selected work</h2><ul>${flagships.map(item).join('')}</ul>`,
    `<h2>More work</h2><ul>${others.map(item).join('')}</ul>`,
    `<h2>Contact</h2><p><a href="mailto:${escape(CONTACT.email)}">${escape(CONTACT.email)}</a> · <a href="${escape(CONTACT.github)}">GitHub</a> · <a href="${escape(CONTACT.linkedin)}">LinkedIn</a></p>`,
  ].join(''),
}));

// Add the new pages to the sitemap that public/ already ships.
const sitemapFile = resolve(DIST, 'sitemap.xml');
const sitemap = await readFile(sitemapFile, 'utf8');
const urls = pages.filter((entry) => entry.listed).map(({ route }) => `  <url><loc>${ORIGIN}${pathForRoute(route)}</loc></url>`).join('\n');
await writeFile(sitemapFile, sitemap.replace('</urlset>', `${urls}\n</urlset>`));

console.log(`prerender: wrote ${pages.length} pages, 404.html and sitemap.xml`);
