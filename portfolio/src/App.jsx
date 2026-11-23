import { Component, createRef, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilmReel, Hero, ProjectsSection, CapabilitiesSection, MoreWorkSection, PlaygroundSection, ContactSection } from "./components/Sections";
import CommandPalette from "./components/CommandPalette";
import { MatrixBackground } from "./components/RouteBackgrounds";
import PaletteSwatch from "./components/PaletteSwatch";
// The palette card is a tool for working on the site, not for visitors:
// on the dev server, or with ?palette in the address.
const SHOW_SWATCH = typeof window !== "undefined" && (import.meta.env.DEV || new URLSearchParams(window.location.search).has("palette"));
import Cursor from "./components/Cursor";
import { COLD_OPEN_SESSION_KEY, SKIP_FILM, WATCH_FILM, coldOpenForced, filmAutoplayWanted, filmEnabled, shouldPlayIntro, watchFilm } from "./lib/intro";
import { FilmIdent, FilmSkip } from "./components/FilmChrome";
import { Play } from "lucide-react";
import { armSound, setSound } from "./lib/sound";
import { isRouteTransitioning, noteSource, runRouteChange } from "./lib/routeTransition";
import { PREVIS, parseTarget, pathForRoute, readLocation, urlForTarget } from "./lib/routes";
import { titleForRoute } from "./lib/routeTitle";
import { CONTACT } from "./data/content";
import { applyPalette, clearPalette, paletteForRoute, pickPalette } from "./lib/palettes";
import { OPEN_SOURCE_PROJECTS } from "./data/projectIndex";
import { RouteContext, SandboxContext, ThemeContext, useRoute, useSandbox } from "./appContexts";
import { scrollToElement, scrollToTop, setSmoothScroll } from "./lib/scroll";

// Only the home page ships in the first load; every other view arrives
// when it is opened.
const EmetSection = lazy(() => import("./components/EmetSection"));
const ProjectPage = lazy(() => import("./components/ProjectPage"));
const ProjectWorkPage = lazy(() => import("./components/ProjectWorkPage"));
const SandboxStubs = lazy(() => import("./components/SandboxStubs"));
const SolarSystemExplorer = lazy(() => import("./components/SolarSystemExplorer"));
const DataLineageExplorer = lazy(() => import("./components/DataLineageExplorer"));
const DigitalDouble = lazy(() => import("./components/DigitalDouble"));
const HaloscriptPage = lazy(() => import("./components/HaloscriptPage"));
const HedwigPage = lazy(() => import("./components/HedwigPage"));
const InfinityPage = lazy(() => import("./components/InfinityPage"));
const BB8Companion = lazy(() => import("./components/BB8Companion"));
// The film's cold open. It brings three.js with it, so it loads on its own
// and only for a visitor who is going to see it.
const ColdOpen = lazy(() => import("./film/ColdOpen"));
// The rest of the film, which follows it. Loaded with the cold open.
const loadFilmPlayer = () => import("./film/FilmPlayer");
const FilmPlayer = lazy(loadFilmPlayer);
// The film's pre-vis pages. Development only: a production build drops both
// the routes and these chunks.
const Storyboard = import.meta.env.DEV ? lazy(() => import("./film/Storyboard")) : null;
const Previs = import.meta.env.DEV ? lazy(() => import("./film/Previs")) : null;

/* ============================================================
   ROUTER: every view has its own URL (see lib/routes.js). "main" is the
   home page: one scrolled document, the hero followed by Selected work,
   What I bring, More work, the Playground and Contact, so a link to one of
   those does not swap a view, it scrolls to that section's id. Project
   pages live at /work/<slug>/ and the full-screen views under
   /playground/. Links are ordinary <a href>; one click handler turns the
   in-app ones into history changes so the page never reloads.
   ============================================================ */
function readRoute() {
  if (typeof window === "undefined") return "main";
  return readLocation().route;
}

// Coming back from a project page, the main document only mounts once the
// page's exit animation finishes, so keep looking for the section for a
// moment instead of giving up after one frame.
function scrollToSection(id, tries = 60) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) {
      // A build row is its own <details>; older archives wrap their links in one.
      const archive = el.tagName === "DETAILS" ? el : el.closest("details");
      if (archive) archive.open = true;
      scrollToElement(el, { center: id.startsWith("card-") });
    }
    else if (tries > 0) scrollToSection(id, tries - 1);
  });
}

function RouteProvider({ children }) {
  const [route, setRoute] = useState(readRoute);
  // The first run is the initial render, where moving focus would steal it
  // from the top of the page the visitor just opened.
  const first = useRef(true);

  // The route the page is showing, readable from the history handlers
  // without re-subscribing them on every change.
  const shownRoute = useRef(route);
  const leavingHeading = useRef(null);
  // Where the home page was scrolled to when the visitor left it, so Back
  // returns them there.
  const homeScroll = useRef(0);

  // Show whatever the address bar now says.
  const sync = useCallback(({ restore = false } = {}) => {
    const { route: next, section, legacy } = readLocation();
    // An old hash link: keep the view, move it to its real URL.
    if (legacy) window.history.replaceState(null, "", pathForRoute(next));
    const from = shownRoute.current;
    if (next !== from) {
      if (from === "main") homeScroll.current = window.scrollY;
      shownRoute.current = next;
      // Remember the heading being left. The swap below is synchronous, so
      // by the time the focus effect runs only the new page is in the DOM.
      leavingHeading.current = document.querySelector("main h1, main h2");
      // Home to a project page and back travel as one move; every other
      // change just swaps (see lib/routeTransition.js).
      runRouteChange({ from, to: next, apply: () => setRoute(next) });
      if (next === "main" && !section) {
        // The closing transition brings the card back into view itself.
        if (restore && !isRouteTransitioning()) requestAnimationFrame(() => window.scrollTo(0, homeScroll.current));
        else if (!restore) scrollToTop({ instant: true });
      }
    }
    if (next === "main" && section) scrollToSection(section);
  }, []);

  // Go to a view or section: a link target, a path, or a bare id.
  const go = useCallback((href) => {
    const target = parseTarget(href);
    if (!target) { window.location.assign(href); return; }
    // A hash link to something on the page being shown (a table of contents
    // on a project page) scrolls there and stays on that page.
    const here = shownRoute.current;
    if (here !== "main" && target.route === "main" && target.section) {
      const local = document.getElementById(target.section);
      if (local) { scrollToElement(local); return; }
    }
    const url = urlForTarget(target);
    const hashChanged = window.location.hash !== (target.section ? `#${target.section}` : "");
    if (url !== window.location.pathname + window.location.hash) window.history.pushState(null, "", url);
    sync();
    // Components that follow the hash (the work stage) still hear about it.
    if (hashChanged && target.route === "main" && here === "main") window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, [sync]);

  useEffect(() => {
    const onPop = () => sync({ restore: true });
    // The visitor edited the hash by hand, or old code set it.
    const onHashChange = (event) => { if (event.isTrusted) sync(); };
    // In-app links change history instead of loading a page. Anything else
    // (another site, a file under /p/, a new tab) is left to the browser.
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.namespaceURI !== "http://www.w3.org/1999/xhtml" || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!parseTarget(href)) return;
      event.preventDefault();
      noteSource(link);
      go(href);
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick);
    };
  }, [go, sync]);

  // First load: rewrite an old hash link, and scroll to a section named in
  // the URL (no event fires for a hash already present at mount).
  useEffect(() => {
    // The app restores scroll itself; the browser's guess is for the wrong page.
    window.history.scrollRestoration = "manual";
    const { route: initial, section, legacy } = readLocation();
    if (legacy) window.history.replaceState(null, "", pathForRoute(initial));
    if (initial === "main" && section) scrollToSection(section);
  }, []);

  // A takeover view is a page as far as the browser and assistive tech are
  // concerned: give it its own title, and move focus to its heading so the
  // change is announced and the next Tab carries on from the new view
  // instead of restarting at the top of the document.
  useEffect(() => {
    document.title = titleForRoute(route);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", `https://ansarbuilds.dev${pathForRoute(route)}`);
    if (first.current) { first.current = false; return; }
    if (route === "main") return;
    // This effect can run while the outgoing view is still in the document
    // (a view transition, or a lazy route that has not arrived). Focusing a
    // heading now could announce the page being left, so wait for one that
    // is a different node from the one on screen when the route changed.
    const outgoing = leavingHeading.current;
    let cancelled = false;
    let tries = 120;
    const focusIncoming = () => {
      if (cancelled) return;
      const heading = document.querySelector("main h1, main h2");
      if (heading && heading !== outgoing) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
        return;
      }
      // Lazy routes mount their heading only once the chunk arrives.
      if (tries-- > 0) { requestAnimationFrame(focusIncoming); return; }
      // The wait expired, so a chunk is slow or has failed. Once the outgoing
      // heading is gone, <main> can no longer announce the page being left,
      // which makes it a safe fallback. If it is somehow still there, leave
      // focus alone rather than announce it.
      if (outgoing?.isConnected) return;
      // A chunk that fails outright is not reachable from here: the error
      // boundary sits above this provider and unmounts it, so the boundary
      // moves focus itself.
      const main = document.querySelector("main");
      if (!main) return;
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    };
    requestAnimationFrame(focusIncoming);
    return () => { cancelled = true; };
  }, [route]);

  const navigate = useCallback((id) => {
    if (id === "deck") {
      if (shownRoute.current === "main") {
        if (window.location.hash) window.history.pushState(null, "", "/");
        scrollToTop();
      } else go("/");
      return;
    }
    go(id);
  }, [go]);

  const value = useMemo(() => ({ route, navigate }), [navigate, route]);
  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

/* ============================================================
   THEME — dark, always. A premium, space-lit backdrop is the whole
   point of the restructure, so there's no light variant to switch
   to; the context stays only because a few permanently-dark surfaces
   (the CRT chassis) key off document.documentElement.dataset.theme.
   ============================================================ */
function ThemeProvider({ children }) {
  useEffect(() => {
    document.documentElement.dataset.theme = "dark";
  }, []);

  const value = useMemo(() => ({ theme: "dark" }), []);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/* ============================================================
   SANDBOX STATE — dev_mode toggle, reachable from the EMET
   terminal input ("dev_mode") or the command palette.
   ============================================================ */
function SandboxProvider({ children }) {
  const [devMode, setDevMode] = useState(false);
  const value = useMemo(
    () => ({ devMode, toggleDevMode: () => setDevMode((v) => !v), setDevMode }),
    [devMode]
  );
  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>;
}

// The command palette's shortcut as the visitor's keyboard writes it.
const PALETTE_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";

// A consistent paper navigation anchors the alternating editorial sections.
function Nav({ booting = false }) {
  const { route, navigate } = useRoute();
  const [filmOn] = useState(filmEnabled);
  const editorial = route === "main";
  // While the dark hero is behind it, the nav goes dark glass to match.
  const [overHero, setOverHero] = useState(editorial);
  useEffect(() => {
    if (!editorial) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      // The hero is pinned on desktop, so watch the sheet that slides over
      // it rather than the hero's own box.
      const sheet = document.querySelector(".ed-intro");
      setOverHero(!!sheet && sheet.getBoundingClientRect().top > 70);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    // The home page mounts a moment after the route changes.
    const settle = setTimeout(update, 400);
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); clearTimeout(settle); };
  }, [editorial]);
  function openPalette() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  }
  // On a phone the section links fold into one menu button, so every
  // section stays reachable while "Get in touch" keeps its place in the bar.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [menuOpen]);
  return <nav className={`ed-nav ${editorial && overHero ? "is-over-hero" : ""} ${booting ? "is-booting" : ""}`} aria-label="Main navigation"><div className="ed-nav-inner">
    <button onClick={() => navigate("deck")} className="ed-wordmark"><span className="ed-wordmark-symbol" aria-hidden="true">ma</span><span>mohamed ansar</span><span className="sr-only">, home</span></button>
    <div className="ed-nav-links">{editorial ? <><a href="#projects" className="ed-nav-wide">Work</a><a href="#capabilities" className="ed-nav-wide">Capabilities</a><a href={CONTACT.github} className="ed-nav-wide" target="_blank" rel="noopener noreferrer">GitHub</a><span ref={menuRef} className="ed-nav-menu"><button type="button" aria-expanded={menuOpen} aria-controls="nav-menu" onClick={() => setMenuOpen((open) => !open)}>Menu</button>{menuOpen && <span id="nav-menu" className="ed-nav-menu-list" onClick={() => setMenuOpen(false)}><a href="#projects">Work</a><a href="#capabilities">Capabilities</a><a href="#more">More work</a><a href={CONTACT.github} target="_blank" rel="noopener noreferrer">GitHub ↗</a></span>}</span><a href="#contact" className="ed-nav-contact">Get in touch ↗</a></> : <button onClick={() => navigate("deck")}>← Home</button>}
      {filmOn && editorial && <button type="button" className="ed-nav-sound ed-nav-film" onClick={watchFilm} aria-label="Watch the film"><Play size={14} aria-hidden="true" /><span>Watch the film</span></button>}
      <button type="button" onClick={openPalette} className="ed-nav-command" aria-label={`${PALETTE_KEY} K, open the command palette`}>{PALETTE_KEY} K</button>
    </div>
  </div></nav>;
}

// The trailing cursor belongs to the home page only: the takeover views
// (terminal, 3D scenes) have their own pointer behaviour.
function HomeCursor() {
  const { route } = useRoute();
  return route === "main" ? <Cursor /> : null;
}

function ScrollProgress() {
  const { route } = useRoute();
  const barRef = useRef(null);

  useEffect(() => {
    const scroller = document.scrollingElement;
    const bar = barRef.current;
    if (!scroller || !bar) return;
    let raf = null;
    const update = () => {
      raf = null;
      const distance = scroller.scrollHeight - scroller.clientHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / distance)) : 0;
      bar.style.transform = `scaleX(${progress})`;
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [route]);

  return <div className="ed-scroll-progress" aria-hidden="true"><span ref={barRef} /></div>;
}

function RouteLoader({ label = "Loading interactive" }) {
  return <div className="route-loader" role="status"><span aria-hidden="true" /><p>{label}</p></div>;
}

// Each section brings its own palette: whichever tagged section has most
// recently crossed the middle of the screen sets the page's colour tokens,
// and :root eases between them. Leaving the home page clears them, and
// useRoutePalette sets the palette for the page being opened.
function useSectionPalette() {
  const { route } = useRoute();
  useEffect(() => {
    // MainDocument stays mounted through its exit animation, so key off the
    // route rather than mount state to let go as soon as it changes.
    if (route !== "main") return;
    const root = document.documentElement;
    let current = null;
    let raf = null;
    const update = () => {
      raf = null;
      const name = pickPalette(document.querySelectorAll("[data-palette]"), window.innerHeight * 0.5);
      if (name === current) return;
      current = name;
      applyPalette(root, name);
    };
    const onScroll = () => {
      if (raf === null) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
      clearPalette(root);
    };
  }, [route]);
}

const OPEN_SOURCE_SLUGS = new Set(OPEN_SOURCE_PROJECTS.map((p) => p.slug));
function useRoutePalette(route) {
  useEffect(() => {
    const name = paletteForRoute(route, OPEN_SOURCE_SLUGS);
    if (!name) return;
    const root = document.documentElement;
    applyPalette(root, name);
    return () => clearPalette(root);
  }, [route]);
}

function MainDocument({ bootDone, held, onBoot, heroRun }) {
  useSectionPalette();
  return (
    <>
      {/* A new run of the film sets the hero up again for its entrance. */}
      <Hero key={heroRun} ready={bootDone} hold={held} onReady={onBoot} />
      <ProjectsSection />
      <CapabilitiesSection />
      <MoreWorkSection />
      <PlaygroundSection />
      <ContactSection />
    </>
  );
}

// What each route shows. Takeover views fill the stage; the home page and
// the project pages scroll.
function RouteView({ route, bootDone, held, onBoot, heroRun }) {
  if (Storyboard && route === "storyboard") return <Suspense fallback={<RouteLoader label="Loading storyboard" />}><Storyboard /></Suspense>;
  if (Previs && route === "previs") return <Suspense fallback={<RouteLoader label="Loading pre-vis" />}><Previs /></Suspense>;
  if (route === "emet") return <Suspense fallback={<RouteLoader label="Loading Emet" />}><EmetSection /></Suspense>;
  if (route === "explore") return <Suspense fallback={<RouteLoader label="Loading solar system" />}><SolarSystemExplorer /></Suspense>;
  if (route === "work") return <Suspense fallback={<RouteLoader label="Loading work" />}><ProjectWorkPage /></Suspense>;
  if (route === "project/digital-double") return <Suspense fallback={<RouteLoader label="Loading 3D project" />}><DigitalDouble /></Suspense>;
  if (route === "project/haloscript") return <Suspense fallback={<RouteLoader label="Loading project" />}><HaloscriptPage /></Suspense>;
  if (route === "project/hedwig") return <Suspense fallback={<RouteLoader label="Loading project" />}><HedwigPage /></Suspense>;
  if (route.startsWith("project/")) return <Suspense fallback={<RouteLoader label="Loading project" />}><ProjectPage slug={route.slice("project/".length)} /></Suspense>;
  if (route === "lineage-demo") return <Suspense fallback={<RouteLoader label="Loading data explorer" />}><DataLineageExplorer /></Suspense>;
  if (route === "infinity") return <Suspense fallback={<RouteLoader label="Loading particle scene" />}><InfinityPage /></Suspense>;
  if (route === "digital-double") return <Suspense fallback={<RouteLoader label="Loading 3D project" />}><DigitalDouble /></Suspense>;
  return <MainDocument bootDone={bootDone} held={held} onBoot={onBoot} heroRun={heroRun} />;
}

/* The one scene change for every route. The incoming view fades in (project
   pages also rise a little); the outgoing one is simply replaced, so a route
   swap is a single synchronous step, which is what lets a view transition
   wrap it. The motion itself is CSS (.rt in showcase.css): it switches off
   during a view transition, which brings its own, and for reduced motion. */
const FULL_HEIGHT = new Set(["emet", "explore", "lineage-demo", "infinity", "digital-double"]);
function RouteTransition({ route, children }) {
  const kind = route === "main" ? "home" : route.startsWith("project/") || route === "work" ? "page" : "takeover";
  return <div key={route} className={`rt rt-${kind} ${FULL_HEIGHT.has(route) ? "h-[100dvh]" : ""}`}>{children}</div>;
}

function Stage({ bootDone, held, onBoot, heroRun }) {
  const { route } = useRoute();
  useRoutePalette(route);
  const { devMode, toggleDevMode } = useSandbox();

  // The document is the scroller. Full-screen views own the wheel (orbit
  // controls, the terminal), so smoothing is only on for pages that scroll.
  useEffect(() => {
    setSmoothScroll(!FULL_HEIGHT.has(route));
    if (route !== "main") scrollToTop({ instant: true });
  }, [route]);

  return (
    <main id="main-content" tabIndex={-1} className="relative min-h-[100dvh]">
      <RouteTransition route={route}><RouteView route={route} bootDone={bootDone} held={held} onBoot={onBoot} heroRun={heroRun} /></RouteTransition>
      {devMode && <Suspense fallback={null}><SandboxStubs onClose={toggleDevMode} /></Suspense>}
    </main>
  );
}

// The explorer is content (like EMET), not backdrop — it needs to
// capture drag/scroll/pinch itself for orbit controls, which a fixed
// z-0 layer sitting *behind* Stage's scrollable <main> can't reliably
// do. So on that route the backdrop is just a plain matching fill;
// SolarSystemExplorer renders its own full 3D scene inside Stage
// instead.
function Backdrop() {
  const { route } = useRoute();
  if (route === "emet") {
    return (
      <Suspense fallback={<div className="fixed inset-0 z-0 bg-[#04120a]" aria-hidden="true" />}>
        <MatrixBackground />
      </Suspense>
    );
  }
  if (route === "explore" || route === "lineage-demo" || route === "infinity") {
    return <div className="fixed inset-0 z-0 bg-[#02050c]" aria-hidden="true" />;
  }
  if (route === "digital-double") {
    return <div className="fixed inset-0 z-0 bg-[#050506]" aria-hidden="true" />;
  }
  // Everything else sits on flat ink: sections paint their own full-bleed
  // color blocks, and the infinity loop has its own page (#infinity).
  return <div className="fixed inset-0 z-0 bg-ink" aria-hidden="true" />;
}

// BB-8 brings three.js with it, the heaviest chunk on the page. Waiting for
// the browser to go idle after the intro keeps it out of the first paint.
// The companion pulls in three.js, the heaviest thing on the page. Waiting
// for the visitor's first scroll, tap or key (then an idle moment) keeps it
// off the first load, and off quick bounces entirely. It only appears a few
// seconds in anyway, so nobody sees the difference.
const FIRST_INPUT_EVENTS = ["pointerdown", "pointermove", "wheel", "touchstart", "keydown", "scroll"];
function useIdleAfterFirstInput(ready) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if (!ready) return undefined;
    let idleId = 0;
    let timer = 0;
    const listen = { passive: true, capture: true };
    const start = () => {
      FIRST_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, start, listen));
      if ("requestIdleCallback" in window) idleId = window.requestIdleCallback(() => setIdle(true), { timeout: 2500 });
      else timer = setTimeout(() => setIdle(true), 600);
    };
    FIRST_INPUT_EVENTS.forEach((name) => window.addEventListener(name, start, listen));
    return () => {
      FIRST_INPUT_EVENTS.forEach((name) => window.removeEventListener(name, start, listen));
      if (idleId) window.cancelIdleCallback(idleId);
      clearTimeout(timer);
    };
  }, [ready]);
  return idle;
}

// The droid stays off the pre-vis pages: they are a work surface, and it
// would sit on top of the frame being judged.
function Companion() {
  const { route } = useRoute();
  // On a phone there is no room beside the content: the droid and its
  // speech bubble would sit on top of the headings and the film's cards.
  const [narrow] = useState(() => window.matchMedia("(max-width: 760px)").matches);
  if (PREVIS.includes(route) || narrow) return null;
  return <Suspense fallback={null}><BB8Companion /></Suspense>;
}

function AppShell({ bootDone, held, onBoot, heroRun }) {
  const companionReady = useIdleAfterFirstInput(bootDone);
  return (
      <RouteProvider>
        <div className="relative bg-ink text-slate-100 min-h-[100dvh]">
          <Backdrop />
          <div className="relative z-10">
            <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to main content</a>
            <Nav booting={!bootDone} />
            <ScrollProgress />
            {SHOW_SWATCH && <PaletteSwatch />}
            <HomeCursor />
            {companionReady && <Companion />}
            {/* No page-level `perspective` here on purpose: setting it on an
                ancestor this high up turns it into the CSS containing block
                for every `position: fixed` descendant (modals, overlays)
                anywhere in the tree, breaking their viewport-relative
                positioning. Each 3D component (deck cards, emet's chassis,
                project cards) establishes its own local perspective instead. */}
            <Stage bootDone={bootDone} held={held} onBoot={onBoot} heroRun={heroRun} />
            <CommandPalette />
          </div>
        </div>
      </RouteProvider>
  );
}

/* ============================================================
   ERROR BOUNDARY — a visible fallback instead of a blank screen if
   anything in the tree throws during render.
   ============================================================ */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.headingRef = createRef();
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    console.error("Portfolio crashed:", error);
    // This replaces the whole shell, router included, so nothing else is left
    // to move focus. Without this the message is never announced.
    requestAnimationFrame(() => {
      const heading = this.headingRef.current;
      if (!heading) return;
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ink text-slate-100 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <p className="font-mono text-[.7rem] uppercase tracking-[.14em] text-rose mb-3">
              something broke
            </p>
            <h1 ref={this.headingRef} className="font-display text-2xl font-semibold mb-3">This page hit an error</h1>
            <p className="text-slate-400 text-sm mb-6">
              Try reloading. If it keeps happening, the contact details still work.
            </p>
            <a
              href="mailto:mohamedansarkms@gmail.com"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gradient-to-r from-coral to-[#f7b598] text-aubergine text-[.8rem] font-bold"
            >
              mohamedansarkms@gmail.com
            </a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* The cold open's place in the app. Until its code arrives the screen is
   plain black (which is also the film's first beat). If the code is slow or
   fails, or WebGL gives up, the page is simply shown: the opening is a
   flourish, never a gate. */
// When it is forced on the dev server (tests, review) it waits longer, so a
// busy machine still gets to see it.
const COLD_OPEN_PATIENCE_MS = coldOpenForced() ? 15000 : 4500;
class ColdOpenBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}
function ColdOpenLayer({ mode, onStarted, onHandOver, onDone }) {
  const [since] = useState(() => performance.now());
  const started = useRef(false);
  const abandon = useCallback(() => { onHandOver(); onDone(); }, [onHandOver, onDone]);
  useEffect(() => {
    const timer = setTimeout(() => { if (!started.current) { if (import.meta.env.DEV) console.warn("cold open: gave up waiting for its code"); abandon(); } }, COLD_OPEN_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, [abandon]);
  const onStart = useCallback(() => { started.current = true; onStarted?.(); }, [onStarted]);
  return <ColdOpenBoundary onFail={abandon}>
    <Suspense fallback={null}>
      <ColdOpen mode={mode} since={since} onStart={onStart} onHandOver={onHandOver} onDone={onDone} />
    </Suspense>
  </ColdOpenBoundary>;
}


// The studio ident, before the cold open.
const IDENT_MS = 1200;

/* The film's place in the app, start to end:
     ident     a first visit opens on the film, playing on its own: the
               studio ident over black (FilmIdent), its sound waiting for
               the visitor's first tap
     cold open its own layer (ColdOpen), its short cut: the network
               becoming the name, built on the hero's
     acts      the film player (FilmPlayer), over the page, on one clock: a
               trailer cut of the acts, under 30 seconds in all
     the page  an ordinary page to scroll, with "Watch the film" in the nav
               and the hero to play it again
   A big skip button (FilmSkip) is up the whole time, and so is Escape.
   The hero's entrance plays as the cold open lifts. Until it hands over,
   `bootDone` is false: the nav stays out of the way and the companion does
   not load. `held` keeps the entrance waiting, with the name set large
   mid-screen for the cold open to build on. */
export default function App() {
  const [autoplay] = useState(() => readRoute() === "main" && filmAutoplayWanted());
  // The ident over the page until the cold open's first frame.
  const [cover, setCover] = useState(autoplay);
  const [bootDone, setBootDone] = useState(() => !autoplay && !(shouldPlayIntro() && readRoute() === "main"));
  const onBoot = useCallback(() => setBootDone(true), []);
  const [held, setHeld] = useState(autoplay);
  const [heroRun, setHeroRun] = useState(0);
  // Each start of the film is a new take: its layers mount fresh for it.
  const [take, setTake] = useState(autoplay ? 1 : 0);
  const [filmUp, setFilmUp] = useState(autoplay);
  const [coldOpenUp, setColdOpenUp] = useState(false);
  const [rolling, setRolling] = useState(false);
  const running = useRef(false);
  const coldOpenStarted = useRef(false);
  const identTimer = useRef(0);
  useEffect(() => { running.current = filmUp; }, [filmUp]);

  // What starting the film sets going outside React. `chosen`: the visitor
  // pressed something to start it, which lets the sound start now;
  // otherwise it waits for their first tap. The cold open comes on after
  // the ident.
  const roll = useCallback((chosen) => {
    if (chosen) setSound(true); else armSound();
    loadFilmPlayer().catch(() => {});
    import("./film/ColdOpen").catch(() => {});
    try { window.sessionStorage.setItem(COLD_OPEN_SESSION_KEY, "1"); } catch { /* not remembered */ }
    coldOpenStarted.current = false;
    clearTimeout(identTimer.current);
    identTimer.current = setTimeout(() => setColdOpenUp(true), IDENT_MS);
  }, []);
  const start = useCallback(() => {
    roll(true);
    setCover(true);
    setRolling(false);
    setColdOpenUp(false);
    setFilmUp(true);
    setTake((n) => n + 1);
  }, [roll]);
  const onStarted = useCallback(() => { coldOpenStarted.current = true; setTimeout(() => setCover(false), 250); }, []);
  const release = useCallback(() => {
    setCover(false);
    setHeld(false);
    // The player takes over on the cold open's last frame: Act I opens on
    // the same shot, so the cut is invisible.
    if (running.current) setRolling(true);
  }, []);
  const closeColdOpen = useCallback(() => setColdOpenUp(false), []);
  const endFilm = useCallback(() => { setFilmUp(false); setRolling(false); }, []);
  const skipFilm = useCallback(() => {
    clearTimeout(identTimer.current);
    endFilm();
    setCover(false);
    // A cold open on screen fades itself out and hands over to the hero;
    // one that has not started yet is simply not shown.
    if (coldOpenStarted.current) window.dispatchEvent(new Event(SKIP_FILM));
    else { setColdOpenUp(false); setHeld(false); }
  }, [endFilm]);

  // The film plays as a first visit lands.
  useEffect(() => { if (autoplay) roll(false); }, [autoplay, roll]);
  useEffect(() => () => clearTimeout(identTimer.current), []);

  // Escape skips, from anywhere in the film.
  useEffect(() => {
    if (!filmUp) return undefined;
    const onKey = (event) => { if (event.key === "Escape") skipFilm(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filmUp, skipFilm]);

  // "Watch the film", from the nav or the hero: back to the top, the hero
  // set up again for its entrance, and the film from the start.
  useEffect(() => {
    const watch = () => {
      if (running.current || !filmEnabled()) return;
      scrollToTop({ instant: true });
      setBootDone(false);
      setHeld(true);
      setHeroRun((n) => n + 1);
      start();
    };
    window.addEventListener(WATCH_FILM, watch);
    return () => window.removeEventListener(WATCH_FILM, watch);
  }, [start]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <SandboxProvider>
          <AppShell bootDone={bootDone} held={held} onBoot={onBoot} heroRun={heroRun} />
          {filmUp && <ColdOpenBoundary key={`film-${take}`} onFail={endFilm}><Suspense fallback={null}>
            <FilmPlayer rolling={rolling} onEnd={endFilm}>{(playback) => <FilmReel playback={playback} />}</FilmPlayer>
          </Suspense></ColdOpenBoundary>}
          {coldOpenUp && <ColdOpenLayer key={`co-${take}`} mode="short" onStarted={onStarted} onHandOver={release} onDone={closeColdOpen} />}
          {cover && <FilmIdent />}
          {filmUp && <FilmSkip onSkip={skipFilm} />}
        </SandboxProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
