/*
 * Shared behaviour for every page:
 * - light / dark toggle (remembered per browser)
 * - collection lookup from ?c=<slug> and its accent colour
 *
 * The saved theme is applied by a one-line script in each page's <head>
 * so the page never flashes the wrong colours.
 */
const Site = (() => {
  const cfg = window.SITE_CONFIG || {};
  const root = document.documentElement;

  // ---- theme ----
  function setTheme(theme, save = true) {
    root.dataset.theme = theme;
    if (save) try { localStorage.setItem("theme", theme); } catch (_) {}
    const btn = document.getElementById("theme-toggle");
    if (btn) btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (cfg.siteName) document.querySelectorAll("[data-site-name]").forEach((el) => (el.textContent = cfg.siteName));
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;
    setTheme(root.dataset.theme || "dark", false);
    btn.addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
  });

  // ---- collections ----
  function collection() {
    const slug = new URLSearchParams(location.search).get("c");
    const list = cfg.collections || [];
    return list.find((c) => c.slug === slug) || list[0] || null;
  }

  function applyAccent(c) {
    if (!c || !c.accent) return;
    root.dataset.accent = c.slug;
    root.style.setProperty("--accent-dark", c.accent.dark);
    root.style.setProperty("--accent-light", c.accent.light || c.accent.dark);
  }

  const pad = (n) => String(n).padStart(2, "0");

  return { collection, applyAccent, pad, config: cfg };
})();
