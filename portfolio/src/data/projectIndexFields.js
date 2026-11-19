// Which fields of a project the home page reads. Everything else (the story,
// how it works, results, flows, samples) stays in projects.js for its page.
export const INDEX_FIELDS = [
  "slug", "title", "cardTitle", "kind", "hook", "status", "links", "stats", "accent", "icon", "theme",
  "featured", "grid", "hidden", "earlier", "spotlightGroup", "spotlightCategory", "spotlightLink",
  "spotlightArt", "cardArt", "cardShot", "shots", "heroArt", "heroAlt", "heroCaption", "film", "preferIcon",
];
export const indexOf = (project) => Object.fromEntries(INDEX_FIELDS.filter((key) => key in project).map((key) => [key, project[key]]));
