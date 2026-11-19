/* Where every view lives.

   Each view has a real URL, so it can be linked, shared and pre-rendered:

     main                  /            (sections are /#projects, /#contact …)
     work                  /work/
     project/<slug>        /work/<slug>/
     emet, explore, …      /playground/<id>/

   The site used to keep the view in the hash (/#project/jarvis, /#emet).
   Those links are all over the web, so they still open the right view and
   the address bar is rewritten to the new URL. */

export const PLAYGROUND = ["emet", "explore", "lineage-demo", "digital-double", "infinity"];

// A view id from the old hash scheme, or "main" for a section id.
export function routeFromLegacyHash(id) {
  if (PLAYGROUND.includes(id) || id === "work") return id;
  if (id.startsWith("project/") && id.length > "project/".length) return id;
  return "main";
}

// null means "not one of this app's pages" (a static file under /p/, say).
export function routeFromPath(pathname) {
  const path = pathname.replace(/index\.html$/, "").replace(/\/+$/, "");
  if (path === "") return "main";
  const [, first, second, extra] = path.split("/");
  if (extra !== undefined) return null;
  if (first === "work") return second ? `project/${second}` : "work";
  if (first === "playground" && PLAYGROUND.includes(second)) return second;
  return null;
}

export function pathForRoute(route) {
  if (route === "work") return "/work/";
  if (route.startsWith("project/")) return `/work/${route.slice("project/".length)}/`;
  if (PLAYGROUND.includes(route)) return `/playground/${route}/`;
  return "/";
}

export const projectHref = (slug) => `/work/${slug}/`;

// The view and section a location points at. An unknown path (the 404
// fallback) is the home page.
export function readLocation(location = window.location) {
  const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
  const route = routeFromPath(location.pathname) ?? "main";
  if (route === "main") {
    const legacy = routeFromLegacyHash(hash);
    if (legacy !== "main") return { route: legacy, section: "", legacy: true };
  }
  return { route, section: hash, legacy: false };
}

// What an in-page link points at, or null to let the browser handle it.
// `id` alone (no "#", no "/") is accepted for navigate("contact").
export function parseTarget(href, location = window.location) {
  if (!href) return null;
  if (href.startsWith("#") || !/[/:.]/.test(href)) {
    const id = href.replace(/^#/, "");
    const route = routeFromLegacyHash(id);
    return route === "main" ? { route, section: id } : { route, section: "" };
  }
  let url;
  try { url = new URL(href, location.href); } catch { return null; }
  if (url.origin !== location.origin) return null;
  const route = routeFromPath(url.pathname);
  if (route === null) return null;
  return readLocation(url);
}

export const urlForTarget = ({ route, section }) => pathForRoute(route) + (section ? `#${section}` : "");
