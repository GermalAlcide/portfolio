/*
 * Full gallery for one collection: gallery.html?c=<slug>
 * Every photo in the collection's "Gallery" folder, in folder order.
 * Tiles are added in batches as you scroll, so big galleries open quickly.
 * Lightbox: ← → keys, swipe, Esc, and a Download link for the original file.
 */
(() => {
  const BATCH = 24;

  const grid = document.getElementById("grid");
  const status = document.getElementById("status");
  const count = document.getElementById("count");
  const sentinel = document.getElementById("sentinel");

  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lb-img");
  const lbCounter = document.getElementById("lb-counter");
  const lbDownload = document.getElementById("lb-download");

  // Drive serves the original file with a "save as" header, so this
  // downloads full resolution without leaving the page.
  const downloadUrl = (p) => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(p.id)}`;

  const c = Site.collection();
  if (!c) {
    status.classList.remove("is-loading");
    status.textContent = "Collection not found.";
    return;
  }

  Site.applyAccent(c);
  document.title = `${c.title} — Gallery — ${Site.config.siteName || "Portfolio"}`;
  document.getElementById("title").textContent = c.title;
  document.getElementById("back").href = `collection.html?c=${encodeURIComponent(c.slug)}`;

  let photos = [];
  let rendered = 0;
  let index = 0;
  const lbWidth = () => Math.min(2400, window.innerWidth * (window.devicePixelRatio || 1));

  // ---------- grid, in batches ----------

  function renderMore() {
    const end = Math.min(rendered + BATCH, photos.length);
    const frag = document.createDocumentFragment();
    for (let i = rendered; i < end; i++) {
      const li = document.createElement("li");
      li.className = "grid__item";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "grid__btn photo";
      btn.dataset.index = i;
      btn.setAttribute("aria-label", `Open photo ${i + 1}`);

      const img = new Image();
      img.alt = "";
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
      img.src = Photos.url(photos[i], 640);

      btn.append(img);
      li.append(btn);
      frag.append(li);
    }
    grid.append(frag);
    rendered = end;
    if (rendered >= photos.length) observer.disconnect();
    else { observer.unobserve(sentinel); observer.observe(sentinel); } // re-check if still in view
  }

  const observer = new IntersectionObserver(
    (entries) => { if (entries.some((e) => e.isIntersecting)) renderMore(); },
    { rootMargin: "1200px 0px" }
  );

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".grid__btn");
    if (btn) open(Number(btn.dataset.index));
  });

  // ---------- lightbox ----------

  function show(i) {
    index = (i + photos.length) % photos.length;
    lbImg.src = Photos.url(photos[index], lbWidth());
    lbImg.alt = `Photo ${index + 1}`;
    lbDownload.href = downloadUrl(photos[index]);
    lbDownload.setAttribute("download", photos[index].name || "");
    lbCounter.textContent = `${Site.pad(index + 1)} / ${Site.pad(photos.length)}`;
    [index + 1, index - 1].forEach((n) => {
      new Image().src = Photos.url(photos[(n + photos.length) % photos.length], lbWidth());
    });
  }

  function open(i) {
    show(i);
    lb.showModal();
    document.body.style.overflow = "hidden";
  }

  lb.addEventListener("close", () => {
    document.body.style.overflow = "";
    lbImg.removeAttribute("src");
    // Make sure the tile we return to exists (lightbox can step past the rendered batch).
    while (index >= rendered && rendered < photos.length) renderMore();
    grid.querySelector(`[data-index="${index}"]`)?.focus({ preventScroll: false });
  });

  document.getElementById("lb-close").addEventListener("click", () => lb.close());
  document.getElementById("lb-prev").addEventListener("click", () => show(index - 1));
  document.getElementById("lb-next").addEventListener("click", () => show(index + 1));
  lb.addEventListener("click", (e) => {
    if (e.target === lb || e.target.classList.contains("lightbox__figure")) lb.close();
  });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(index + 1);
    if (e.key === "ArrowLeft") show(index - 1);
  });

  let touchX = null;
  lb.addEventListener("touchstart", (e) => (touchX = e.touches[0].clientX), { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  // ---------- go ----------

  Photos.load(c.galleryFolderId)
    .then((list) => {
      photos = list;
      status.classList.remove("is-loading");
      if (!photos.length) {
        status.textContent = "No photos yet — check back soon.";
        return;
      }
      status.remove();
      count.textContent = `${photos.length} photograph${photos.length === 1 ? "" : "s"}`;
      renderMore();
      observer.observe(sentinel);
    })
    .catch((err) => {
      console.error(err);
      status.classList.remove("is-loading");
      status.textContent = "Photos couldn't be loaded right now. Please try again later.";
    });
})();
