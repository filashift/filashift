const KEY = "filashift-theme";

export function initialDark(): boolean {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored === "dark";
  } catch { /* Use device preference when storage is unavailable. */ }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function chooseDark(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem(KEY, dark ? "dark" : "light"); }
  catch { /* The choice still applies for this page. */ }
}
