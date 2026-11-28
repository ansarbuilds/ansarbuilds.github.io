// Runs after `vite build`. GitHub Pages serves files, so every view needs a
// file at its URL: this writes dist/work/<slug>/index.html (and the other
// views) from the built index.html, each with its own title, description,
// canonical URL and share image, plus a short static version of the page in
// #root for readers and crawlers that do not run scripts. React replaces it
// on load. Each page also gets structured data for search engines: the
// site-wide Person and WebSite from index.html plus what the page is (a
// project, the index or the profile at home) and its breadcrumb trail.
// 404.html is the same app, so an unknown URL still opens the site.
import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PROJECTS } from '../src/data/projects.js';
import { HERO, LISTED_SLUGS, NOW, PERSON as ME, SHIPPED, STORY, MORE, isListed } from '../src/data/site.js';
import { PLAYGROUND, pathForRoute } from '../src/lib/routes.js';
import { titleForRoute } from '../src/lib/routeTitle.js';
import { summarize } from '../src/lib/sentences.js';

const ORIGIN = 'https://ansarbuilds.dev';
const DIST = resolve('dist');
const escape = (text) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const exists = (file) => access(file).then(() => true, () => false);

const VIEW_DESCRIPTIONS = {
  work: 'Everything Mohamed Ansar has shipped or is building now: Hermione, saywhen, Haloscript, Agent Flight Recorder and Sirius.',
  'lineage-demo': 'An interactive data lineage explorer: follow a column from source to report.',
};

const template = await readFile(resolve(DIST, 'index.html'), 'utf8');

// Structured data. index.html carries the Person and the WebSite; every page
// written here repeats them in one block with its own nodes, which point back
// by @id, so each page's graph is whole on its own.
const LD = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
const SITE_GRAPH = JSON.parse(template.match(LD)?.[1] ?? 'null')?.['@graph'];
if (!SITE_GRAPH) throw new Error('prerender: the site-wide structured data is missing from index.html');
const PERSON = { '@id': `${ORIGIN}/#person` };
const WEBSITE = { '@id': `${ORIGIN}/#website` };
const crumbs = (...trail) => ({
  '@type': 'BreadcrumbList',
  itemListElement: trail.map(([name, route], index) => ({ '@type': 'ListItem', position: index + 1, name, item: ORIGIN + pathForRoute(route) })),
});
// JSON in a script tag: `<` is escaped so no text can close the tag early.
const jsonLd = (nodes) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [...SITE_GRAPH, ...nodes] }).replace(/</g, '\\u003c')}</script>`;

// A search result shows about 160 characters, so a description is
// summarize(): the opening sentences of the project's own hook that fit.

function page({ route, title, description, image, body, data = [], quiet = true, noindex = false }) {
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
  html = html.replace(LD, () => jsonLd(data));
  // Projects that are no longer listed keep their page for old links, out of search.
  if (noindex) html = html.replace('</head>', '<meta name="robots" content="noindex" /></head>');
  if (!html.includes('<div id="root"></div>')) throw new Error('prerender: #root not found in index.html');
  // A browser that runs scripts never shows this static text: it is there
  // for readers and crawlers that do not.
  if (quiet) html = html.replace('</head>', '<script>document.documentElement.classList.add("js")</script><style>.js #root>.prerendered{display:none}</style></head>');
  return html.replace('<div id="root"></div>', `<div id="root"><main${quiet ? ' class="prerendered"' : ''} style="max-width:48rem;margin:16vh auto;padding:0 1.5rem">${body}</main></div>`);
}

const pages = [];
const INDEX_NAME = titleForRoute('work').split(' · ')[0];
// Unlisted projects are left out of every list, but their pages still open.
for (const project of PROJECTS) {
  const listed = isListed(project.slug);
  const route = `project/${project.slug}`;
  const shareImage = `/p/${project.slug}/og.jpg`;
  const image = (await exists(resolve('public', `.${shareImage}`))) ? shareImage : null;
  const description = summarize(project.hook);
  pages.push({
    route,
    listed,
    noindex: !listed,
    title: titleForRoute(route),
    description,
    image,
    body: `<p>Mohamed Ansar / Work</p><h1>${escape(project.title)}</h1><p>${escape(project.hook)}</p><p><a href="/">Portfolio home</a></p>`,
    data: [
      {
        '@type': 'CreativeWork',
        '@id': `${ORIGIN}${pathForRoute(route)}#work`,
        name: project.title,
        description,
        url: ORIGIN + pathForRoute(route),
        ...(image ? { image: ORIGIN + image } : {}),
        ...(project.tags?.length ? { keywords: project.tags.join(', ') } : {}),
        author: PERSON,
        isPartOf: WEBSITE,
      },
      crumbs(['Home', 'home'], [INDEX_NAME, 'work'], [project.title, route]),
    ],
  });
}
// The index lists every project in the order /work/ shows them.
const indexed = LISTED_SLUGS.map((slug) => PROJECTS.find((project) => project.slug === slug)).filter(Boolean);
pages.push({
  route: 'work',
  listed: true,
  title: titleForRoute('work'),
  description: VIEW_DESCRIPTIONS.work,
  image: null,
  body: `<h1>${escape(INDEX_NAME)}</h1><p>${escape(VIEW_DESCRIPTIONS.work)}</p><p><a href="/">Portfolio home</a></p>`,
  data: [
    {
      '@type': 'CollectionPage',
      '@id': `${ORIGIN}${pathForRoute('work')}#page`,
      name: titleForRoute('work'),
      description: VIEW_DESCRIPTIONS.work,
      url: ORIGIN + pathForRoute('work'),
      author: PERSON,
      isPartOf: WEBSITE,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: indexed.length,
        itemListElement: indexed.map((project, index) => ({ '@type': 'ListItem', position: index + 1, name: project.title, url: ORIGIN + pathForRoute(`project/${project.slug}`) })),
      },
    },
    crumbs(['Home', 'home'], [INDEX_NAME, 'work']),
  ],
});
for (const route of PLAYGROUND) {
  const title = titleForRoute(route);
  pages.push({ route, listed: false, noindex: true, title, description: VIEW_DESCRIPTIONS[route], image: null, body: `<h1>${escape(title.split(' · ')[0])}</h1><p>${escape(VIEW_DESCRIPTIONS[route])}</p><p><a href="/">Portfolio home</a></p>` });
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
const bySlug = (slug) => PROJECTS.find((project) => project.slug === slug);
const item = (slug, line) => `<li><a href="/work/${slug}/">${escape(bySlug(slug)?.title || slug)}</a>: ${escape(line)}</li>`;
const homeTitle = template.match(/<title>([^<]*)<\/title>/)[1];
const homeDescription = template.match(/<meta name="description" content="([^"]*)"/)[1];
await writeFile(resolve(DIST, 'index.html'), page({
  route: 'home',
  title: homeTitle,
  description: homeDescription,
  image: null,
  quiet: true,
  data: [{ '@type': 'ProfilePage', '@id': `${ORIGIN}/#page`, name: homeTitle, description: homeDescription, url: `${ORIGIN}/`, mainEntity: PERSON, isPartOf: WEBSITE }],
  body: [
    `<h1>Mohamed Ansar</h1>`,
    `<p>${escape(HERO.title.join(' '))}</p>`,
    `<p>${escape(HERO.lede)}</p>`,
    ...STORY.paragraphs.map((text) => `<p>${escape(text)}</p>`),
    `<h2>Building now</h2><ul>${item(NOW.slug, NOW.line)}</ul>`,
    `<h2>Shipped</h2><ul>${SHIPPED.map((spot) => item(spot.slug, spot.line)).join('')}</ul>`,
    `<h2>More shipped work</h2><ul>${MORE.map((more) => item(more.slug, more.line)).join('')}</ul>`,
    `<h2>Contact</h2><p><a href="mailto:${escape(ME.email)}">${escape(ME.email)}</a> · <a href="${escape(ME.github)}">GitHub</a> · <a href="${escape(ME.linkedin)}">LinkedIn</a></p>`,
  ].join(''),
}));

// Add the new pages to the sitemap that public/ already ships.
const sitemapFile = resolve(DIST, 'sitemap.xml');
const sitemap = await readFile(sitemapFile, 'utf8');
const urls = pages.filter((entry) => entry.listed).map(({ route }) => `  <url><loc>${ORIGIN}${pathForRoute(route)}</loc></url>`).join('\n');
await writeFile(sitemapFile, sitemap.replace('</urlset>', `${urls}\n</urlset>`));

console.log(`prerender: wrote ${pages.length} pages, 404.html and sitemap.xml`);
