/* film-quiet: while the film plays over the page, the page chrome that
   would sit on top of it steps out of the way (the command button, BB-8).
   The class goes on the document element. */
export function setQuiet(on) {
  document.documentElement.classList.toggle("film-quiet", on);
}

// For code that reacts to the class (BB-8 parks and pauses on it).
export function onQuiet(callback) {
  const read = () => callback(document.documentElement.classList.contains("film-quiet"));
  const mutations = new MutationObserver(read);
  mutations.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  read();
  return () => mutations.disconnect();
}
