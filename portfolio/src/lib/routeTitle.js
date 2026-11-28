import { getProject } from "../data/projectIndex.js";

/* Each view reads like a page: its own tab title, in tabs, history and
   bookmarks. */
export const SITE_TITLE = "Mohamed Ansar · Local-first apps and on-device AI";

const VIEW_TITLES = {
  "lineage-demo": "Data lineage explorer",
  work: "Work",
};

export function titleForRoute(route) {
  if (!route || route === "main") return SITE_TITLE;
  if (route.startsWith("project/")) {
    const project = getProject(route.slice("project/".length));
    return project ? `${project.title} · Mohamed Ansar` : SITE_TITLE;
  }
  const view = VIEW_TITLES[route];
  return view ? `${view} · Mohamed Ansar` : SITE_TITLE;
}
