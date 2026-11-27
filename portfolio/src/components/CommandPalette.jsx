import { DUR, EASE } from "../lib/motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, CornerDownLeft, ArrowUp, ArrowDown, X, Hash, Link2, Terminal, Sparkles } from "lucide-react";
import { COMMAND_ITEMS } from "../data/content";
import { LISTED_PROJECTS } from "../data/projectIndex";
import { FLAGSHIPS } from "../data/showcase";
import { useRoute, useSandbox } from "../appContexts";

const GROUP_ICONS = { Sections: Hash, Projects: Hash, Playground: Sparkles, Links: Link2, System: Terminal };
const GROUP_ORDER = ["Sections", "Projects", "Playground", "Links", "System"];
const CORAL = "#a8323c";

// Every listed project, flagships first in stage order, each with its stage
// eyebrow (or its kind) so a search for "agent" or "app" finds it.
const PROJECT_ITEMS = [
  ...FLAGSHIPS.map((flag) => [flag, LISTED_PROJECTS.find((p) => p.slug === flag.slug)]),
  ...LISTED_PROJECTS.filter((p) => !FLAGSHIPS.some((flag) => flag.slug === p.slug)).map((p) => [null, p]),
].filter(([, project]) => project).map(([flag, project]) => ({
  label: `${project.title} · ${flag?.eyebrow || project.kind}`,
  go: `/work/${project.slug}/`,
  group: "Projects",
}));

// A tool for working on the site, not for visitors: the dev server only.
const SYSTEM_ITEMS = import.meta.env.DEV ? [{ label: "Toggle dev_mode · sandbox stubs", action: "toggle-sandbox", group: "System" }] : [];

const ALL_ITEMS = [...COMMAND_ITEMS, ...PROJECT_ITEMS, ...SYSTEM_ITEMS]
  .sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));

/**
 * Global ⌘K / Ctrl+K command palette.
 *
 * A combobox: focus stays in the search box, the arrow keys move the
 * highlighted result, and a screen reader hears it (aria-activedescendant).
 * Tab stays inside the dialog, and closing hands focus back to whatever had
 * it before.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const closeRef = useRef(null);
  const listRef = useRef(null);
  const returnTo = useRef(null);
  const { toggleDevMode } = useSandbox();
  const { navigate } = useRoute();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(q)) : ALL_ITEMS;
  }, [query]);

  // Global shortcut listener: meta+k / ctrl+k toggles, Escape closes.
  useEffect(() => {
    function onKeyDown(e) {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        if (!open) {
          returnTo.current = document.activeElement;
          setQuery("");
          setActiveIndex(0);
        }
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Focus the search box on open; give focus back on close.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
    const back = returnTo.current;
    returnTo.current = null;
    if (back && back.isConnected && typeof back.focus === "function") back.focus({ preventScroll: true });
    return undefined;
  }, [open]);

  // Keep the highlighted result in view as the arrow keys move it.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`#cp-opt-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function runItem(item) {
    if (!item) return;
    // Navigating moves focus to the new place; don't pull it back.
    returnTo.current = null;
    if (item.action === "toggle-sandbox") toggleDevMode();
    else if (item.go) navigate(item.go);
    else if (item.href) window.open(item.href, item.href.startsWith("mailto:") ? "_self" : "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function onKeyDownList(e) {
    const last = results.length - 1;
    const move = { ArrowDown: (i) => Math.min(i + 1, last), ArrowUp: (i) => Math.max(i - 1, 0), Home: () => 0, End: () => last }[e.key];
    if (move) {
      // Home and End keep their usual meaning inside the text while typing.
      if ((e.key === "Home" || e.key === "End") && query) return;
      e.preventDefault();
      setActiveIndex(move);
    } else if (e.key === "Enter") {
      e.preventDefault();
      runItem(results[activeIndex]);
    }
  }

  // Tab and Shift+Tab move between the search box and the close button only.
  function onKeyDownDialog(e) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    (document.activeElement === inputRef.current ? closeRef.current : inputRef.current)?.focus();
  }

  const grouped = useMemo(() => {
    const groups = {};
    results.forEach((item, i) => {
      const key = item.group || "Other";
      (groups[key] ||= []).push({ ...item, _index: i });
    });
    return groups;
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DUR.instant }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="w-full max-w-xl overflow-hidden border border-black bg-[#f8f6f4] text-black shadow-[8px_8px_0_#000]"
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: DUR.fast, ease: EASE.out }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={onKeyDownDialog}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-dashed border-black/35 bg-white">
              <Search size={16} className="shrink-0" style={{ color: CORAL }} aria-hidden="true" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDownList}
                role="combobox"
                aria-expanded="true"
                aria-controls="cp-list"
                aria-autocomplete="list"
                aria-activedescendant={results.length ? `cp-opt-${activeIndex}` : undefined}
                aria-label="Search sections, projects and links"
                placeholder="Jump to a section, project or link…"
                className="flex-1 bg-transparent outline-none text-sm font-mono text-black placeholder:text-[#545454]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close command palette"
                className="grid h-8 w-8 place-items-center border border-black bg-[#eceae8] text-black hover:bg-[#e1dfdd] transition-colors"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <div ref={listRef} id="cp-list" role="listbox" aria-label="Results" className="max-h-[50vh] overflow-y-auto mono-scroll py-2">
              {results.length === 0 && (
                <p role="presentation" className="px-4 py-6 text-center text-sm text-[#545454] font-mono">No matches.</p>
              )}
              {Object.entries(grouped).map(([groupName, items]) => {
                const GroupIcon = GROUP_ICONS[groupName];
                return (
                  <div key={groupName} role="group" aria-labelledby={`cp-group-${groupName}`} className="mb-1">
                    <p id={`cp-group-${groupName}`} className="flex items-center gap-1.5 px-4 pt-2 pb-1 text-[.66rem] tracking-[.14em] uppercase text-[#545454] font-mono">
                      {GroupIcon && <GroupIcon size={10} className="opacity-70" aria-hidden="true" />}
                      {groupName}
                    </p>
                    {items.map((item) => {
                      const active = item._index === activeIndex;
                      return (
                        <div
                          key={item.label}
                          id={`cp-opt-${item._index}`}
                          role="option"
                          aria-selected={active}
                          onMouseEnter={() => setActiveIndex(item._index)}
                          // Keep focus in the search box while clicking.
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => runItem(item)}
                          className={`relative w-full flex cursor-pointer items-center justify-between gap-3 pl-4 pr-4 py-2.5 text-left text-sm transition-colors ${
                            active ? "bg-[#eceae8] font-semibold" : "text-black hover:bg-[#eceae8]/70"
                          }`}
                          style={active ? { color: CORAL } : undefined}
                        >
                          <span
                            className={`absolute left-0 top-1 bottom-1 w-[3px] transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                            style={{ background: "#e57981" }}
                            aria-hidden="true"
                          />
                          <span className="font-mono">{item.label}</span>
                          {active && <CornerDownLeft size={13} className="shrink-0" aria-hidden="true" />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4 px-4 py-2.5 border-t border-dashed border-black/35 bg-white text-[.66rem] font-mono text-[#545454]" aria-hidden="true">
              <span className="flex items-center gap-1">
                <ArrowUp size={11} />
                <ArrowDown size={11} /> navigate
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft size={11} /> select
              </span>
              <span className="ml-auto">esc to close</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
