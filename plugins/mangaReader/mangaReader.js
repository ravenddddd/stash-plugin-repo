"use strict";
(() => {
  // src/plugin-api.ts
  window.MangaReader = window.MangaReader || {};
  var NR = window.MangaReader;
  function requirePluginApi() {
    const api = window.PluginApi;
    if (!api) throw new Error("[mangaReader] PluginApi is not available");
    return api;
  }
  function gqlDoc(text) {
    var _a, _b;
    const api = requirePluginApi();
    const gql = ((_a = api.libraries.Apollo) == null ? void 0 : _a.gql) || ((_b = api.GQL) == null ? void 0 : _b.gql);
    if (!gql) {
      console.error("[mangaReader] gql not available, cannot build a query");
      return null;
    }
    return gql(text);
  }

  // src/spreads.ts
  var DEFAULT_SPREAD_OPTIONS = {
    coverAlone: true,
    offset: 0,
    detectSpreads: true
  };
  var SPREAD_RATIO = 1;
  function isWideSpreadPage(page) {
    if (!page.height || page.width <= 0) return false;
    return page.width / page.height > SPREAD_RATIO;
  }
  function layout(pages, options) {
    const opts = {
      ...DEFAULT_SPREAD_OPTIONS,
      ...options || {}
    };
    const screens = [];
    const pairable = (page) => !(opts.detectSpreads && isWideSpreadPage(page));
    let i = 0;
    const standAlone = () => {
      screens.push({ start: i, pages: [pages[i]] });
      i += 1;
    };
    if (opts.coverAlone && i < pages.length) standAlone();
    if (opts.offset === 1 && i < pages.length) standAlone();
    while (i < pages.length) {
      const next = pages[i + 1];
      if (next && pairable(pages[i]) && pairable(next)) {
        screens.push({ start: i, pages: [pages[i], next] });
        i += 2;
      } else {
        standAlone();
      }
    }
    return screens;
  }
  function screenAt(screens, pageIndex) {
    for (let i = 0; i < screens.length; i++) {
      const screen = screens[i];
      if (pageIndex >= screen.start && pageIndex < screen.start + screen.pages.length) {
        return i;
      }
    }
    return -1;
  }
  function stepsToAdjacent(screens, pageIndex, direction) {
    const at = screenAt(screens, pageIndex);
    if (at < 0) return 0;
    const target = screens[at + direction];
    if (!target) return 0;
    return target.start - pageIndex;
  }
  NR.isWideSpreadPage = isWideSpreadPage;
  NR.layout = layout;
  NR.screenAt = screenAt;
  NR.stepsToAdjacent = stepsToAdjacent;

  // src/i18n.ts
  var LABELS = {
    en: {
      doublePage: "Double page",
      offset: "Shift the pairing by one page"
    },
    "zh-Hans": { doublePage: "\u53CC\u9875\u9605\u8BFB", offset: "\u914D\u5BF9\u504F\u79FB\u4E00\u683C" },
    "zh-Hant": { doublePage: "\u96D9\u9801\u95B1\u8B80", offset: "\u914D\u5C0D\u504F\u79FB\u4E00\u683C" }
  };
  var ALIASES = {
    zh: "zh-Hans",
    "zh-CN": "zh-Hans",
    "zh-SG": "zh-Hans",
    "zh-Hans": "zh-Hans",
    "zh-TW": "zh-Hant",
    "zh-HK": "zh-Hant",
    "zh-MO": "zh-Hant",
    "zh-Hant": "zh-Hant"
  };
  function labelFor(locale, key) {
    const parts = String(locale || "").replace("_", "-").split("-");
    while (parts.length > 0) {
      const tag = parts.join("-");
      const catalog = LABELS[ALIASES[tag] || tag];
      if (catalog) return catalog[key];
      parts.pop();
    }
    return LABELS.en[key];
  }

  // src/settings.ts
  var STORAGE_KEY = "mangaReader.settings";
  var DEFAULT_SETTINGS = {
    doublePage: false,
    coverAlone: true,
    detectSpreads: true
  };
  function parseSettings(raw) {
    const stored = (() => {
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    })();
    const flag = (key) => typeof stored[key] === "boolean" ? stored[key] : DEFAULT_SETTINGS[key];
    return {
      doublePage: flag("doublePage"),
      coverAlone: flag("coverAlone"),
      detectSpreads: flag("detectSpreads")
    };
  }
  function readSettings() {
    try {
      return parseSettings(window.localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      console.error(
        "[mangaReader] settings are not readable, using defaults:",
        e
      );
      return { ...DEFAULT_SETTINGS };
    }
  }
  function writeSettings(next) {
    const merged = { ...readSettings(), ...next };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.error("[mangaReader] settings are not writable:", e);
    }
    return merged;
  }
  var OFFSET_KEY = "mangaReader.offsets";
  function parseOffsets(raw) {
    const stored = (() => {
      if (!raw) return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
      } catch {
        return {};
      }
    })();
    const offsets = {};
    for (const [id, value] of Object.entries(stored)) {
      if (value === 1) offsets[id] = 1;
    }
    return offsets;
  }
  function readOffset(galleryId2) {
    try {
      return parseOffsets(window.localStorage.getItem(OFFSET_KEY))[galleryId2] || 0;
    } catch (e) {
      console.error("[mangaReader] offsets are not readable:", e);
      return 0;
    }
  }
  function writeOffset(galleryId2, offset2) {
    try {
      const offsets = parseOffsets(window.localStorage.getItem(OFFSET_KEY));
      if (offset2 === 1) offsets[galleryId2] = 1;
      else delete offsets[galleryId2];
      window.localStorage.setItem(OFFSET_KEY, JSON.stringify(offsets));
    } catch (e) {
      console.error("[mangaReader] offsets are not writable:", e);
    }
  }
  NR.parseSettings = parseSettings;
  NR.parseOffsets = parseOffsets;

  // src/stash-lightbox.ts
  var SELECTOR_LIGHTBOX = ".Lightbox";
  var SELECTOR_DISPLAY = ".Lightbox-display";
  var SELECTOR_INDICATOR = ".Lightbox-header-indicator";
  var SELECTOR_POPOVER_BODY = ".popover .popover-body";
  function parseIndicator(text) {
    const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text);
    if (!match) return null;
    const current2 = Number(match[1]);
    const total = Number(match[2]);
    if (!total || current2 < 1 || current2 > total) return null;
    return { current: current2, total };
  }
  function readPosition(root2) {
    const indicator = root2.querySelector(SELECTOR_INDICATOR);
    const counter = indicator == null ? void 0 : indicator.querySelector("b");
    if (!counter) return null;
    return parseIndicator(counter.textContent || "");
  }
  function galleryIdFromPath(pathname) {
    const match = /^\/galleries\/(\d+)/.exec(pathname);
    return match ? match[1] : null;
  }
  function pressArrow(direction) {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: direction > 0 ? "ArrowRight" : "ArrowLeft",
        bubbles: true,
        cancelable: true
      })
    );
  }
  var GALLERY_QUERY_TEXT = [
    "query MangaReaderGallery($galleryId: ID!) {",
    "  configuration {",
    "    interface {",
    "      language",
    "    }",
    "  }",
    "  findImages(",
    "    image_filter: { galleries: { value: [$galleryId], modifier: INCLUDES } }",
    '    filter: { per_page: -1, sort: "path" }',
    "  ) {",
    "    images {",
    "      id",
    "      visual_files {",
    "        ... on ImageFile {",
    "          width",
    "          height",
    "        }",
    "      }",
    "      paths {",
    "        image",
    "      }",
    "    }",
    "  }",
    "}"
  ].join("\n");
  var galleryQuery = null;
  async function fetchGallery(galleryId2) {
    var _a, _b, _c;
    if (!galleryQuery) galleryQuery = gqlDoc(GALLERY_QUERY_TEXT);
    const query = galleryQuery;
    if (!query) throw new Error("[mangaReader] no gallery query document");
    const data = await requirePluginApi().utils.StashService.getClient().query({ query, variables: { galleryId: galleryId2 }, fetchPolicy: "no-cache" }).then((res) => res == null ? void 0 : res.data);
    const pages = (((_a = data == null ? void 0 : data.findImages) == null ? void 0 : _a.images) || []).map(
      (image) => {
        var _a2;
        const file = (image.visual_files || []).find(
          (f) => typeof (f == null ? void 0 : f.width) === "number" && typeof (f == null ? void 0 : f.height) === "number"
        );
        return {
          id: String(image.id),
          width: (file == null ? void 0 : file.width) || 0,
          height: (file == null ? void 0 : file.height) || 0,
          // Stash's own URL for the image, kept for the query on it — which is a
          // version stamp, and is the whole reason this field is fetched at all. See
          // pageUrl in takeover.ts.
          url: ((_a2 = image.paths) == null ? void 0 : _a2.image) || ""
        };
      }
    );
    return {
      language: ((_c = (_b = data == null ? void 0 : data.configuration) == null ? void 0 : _b.interface) == null ? void 0 : _c.language) || null,
      pages
    };
  }
  NR.parseIndicator = parseIndicator;
  NR.galleryIdFromPath = galleryIdFromPath;

  // src/takeover.ts
  var CLASS_ACTIVE = "manga-reader-active";
  var CLASS_SPREAD = "manga-reader-spread";
  var CLASS_PAGE = "manga-reader-page";
  var CLASS_SINGLE = "is-single";
  var SWITCH_ID = "manga-reader-double-page";
  var OFFSET_ID = "manga-reader-offset";
  var CLASS_OPTIONS = "manga-reader-options";
  var MAX_REINSERTS = 8;
  var CACHE_LIMIT = 8;
  var settings = readSettings();
  var root = null;
  var container = null;
  var loaded = /* @__PURE__ */ new Map();
  var galleryId = null;
  var shownAt = -1;
  var drawGeneration = 0;
  var awaiting = -1;
  var offset = 0;
  var offsetFor = null;
  var reinsers = 0;
  var language = null;
  var logged = false;
  var errand = null;
  var PRESS_RETRY_MS = 120;
  var MAX_ATTEMPTS = 3;
  var attempts = 0;
  function step() {
    const lightbox = document.querySelector(SELECTOR_LIGHTBOX);
    if (!lightbox) {
      if (root) closeLightbox();
      return;
    }
    if (lightbox !== root) {
      closeLightbox();
      root = lightbox;
      galleryId = null;
      shownAt = -1;
      reinsers = 0;
      logged = false;
    }
    injectSwitch(lightbox);
    if (!wanted()) return;
    const wantedId = galleryIdFromPath(window.location.pathname);
    if (!wantedId) return;
    if (galleryId !== wantedId || !loaded.has(wantedId)) {
      loadGallery(wantedId);
      return;
    }
    sync(lightbox);
    arrived(lightbox);
  }
  function wanted() {
    return settings.doublePage && root !== null && galleryIdFromPath(window.location.pathname) !== null;
  }
  function current() {
    return galleryId ? loaded.get(galleryId) || null : null;
  }
  function loadGallery(id) {
    if (offsetFor !== id) {
      offsetFor = id;
      offset = readOffset(id);
    }
    const already = loaded.get(id);
    if (already) {
      galleryId = id;
      shownAt = -1;
      step();
      return;
    }
    const forLightbox = root;
    fetchGallery(id).then((answer) => {
      if (root !== forLightbox) return;
      remember(id, {
        id,
        pages: answer.pages,
        screens: layout(answer.pages, { ...settings, offset })
      });
      language = answer.language;
      galleryId = id;
      shownAt = -1;
      step();
    }).catch((e) => {
      console.error(
        "[mangaReader] could not read this gallery's pages, turning the spread view off:",
        e
      );
      deactivate();
    });
  }
  function remember(id, gallery) {
    loaded.delete(id);
    loaded.set(id, gallery);
    while (loaded.size > CACHE_LIMIT) {
      const oldest = loaded.keys().next();
      if (oldest.done) break;
      loaded.delete(oldest.value);
    }
  }
  function sync(lightbox) {
    const gallery = current();
    if (!gallery) return;
    const position = readPosition(lightbox);
    if (!position) {
      if (gallery.pages.length <= 1) return;
      console.error(
        "[mangaReader] the lightbox header could not be read, so the spread view cannot follow it \u2014 turning itself off"
      );
      deactivate();
      return;
    }
    const at = screenAt(gallery.screens, position.current - 1);
    if (at < 0) {
      console.error(
        "[mangaReader] the lightbox is at page " + position.current + ", which is not among the pages this plugin read \u2014 turning the spread view off"
      );
      deactivate();
      return;
    }
    if (at === shownAt && container && (container.childElementCount || awaiting === at)) {
      return;
    }
    ensureContainer(lightbox);
    if (!container) return;
    draw(gallery.screens[at], at);
  }
  function ensureContainer(lightbox) {
    const display = lightbox.querySelector(SELECTOR_DISPLAY);
    if (!display) {
      deactivate();
      return;
    }
    if (container && container.parentNode === display) return;
    if (container) {
      reinsers += 1;
      if (reinsers > MAX_REINSERTS) {
        console.error(
          "[mangaReader] the lightbox keeps removing the reader's container \u2014 turning the spread view off rather than fighting it"
        );
        deactivate();
        return;
      }
    }
    if (!container) {
      container = document.createElement("div");
      container.className = CLASS_SPREAD;
    }
    display.style.position = "relative";
    display.appendChild(container);
    lightbox.classList.add(CLASS_ACTIVE);
  }
  var REVEAL_BUDGET_MS = 300;
  NR.REVEAL_BUDGET_MS = REVEAL_BUDGET_MS;
  function pageUrl(page) {
    const query = /\?.*$/.exec(page.url || "");
    return "/image/" + page.id + "/image" + (query ? query[0] : "");
  }
  function decodedImage(image) {
    return typeof image.decode === "function" ? image.decode().catch(() => {
    }) : Promise.resolve();
  }
  function draw(screen, at) {
    if (!container) return;
    awaiting = -1;
    const boxes = [];
    const images = [];
    screen.pages.forEach((page, index) => {
      const box = document.createElement("div");
      box.className = CLASS_PAGE;
      const image = document.createElement("img");
      image.src = pageUrl(page);
      image.alt = String(screen.start + index + 1);
      image.decoding = "async";
      box.appendChild(image);
      boxes.push(box);
      images.push(image);
    });
    const mine = ++drawGeneration;
    let revealed = false;
    const reveal = () => {
      if (revealed || mine !== drawGeneration || !container) return;
      revealed = true;
      if (awaiting === at) awaiting = -1;
      container.textContent = "";
      container.classList.toggle(CLASS_SINGLE, screen.pages.length === 1);
      boxes.forEach((box) => {
        container == null ? void 0 : container.appendChild(box);
      });
      preload(at);
    };
    if (images.every((image) => image.complete !== false)) {
      reveal();
    } else {
      awaiting = at;
      Promise.all(images.map(decodedImage)).then(reveal);
      window.setTimeout(reveal, REVEAL_BUDGET_MS);
    }
    shownAt = at;
    const gallery = current();
    if (!logged && gallery) {
      logged = true;
      console.info(
        "[mangaReader] " + gallery.screens.length + " screen(s) from " + gallery.pages.length + " page(s), offset " + offset + " \u2014 the lightbox's options menu can shift the pairing, and O does the same"
      );
    }
  }
  function preload(at) {
    const gallery = current();
    if (!gallery) return;
    for (const step2 of [1, -1]) {
      const screen = gallery.screens[at + step2];
      if (!screen) continue;
      for (const page of screen.pages) {
        const image = new Image();
        image.src = pageUrl(page);
      }
    }
  }
  function currentIndex(lightbox) {
    const position = readPosition(lightbox);
    return position ? position.current - 1 : null;
  }
  function startErrand(lightbox, to) {
    const from = currentIndex(lightbox);
    if (from === null || from === to) return;
    endErrand();
    attempts = 0;
    errand = { from, to, retry: null };
    press(lightbox);
  }
  function press(lightbox) {
    if (!errand) return;
    const from = currentIndex(lightbox);
    if (from === null) {
      endErrand();
      return;
    }
    if (from === errand.to) {
      endErrand();
      return;
    }
    errand.from = from;
    attempts += 1;
    pressArrow(from < errand.to ? 1 : -1);
    armRetry(lightbox);
  }
  function armRetry(lightbox) {
    if (!errand) return;
    if (errand.retry !== null) window.clearTimeout(errand.retry);
    errand.retry = window.setTimeout(() => {
      if (!errand) return;
      errand.retry = null;
      const at = currentIndex(lightbox);
      if (at === null || at !== errand.from) return;
      if (attempts >= MAX_ATTEMPTS) {
        console.error(
          "[mangaReader] the lightbox did not respond to the arrow keys, so the spread view has stopped moving it \u2014 the page shown is the one it is on"
        );
        endErrand();
        return;
      }
      press(lightbox);
    }, PRESS_RETRY_MS);
  }
  function arrived(lightbox) {
    if (!errand) return;
    const at = currentIndex(lightbox);
    if (at === null) {
      endErrand();
      return;
    }
    if (at === errand.to) {
      endErrand();
      return;
    }
    if (at !== errand.from) press(lightbox);
  }
  function endErrand() {
    if (errand && errand.retry !== null) window.clearTimeout(errand.retry);
    errand = null;
  }
  function activate() {
    settings = writeSettings({ doublePage: true });
    setSwitchChecked(true);
    step();
  }
  function deactivate() {
    if (container) {
      container.remove();
      container = null;
    }
    if (root) {
      root.classList.remove(CLASS_ACTIVE);
      const display = root.querySelector(SELECTOR_DISPLAY);
      if (display) display.style.position = "";
    }
    shownAt = -1;
  }
  function closeLightbox() {
    deactivate();
    root = null;
    galleryId = null;
    logged = false;
  }
  function injectSwitch(lightbox) {
    const body = lightbox.querySelector(SELECTOR_POPOVER_BODY);
    if (!body) return;
    const existing = body.querySelector("." + CLASS_OPTIONS);
    if (existing) {
      addOffsetSwitch(existing);
      return;
    }
    const group = document.createElement("div");
    group.className = "form-group " + CLASS_OPTIONS;
    group.appendChild(
      checkbox({
        id: SWITCH_ID,
        label: labelFor(language, "doublePage"),
        checked: settings.doublePage,
        onChange: (checked) => {
          if (checked) {
            activate();
          } else {
            settings = writeSettings({ doublePage: false });
            deactivate();
          }
        }
      })
    );
    addOffsetSwitch(group);
    body.appendChild(group);
  }
  function addOffsetSwitch(group) {
    if (!current() || group.querySelector("#" + OFFSET_ID)) return;
    group.appendChild(
      checkbox({
        id: OFFSET_ID,
        label: labelFor(language, "offset"),
        checked: offset === 1,
        onChange: (checked) => {
          const gallery = current();
          if (gallery) setOffset(gallery, checked ? 1 : 0);
        }
      })
    );
  }
  function checkbox(option) {
    const row = document.createElement("div");
    row.className = "row mb-1";
    const column = document.createElement("div");
    column.className = "col";
    const check = document.createElement("div");
    check.className = "form-check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "form-check-input";
    input.id = option.id;
    input.checked = option.checked;
    const text = document.createElement("label");
    text.className = "form-check-label";
    text.htmlFor = option.id;
    text.textContent = option.label;
    input.addEventListener("change", () => option.onChange(input.checked));
    check.appendChild(input);
    check.appendChild(text);
    column.appendChild(check);
    row.appendChild(column);
    return row;
  }
  function setSwitchChecked(checked) {
    setChecked(SWITCH_ID, checked);
  }
  function setOffsetSwitchChecked(checked) {
    setChecked(OFFSET_ID, checked);
  }
  function setChecked(id, checked) {
    const input = document.getElementById(id);
    if (input) input.checked = checked;
  }
  function onKeyDown(event) {
    if (!event.isTrusted || !wanted() || !root) return;
    const lightbox = root;
    const gallery = current();
    if (!gallery) return;
    if (event.key === "o" || event.key === "O") {
      if (event.repeat) return;
      setOffset(gallery, offset === 0 ? 1 : 0);
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    if (event.repeat) return;
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
      return;
    }
    const at = currentIndex(lightbox);
    if (at === null) return;
    const steps = stepsToAdjacent(
      gallery.screens,
      at,
      event.key === "ArrowRight" ? 1 : -1
    );
    if (steps === 0) return;
    event.preventDefault();
    event.stopPropagation();
    startErrand(lightbox, at + steps);
  }
  function setOffset(gallery, next) {
    offset = next;
    offsetFor = gallery.id;
    writeOffset(gallery.id, next);
    gallery.screens = layout(gallery.pages, { ...settings, offset });
    shownAt = -1;
    setOffsetSwitchChecked(next === 1);
    step();
  }
  function install() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", install);
      return;
    }
    const observer = new MutationObserver(() => {
      try {
        step();
      } catch (e) {
        console.error(
          "[mangaReader] the reader failed and has been turned off:",
          e
        );
        deactivate();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("keydown", onKeyDown, true);
    step();
  }

  // src/mangaReader.tsx
  requirePluginApi();
  install();
})();
