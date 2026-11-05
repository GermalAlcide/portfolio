/* Gallery index: a centred list of every collection in config.js. */
(() => {
  const list = document.getElementById("list");
  const total = document.getElementById("total");
  const collections = Site.config.collections || [];

  total.textContent = `${Site.pad(collections.length)} total`;

  if (!collections.length) {
    list.outerHTML = '<p class="status label">No collections yet.</p>';
    return;
  }

  const arrow = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 11L11 3M4.5 3H11v6.5"/></svg>';

  collections.forEach((c, i) => {
    const li = document.createElement("li");
    li.className = "collection";
    if (c.accent) {
      li.style.setProperty("--c-accent-dark", c.accent.dark);
      li.style.setProperty("--c-accent-light", c.accent.light || c.accent.dark);
    }

    const a = document.createElement("a");
    a.className = "collection__link";
    a.href = `collection.html?c=${encodeURIComponent(c.slug)}`;
    a.innerHTML = `
      <span class="collection__num label">${Site.pad(i + 1)}</span>
      <div>
        <h2 class="collection__title display"></h2>
        <span class="collection__meta label">Summoning photos…</span>
      </div>
      <span class="arrow-box">${arrow}</span>`;
    a.querySelector(".collection__title").textContent = c.title;
    li.append(a);
    list.append(li);

    // Photo count from the full-gallery folder.
    const meta = a.querySelector(".collection__meta");
    Photos.load(c.galleryFolderId)
      .then((p) => (meta.textContent = p.length ? `${p.length} photograph${p.length === 1 ? "" : "s"}` : "Coming soon"))
      .catch(() => (meta.textContent = ""));
  });
})();
