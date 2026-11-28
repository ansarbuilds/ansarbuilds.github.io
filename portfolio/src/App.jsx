import { Component, createRef, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import Home from "./components/Home";
import Field from "./components/Field";
import Intro from "./components/Intro";
import CommandPalette from "./components/CommandPalette";
import { introWanted } from "./lib/intro";
import { chooseTheme, currentTheme, followSystem } from "./lib/theme";
import { runRouteChange } from "./lib/routeTransition";
import { parseTarget, pathForRoute, readLocation, urlForTarget } from "./lib/routes";
import { titleForRoute } from "./lib/routeTitle";
import { isListed, PERSON } from "./data/site";
import { RouteContext, useRoute } from "./appContexts";
import { scrollToElement, scrollToTop } from "./lib/scroll";
import "./site.css";

// Only the home page ships in the first load; every other view arrives
// when it is opened.
const CaseStudy = lazy(() => import("./components/CaseStudy"));
const ProjectWorkPage = lazy(() => import("./components/ProjectWorkPage"));
// Pages for projects that are no longer listed keep their original design.
const ProjectPage = lazy(() => import("./components/ProjectPage"));
const HedwigPage = lazy(() => import("./components/HedwigPage"));
const DataLineageExplorer = lazy(() => import("./components/DataLineageExplorer"));

/* ============================================================
   ROUTER: every view has its own URL (see lib/routes.js). "main" is the
   home page, one scrolled document, so a link to one of its sections
   scrolls to that id. Project pages live at /work/<slug>/. Links are
   ordinary <a href>; one click handler turns the in-app ones into history
   changes so the page never reloads.
   ============================================================ */
function readRoute() {
  if (typeof window === "undefined") return "main";
  return readLocation().route;
}

// Coming back from a project page, the home page mounts a moment later, so
// keep looking for the section for a few frames.
function scrollToSection(id, tries = 60) {
  requestAnimationFrame(() => {
    const el = document.getElementById(id);
    if (el) scrollToElement(el);
    else if (tries > 0) scrollToSection(id, tries - 1);
  });
}

function RouteProvider({ children }) {
  const [route, setRoute] = useState(readRoute);
  const first = useRef(true);
  const shownRoute = useRef(route);
  const leavingHeading = useRef(null);
  const homeScroll = useRef(0);

  const sync = useCallback(({ restore = false } = {}) => {
    const { route: next, section, legacy } = readLocation();
    if (legacy) window.history.replaceState(null, "", pathForRoute(next));
    const from = shownRoute.current;
    if (next !== from) {
      if (from === "main") homeScroll.current = window.scrollY;
      shownRoute.current = next;
      leavingHeading.current = document.querySelector("main h1, main h2");
      runRouteChange({
        apply: () => {
          setRoute(next);
          if (next === "main" && !section && restore) requestAnimationFrame(() => window.scrollTo({ top: homeScroll.current, behavior: "instant" }));
          else if (!section) window.scrollTo({ top: 0, behavior: "instant" });
        },
      });
    }
    if (next === "main" && section) scrollToSection(section);
  }, []);

  const go = useCallback((href) => {
    const target = parseTarget(href);
    if (!target) { window.location.assign(href); return; }
    const here = shownRoute.current;
    if (here !== "main" && target.route === "main" && target.section) {
      const local = document.getElementById(target.section);
      if (local) { scrollToElement(local); return; }
    }
    const url = urlForTarget(target);
    if (url !== window.location.pathname + window.location.hash) window.history.pushState(null, "", url);
    sync();
  }, [sync]);

  useEffect(() => {
    const onPop = () => sync({ restore: true });
    const onHashChange = (event) => { if (event.isTrusted) sync(); };
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target.closest?.("a[href]");
      if (!link || link.namespaceURI !== "http://www.w3.org/1999/xhtml" || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!parseTarget(href)) return;
      event.preventDefault();
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

  // First load: rewrite an old hash link, and go to a section named in the URL.
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    const { route: initial, section, legacy } = readLocation();
    if (legacy) window.history.replaceState(null, "", pathForRoute(initial));
    if (initial === "main" && section) scrollToSection(section);
  }, []);

  // Each view gets its own title, canonical URL and robots rule, and focus
  // moves to its heading so the change is announced.
  useEffect(() => {
    document.title = titleForRoute(route);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", `https://ansarbuilds.dev${pathForRoute(route)}`);
    const slug = route.startsWith("project/") ? route.slice("project/".length) : null;
    let robots = document.querySelector('meta[name="robots"]');
    if (slug && !isListed(slug)) {
      if (!robots) { robots = Object.assign(document.createElement("meta"), { name: "robots" }); document.head.append(robots); }
      robots.setAttribute("content", "noindex");
    } else robots?.remove();
    if (first.current) { first.current = false; return; }
    if (route === "main") return;
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
      if (tries-- > 0) requestAnimationFrame(focusIncoming);
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

const PALETTE_KEY = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl";
const SECTIONS = [["#about", "About"], ["#now", "Now"], ["#shipped", "Shipped"], ["/work/", "Work"]];

function ThemeToggle() {
  const [theme, setTheme] = useState(() => (typeof document === "undefined" ? "light" : currentTheme()));
  useEffect(() => {
    const stop = followSystem();
    const watch = new MutationObserver(() => setTheme(currentTheme()));
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => { stop(); watch.disconnect(); };
  }, []);
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button type="button" className="ab-icon-btn" onClick={() => chooseTheme(next)} aria-label={`Switch to ${next} mode`} title={`Switch to ${next} mode`}>
      {theme === "dark" ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  );
}

function Nav() {
  const { navigate } = useRoute();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", close); };
  }, [menuOpen]);
  const openPalette = () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
  return (
    <nav className={`ab-nav ${scrolled ? "is-scrolled" : ""}`} aria-label="Main navigation">
      <div className="ab-wrap ab-nav-inner">
        <a href="/" className="ab-mark" onClick={(event) => { event.preventDefault(); navigate("deck"); }}>
          <span className="ab-mark-sym" aria-hidden="true">MA</span><span>Mohamed Ansar</span>
        </a>
        <div className="ab-nav-links">{SECTIONS.map(([href, label]) => <a key={href} href={href === "/work/" ? href : `/${href}`}>{label}</a>)}</div>
        <span className="ab-menu" ref={menuRef}>
          <button type="button" className="ab-icon-btn" aria-expanded={menuOpen} aria-controls="nav-menu" onClick={() => setMenuOpen((open) => !open)}>Menu</button>
          {menuOpen && (
            <span id="nav-menu" className="ab-menu-list" onClick={() => setMenuOpen(false)}>
              {SECTIONS.map(([href, label]) => <a key={href} href={href === "/work/" ? href : `/${href}`}>{label}</a>)}
              <a href="/#contact">Contact</a>
            </span>
          )}
        </span>
        <ThemeToggle />
        <button type="button" onClick={openPalette} className="ab-icon-btn ab-kbd-btn" aria-label={`${PALETTE_KEY} K, open the command palette`}><kbd>{PALETTE_KEY} K</kbd></button>
        <a href="/#contact" className="ab-nav-cta">Say hi</a>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="ab-foot">
      <div className="ab-wrap">
        <p>© {new Date().getFullYear()} {PERSON.name}. Designed and built by me, with AI as the pair programmer.</p>
        <nav aria-label="Footer">
          <a href="/work/">All work</a>
          <a href={`mailto:${PERSON.email}`}>Email</a>
          <a href={PERSON.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={PERSON.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </nav>
      </div>
    </footer>
  );
}

function RouteLoader() {
  return <div className="ab-wrap" role="status" style={{ minHeight: "100dvh" }}><span className="sr-only">Loading</span></div>;
}

function RouteView({ route, arriving }) {
  if (route === "work") return <ProjectWorkPage />;
  if (route.startsWith("project/")) {
    const slug = route.slice("project/".length);
    if (isListed(slug)) return <CaseStudy slug={slug} />;
    if (slug === "hedwig") return <div className="legacy"><HedwigPage /></div>;
    return <div className="legacy"><ProjectPage slug={slug} /></div>;
  }
  if (route === "lineage-demo") return <div className="legacy h-[100dvh]"><DataLineageExplorer /></div>;
  return <Home arriving={arriving} />;
}

function Stage({ arriving }) {
  const { route } = useRoute();
  return (
    <main id="main-content" tabIndex={-1} className="ab-page">
      <div key={route} className="ab-route">
        <Suspense fallback={<RouteLoader />}><RouteView route={route} arriving={arriving} /></Suspense>
      </div>
    </main>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.headingRef = createRef();
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error) {
    console.error("Portfolio crashed:", error);
    requestAnimationFrame(() => this.headingRef.current?.focus({ preventScroll: true }));
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="ab-wrap" style={{ minHeight: "100dvh", display: "grid", placeContent: "center", textAlign: "center", gap: 14 }}>
        <p className="ab-kicker" style={{ justifyContent: "center" }}>Something broke</p>
        <h1 ref={this.headingRef} tabIndex={-1} className="ab-title-l">This page hit an error.</h1>
        <p className="ab-copy" style={{ margin: "0 auto" }}>Try reloading. If it keeps happening, email works: <a href={`mailto:${PERSON.email}`}>{PERSON.email}</a></p>
      </div>
    );
  }
}

export default function App() {
  const [intro, setIntro] = useState(() => {
    const wanted = readRoute() === "main" && introWanted();
    // Hide the page before the first paint, not after it.
    if (wanted) document.documentElement.classList.add("ab-intro-on");
    return wanted;
  });
  const [arriving, setArriving] = useState(false);
  useEffect(() => {
    document.body.classList.add("ab-body");
    document.documentElement.classList.toggle("ab-intro-on", intro);
  }, [intro]);
  const endIntro = useCallback(() => { setIntro(false); setArriving(true); }, []);
  return (
    <ErrorBoundary>
      <Field />
      <RouteProvider>
        <div className="ab-shell">
          <a className="ab-skip" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>Skip to main content</a>
          <Nav />
          <Stage arriving={arriving} />
          <Footer />
          <CommandPalette />
        </div>
      </RouteProvider>
      {intro && <Intro onDone={endIntro} />}
    </ErrorBoundary>
  );
}
