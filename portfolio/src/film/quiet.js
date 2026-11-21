/* film-quiet: while a film stage covers the viewport, the page chrome that
   would sit on a portrait steps out of the way (the sound switch, the
   command button, BB-8). Each act registers its pinned stage; the class
   goes on the document element while any of them is on screen. */
let visible = 0;

export function trackQuiet(stage) {
  if (!stage || typeof IntersectionObserver === "undefined") return () => {};
  let on = false;
  const set = (now) => {
    if (now === on) return;
    on = now;
    visible += now ? 1 : -1;
    document.documentElement.classList.toggle("film-quiet", visible > 0);
  };
  const observer = new IntersectionObserver(([entry]) => set(entry.isIntersecting && entry.intersectionRatio > 0.85), { threshold: [0, 0.85, 1] });
  observer.observe(stage);
  return () => { observer.disconnect(); set(false); };
}

// For code that reacts to the class (BB-8 parks and pauses on it).
export function onQuiet(callback) {
  const read = () => callback(document.documentElement.classList.contains("film-quiet"));
  const mutations = new MutationObserver(read);
  mutations.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  read();
  return () => mutations.disconnect();
}
