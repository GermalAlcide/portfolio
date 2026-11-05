/* Collection page: carousel of the collection's "Carousel" folder (in folder
   order) + a button through to the full gallery. URL: collection.html?c=<slug> */
(() => {
  const c = Site.collection();
  const status = document.getElementById("status");
  if (!c) {
    status.classList.remove("is-loading");
    status.textContent = "Collection not found.";
    return;
  }

  Site.applyAccent(c);
  document.title = `${c.title} — ${Site.config.siteName || "Portfolio"}`;
  document.getElementById("caption").textContent = c.title;
  document.getElementById("full-gallery").href = `gallery.html?c=${encodeURIComponent(c.slug)}`;

  Carousel.create({ folderId: c.carouselFolderId, shuffle: false }).catch(() => {});
})();
