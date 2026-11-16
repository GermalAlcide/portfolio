/*
 * Drifting photo carousel (home page + collection pages).
 *
 * Motion model: one animation loop, one velocity.
 * - At rest the velocity eases toward a slow rightward drift.
 * - Drag / swipe / trackpad moves it directly; on release it keeps the
 *   flick's velocity and glides, relaxing back into the drift (no hard stop).
 * - Click a photo: it slides to the centre and grows, pushing neighbours aside.
 * - Click it again / empty space / Esc: it shrinks back while the carousel is
 *   already picking up speed again.
 * - A short folder is simply repeated to fill the loop.
 *
 *   Carousel.create({ folderId, shuffle }) → Promise<photos>
 */
const Carousel = (() => {
  const DRIFT = 34;          // resting speed, px/s (positive = rightward)
  const RELAX = 0.6;         // s — how quickly a flick settles back into the drift
  const FOCUS_MS = 620;
  const UNFOCUS_MS = 560;
  const MAX_FLICK = 5000;    // px/s
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;

  function create({ folderId, shuffle = false }) {
    const stage = document.getElementById("stage");
    const carousel = document.getElementById("carousel");
    const track = document.getElementById("track");
    const status = document.getElementById("status");

    let photos = [];
    let items = [];
    let setWidth = 0;
    let x = 0;
    let v = 0;

    let active = null;
    let focusAnim = null;    // centring + growing
    let shrink = null;       // shrinking back after unfocus
    let drag = null;
    const sized = new Set(); // items with an inline height

    // Download a photo only when it comes within a screen-width of view, so a
    // folder of hundreds of photos never loads all at once.
    const lazy = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        const img = en.target.querySelector("img");
        if (!img.getAttribute("src")) img.src = img.dataset.src;
        lazy.unobserve(en.target);
      }
    }, { root: carousel, rootMargin: "0px 100% 0px 100%" });

    let looping = false;
    let last = 0;

    const photoOf = (item) => photos[Number(item.dataset.index)];

    // ------------------------------------------------------------ build

    function makeItem(photo, index) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "carousel__item photo";
      // Width is set from --h × --ar in CSS (Safari mis-sizes aspect-ratio flex items).
      btn.style.setProperty("--ar", (photo.width / photo.height).toFixed(4));
      btn.dataset.index = index;
      btn.setAttribute("aria-label", `Enlarge photo ${index + 1}`);
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.draggable = false;
      btn.append(img);
      return btn;
    }

    function markLoaded(root) {
      root.querySelectorAll("img").forEach((img) => {
        if (img.complete && img.naturalWidth) img.classList.add("is-loaded");
        else img.addEventListener("load", () => img.classList.add("is-loaded"), { once: true });
      });
    }

    // Three identical sets [A][B][C]; the view stays inside B/C so a photo
    // can always be centred with neighbours on both sides.
    function build() {
      track.textContent = "";
      sized.clear();
      active = focusAnim = shrink = null;
      carousel.classList.remove("has-active");

      const setA = document.createElement("div");
      setA.className = "carousel__set";
      track.append(setA);

      let rounds = 0;
      do {
        photos.forEach((p, i) => setA.append(makeItem(p, i)));
        rounds++;
      } while (setA.getBoundingClientRect().width < window.innerWidth * 2 && rounds < 60);

      // Each photo at the size it is shown (big and small slots differ).
      setA.querySelectorAll(".carousel__item").forEach((b) => {
        b.querySelector("img").dataset.src = Photos.url(photoOf(b), Photos.fit(b.getBoundingClientRect().width));
      });

      const setB = setA.cloneNode(true);
      const setC = setA.cloneNode(true);
      setA.setAttribute("aria-hidden", "true");
      setC.setAttribute("aria-hidden", "true");
      track.append(setB, setC);
      markLoaded(track);
      items = [...track.querySelectorAll(".carousel__item")];
      lazy.disconnect();
      items.forEach((b) => lazy.observe(b));

      const seen = new Set();
      items.forEach((b) => {
        const tabbable = b.parentElement === setB && !seen.has(b.dataset.index);
        if (tabbable) seen.add(b.dataset.index);
        b.tabIndex = tabbable ? 0 : -1;
      });

      measure();
      x = -setWidth * 1.5;
      render();
    }

    function measure() {
      const first = track.querySelector(".carousel__set");
      setWidth = first ? first.getBoundingClientRect().width : 0;
    }

    // ------------------------------------------------------------ render

    function canWrap() {
      return setWidth && !active && !focusAnim && !shrink && sized.size === 0;
    }

    function wrap() {
      // Keep x within [-2·setWidth, -setWidth). Sets are identical, so a jump
      // of one set width is invisible.
      let shift = 0;
      while (x + shift >= -setWidth) shift -= setWidth;
      while (x + shift < -2 * setWidth) shift += setWidth;
      if (shift) {
        x += shift;
        if (drag) drag.startPos += shift;
      }
    }

    function render() {
      if (canWrap()) wrap();
      const dpr = window.devicePixelRatio || 1;
      track.style.transform = `translate3d(${Math.round(x * dpr) / dpr}px, 0, 0)`;
    }

    // Position of an item's centre, in track coordinates.
    function centreInTrack(item) {
      const r = item.getBoundingClientRect();
      return r.left - track.getBoundingClientRect().left + r.width / 2;
    }
    function centreOnScreen(item) {
      const r = item.getBoundingClientRect();
      return r.left + r.width / 2;
    }
    function stageCentre() {
      const r = carousel.getBoundingClientRect();
      return r.left + r.width / 2;
    }

    // ------------------------------------------------------------ loop

    function loop(now) {
      if (!looping) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      if (focusAnim) {
        stepFocus(now);
      } else if (drag) {
        // position is driven by the pointer
      } else if (!active) {
        const target = reduceMotion ? 0 : DRIFT;
        v += (target - v) * (1 - Math.exp(-dt / RELAX));
        if (shrink) {
          shrink.centre += v * dt;
          stepShrink(now);
        } else {
          x += v * dt;
        }
      }

      render();
      requestAnimationFrame(loop);
    }

    function start() {
      if (looping || !items.length) return;
      looping = true;
      last = performance.now();
      requestAnimationFrame(loop);
    }
    function stop() { looping = false; }

    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    // ------------------------------------------------------------ focus

    function naturalHeight(el) {
      const inline = el.style.getPropertyValue("--h");
      el.style.removeProperty("--h");
      const h = el.getBoundingClientRect().height;
      if (inline) el.style.setProperty("--h", inline);
      return h;
    }

    function activeHeight(el) {
      const p = photoOf(el);
      const cs = getComputedStyle(carousel);
      const pad = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const maxH = (stage.clientHeight - pad) * 0.95;
      const maxW = carousel.clientWidth * (window.innerWidth < 640 ? 0.92 : 0.78);
      return Math.min(maxH, (maxW * p.height) / p.width);
    }

    function heightEntries() {
      return [...sized].map((el) => ({
        el,
        from: el.getBoundingClientRect().height,
        to: el === active ? activeHeight(el) : naturalHeight(el),
      }));
    }

    function applyHeights(entries, e) {
      for (const en of entries) en.el.style.setProperty("--h", `${lerp(en.from, en.to, e)}px`);
    }

    function stepFocus(now) {
      const a = focusAnim;
      const p = a.duration > 0 ? Math.min((now - a.t0) / a.duration, 1) : 1;
      const e = ease(p);
      applyHeights(a.entries, e);
      x = lerp(a.fromCentre, a.toCentre, e) - (centreInTrack(a.anchor) + carousel.getBoundingClientRect().left);
      if (p >= 1) {
        focusAnim = null;
        for (const el of sized) if (el !== active) { el.style.removeProperty("--h"); sized.delete(el); }
      }
    }

    function stepShrink(now) {
      const s = shrink;
      const p = s.duration > 0 ? Math.min((now - s.t0) / s.duration, 1) : 1;
      applyHeights(s.entries, ease(p));
      x = s.centre - (centreInTrack(s.anchor) + carousel.getBoundingClientRect().left);
      if (p >= 1) {
        for (const el of sized) el.style.removeProperty("--h");
        sized.clear();
        shrink = null;
        measure();
      }
    }

    function loadHiRes(item) {
      const img = item.querySelector("img");
      const photo = photoOf(item);
      const px = Photos.fit(activeHeight(item) * (photo.width / photo.height));
      const hi = new Image();
      hi.onload = () => {
        if (item.classList.contains("is-active")) {
          img.src = hi.src;
          img.classList.add("is-loaded");
        }
      };
      hi.src = Photos.url(photo, px);
    }

    function focus(item, duration = reduceMotion ? 0 : FOCUS_MS) {
      if (!item) return;
      drag = null;
      shrink = null;
      v = 0;
      if (active && active !== item) active.classList.remove("is-active");
      if (active !== item) loadHiRes(item);
      active = item;
      item.classList.add("is-active");
      carousel.classList.add("has-active");
      sized.add(item);
      focusAnim = {
        anchor: item,
        entries: heightEntries(),
        fromCentre: centreOnScreen(item),
        toCentre: stageCentre(),
        t0: performance.now(),
        duration,
      };
      if (duration === 0) { stepFocus(performance.now()); render(); }
    }

    function unfocus() {
      if (!active) return;
      const item = active;
      active = null;
      focusAnim = null;
      item.classList.remove("is-active");
      carousel.classList.remove("has-active");
      v = 0; // eases back up to the drift while it shrinks
      shrink = {
        anchor: item,
        entries: heightEntries(),
        centre: centreOnScreen(item),
        t0: performance.now(),
        duration: reduceMotion ? 0 : UNFOCUS_MS,
      };
    }

    stage.addEventListener("click", (e) => {
      const item = e.target.closest(".carousel__item");
      if (!item || item === active) return unfocus();
      focus(item);
    });

    document.addEventListener("keydown", (e) => {
      if (!active) return;
      if (e.key === "Escape") unfocus();
      else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const next = items[items.indexOf(active) + (e.key === "ArrowRight" ? 1 : -1)];
        if (next) focus(next);
      }
    });

    // ------------------------------------------------------------ drag / flick

    carousel.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || active || focusAnim) return;
      v = 0; // catching it, like a hand on a spinning wheel
      drag = {
        id: e.pointerId,
        startX: e.clientX,
        startPos: x,
        startCentre: shrink ? shrink.centre : 0,
        moved: false,
        samples: [{ t: e.timeStamp, x: e.clientX }],
      };
    });

    carousel.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) > 6) {
        drag.moved = true;
        carousel.classList.add("is-dragging");
        try { carousel.setPointerCapture(e.pointerId); } catch (_) {}
      }
      if (!drag.moved) return;

      drag.samples.push({ t: e.timeStamp, x: e.clientX });
      while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > 100) drag.samples.shift();

      if (shrink) {
        shrink.centre = drag.startCentre + dx;
        stepShrink(performance.now());
      } else {
        x = drag.startPos + dx;
      }
      render();
    });

    function endDrag(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      carousel.classList.remove("is-dragging");
      if (!d.moved) return; // a tap — the click handler takes it from here

      const first = d.samples[0];
      const lastS = d.samples[d.samples.length - 1];
      const span = (lastS.t - first.t) / 1000;
      const heldStill = e.timeStamp - lastS.t > 80;
      v = span > 0.008 && !heldStill ? (lastS.x - first.x) / span : 0;
      v = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v));

      // Swallow the click that follows a drag.
      stage.addEventListener("click", (ev) => ev.stopPropagation(), { capture: true, once: true });
    }
    carousel.addEventListener("pointerup", endDrag);
    carousel.addEventListener("pointercancel", endDrag);

    // Trackpad / mouse wheel: scrubs, and keeps the momentum it was given.
    let lastWheel = 0;
    carousel.addEventListener("wheel", (e) => {
      if (active || focusAnim || drag) return;
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (!delta) return;
      e.preventDefault();
      const px = e.deltaMode === 1 ? delta * 16 : delta;
      const now = performance.now();
      const gap = Math.max((now - lastWheel) / 1000, 1 / 60);
      lastWheel = now;
      if (shrink) shrink.centre -= px; else x -= px;
      v = lerp(v, Math.max(-MAX_FLICK, Math.min(MAX_FLICK, -px / Math.min(gap, 0.05))), 0.5);
      render();
    }, { passive: false });

    // ------------------------------------------------------------ resize

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (active) return focus(active, 0);
        if (shrink || sized.size) return;
        const ratio = setWidth ? x / setWidth : 0;
        measure();
        if (setWidth < window.innerWidth * 2) build();
        else { x = ratio * setWidth; render(); }
      }, 150);
    });

    // ------------------------------------------------------------ go

    return Photos.load(folderId)
      .then((list) => {
        photos = shuffle ? Photos.shuffle(list) : list;
        status.classList.remove("is-loading");
        if (!photos.length) {
          status.textContent = "No photos yet — check back soon.";
          return photos;
        }
        status.hidden = true;
        build();
        start();
        return photos;
      })
      .catch((err) => {
        console.error(err);
        status.classList.remove("is-loading");
        status.textContent = "Photos couldn't be loaded right now. Please try again later.";
        throw err;
      });
  }

  return { create };
})();
