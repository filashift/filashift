import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PATH_ROUTING } from "./routing";

if (PATH_ROUTING) {
  // old hash links such as /#/filament move to the real path
  const fromHash = () => {
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
  window.location.hash = "#/";
}
if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
