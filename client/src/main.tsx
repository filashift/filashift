import { PATH_LANG, startDomTranslator } from "./lib/i18n";
import "./lib/es-patterns";
import "./lib/de-patterns";
import "./lib/fr-patterns";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PATH_ROUTING } from "./routing";
import { initialDark } from "./lib/theme";

if (PATH_ROUTING) {
  // old hash links such as /#/filament move to the real path
  const fromHash = () => {
    if (location.pathname === "/" && ["#faq", "#guides"].includes(location.hash)) {
      window.history.replaceState(null, "", "/" + location.hash.slice(1) + location.search);
      return true;
    }
    const m = window.location.hash.match(/^#(\/[^?#]*)/);
    if (!m) return false;
    window.history.replaceState(null, "", m[1]);
    return true;
  };
  fromHash();
  window.addEventListener("hashchange", () => {
    if (fromHash()) window.dispatchEvent(new PopStateEvent("popstate"));
  });
} else if (!window.location.hash) {
  // a prerendered /de/… page opened on a hash-routed host keeps its language prefix in the hash route
  window.location.hash = PATH_LANG ? `#/${PATH_LANG}/` : "#/";
}
document.documentElement.classList.toggle("dark", initialDark());

// installable app: only on the real site (not previews or local files)
if ("serviceWorker" in navigator && location.protocol === "https:" && /(^|\.)filashift\.com$/.test(location.hostname)) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}

createRoot(document.getElementById("root")!).render(<App />);
startDomTranslator();
