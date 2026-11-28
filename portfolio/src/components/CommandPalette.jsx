import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft, ArrowUp, ArrowDown, X } from "lucide-react";
import { LISTED_PROJECTS } from "../data/projectIndex";
import { PERSON } from "../data/site";
import { useRoute } from "../appContexts";

const GROUP_ORDER = ["Sections", "Projects", "Links"];

const SECTION_ITEMS = [
  { label: "Who I am", go: "#about", group: "Sections" },
  { label: "Now · what I'm building", go: "#now", group: "Sections" },
  { label: "Shipped work", go: "#shipped", group: "Sections" },
  { label: "More shipped work", go: "#more", group: "Sections" },
  { label: "How I work", go: "#how", group: "Sections" },
  { label: "Contact", go: "#contact", group: "Sections" },
  { label: "All work, in one list", go: "/work/", group: "Sections" },
];

// Every listed project, with its kind so a search for "app" or "AI" finds it.
const PROJECT_ITEMS = LISTED_PROJECTS.map((project) => ({ label: `${project.title} · ${project.kind}`, go: `/work/${project.slug}/`, group: "Projects" }));

const LINK_ITEMS = [
  { label: "Haloscript on the App Store", href: "https://apps.apple.com/ca/app/haloscript/id6820670080", group: "Links" },
  { label: "saywhen on GitHub", href: "https://github.com/ansarbuilds/saywhen", group: "Links" },
  { label: "Agent Flight Recorder on PyPI", href: "https://pypi.org/project/flightrecorder-ai/", group: "Links" },
  { label: "Sirius demo on Hugging Face", href: "https://huggingface.co/spaces/ansarbuilds/sirius-demo", group: "Links" },
  { label: "GitHub", href: PERSON.github, group: "Links" },
  { label: "LinkedIn", href: PERSON.linkedin, group: "Links" },
  { label: "Email · " + PERSON.email, href: "mailto:" + PERSON.email, group: "Links" },
];

const ALL_ITEMS = [...SECTION_ITEMS, ...PROJECT_ITEMS, ...LINK_ITEMS]
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
    if (item.go) navigate(item.go);
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

  if (!open) return null;
  return (
    <div className="ab-cp-scrim" onClick={() => setOpen(false)}>
      <div className="ab-cp" onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDownDialog} role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="ab-cp-search">
          <Search size={16} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={onKeyDownList}
            role="combobox"
            aria-expanded="true"
            aria-controls="cp-list"
            aria-autocomplete="list"
            aria-activedescendant={results.length ? `cp-opt-${activeIndex}` : undefined}
            aria-label="Search sections, projects and links"
            placeholder="Jump to a section, project or link…"
            autoComplete="off"
            spellCheck={false}
          />
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close command palette" className="ab-icon-btn"><X size={15} aria-hidden="true" /></button>
        </div>
        <div ref={listRef} id="cp-list" role="listbox" aria-label="Results" className="ab-cp-list">
          {results.length === 0 && <p role="presentation" className="ab-cp-empty">No matches.</p>}
          {Object.entries(grouped).map(([groupName, items]) => (
            <div key={groupName} role="group" aria-labelledby={`cp-group-${groupName}`}>
              <p id={`cp-group-${groupName}`} className="ab-cp-group">{groupName}</p>
              {items.map((item) => {
                const active = item._index === activeIndex;
                return (
                  <div
                    key={item.label}
                    id={`cp-opt-${item._index}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setActiveIndex(item._index)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runItem(item)}
                    className={`ab-cp-item ${active ? "is-active" : ""}`}
                  >
                    <span>{item.label}</span>
                    {active && <CornerDownLeft size={13} aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="ab-cp-foot" aria-hidden="true">
          <span><ArrowUp size={11} /><ArrowDown size={11} /> navigate</span>
          <span><CornerDownLeft size={11} /> select</span>
          <span style={{ marginLeft: "auto" }}>esc to close</span>
        </div>
      </div>
    </div>
  );
}
