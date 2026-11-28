/* Light and dark. The page follows the system until the visitor picks one
   with the toggle; that choice is remembered on this device. index.html
   sets data-theme before the first paint (the same rule as here), so the
   page never flashes the wrong colours. */

export const THEME_KEY = "theme";
const COLORS = { light: "#f3f2ee", dark: "#07080c" };

export function storedTheme() {
  try { return window.localStorage.getItem(THEME_KEY); } catch { return null; }
}

export function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLORS[theme]);
}

export function chooseTheme(theme) {
  applyTheme(theme);
  try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* this visit only */ }
}

// Follow the system while the visitor has not chosen.
export function followSystem() {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => { if (!storedTheme()) applyTheme(systemTheme()); };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
