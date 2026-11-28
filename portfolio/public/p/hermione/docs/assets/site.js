const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// theme
$(".theme").addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  try { localStorage.setItem("hermione-docs-theme", next); } catch {}
  drawDiagrams();
});

// mobile nav
const menu = $(".menu");
menu.addEventListener("click", () => {
  const open = document.body.classList.toggle("nav-open");
  menu.setAttribute("aria-expanded", String(open));
});
document.addEventListener("click", (e) => {
  if (document.body.classList.contains("nav-open") && !e.target.closest(".sidebar, .menu")) {
    document.body.classList.remove("nav-open");
    menu.setAttribute("aria-expanded", "false");
  }
});
$(".sidebar [aria-current]")?.scrollIntoView({ block: "center" });

// copy buttons
for (const btn of $$(".code .copy")) {
  btn.addEventListener("click", async () => {
    const text = btn.nextElementSibling.innerText.replace(/\n$/, "");
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; btn.classList.add("done"); } catch { btn.textContent = "Press ⌘C"; }
    setTimeout(() => { btn.textContent = "Copy"; btn.classList.remove("done"); }, 1600);
  });
}

// screenshot lightbox
const lightbox = $(".lightbox");
for (const z of $$(".shot .zoom")) {
  z.addEventListener("click", () => {
    const img = $$("img", z).find((i) => getComputedStyle(i).display !== "none");
    $("img", lightbox).src = img.currentSrc || img.src;
    $("img", lightbox).alt = img.alt;
    lightbox.showModal();
  });
}
lightbox.addEventListener("click", () => lightbox.close());

// on this page: highlight the section in view
const tocLinks = $$(".toc a");
if (tocLinks.length) {
  const heads = tocLinks.map((a) => document.getElementById(decodeURIComponent(a.hash.slice(1)))).filter(Boolean);
  const onScroll = () => {
    let current = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top < 140) current = h;
    for (const a of tocLinks) a.classList.toggle("on", a.hash === `#${current.id}`);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// mermaid diagrams, themed to match
const sources = $$("pre.mermaid").map((el) => [el, el.textContent]);
let mermaid;
async function drawDiagrams() {
  if (!sources.length) return;
  mermaid ??= (await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")).default;
  const dark = root.dataset.theme === "dark";
  const css = getComputedStyle(root);
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    fontFamily: "Inter, system-ui, sans-serif",
    themeVariables: {
      darkMode: dark,
      background: "transparent",
      primaryColor: dark ? "#1b1a2b" : "#f1effc",
      primaryBorderColor: dark ? "#5b4fc4" : "#a99cf3",
      primaryTextColor: css.getPropertyValue("--text").trim(),
      secondaryColor: dark ? "#141421" : "#f7f7fb",
      tertiaryColor: dark ? "#10101a" : "#fbfbfd",
      clusterBkg: dark ? "#0f0f19" : "#f6f5fb",
      clusterBorder: dark ? "#2a2940" : "#dcd8f0",
      lineColor: dark ? "#7d72d8" : "#7a6ae0",
      textColor: css.getPropertyValue("--text-2").trim(),
      edgeLabelBackground: dark ? "#0d0d14" : "#f4f4f8",
      fontSize: "14px",
    },
    flowchart: { useMaxWidth: false, padding: 14 },
    sequence: { useMaxWidth: false },
  });
  for (const [el, src] of sources) {
    el.removeAttribute("data-processed");
    el.textContent = src;
  }
  await mermaid.run({ nodes: sources.map(([el]) => el) });
}
if (sources.length) {
  new IntersectionObserver((entries, io) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); drawDiagrams(); }
  }, { rootMargin: "400px" }).observe(sources[0][0]);
}

// search
const dialog = $("dialog.search");
const input = $("input", dialog);
const list = $(".results", dialog);
list.dataset.empty = "Type to search every page.";
let index;
let selected = 0;
async function openSearch() {
  dialog.showModal();
  input.select();
  index ??= await fetch("../assets/search.json").then((r) => r.json());
  render();
}
$(".search-open").addEventListener("click", openSearch);
addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
  else if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
});
dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
function mark(text, words) {
  let out = escHtml(text);
  for (const w of words) out = out.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), "<mark>$1</mark>");
  return out;
}
function render() {
  if (!index) return;
  const q = input.value.trim().toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  if (!words.length) { list.innerHTML = ""; list.dataset.empty = "Type to search every page."; return; }
  const hits = [];
  for (const e of index) {
    const h = e.h.toLowerCase(), x = e.x.toLowerCase(), t = e.t.toLowerCase();
    let score = 0;
    let ok = true;
    for (const w of words) {
      const s = (h.includes(w) ? 6 : 0) + (t.includes(w) ? 3 : 0) + (x.includes(w) ? 1 : 0);
      if (!s) { ok = false; break; }
      score += s;
    }
    if (ok) hits.push([score, e]);
  }
  hits.sort((a, b) => b[0] - a[0]);
  selected = 0;
  list.dataset.empty = `Nothing matches “${q}”.`;
  list.innerHTML = hits.slice(0, 12).map(([, e], i) => {
    const pos = Math.max(0, e.x.toLowerCase().indexOf(words[0]) - 40);
    const snippet = (pos ? "…" : "") + e.x.slice(pos, pos + 160);
    return `<li><a href="../${e.p}/${e.a ? `#${e.a}` : ""}" aria-selected="${i === 0}"><small>${escHtml(e.t)}</small>${mark(e.h, words)}<span>${mark(snippet, words)}</span></a></li>`;
  }).join("");
}
input.addEventListener("input", render);
input.addEventListener("keydown", (e) => {
  const links = $$("a", list);
  if (!links.length) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    selected = (selected + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
    links.forEach((a, i) => a.setAttribute("aria-selected", String(i === selected)));
    links[selected].scrollIntoView({ block: "nearest" });
  } else if (e.key === "Enter") {
    e.preventDefault();
    links[selected].click();
    dialog.close();
  }
});
list.addEventListener("click", () => dialog.close());
