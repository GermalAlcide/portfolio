/*
 * Lists the images in a public Google Drive folder (Drive API v3).
 * Nothing is cached, so a newly uploaded photo appears on the next page load.
 *
 *   Photos.load(folderId)   → [{ id, name, width, height }] in file-name order
 *   Photos.url(photo, px)   → image URL roughly `px` wide
 *   Photos.fit(cssPx)       → pixel width to request for something cssPx wide on this screen
 *   Photos.shuffle(list)    → new array in random order
 */
const Photos = (() => {
  const cfg = window.SITE_CONFIG || {};

  async function load(folderId) {
    if (!cfg.driveApiKey || !folderId) throw new Error("[photos] Missing API key or folder ID in js/config.js");

    const files = [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
        key: cfg.driveApiKey,
        fields: "nextPageToken, files(id, name, imageMediaMetadata(width, height, rotation))",
        orderBy: "name_natural",
        pageSize: "1000",
      });
      if (pageToken) params.set("pageToken", pageToken);

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      files.push(...(data.files || []));
      pageToken = data.nextPageToken || "";
    } while (pageToken);

    return files.map((f) => {
      const m = f.imageMediaMetadata || {};
      let w = m.width || 4;
      let h = m.height || 5;
      if (m.rotation === 1 || m.rotation === 3) [w, h] = [h, w];
      return { id: f.id, name: f.name, width: w, height: h };
    });
  }

  function url(photo, px = 1200) {
    return `https://lh3.googleusercontent.com/d/${photo.id}=w${Math.round(px)}`;
  }

  // Twice the shown size: Google over-sharpens small copies (gritty skin,
  // jagged hair); a 2× copy shrunk by the browser matches the original.
  // Screen sharpness capped at 2×: 3× phone screens show no visible difference.
  function fit(cssPx) {
    const px = cssPx * Math.min(window.devicePixelRatio || 1, 2) * 2;
    return Math.min(2400, Math.ceil(px / 50) * 50);
  }

  function shuffle(list) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  return { load, url, fit, shuffle };
})();
