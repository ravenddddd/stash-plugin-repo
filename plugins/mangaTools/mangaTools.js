"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/plugin-api.ts
  function requirePluginApi() {
    const api = window.PluginApi;
    if (!api) {
      throw new Error(
        "[mangaTools] window.PluginApi is missing \u2014 the plugin cannot load"
      );
    }
    return api;
  }
  function gqlDoc(text2, what) {
    var _a2, _b2;
    const api = requirePluginApi();
    const gql = ((_a2 = api.libraries.Apollo) == null ? void 0 : _a2.gql) || ((_b2 = api.GQL) == null ? void 0 : _b2.gql);
    if (!gql) {
      console.error("[mangaTools] gql not available, cannot " + what);
      return null;
    }
    return gql(text2);
  }

  // src/languages.ts
  window.MangaTools = window.MangaTools || {};
  var NS = window.MangaTools;
  NS.LANGUAGES = {
    ja: { flag: "jp" },
    "zh-Hans": { flag: "cn" },
    "zh-Hant": { flag: "tw" },
    en: { flag: "gb" },
    ko: { flag: "kr" },
    es: { flag: "es" },
    fr: { flag: "fr" },
    de: { flag: "de" },
    it: { flag: "it" },
    pt: { flag: "pt" },
    ru: { flag: "ru" },
    th: { flag: "th" },
    vi: { flag: "vn" },
    id: { flag: "id" }
  };
  NS.FALLBACK_LOCALE = "en";
  var displayNamesCache = {};
  var collatorCache = {};
  function collatorFor(locale) {
    if (!(locale in collatorCache)) {
      try {
        collatorCache[locale] = new Intl.Collator(locale);
      } catch {
        collatorCache[locale] = new Intl.Collator(NS.FALLBACK_LOCALE);
      }
    }
    return collatorCache[locale];
  }
  function buildDisplayNames(ctor, locales) {
    try {
      return new ctor(locales, { type: "language" });
    } catch {
      return null;
    }
  }
  function displayNamesFor(locale) {
    if (!(locale in displayNamesCache)) {
      const ctor = Intl.DisplayNames;
      displayNamesCache[locale] = typeof ctor === "function" ? buildDisplayNames(ctor, [locale, NS.FALLBACK_LOCALE]) || buildDisplayNames(ctor, [NS.FALLBACK_LOCALE]) : null;
    }
    return displayNamesCache[locale];
  }
  NS.findCanonical = (code) => {
    if (!code) return "";
    const lower = String(code).trim().toLowerCase();
    if (lower === "") return "";
    const keys = Object.keys(NS.LANGUAGES);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === lower) return keys[i];
    }
    return "";
  };
  NS.normalize = (raw) => {
    if (raw === null || raw === void 0) return "";
    const s = String(raw).trim();
    if (s === "") return "";
    return NS.findCanonical(s) || s;
  };
  NS.name = (code, locale) => {
    const normalized = NS.normalize(code);
    const canonical = NS.findCanonical(normalized);
    if (!canonical) {
      return normalized;
    }
    const names = displayNamesFor(locale || NS.FALLBACK_LOCALE);
    if (!names) return canonical;
    return names.of(canonical) || canonical;
  };
  NS.describe = (raw, locale) => {
    const code = NS.normalize(raw);
    if (code === "") return null;
    const canonical = NS.findCanonical(code);
    if (canonical) {
      return {
        code: canonical,
        flag: NS.LANGUAGES[canonical].flag,
        name: NS.name(canonical, locale),
        known: true
      };
    }
    return { code, flag: null, name: code, known: false };
  };
  NS.languageOptions = (locale) => {
    const uiLocale = locale || NS.FALLBACK_LOCALE;
    const collator = collatorFor(uiLocale);
    return Object.keys(NS.LANGUAGES).map((code) => ({
      value: code,
      label: NS.name(code, uiLocale),
      flag: NS.LANGUAGES[code].flag
    })).sort((a, b) => collator.compare(a.label, b.label));
  };
  NS.enabledLanguages = null;
  NS.parseEnabledLanguages = (raw) => {
    if (raw === null || raw === void 0) return null;
    const s = String(raw).trim();
    if (s === "") return null;
    const out = /* @__PURE__ */ new Set();
    s.split(",").forEach((piece) => {
      const canonical = NS.findCanonical(piece.trim());
      if (canonical) out.add(canonical);
    });
    return out.size ? out : null;
  };
  NS.serializeEnabledLanguages = (codes) => Array.from(codes).sort().join(",");
  NS.showFlags = true;
  NS.showCoverBadge = true;
  NS.parseFlag = (raw, fallback) => {
    if (raw === null || raw === void 0 || raw === "") return fallback;
    if (typeof raw === "boolean") return raw;
    const s = String(raw).trim().toLowerCase();
    if (s === "false" || s === "0" || s === "no" || s === "off") return false;
    if (s === "true" || s === "1" || s === "yes" || s === "on") return true;
    return fallback;
  };

  // src/tools/fields.ts
  NS.FIELD_NAME = "plugin.mangaTools.language";
  NS.CENSORSHIP_FIELD_NAME = "plugin.mangaTools.censorship";
  NS.MANGA_FIELD_NAME = "plugin.mangaTools.manga";
  NS.TRANSLATION_GROUP_FIELD_NAME = "plugin.mangaTools.translationGroup";
  NS.translationGroupOf = (customFields) => NS.pickField(customFields, NS.TRANSLATION_GROUP_FIELD_NAME).trim();
  NS.groupKey = (name) => String(name != null ? name : "").trim().toLowerCase();
  NS.sameTranslationGroup = (a, b) => NS.groupKey(a) === NS.groupKey(b);
  NS.usualLanguageFor = (galleries, group) => {
    const key = NS.groupKey(group);
    return key ? NS.usualLanguagesOf(galleries)[key] || null : null;
  };
  NS.usualLanguagesOf = (galleries) => {
    const out = {};
    if (!galleries) return out;
    const counts = {};
    galleries.forEach((fields) => {
      const key = NS.groupKey(NS.translationGroupOf(fields));
      if (!key) return;
      const code = NS.findCanonical(
        NS.normalize(NS.pickField(fields, NS.FIELD_NAME))
      );
      if (!code) return;
      if (!counts[key]) counts[key] = {};
      const byLanguage = counts[key];
      byLanguage[code] = (byLanguage[code] || 0) + 1;
    });
    for (const key of Object.keys(counts)) {
      const usual = majorityOf(counts[key]);
      if (usual) out[key] = usual;
    }
    return out;
  };
  function majorityOf(counts) {
    let best = "";
    let count = 0;
    let tied = false;
    for (const code of Object.keys(counts)) {
      if (counts[code] > count) {
        best = code;
        count = counts[code];
        tied = false;
      } else if (counts[code] === count) {
        tied = true;
      }
    }
    return best && !tied ? { code: best, count } : null;
  }
  NS.MANGA_VALUE = "true";
  NS.isManga = (customFields) => NS.pickField(customFields, NS.MANGA_FIELD_NAME) !== "";
  NS.ORIGINAL_FIELD_NAME = "plugin.mangaTools.original";
  NS.ORIGINAL_VALUE = NS.MANGA_VALUE;
  NS.isOriginal = (customFields) => NS.pickField(customFields, NS.ORIGINAL_FIELD_NAME) !== "";
  NS.CHAPTER_FIELD_NAME = "plugin.mangaTools.chapters";
  NS.ownField = (key) => {
    const k = String(key != null ? key : "").trim().toLowerCase();
    if (k === "") return "";
    const names = [
      NS.FIELD_NAME,
      NS.CENSORSHIP_FIELD_NAME,
      NS.MANGA_FIELD_NAME,
      NS.TRANSLATION_GROUP_FIELD_NAME,
      NS.ORIGINAL_FIELD_NAME,
      // Recognised but never drawn: no row, no sidebar section, no bulk entry.
      // What it means is the reader half's business — a key of this plugin's must
      // not be left behind in Stash's own custom-field rows either way.
      NS.CHAPTER_FIELD_NAME
    ];
    for (let i = 0; i < names.length; i++) {
      if (names[i].toLowerCase() === k) return names[i];
    }
    return "";
  };
  NS.isOwnField = (key) => NS.ownField(key) !== "";
  NS.fieldsToClear = (customFields) => {
    const map = customFields || {};
    if (!map || typeof map !== "object") return [NS.MANGA_FIELD_NAME];
    const keys = Object.keys(map).filter((key) => NS.isOwnField(key));
    return keys.length ? keys : [NS.MANGA_FIELD_NAME];
  };
  NS.clearFields = (customFields) => {
    let next = customFields || {};
    if (!next || typeof next !== "object") next = {};
    NS.fieldsToClear(next).forEach((name) => {
      next = NS.setField(next, name, "");
    });
    return next;
  };
  NS.pickField = (customFields, name) => {
    if (!customFields || typeof customFields !== "object") return "";
    const map = customFields;
    const key = name.toLowerCase();
    const keys = Object.keys(map);
    for (let i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === key) {
        const v = map[keys[i]];
        if (v === null || v === void 0) return "";
        return String(v);
      }
    }
    return "";
  };
  NS.setField = (customFields, name, value) => {
    const next = Object.assign({}, customFields || {});
    const key = name.toLowerCase();
    Object.keys(next).forEach((k) => {
      if (k.toLowerCase() === key) delete next[k];
    });
    if (value) next[name] = value;
    return next;
  };

  // src/reader/namespace.ts
  window.MangaReader = window.MangaReader || {};
  var NR = window.MangaReader;

  // src/reader/chapters.ts
  var CHAPTERS_VERSION = 1;
  function parseChapters(raw) {
    if (!raw) return null;
    let stored = null;
    try {
      stored = JSON.parse(raw);
    } catch {
      return null;
    }
    if (!stored || typeof stored !== "object") return null;
    if (stored.v !== CHAPTERS_VERSION) return null;
    if (!Array.isArray(stored.chapters)) return null;
    const chapters = [];
    for (const entry of stored.chapters) {
      if (!entry || typeof entry !== "object") continue;
      const row2 = entry;
      if (!Array.isArray(row2.images)) continue;
      const images = [];
      for (const id of row2.images) {
        if (typeof id === "string" || typeof id === "number") {
          images.push(String(id));
        }
      }
      chapters.push({
        title: typeof row2.title === "string" ? row2.title : "",
        images
      });
    }
    return chapters;
  }
  function serializeChapters(chapters) {
    return JSON.stringify({
      v: CHAPTERS_VERSION,
      chapters: chapters.map((chapter) => ({
        title: typeof chapter.title === "string" ? chapter.title : "",
        images: chapter.images.map((id) => String(id))
      }))
    });
  }
  function chaptersFromStash(rows, pathIds) {
    if (!Array.isArray(rows)) return [];
    const starts = [];
    for (const row2 of rows) {
      const index = Number(row2 == null ? void 0 : row2.image_index);
      if (!Number.isInteger(index) || index < 1 || index > pathIds.length)
        continue;
      starts.push({
        title: typeof (row2 == null ? void 0 : row2.title) === "string" ? row2.title : "",
        index
      });
    }
    starts.sort((a, b) => a.index - b.index);
    return starts.map((start2, i) => {
      const next = starts[i + 1];
      const end = next ? next.index - 1 : pathIds.length;
      return {
        title: start2.title,
        images: pathIds.slice(start2.index - 1, end)
      };
    });
  }
  function placeChapters(chapters, pages) {
    const position = /* @__PURE__ */ new Map();
    for (let i = 0; i < pages.length; i++) {
      if (!position.has(pages[i].id)) position.set(pages[i].id, i);
    }
    const placed = [];
    for (const chapter of chapters) {
      let at = -1;
      for (const id of chapter.images) {
        const index = position.get(id);
        if (index !== void 0 && (at < 0 || index < at)) at = index;
      }
      if (at < 0) continue;
      placed.push({ title: chapter.title, images: chapter.images, at });
    }
    placed.sort((a, b) => a.at - b.at);
    return placed;
  }
  function positionsIn(order) {
    const position = /* @__PURE__ */ new Map();
    for (let i = 0; i < order.length; i++) {
      if (!position.has(order[i])) position.set(order[i], i);
    }
    return (id) => {
      var _a2;
      return (_a2 = position.get(id)) != null ? _a2 : Number.MAX_SAFE_INTEGER;
    };
  }
  function startOf(chapter, position) {
    let at = Number.MAX_SAFE_INTEGER;
    for (const id of chapter.images) {
      const index = position(id);
      if (index < at) at = index;
    }
    return at;
  }
  function inOrder(chapters, position) {
    return chapters.map((chapter, index) => ({
      chapter: {
        title: chapter.title,
        images: [...chapter.images].sort((a, b) => position(a) - position(b))
      },
      at: startOf(chapter, position),
      index
    })).sort((a, b) => a.at === b.at ? a.index - b.index : a.at - b.at).map((entry) => entry.chapter);
  }
  function addChapterAt(chapters, order, pageId, title) {
    const position = positionsIn(order);
    const at = position(pageId);
    if (at === Number.MAX_SAFE_INTEGER) return null;
    const starts = chapters.map((chapter) => startOf(chapter, position));
    if (starts.some((start2) => start2 === at)) return null;
    const next = starts.filter(
      (start2) => start2 > at && start2 !== Number.MAX_SAFE_INTEGER
    );
    const end = next.length > 0 ? Math.min(...next) : order.length;
    const rest = chapters.map((chapter) => ({
      title: chapter.title,
      images: chapter.images.filter((id) => {
        const index = position(id);
        return index < at || index >= end;
      })
    }));
    return inOrder([...rest, { title, images: order.slice(at, end) }], position);
  }
  function renameChapterAt(chapters, order, startPageId, title) {
    const position = positionsIn(order);
    const at = position(startPageId);
    if (at === Number.MAX_SAFE_INTEGER) return null;
    const found = chapters.findIndex(
      (chapter) => startOf(chapter, position) === at
    );
    if (found < 0) return null;
    return chapters.map(
      (chapter, index) => index === found ? { title, images: chapter.images } : chapter
    );
  }
  function moveChapterStart(chapters, order, fromPageId, toPageId) {
    const position = positionsIn(order);
    const from = position(fromPageId);
    const to = position(toPageId);
    if (from === Number.MAX_SAFE_INTEGER || to === Number.MAX_SAFE_INTEGER)
      return null;
    if (from === to) return null;
    const moved = chapters.findIndex(
      (chapter) => startOf(chapter, position) === from
    );
    if (moved < 0) return null;
    const taken = chapters.some(
      (chapter, index) => index !== moved && startOf(chapter, position) === to
    );
    if (taken) return null;
    const placed = chapters.map((chapter, index) => ({
      chapter,
      index,
      at: index === moved ? to : startOf(chapter, position)
    })).filter((entry) => entry.at !== Number.MAX_SAFE_INTEGER).sort((a, b) => a.at === b.at ? a.index - b.index : a.at - b.at);
    const runs = placed.map((entry, i) => ({
      title: entry.chapter.title,
      images: order.slice(
        entry.at,
        i + 1 < placed.length ? placed[i + 1].at : order.length
      )
    }));
    const unplaced = chapters.filter(
      (chapter) => startOf(chapter, position) === Number.MAX_SAFE_INTEGER
    );
    return [...runs, ...unplaced];
  }
  function removeChapterAt(chapters, order, pageId) {
    const position = positionsIn(order);
    const at = position(pageId);
    if (at === Number.MAX_SAFE_INTEGER) return null;
    const found = chapters.findIndex(
      (chapter) => chapter.images.some((id) => position(id) === at)
    );
    if (found < 0) return null;
    return chapters.filter((_, index) => index !== found);
  }
  function chapterAt(placed, pageId) {
    for (const chapter of placed) {
      if (chapter.images.includes(pageId)) return chapter;
    }
    return null;
  }
  NR.CHAPTERS_VERSION = CHAPTERS_VERSION;
  NR.chapterAt = chapterAt;
  NR.parseChapters = parseChapters;
  NR.serializeChapters = serializeChapters;
  NR.chaptersFromStash = chaptersFromStash;
  NR.placeChapters = placeChapters;
  NR.addChapterAt = addChapterAt;
  NR.renameChapterAt = renameChapterAt;
  NR.moveChapterStart = moveChapterStart;
  NR.removeChapterAt = removeChapterAt;

  // src/reader/chapters-edit.ts
  var undoable = /* @__PURE__ */ new Map();
  var listeners = [];
  function writeChapters(galleryId2, next, previous) {
    return write(galleryId2, next).then(() => {
      if (previous) undoable.set(galleryId2, previous);
      announce(galleryId2, next);
    });
  }
  function canUndoChapters(galleryId2) {
    return undoable.has(galleryId2);
  }
  function undoChapters(galleryId2) {
    const previous = undoable.get(galleryId2);
    if (!previous) return Promise.resolve();
    undoable.delete(galleryId2);
    return write(galleryId2, previous).then(() => {
      announce(galleryId2, previous);
    });
  }
  function watchChapters(fn) {
    listeners.push(fn);
    return () => {
      const at = listeners.indexOf(fn);
      if (at >= 0) listeners.splice(at, 1);
    };
  }
  function write(galleryId2, chapters) {
    const write2 = NS.writeChapters;
    if (typeof write2 !== "function") {
      return Promise.reject(
        new Error(
          "[mangaReader] the tools half is not running, so chapters cannot be written"
        )
      );
    }
    return write2(galleryId2, serializeChapters(chapters));
  }
  function announce(galleryId2, chapters) {
    for (const fn of [...listeners]) fn(galleryId2, chapters);
  }
  NR.writeChapters = writeChapters;
  NR.watchChapters = watchChapters;
  NR.canUndoChapters = canUndoChapters;
  NR.undoChapters = undoChapters;

  // src/reader/stash-lightbox.ts
  var SELECTOR_LIGHTBOX = ".Lightbox";
  var SELECTOR_DISPLAY = ".Lightbox-display";
  var SELECTOR_CAROUSEL = ".Lightbox-carousel";
  var CLASS_NAVBUTTON = "Lightbox-navbutton";
  var CLASS_LOADING = "LoadingIndicator";
  function parseIndicator(text2) {
    const match = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(text2);
    if (!match) return null;
    const current2 = Number(match[1]);
    const total = Number(match[2]);
    if (!total || current2 < 1 || current2 > total) return null;
    return { current: current2, total };
  }
  function galleryIdFromPath(pathname) {
    const match = /^\/galleries\/(\d+)/.exec(pathname);
    return match ? match[1] : null;
  }
  function inFullscreen(lightbox) {
    const element = document.fullscreenElement;
    return element ? lightbox.contains(element) : false;
  }
  function pressEscape() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true
      })
    );
  }
  function lightboxOrder(search) {
    const params = new URLSearchParams(search || "");
    const sort = params.get("sortby") || "path";
    const direction = params.get("sortdir");
    return {
      sort,
      direction: direction === "desc" || direction === null && sort === "date" ? "DESC" : "ASC"
    };
  }
  var GALLERY_QUERY_TEXT = [
    "query MangaReaderGallery($galleryId: ID!, $sort: String, $direction: SortDirectionEnum, $withPathIds: Boolean!) {",
    "  configuration {",
    "    interface {",
    "      language",
    "    }",
    "  }",
    "  findGallery(id: $galleryId) {",
    "    id",
    "    custom_fields",
    "    chapters {",
    "      title",
    "      image_index",
    "    }",
    "  }",
    "  pages: findImages(",
    "    image_filter: { galleries: { value: [$galleryId], modifier: INCLUDES } }",
    "    filter: { per_page: -1, sort: $sort, direction: $direction }",
    "  ) {",
    "    images {",
    "      id",
    "      title",
    "      visual_files {",
    "        __typename",
    "        ... on VideoFile {",
    "          path",
    "          video_codec",
    "        }",
    "        ... on ImageFile {",
    "          path",
    "          width",
    "          height",
    "        }",
    "      }",
    "      paths {",
    "        image",
    "      }",
    "      galleries {",
    "        id",
    "        title",
    "        folder {",
    "          path",
    "        }",
    "      }",
    "    }",
    "  }",
    "  byPath: findImages(",
    "    image_filter: { galleries: { value: [$galleryId], modifier: INCLUDES } }",
    '    filter: { per_page: -1, sort: "path", direction: ASC }',
    "  ) @include(if: $withPathIds) {",
    "    images {",
    "      id",
    "    }",
    "  }",
    "}"
  ].join("\n");
  var galleryQuery = null;
  function carouselImage(lightbox) {
    var _a2, _b2;
    const carousel = lightbox.querySelector(
      SELECTOR_CAROUSEL
    );
    if (!carousel) return null;
    const offset2 = /^(-?\d+(?:\.\d+)?)vw$/.exec(((_a2 = carousel.style) == null ? void 0 : _a2.left) || "");
    if (!offset2) return null;
    const at = Math.round(-Number(offset2[1]) / 100);
    if (!Number.isFinite(at) || at < 0) return null;
    const slide = carousel.children[at];
    const media = (slide == null ? void 0 : slide.querySelector("img")) || (slide == null ? void 0 : slide.querySelector("video"));
    const src = (media == null ? void 0 : media.src) || "";
    const id = (_b2 = /\/image\/([^/]+)\//.exec(src)) == null ? void 0 : _b2[1];
    if (!id) return null;
    return { at, id };
  }
  async function fetchGallery(galleryId2, order) {
    var _a2, _b2, _c, _d, _e, _f, _g;
    if (!galleryQuery) {
      galleryQuery = gqlDoc(GALLERY_QUERY_TEXT, "build the gallery query");
    }
    const query = galleryQuery;
    if (!query) throw new Error("[mangaReader] no gallery query document");
    const pathIdsNeeded = order.sort !== "path";
    const data = await requirePluginApi().utils.StashService.getClient().query({
      query,
      variables: {
        galleryId: galleryId2,
        sort: order.sort,
        direction: order.direction,
        withPathIds: pathIdsNeeded
      },
      fetchPolicy: "no-cache"
    }).then((res) => res == null ? void 0 : res.data);
    const pages = (((_a2 = data == null ? void 0 : data.pages) == null ? void 0 : _a2.images) || []).map((image) => {
      var _a3;
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
        url: ((_a3 = image.paths) == null ? void 0 : _a3.image) || ""
      };
    });
    const images = (((_b2 = data == null ? void 0 : data.pages) == null ? void 0 : _b2.images) || []).map((image) => {
      var _a3, _b3, _c2, _d2, _e2;
      const files = image.visual_files || [];
      const sized = files.find(
        (f) => typeof (f == null ? void 0 : f.width) === "number" && typeof (f == null ? void 0 : f.height) === "number"
      );
      const file = files[0];
      return {
        id: String(image.id),
        // Passed through as it came: Stash's lightbox shows a title when there is one
        // and the file's name when there is not, and telling it which is which is the
        // whole of this plugin's part in that.
        title: String((_a3 = image.title) != null ? _a3 : ""),
        paths: { image: ((_b3 = image.paths) == null ? void 0 : _b3.image) || "" },
        visual_files: [
          {
            __typename: String(
              (sized == null ? void 0 : sized.__typename) || (file == null ? void 0 : file.__typename) || "ImageFile"
            ),
            path: String((_d2 = (_c2 = sized == null ? void 0 : sized.path) != null ? _c2 : file == null ? void 0 : file.path) != null ? _d2 : ""),
            video_codec: (_e2 = sized == null ? void 0 : sized.video_codec) != null ? _e2 : file == null ? void 0 : file.video_codec,
            width: (sized == null ? void 0 : sized.width) || 0,
            height: (sized == null ? void 0 : sized.height) || 0
          }
        ],
        // As they came, and always a list: Stash asks whether there are any, so an image
        // with none and an image nobody asked about have to look the same to it.
        galleries: (image.galleries || []).map((gallery) => {
          var _a4, _b4;
          return {
            id: String(gallery.id),
            title: String((_a4 = gallery.title) != null ? _a4 : ""),
            folder: gallery.folder ? { path: String((_b4 = gallery.folder.path) != null ? _b4 : "") } : null
          };
        })
      };
    });
    return {
      language: ((_d = (_c = data == null ? void 0 : data.configuration) == null ? void 0 : _c.interface) == null ? void 0 : _d.language) || null,
      pages,
      images,
      customFields: ((_e = data == null ? void 0 : data.findGallery) == null ? void 0 : _e.custom_fields) || {},
      stashChapters: ((_f = data == null ? void 0 : data.findGallery) == null ? void 0 : _f.chapters) || [],
      pathIds: pathIdsNeeded ? (((_g = data == null ? void 0 : data.byPath) == null ? void 0 : _g.images) || []).map((image) => String(image.id)) : null
    };
  }
  NR.parseIndicator = parseIndicator;
  NR.galleryIdFromPath = galleryIdFromPath;
  NR.lightboxOrder = lightboxOrder;
  function lightboxIsLoading(lightbox) {
    return lightbox.querySelector("." + CLASS_LOADING) !== null;
  }
  NR.carouselImage = carouselImage;
  NR.lightboxIsLoading = lightboxIsLoading;

  // src/reader/chapters-import.ts
  var CHAPTERS_QUERY_TEXT = [
    "query MangaReaderChapterImports($field: String!, $mark: Any!, $perPage: Int!) {",
    "  findGalleries(",
    "    gallery_filter: { custom_fields: [{ field: $field, modifier: EQUALS, value: [$mark] }] }",
    "    filter: { per_page: $perPage }",
    "  ) {",
    "    count",
    "    galleries {",
    "      id",
    "      custom_fields",
    "      chapters {",
    "        title",
    "        image_index",
    "      }",
    "    }",
    "  }",
    "}"
  ].join("\n");
  var chaptersQuery = null;
  async function planChapterImports() {
    var _a2;
    if (!chaptersQuery) {
      chaptersQuery = gqlDoc(
        CHAPTERS_QUERY_TEXT,
        "build the chapter import query"
      );
    }
    const query = chaptersQuery;
    if (!query) throw new Error("[mangaReader] no chapter import query document");
    const data = await requirePluginApi().utils.StashService.getClient().query({
      query,
      variables: {
        field: NS.MANGA_FIELD_NAME,
        mark: NS.MANGA_VALUE,
        perPage: -1
      },
      fetchPolicy: "no-cache"
    }).then((res) => res == null ? void 0 : res.data);
    const galleries = ((_a2 = data == null ? void 0 : data.findGalleries) == null ? void 0 : _a2.galleries) || [];
    const plan = { toImport: [], owned: [], considered: 0 };
    for (const gallery of galleries) {
      const id = (gallery == null ? void 0 : gallery.id) === void 0 ? "" : String(gallery.id);
      if (!id) continue;
      plan.considered += 1;
      if (!(gallery.chapters || []).length) continue;
      const own = parseChapters(
        NS.pickField(gallery.custom_fields, NS.CHAPTER_FIELD_NAME) || null
      );
      (own ? plan.owned : plan.toImport).push(id);
    }
    return plan;
  }
  async function runChapterImports(plan, options = {}) {
    var _a2;
    const ids = options.reimport ? [...plan.toImport, ...plan.owned] : [...plan.toImport];
    const run = { written: [], failed: [], skippedEmpty: [] };
    let done = 0;
    for (const id of ids) {
      try {
        const answer = await fetchGallery(id, { sort: "path", direction: "ASC" });
        const chapters = chaptersFromStash(
          answer.stashChapters,
          answer.pages.map((page) => page.id)
        );
        if (chapters.length === 0) {
          run.skippedEmpty.push(id);
        } else {
          await writeChapters(id, chapters, null);
          run.written.push(id);
        }
      } catch (error) {
        run.failed.push({ id, error });
      }
      done += 1;
      (_a2 = options.onProgress) == null ? void 0 : _a2.call(options, done, ids.length);
    }
    return run;
  }
  NR.CHAPTERS_QUERY_TEXT = CHAPTERS_QUERY_TEXT;
  NR.planChapterImports = planChapterImports;
  NR.runChapterImports = runChapterImports;

  // src/reader/bridge.ts
  var handles = [];
  function bridged() {
    return handles.length > 0;
  }
  function takeOver(request) {
    var _a2;
    (_a2 = handles[handles.length - 1]) == null ? void 0 : _a2.takeOver(request);
  }
  function LightboxBridge() {
    const api = requirePluginApi();
    const React6 = api.React;
    const show = api.hooks.useLightbox();
    React6.useEffect(() => {
      const mine = {
        takeOver(request) {
          show({
            images: request.images,
            // One page of everything, so the lightbox never asks for another: this list
            // is the whole gallery, and a page callback would be a second way of saying
            // which images it holds.
            pages: 1,
            pageSize: request.images.length,
            totalCount: request.totalCount,
            // Only read when the lightbox mounts, which is how a chapter clicked on the
            // gallery's own page opens one — see the chapters tab.
            initialIndex: request.at
          });
        }
      };
      handles.push(mine);
      return () => {
        const at = handles.indexOf(mine);
        if (at !== -1) handles.splice(at, 1);
      };
    }, [show, api]);
    return null;
  }
  function installBridge() {
    const api = requirePluginApi();
    const React6 = api.React;
    for (const target2 of ["ImageList", "HeaderImage"]) {
      installAgainst(api, React6, target2);
    }
  }
  function installAgainst(api, React6, target2) {
    api.patch.after(target2, (...args) => {
      const result = args[args.length - 1];
      return React6.createElement(
        React6.Fragment,
        null,
        result,
        React6.createElement(LightboxBridge)
      );
    });
  }

  // src/messages/en.json
  var en_default = {
    "mangaReader.options": "Options",
    "mangaReader.doublePage": "Double page",
    "mangaReader.fade": "Fade in",
    "mangaReader.offset": "Shift the pairing by one page",
    "mangaReader.importChapters": "Import Stash's chapters",
    "mangaReader.reimportChapters": "Re-import Stash's chapters",
    "mangaReader.importingChapters": "Importing\u2026",
    "mangaReader.editChapter": "Edit",
    "mangaReader.chapterTitle": "Title",
    "mangaReader.chapterIndex": "Image index",
    "mangaReader.save": "Save",
    "mangaReader.cancel": "Cancel",
    "mangaReader.delete": "Delete",
    "mangaReader.chapterStartTaken": "A chapter already begins here",
    "mangaReader.chapterIndexRange": "That is not one of this gallery's pages",
    "mangaReader.chapterNoSuch": "No chapter begins here",
    "mangaReader.undoChapters": "Chapters changed \u2014 undo",
    "mangaReader.reimportWarning": "Replace this gallery's chapters with Stash's? The plugin's own list for it is overwritten.",
    "mangaReader.reimportReplace": "Replace",
    "mangaReader.reimportCancel": "Cancel",
    "mangaTools.select.placeholder": "Select language\u2026",
    "mangaTools.settings.enabledLanguages.heading": "Enabled languages",
    "mangaTools.settings.enabledLanguages.description": "Only these languages appear in the edit-page dropdown. Display (badge and detail row) is unaffected. Leave empty to show every language.",
    "mangaTools.settings.enabledLanguages.placeholder": "All languages",
    "mangaTools.settings.showFlags.heading": "Show flags",
    "mangaTools.settings.showFlags.description": "Draw the flag beside the language name. Turn this off to show the name on its own.",
    "mangaTools.settings.showCoverBadge.heading": "Show the language on gallery covers",
    "mangaTools.settings.showCoverBadge.description": "The badge in the bottom-right of a gallery's cover. With flags turned off it shows the language name instead of a flag.",
    "mangaTools.settings.openDetailsBlock.heading": "Start the details block expanded",
    "mangaTools.settings.openDetailsBlock.description": "The Manga info section in a gallery's details tab. Collapsed, its heading is what says the section is there. This decides the state a block opens in, not whether it can be opened.",
    "mangaTools.settings.openEditBlock.heading": "Start the edit block expanded",
    "mangaTools.settings.openEditBlock.description": "The Manga info block in a gallery's edit form, where its language, censorship and translation group are set. This decides the state a block opens in, not whether it can be opened.",
    "mangaTools.settings.hidePerformers.heading": "Hide the performers field on a manga gallery",
    "mangaTools.settings.hidePerformers.description": "A manga gallery rarely has performers, so its edit page leaves the field out. Only the field is hidden \u2014 whatever a gallery already has stays on the gallery and is kept when it is saved. The bulk edit dialog and the details tab are unaffected.",
    "mangaTools.settings.chapters.heading": "Import chapters from Stash",
    "mangaTools.settings.chapters.description": "Copies every marked gallery's Stash chapters into this plugin's own chapters field \u2014 the one the reader prefers, and the one nothing has ever written. Nothing of Stash's is changed. Galleries that already have a list of this plugin's own are left alone unless you ask to replace them.",
    "mangaTools.settings.chapters.check": "Check what would be imported",
    "mangaTools.settings.chapters.checking": "Checking\u2026",
    "mangaTools.settings.chapters.toImport": "Galleries to import",
    "mangaTools.settings.chapters.owned": "Already imported",
    "mangaTools.settings.chapters.replace": "Also replace the ones already imported",
    "mangaTools.settings.chapters.start": "Import",
    "mangaTools.settings.chapters.progress": "Imported",
    "mangaTools.settings.chapters.of": "of",
    "mangaTools.settings.chapters.skipped": "Skipped, nothing to bring over",
    "mangaTools.settings.chapters.failed": "Failed",
    "mangaTools.manga.mark": "Mark as manga",
    "mangaTools.manga.marked": "Manga",
    "mangaTools.manga.isManga": "Is manga",
    "mangaTools.filter.manga.marked": "Marked",
    "mangaTools.filter.manga.unmarked": "Unmarked",
    "mangaTools.manga.confirm": "Are you sure you want to stop managing this gallery? Its language, censorship and translation group values will be removed.",
    "mangaTools.manga.confirmResetsForm": "The edit form has unsaved changes, and taking the mark off will reset it.",
    "mangaTools.manga.confirmCancel": "Cancel",
    "mangaTools.manga.confirmOk": "Unmark",
    "mangaTools.panel.heading": "Manga info",
    "mangaTools.censorship.heading": "Censorship",
    "mangaTools.censorship.censored": "Censored",
    "mangaTools.censorship.uncensored": "Uncensored",
    "mangaTools.censorship.unset": "Not marked",
    "mangaTools.translationGroup.heading": "Translation group",
    "mangaTools.translationGroup.create": "Create",
    "mangaTools.translationGroup.placeholder": "Set a translation group\u2026",
    "mangaTools.translationGroup.fill": "Fill in",
    "mangaTools.translationGroup.original": "Raw",
    "mangaTools.translationGroup.originalOn": "Mark as raw: the original text, no translation group",
    "mangaTools.translationGroup.originalOff": "No longer raw \u2014 clear the mark",
    "mangaTools.translationGroup.originalOffRestore": "No longer raw \u2014 clear the mark and put the translation group back",
    "mangaTools.translationGroup.originalDetail": "raw (no translation group)",
    "mangaTools.translationGroup.originalInline": " (raw)",
    "mangaTools.translationGroup.suggestedLanguage": "This group's galleries usually carry this language",
    "mangaTools.bulk.remove": "Remove",
    "mangaTools.bulk.unmarkWarning": "Unmarking removes this plugin's manga, language, censorship and translation group fields from the selected galleries."
  };

  // src/messages/zh-Hans.json
  var zh_Hans_default = {
    "mangaReader.options": "\u9009\u9879",
    "mangaReader.doublePage": "\u53CC\u9875\u9605\u8BFB",
    "mangaReader.fade": "\u6DE1\u5165",
    "mangaReader.offset": "\u914D\u5BF9\u504F\u79FB\u4E00\u683C",
    "mangaReader.importChapters": "\u5BFC\u5165 Stash \u7684\u7AE0\u8282",
    "mangaReader.reimportChapters": "\u91CD\u65B0\u5BFC\u5165 Stash \u7684\u7AE0\u8282",
    "mangaReader.importingChapters": "\u6B63\u5728\u5BFC\u5165\u2026",
    "mangaReader.editChapter": "\u7F16\u8F91",
    "mangaReader.chapterTitle": "\u6807\u9898",
    "mangaReader.chapterIndex": "\u56FE\u7247\u5E8F\u53F7",
    "mangaReader.save": "\u4FDD\u5B58",
    "mangaReader.cancel": "\u53D6\u6D88",
    "mangaReader.delete": "\u5220\u9664",
    "mangaReader.chapterStartTaken": "\u8FD9\u4E00\u9875\u5DF2\u7ECF\u662F\u67D0\u4E00\u7AE0\u7684\u5F00\u5934",
    "mangaReader.chapterIndexRange": "\u8FD9\u4E0D\u662F\u8FD9\u672C\u753B\u5ECA\u7684\u9875\u7801",
    "mangaReader.chapterNoSuch": "\u8FD9\u91CC\u6CA1\u6709\u7AE0\u8282\u5F00\u5934",
    "mangaReader.undoChapters": "\u7AE0\u8282\u5DF2\u6539\u52A8 \u2014 \u64A4\u9500",
    "mangaReader.reimportWarning": "\u7528 Stash \u7684\u7AE0\u8282\u66FF\u6362\u8FD9\u672C\u7684\uFF1F\u63D2\u4EF6\u5DF2\u6709\u7684\u90A3\u4EFD\u4F1A\u88AB\u8986\u76D6\u3002",
    "mangaReader.reimportReplace": "\u66FF\u6362",
    "mangaReader.reimportCancel": "\u53D6\u6D88",
    "mangaTools.select.placeholder": "\u9009\u62E9\u8BED\u8A00\u2026",
    "mangaTools.settings.enabledLanguages.heading": "\u542F\u7528\u7684\u8BED\u8A00",
    "mangaTools.settings.enabledLanguages.description": "\u53EA\u6709\u8FD9\u4E9B\u8BED\u8A00\u4F1A\u51FA\u73B0\u5728\u7F16\u8F91\u9875\u7684\u4E0B\u62C9\u6846\u91CC\u3002\u663E\u793A\u65B9\u5F0F\uFF08\u5C01\u9762\u5FBD\u7AE0\u548C\u8BE6\u60C5\u9875\u90A3\u4E00\u884C\uFF09\u4E0D\u53D7\u5F71\u54CD\u3002\u7559\u7A7A\u8868\u793A\u663E\u793A\u5168\u90E8\u8BED\u8A00\u3002",
    "mangaTools.settings.enabledLanguages.placeholder": "\u5168\u90E8\u8BED\u8A00",
    "mangaTools.settings.showFlags.heading": "\u663E\u793A\u56FD\u65D7",
    "mangaTools.settings.showFlags.description": "\u5728\u8BED\u8A00\u540D\u79F0\u65C1\u753B\u51FA\u56FD\u65D7\u3002\u5173\u6389\u540E\u53EA\u663E\u793A\u540D\u79F0\u3002",
    "mangaTools.settings.showCoverBadge.heading": "\u5728\u5C01\u9762\u663E\u793A\u8BED\u8A00",
    "mangaTools.settings.showCoverBadge.description": "\u753B\u5ECA\u5C01\u9762\u53F3\u4E0B\u89D2\u7684\u5FBD\u7AE0\u3002\u5173\u6389\u56FD\u65D7\u65F6\u663E\u793A\u8BED\u8A00\u540D\u79F0\u800C\u4E0D\u662F\u56FD\u65D7\u3002",
    "mangaTools.settings.openDetailsBlock.heading": "\u7B80\u4ECB\u7684\u6F2B\u753B\u4FE1\u606F\u9ED8\u8BA4\u5C55\u5F00",
    "mangaTools.settings.openDetailsBlock.description": "\u753B\u5ECA\u7B80\u4ECB\u9875\u91CC\u7684\u90A3\u4E00\u8282\u3002\u6536\u8D77\u65F6\uFF0C\u90A3\u4E00\u884C\u6807\u9898\u5C31\u662F\u300C\u8FD9\u91CC\u6709\u4E00\u8282\u300D\u7684\u8BF4\u660E\u3002\u8FD9\u53EA\u51B3\u5B9A\u6253\u5F00\u65F6\u7684\u9ED8\u8BA4\u72B6\u6001\uFF0C\u4E0D\u51B3\u5B9A\u5B83\u80FD\u4E0D\u80FD\u6253\u5F00\u3002",
    "mangaTools.settings.openEditBlock.heading": "\u7F16\u8F91\u9875\u7684\u6F2B\u753B\u4FE1\u606F\u9ED8\u8BA4\u5C55\u5F00",
    "mangaTools.settings.openEditBlock.description": "\u753B\u5ECA\u7F16\u8F91\u8868\u5355\u91CC\u7684\u90A3\u4E00\u5757\uFF0C\u8BED\u8A00\u3001\u4FEE\u6B63\u548C\u7FFB\u8BD1\u7EC4\u5728\u90A3\u91CC\u8BBE\u7F6E\u3002\u8FD9\u53EA\u51B3\u5B9A\u6253\u5F00\u65F6\u7684\u9ED8\u8BA4\u72B6\u6001\uFF0C\u4E0D\u51B3\u5B9A\u5B83\u80FD\u4E0D\u80FD\u6253\u5F00.",
    "mangaTools.settings.hidePerformers.heading": "\u5728\u6F2B\u753B\u7684\u7F16\u8F91\u9875\u9690\u85CF\u300C\u6F14\u5458\u300D",
    "mangaTools.settings.hidePerformers.description": "\u6F2B\u753B\u4E00\u822C\u6CA1\u6709\u6F14\u5458\uFF0C\u6240\u4EE5\u7F16\u8F91\u9875\u4E0D\u663E\u793A\u8FD9\u4E00\u680F\u3002\u53EA\u662F\u9690\u85CF\uFF1A\u753B\u5ECA\u5DF2\u6709\u7684\u6F14\u5458\u4ECD\u7136\u7559\u5728\u753B\u5ECA\u4E0A\uFF0C\u4FDD\u5B58\u65F6\u4E5F\u4E0D\u4F1A\u88AB\u6E05\u6389\u3002\u6279\u91CF\u7F16\u8F91\u5BF9\u8BDD\u6846\u548C\u7B80\u4ECB\u9875\u4E0D\u53D7\u5F71\u54CD\u3002",
    "mangaTools.settings.chapters.heading": "\u4ECE Stash \u5BFC\u5165\u7AE0\u8282",
    "mangaTools.settings.chapters.description": "\u628A\u6BCF\u672C\u5DF2\u6807\u8BB0\u6F2B\u753B\u7684 Stash \u7AE0\u8282\u6284\u8FDB\u63D2\u4EF6\u81EA\u5DF1\u7684\u7AE0\u8282\u5B57\u6BB5 \u2014\u2014 \u9605\u8BFB\u534A\u8FB9\u4F18\u5148\u8BFB\u7684\u5C31\u662F\u5B83\uFF0C\u800C\u5B83\u4ECE\u6765\u8FD8\u6CA1\u6709\u88AB\u5199\u8FC7\u3002Stash \u90A3\u8FB9\u4E00\u4E2A\u5B57\u8282\u90FD\u4E0D\u6539\u3002\u5DF2\u6709\u63D2\u4EF6\u7AE0\u8282\u7684\u753B\u5ECA\u9ED8\u8BA4\u4E0D\u52A8\uFF0C\u9664\u975E\u4F60\u8981\u6C42\u8986\u76D6\u3002",
    "mangaTools.settings.chapters.check": "\u5148\u770B\u770B\u4F1A\u5BFC\u5165\u54EA\u4E9B",
    "mangaTools.settings.chapters.checking": "\u6B63\u5728\u68C0\u67E5\u2026",
    "mangaTools.settings.chapters.toImport": "\u5C06\u5BFC\u5165",
    "mangaTools.settings.chapters.owned": "\u5DF2\u5BFC\u5165",
    "mangaTools.settings.chapters.replace": "\u540C\u65F6\u8986\u76D6\u5DF2\u5BFC\u5165\u7684\u90A3\u4E9B",
    "mangaTools.settings.chapters.start": "\u5BFC\u5165",
    "mangaTools.settings.chapters.progress": "\u5DF2\u5BFC\u5165",
    "mangaTools.settings.chapters.of": "/",
    "mangaTools.settings.chapters.skipped": "\u8DF3\u8FC7\uFF08\u6CA1\u6709\u53EF\u642C\u7684\uFF09",
    "mangaTools.settings.chapters.failed": "\u5931\u8D25",
    "mangaTools.manga.mark": "\u6807\u8BB0\u4E3A\u6F2B\u753B",
    "mangaTools.manga.marked": "\u6F2B\u753B",
    "mangaTools.manga.isManga": "\u662F\u5426\u4E3A\u6F2B\u753B",
    "mangaTools.filter.manga.marked": "\u5DF2\u6807\u8BB0",
    "mangaTools.filter.manga.unmarked": "\u672A\u6807\u8BB0",
    "mangaTools.manga.confirm": "\u786E\u5B9A\u4E0D\u518D\u628A\u8FD9\u4E2A\u753B\u5ECA\u4F5C\u4E3A\u6F2B\u753B\u7BA1\u7406\u5417\uFF1F\u5B83\u7684\u8BED\u8A00\u3001\u4FEE\u6B63\u548C\u7FFB\u8BD1\u7EC4\u7684\u503C\u4F1A\u88AB\u5220\u9664\u3002",
    "mangaTools.manga.confirmResetsForm": "\u7F16\u8F91\u9875\u6709\u672A\u4FDD\u5B58\u7684\u6539\u52A8\uFF0C\u53D6\u6D88\u6807\u8BB0\u4F1A\u628A\u8BE5\u8868\u5355\u91CD\u7F6E\u3002",
    "mangaTools.manga.confirmCancel": "\u53D6\u6D88",
    "mangaTools.manga.confirmOk": "\u53D6\u6D88\u6807\u8BB0",
    "mangaTools.panel.heading": "\u6F2B\u753B\u4FE1\u606F",
    "mangaTools.censorship.heading": "\u4FEE\u6B63",
    "mangaTools.censorship.censored": "\u6709\u4FEE\u6B63",
    "mangaTools.censorship.uncensored": "\u65E0\u4FEE\u6B63",
    "mangaTools.censorship.unset": "\u672A\u6807\u6CE8",
    "mangaTools.translationGroup.heading": "\u7FFB\u8BD1\u7EC4",
    "mangaTools.translationGroup.create": "\u521B\u5EFA",
    "mangaTools.translationGroup.placeholder": "\u586B\u5199\u7FFB\u8BD1\u7EC4\u2026",
    "mangaTools.translationGroup.fill": "\u586B\u5165",
    "mangaTools.translationGroup.original": "\u751F\u8089",
    "mangaTools.translationGroup.originalOn": "\u6807\u4E3A\u751F\u8089\uFF1A\u539F\u6587\uFF0C\u6CA1\u6709\u7FFB\u8BD1\u7EC4",
    "mangaTools.translationGroup.originalOff": "\u53D6\u6D88\u751F\u8089\u6807\u8BB0",
    "mangaTools.translationGroup.originalOffRestore": "\u53D6\u6D88\u751F\u8089\u6807\u8BB0\uFF0C\u5E76\u6062\u590D\u539F\u6765\u7684\u7FFB\u8BD1\u7EC4",
    "mangaTools.translationGroup.originalDetail": "\u751F\u8089\uFF08\u65E0\u7FFB\u8BD1\u7EC4\uFF09",
    "mangaTools.translationGroup.originalInline": "\uFF08\u751F\u8089\uFF09",
    "mangaTools.translationGroup.suggestedLanguage": "\u8BE5\u7FFB\u8BD1\u7EC4\u7684\u753B\u5ECA\u901A\u5E38\u662F\u8FD9\u79CD\u8BED\u8A00",
    "mangaTools.bulk.remove": "\u79FB\u9664",
    "mangaTools.bulk.unmarkWarning": "\u53D6\u6D88\u6807\u8BB0\u4F1A\u4ECE\u9009\u4E2D\u7684\u753B\u5ECA\u4E2D\u79FB\u9664\u672C\u63D2\u4EF6\u7684\u6F2B\u753B\u3001\u8BED\u8A00\u3001\u4FEE\u6B63\u548C\u7FFB\u8BD1\u7EC4\u5B57\u6BB5\u3002"
  };

  // src/messages/zh-Hant.json
  var zh_Hant_default = {
    "mangaReader.options": "\u9078\u9805",
    "mangaReader.doublePage": "\u96D9\u9801\u95B1\u8B80",
    "mangaReader.fade": "\u6DE1\u5165",
    "mangaReader.offset": "\u914D\u5C0D\u504F\u79FB\u4E00\u683C",
    "mangaReader.importChapters": "\u532F\u5165 Stash \u7684\u7AE0\u7BC0",
    "mangaReader.reimportChapters": "\u91CD\u65B0\u532F\u5165 Stash \u7684\u7AE0\u7BC0",
    "mangaReader.importingChapters": "\u6B63\u5728\u532F\u5165\u2026",
    "mangaReader.editChapter": "\u7DE8\u8F2F",
    "mangaReader.chapterTitle": "\u6A19\u984C",
    "mangaReader.chapterIndex": "\u5716\u7247\u5E8F\u865F",
    "mangaReader.save": "\u5132\u5B58",
    "mangaReader.cancel": "\u53D6\u6D88",
    "mangaReader.delete": "\u522A\u9664",
    "mangaReader.chapterStartTaken": "\u9019\u4E00\u9801\u5DF2\u7D93\u662F\u67D0\u4E00\u7AE0\u7684\u958B\u982D",
    "mangaReader.chapterIndexRange": "\u9019\u4E0D\u662F\u9019\u672C\u756B\u5ECA\u7684\u9801\u78BC",
    "mangaReader.chapterNoSuch": "\u9019\u88E1\u6C92\u6709\u7AE0\u7BC0\u958B\u982D",
    "mangaReader.undoChapters": "\u7AE0\u7BC0\u5DF2\u6539\u52D5 \u2014 \u64A4\u92B7",
    "mangaReader.reimportWarning": "\u7528 Stash \u7684\u7AE0\u7BC0\u53D6\u4EE3\u9019\u672C\u7684\uFF1F\u5916\u639B\u5DF2\u6709\u7684\u90A3\u4EFD\u6703\u88AB\u8986\u84CB\u3002",
    "mangaReader.reimportReplace": "\u53D6\u4EE3",
    "mangaReader.reimportCancel": "\u53D6\u6D88",
    "mangaTools.select.placeholder": "\u9078\u64C7\u8A9E\u8A00\u2026",
    "mangaTools.settings.enabledLanguages.heading": "\u555F\u7528\u7684\u8A9E\u8A00",
    "mangaTools.settings.enabledLanguages.description": "\u53EA\u6709\u9019\u4E9B\u8A9E\u8A00\u6703\u51FA\u73FE\u5728\u7DE8\u8F2F\u9801\u7684\u4E0B\u62C9\u9078\u55AE\u88E1\u3002\u986F\u793A\u65B9\u5F0F\uFF08\u5C01\u9762\u5FBD\u7AE0\u548C\u8A73\u7D30\u9801\u90A3\u4E00\u884C\uFF09\u4E0D\u53D7\u5F71\u97FF\u3002\u7559\u7A7A\u8868\u793A\u986F\u793A\u5168\u90E8\u8A9E\u8A00\u3002",
    "mangaTools.settings.enabledLanguages.placeholder": "\u5168\u90E8\u8A9E\u8A00",
    "mangaTools.settings.showFlags.heading": "\u986F\u793A\u570B\u65D7",
    "mangaTools.settings.showFlags.description": "\u5728\u8A9E\u8A00\u540D\u7A31\u65C1\u756B\u51FA\u570B\u65D7\u3002\u95DC\u6389\u5F8C\u53EA\u986F\u793A\u540D\u7A31\u3002",
    "mangaTools.settings.showCoverBadge.heading": "\u5728\u5C01\u9762\u986F\u793A\u8A9E\u8A00",
    "mangaTools.settings.showCoverBadge.description": "\u756B\u5ECA\u5C01\u9762\u53F3\u4E0B\u89D2\u7684\u5FBD\u7AE0\u3002\u95DC\u6389\u570B\u65D7\u6642\u986F\u793A\u8A9E\u8A00\u540D\u7A31\u800C\u4E0D\u662F\u570B\u65D7\u3002",
    "mangaTools.settings.openDetailsBlock.heading": "\u7C21\u4ECB\u7684\u6F2B\u756B\u8CC7\u8A0A\u9810\u8A2D\u5C55\u958B",
    "mangaTools.settings.openDetailsBlock.description": "\u756B\u5ECA\u7C21\u4ECB\u9801\u88E1\u7684\u90A3\u4E00\u7BC0\u3002\u6536\u8D77\u6642\uFF0C\u90A3\u4E00\u884C\u6A19\u984C\u5C31\u662F\u300C\u9019\u88E1\u6709\u4E00\u7BC0\u300D\u7684\u8AAA\u660E\u3002\u9019\u53EA\u6C7A\u5B9A\u6253\u958B\u6642\u7684\u9810\u8A2D\u72C0\u614B\uFF0C\u4E0D\u6C7A\u5B9A\u5B83\u80FD\u4E0D\u80FD\u6253\u958B\u3002",
    "mangaTools.settings.openEditBlock.heading": "\u7DE8\u8F2F\u9801\u7684\u6F2B\u756B\u8CC7\u8A0A\u9810\u8A2D\u5C55\u958B",
    "mangaTools.settings.openEditBlock.description": "\u756B\u5ECA\u7DE8\u8F2F\u8868\u55AE\u88E1\u7684\u90A3\u4E00\u584A\uFF0C\u8A9E\u8A00\u3001\u4FEE\u6B63\u548C\u7FFB\u8B6F\u7D44\u5728\u90A3\u88E1\u8A2D\u5B9A\u3002\u9019\u53EA\u6C7A\u5B9A\u6253\u958B\u6642\u7684\u9810\u8A2D\u72C0\u614B\uFF0C\u4E0D\u6C7A\u5B9A\u5B83\u80FD\u4E0D\u80FD\u6253\u958B.",
    "mangaTools.settings.hidePerformers.heading": "\u5728\u6F2B\u756B\u7684\u7DE8\u8F2F\u9801\u96B1\u85CF\u300C\u6F14\u54E1\u300D",
    "mangaTools.settings.hidePerformers.description": "\u6F2B\u756B\u4E00\u822C\u6C92\u6709\u6F14\u54E1\uFF0C\u6240\u4EE5\u7DE8\u8F2F\u9801\u4E0D\u986F\u793A\u9019\u4E00\u6B04\u3002\u53EA\u662F\u96B1\u85CF\uFF1A\u756B\u5ECA\u5DF2\u6709\u7684\u6F14\u54E1\u4ECD\u7136\u7559\u5728\u756B\u5ECA\u4E0A\uFF0C\u5132\u5B58\u6642\u4E5F\u4E0D\u6703\u88AB\u6E05\u6389\u3002\u6279\u91CF\u7DE8\u8F2F\u5C0D\u8A71\u6846\u548C\u7C21\u4ECB\u9801\u4E0D\u53D7\u5F71\u97FF\u3002",
    "mangaTools.settings.chapters.heading": "\u5F9E Stash \u532F\u5165\u7AE0\u7BC0",
    "mangaTools.settings.chapters.description": "\u628A\u6BCF\u672C\u5DF2\u6A19\u8A18\u6F2B\u756B\u7684 Stash \u7AE0\u7BC0\u6284\u9032\u5916\u639B\u81EA\u5DF1\u7684\u7AE0\u7BC0\u6B04\u4F4D \u2014\u2014 \u95B1\u8B80\u534A\u908A\u512A\u5148\u8B80\u7684\u5C31\u662F\u5B83\uFF0C\u800C\u5B83\u5F9E\u4F86\u9084\u6C92\u6709\u88AB\u5BEB\u904E\u3002Stash \u90A3\u908A\u4E00\u500B\u4F4D\u5143\u7D44\u90FD\u4E0D\u6539\u3002\u5DF2\u6709\u5916\u639B\u7AE0\u7BC0\u7684\u756B\u5ECA\u9810\u8A2D\u4E0D\u52D5\uFF0C\u9664\u975E\u4F60\u8981\u6C42\u8986\u84CB\u3002",
    "mangaTools.settings.chapters.check": "\u5148\u770B\u770B\u6703\u532F\u5165\u54EA\u4E9B",
    "mangaTools.settings.chapters.checking": "\u6B63\u5728\u6AA2\u67E5\u2026",
    "mangaTools.settings.chapters.toImport": "\u5C07\u532F\u5165",
    "mangaTools.settings.chapters.owned": "\u5DF2\u532F\u5165",
    "mangaTools.settings.chapters.replace": "\u540C\u6642\u8986\u84CB\u5DF2\u532F\u5165\u7684\u90A3\u4E9B",
    "mangaTools.settings.chapters.start": "\u532F\u5165",
    "mangaTools.settings.chapters.progress": "\u5DF2\u532F\u5165",
    "mangaTools.settings.chapters.of": "/",
    "mangaTools.settings.chapters.skipped": "\u8DF3\u904E\uFF08\u6C92\u6709\u53EF\u642C\u7684\uFF09",
    "mangaTools.settings.chapters.failed": "\u5931\u6557",
    "mangaTools.manga.mark": "\u6A19\u8A18\u70BA\u6F2B\u756B",
    "mangaTools.manga.marked": "\u6F2B\u756B",
    "mangaTools.manga.isManga": "\u662F\u5426\u70BA\u6F2B\u756B",
    "mangaTools.filter.manga.marked": "\u5DF2\u6A19\u8A18",
    "mangaTools.filter.manga.unmarked": "\u672A\u6A19\u8A18",
    "mangaTools.manga.confirm": "\u78BA\u5B9A\u4E0D\u518D\u628A\u9019\u500B\u756B\u5ECA\u4F5C\u70BA\u6F2B\u756B\u7BA1\u7406\u55CE\uFF1F\u5B83\u7684\u8A9E\u8A00\u3001\u4FEE\u6B63\u548C\u7FFB\u8B6F\u7D44\u7684\u503C\u6703\u88AB\u522A\u9664\u3002",
    "mangaTools.manga.confirmResetsForm": "\u7DE8\u8F2F\u9801\u6709\u672A\u5132\u5B58\u7684\u6539\u52D5\uFF0C\u53D6\u6D88\u6A19\u8A18\u6703\u628A\u8A72\u8868\u55AE\u91CD\u7F6E\u3002",
    "mangaTools.manga.confirmCancel": "\u53D6\u6D88",
    "mangaTools.manga.confirmOk": "\u53D6\u6D88\u6A19\u8A18",
    "mangaTools.panel.heading": "\u6F2B\u756B\u8CC7\u8A0A",
    "mangaTools.censorship.heading": "\u4FEE\u6B63",
    "mangaTools.censorship.censored": "\u6709\u4FEE\u6B63",
    "mangaTools.censorship.uncensored": "\u7121\u4FEE\u6B63",
    "mangaTools.censorship.unset": "\u672A\u6A19\u8A3B",
    "mangaTools.translationGroup.heading": "\u7FFB\u8B6F\u7D44",
    "mangaTools.translationGroup.create": "\u5EFA\u7ACB",
    "mangaTools.translationGroup.placeholder": "\u586B\u5BEB\u7FFB\u8B6F\u7D44\u2026",
    "mangaTools.translationGroup.fill": "\u586B\u5165",
    "mangaTools.translationGroup.original": "\u751F\u8089",
    "mangaTools.translationGroup.originalOn": "\u6A19\u70BA\u751F\u8089\uFF1A\u539F\u6587\uFF0C\u6C92\u6709\u7FFB\u8B6F\u7D44",
    "mangaTools.translationGroup.originalOff": "\u53D6\u6D88\u751F\u8089\u6A19\u8A18",
    "mangaTools.translationGroup.originalOffRestore": "\u53D6\u6D88\u751F\u8089\u6A19\u8A18\uFF0C\u4E26\u9084\u539F\u539F\u672C\u7684\u7FFB\u8B6F\u7D44",
    "mangaTools.translationGroup.originalDetail": "\u751F\u8089\uFF08\u7121\u7FFB\u8B6F\u7D44\uFF09",
    "mangaTools.translationGroup.originalInline": "\uFF08\u751F\u8089\uFF09",
    "mangaTools.translationGroup.suggestedLanguage": "\u8A72\u7FFB\u8B6F\u7D44\u7684\u756B\u5ECA\u901A\u5E38\u662F\u9019\u7A2E\u8A9E\u8A00",
    "mangaTools.bulk.remove": "\u79FB\u9664",
    "mangaTools.bulk.unmarkWarning": "\u53D6\u6D88\u6A19\u8A18\u6703\u5F9E\u9078\u4E2D\u7684\u756B\u5ECA\u4E2D\u79FB\u9664\u672C\u5916\u639B\u7684\u6F2B\u756B\u3001\u8A9E\u8A00\u3001\u4FEE\u6B63\u548C\u7FFB\u8B6F\u7D44\u6B04\u4F4D\u3002"
  };

  // src/i18n.ts
  var CATALOGS = {
    en: en_default,
    "zh-Hans": zh_Hans_default,
    "zh-Hant": zh_Hant_default
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
  function catalogs() {
    return CATALOGS;
  }
  function catalogFor(locale) {
    const parts = String(locale || "").replace("_", "-").split("-");
    while (parts.length > 0) {
      const tag = parts.join("-");
      const catalog = CATALOGS[ALIASES[tag] || tag];
      if (catalog) return catalog;
      parts.pop();
    }
    return CATALOGS.en;
  }
  function t(intl, id) {
    return stringFor(intl.locale, id);
  }
  function stringFor(locale, id) {
    var _a2, _b2;
    return (_b2 = (_a2 = catalogFor(locale != null ? locale : "")[id]) != null ? _a2 : CATALOGS.en[id]) != null ? _b2 : id;
  }
  NS.t = t;
  NS.stringFor = stringFor;
  NS.catalogFor = catalogFor;
  NS.catalogs = catalogs;

  // src/reader/settings.ts
  var STORAGE_KEY = "plugin.mangaTools.settings";
  var LEGACY_STORAGE_KEY = "mangaReader.settings";
  function storedValue(key, legacyKey) {
    const current2 = window.localStorage.getItem(key);
    if (current2 !== null) return current2;
    const legacy = window.localStorage.getItem(legacyKey);
    if (legacy !== null) window.localStorage.setItem(key, legacy);
    return legacy;
  }
  var FADE_MAX_MS = 1e3;
  var DEFAULT_SETTINGS = {
    doublePage: false,
    coverAlone: true,
    detectSpreads: true,
    fadeMs: 140
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
    const duration = (key) => {
      const value = stored[key];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return DEFAULT_SETTINGS[key];
      }
      return Math.min(FADE_MAX_MS, Math.max(0, Math.round(value)));
    };
    return {
      doublePage: flag("doublePage"),
      coverAlone: flag("coverAlone"),
      detectSpreads: flag("detectSpreads"),
      fadeMs: duration("fadeMs")
    };
  }
  function readSettings() {
    try {
      return parseSettings(storedValue(STORAGE_KEY, LEGACY_STORAGE_KEY));
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
  var OFFSET_KEY = "plugin.mangaTools.offsets";
  var LEGACY_OFFSET_KEY = "mangaReader.offsets";
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
      return parseOffsets(storedValue(OFFSET_KEY, LEGACY_OFFSET_KEY))[galleryId2] || 0;
    } catch (e) {
      console.error("[mangaReader] offsets are not readable:", e);
      return 0;
    }
  }
  function writeOffset(galleryId2, offset2) {
    try {
      const offsets = parseOffsets(storedValue(OFFSET_KEY, LEGACY_OFFSET_KEY));
      if (offset2 === 1) offsets[galleryId2] = 1;
      else delete offsets[galleryId2];
      window.localStorage.setItem(OFFSET_KEY, JSON.stringify(offsets));
    } catch (e) {
      console.error("[mangaReader] offsets are not writable:", e);
    }
  }
  NR.parseSettings = parseSettings;
  NR.parseOffsets = parseOffsets;
  NR.readSettings = readSettings;
  NR.readOffset = readOffset;
  NR.FADE_MAX_MS = FADE_MAX_MS;

  // src/reader/chrome.ts
  var CLASS_CHROME = "manga-reader-chrome";
  var CLASS_CHAPTER = "manga-reader-chapter";
  var CLASS_COUNTER = "manga-reader-counter";
  var CLASS_OPTIONS_ICON = "Lightbox-header-options-icon";
  var CLASS_OPTIONS_ANCHOR = "manga-reader-options-anchor";
  var CLASS_CLOSE = "manga-reader-close";
  var CLASS_FULLSCREEN = "manga-reader-fullscreen";
  var CLASS_ZOOM = "manga-reader-zoom";
  var CLASS_CHAPTER_MENU = "manga-reader-chapter-menu";
  var HIDDEN = "data-manga-reader-hidden";
  var CLASS_MENU_BUTTON = "manga-reader-menu-button";
  var CLASS_MENU_PANEL = "manga-reader-menu-panel";
  var CLASS_MENU_ITEM = "manga-reader-menu-item";
  var CLASS_SETTINGS = "manga-reader-settings";
  var CLASS_MENU_CHAPTERS = "manga-reader-menu-chapters";
  var CLASS_MENU_SETTINGS = "manga-reader-menu-settings";
  var CLASS_CHAPTER_TOGGLE = "minimal Lightbox-header-chapter-button dropdown-toggle btn btn-primary";
  var CLASS_ICON_BUTTON = "btn btn-link";
  function ensureChrome(lightbox, state) {
    latest = state;
    let chrome = lightbox.querySelector("." + CLASS_CHROME);
    if (!chrome) {
      chrome = document.createElement("div");
      chrome.className = "Lightbox-header " + CLASS_CHROME;
      const stash = lightbox.querySelector(
        ".Lightbox-header:not(." + CLASS_CHROME + ")"
      );
      if (stash == null ? void 0 : stash.parentNode) stash.parentNode.insertBefore(chrome, stash);
      else lightbox.appendChild(chrome);
      const left = document.createElement("div");
      left.className = "Lightbox-header-left-spacer";
      const chapters = document.createElement("div");
      chapters.className = "dropdown " + CLASS_CHAPTER_MENU;
      chapters.appendChild(
        menuButton("chapters", CLASS_CHAPTER_TOGGLE, "faBars")
      );
      chapters.appendChild(
        panel("chapters", "dropdown-menu Lightbox-header-chapters")
      );
      left.appendChild(chapters);
      chrome.appendChild(left);
      const indicator = document.createElement("div");
      indicator.className = "Lightbox-header-indicator";
      indicator.appendChild(text(CLASS_CHAPTER));
      indicator.appendChild(text(CLASS_COUNTER, "b"));
      chrome.appendChild(indicator);
      const right = document.createElement("div");
      right.className = "Lightbox-header-right";
      const options = document.createElement("div");
      options.className = "Lightbox-header-options";
      const anchor = document.createElement("div");
      anchor.className = CLASS_OPTIONS_ICON + " " + CLASS_OPTIONS_ANCHOR;
      anchor.appendChild(menuButton("settings", CLASS_ICON_BUTTON, "faCog"));
      anchor.appendChild(panel("settings", "popover"));
      options.appendChild(anchor);
      right.appendChild(options);
      right.appendChild(zoomButton());
      if (document.fullscreenEnabled) {
        right.appendChild(fullscreenButton(lightbox));
      }
      right.appendChild(closeButton());
      chrome.appendChild(right);
      lightbox.addEventListener("click", onLightboxClick);
    }
    chromeNode = chrome;
    update(chrome, state);
    return chrome;
  }
  function removeChrome(lightbox) {
    const chrome = lightbox.querySelector("." + CLASS_CHROME);
    if (chrome) chrome.remove();
    lightbox.removeEventListener("click", onLightboxClick);
    if (chrome === chromeNode) chromeNode = null;
  }
  function onLightboxClick(event) {
    if (openMenu === null) return;
    if (chromeNode == null ? void 0 : chromeNode.contains(event.target)) return;
    openMenu = null;
    redraw();
  }
  var latest = null;
  var chromeNode = null;
  function redraw() {
    if (chromeNode && latest) update(chromeNode, latest);
  }
  var labels = {};
  var openMenu = null;
  function update(chrome, state) {
    var _a2;
    const chapter = chrome.querySelector("." + CLASS_CHAPTER);
    const counter = chrome.querySelector("." + CLASS_COUNTER);
    const name = ((_a2 = state.chapter) == null ? void 0 : _a2.title) || "";
    if (chapter.textContent !== name) chapter.textContent = name;
    const count = state.number + " / " + state.total;
    if (counter.textContent !== count) counter.textContent = count;
    const chapterPanel = chrome.querySelector(
      "." + CLASS_MENU_CHAPTERS
    );
    const settingsPanel = chrome.querySelector(
      "." + CLASS_MENU_SETTINGS
    );
    if (!chapterPanel || !settingsPanel) return;
    for (const node of chrome.querySelectorAll("." + CLASS_MENU_BUTTON)) {
      const button2 = node;
      const which = button2.dataset.opens;
      const open = which === openMenu;
      button2.setAttribute("aria-expanded", open ? "true" : "false");
      setIcon(button2, iconFor(which, open));
    }
    chapterPanel.classList.toggle("show", openMenu === "chapters");
    settingsPanel.classList.toggle("show", openMenu === "settings");
    showWhen(chrome.querySelector("." + CLASS_ZOOM), state.zoomed);
    showWhen(
      chrome.querySelector("." + CLASS_CHAPTER_MENU),
      state.placed.length > 0
    );
    drawChapters(chapterPanel, state);
    drawSettings(settingsPanel, state);
  }
  function drawChapters(panel2, state) {
    var _a2, _b2;
    const key = state.placed.map((c) => c.at + ":" + c.title).join("|");
    if (panel2.getAttribute("data-drawn") !== key) {
      panel2.setAttribute("data-drawn", key);
      panel2.textContent = "";
      for (const chapter of state.placed) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "dropdown-item " + CLASS_MENU_ITEM;
        item.dataset.at = String(chapter.at);
        item.textContent = chapter.title || "#" + (state.placed.indexOf(chapter) + 1);
        item.addEventListener("click", () => {
          openMenu = null;
          state.handlers.onChapter(chapter.at);
        });
        panel2.appendChild(item);
      }
    }
    for (const item of panel2.querySelectorAll("." + CLASS_MENU_ITEM)) {
      const mine = item.dataset.at === String((_b2 = (_a2 = state.chapter) == null ? void 0 : _a2.at) != null ? _b2 : -1);
      item.classList.toggle("active", mine);
    }
  }
  function drawSettings(panel2, state) {
    const label2 = (id) => stringFor(state.locale, id);
    if (panel2.getAttribute("data-built") !== "yes") {
      panel2.setAttribute("data-built", "yes");
      panel2.classList.add(CLASS_SETTINGS);
      panel2.textContent = "";
      const heading2 = document.createElement("div");
      heading2.className = "popover-header";
      labels.options = heading2;
      panel2.appendChild(heading2);
      const body = document.createElement("div");
      body.className = "popover-body";
      panel2.appendChild(body);
      const pageGroup = document.createElement("div");
      pageGroup.className = "form-group";
      const wrap = document.createElement("div");
      wrap.className = "form-check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.className = "form-check-input";
      input.id = DOUBLE_PAGE_ID;
      input.addEventListener("change", () => {
        latest == null ? void 0 : latest.handlers.onSetting({ doublePage: input.checked });
      });
      const box = document.createElement("label");
      box.className = "form-check-label";
      box.htmlFor = DOUBLE_PAGE_ID;
      labels.doublePage = box;
      wrap.appendChild(input);
      wrap.appendChild(box);
      pageGroup.appendChild(wrap);
      body.appendChild(pageGroup);
      const shiftGroup = document.createElement("div");
      shiftGroup.className = "form-group";
      const shift = document.createElement("div");
      shift.className = "form-check";
      const shiftInput = document.createElement("input");
      shiftInput.type = "checkbox";
      shiftInput.className = "form-check-input";
      shiftInput.id = OFFSET_ID;
      shiftInput.addEventListener("change", () => {
        latest == null ? void 0 : latest.handlers.onOffset(shiftInput.checked ? 1 : 0);
      });
      const shiftLabel = document.createElement("label");
      shiftLabel.className = "form-check-label";
      shiftLabel.htmlFor = OFFSET_ID;
      labels.offset = shiftLabel;
      shift.appendChild(shiftInput);
      shift.appendChild(shiftLabel);
      shiftGroup.appendChild(shift);
      body.appendChild(shiftGroup);
      const fade = document.createElement("div");
      fade.className = "form-group";
      const fadeLabel = document.createElement("label");
      fadeLabel.htmlFor = FADE_ID;
      labels.fade = fadeLabel;
      const range2 = document.createElement("input");
      range2.type = "range";
      range2.className = "form-range";
      range2.id = FADE_ID;
      range2.min = "0";
      range2.max = String(FADE_MAX_MS);
      range2.step = "20";
      range2.addEventListener("input", () => {
        latest == null ? void 0 : latest.handlers.onSetting({ fadeMs: Number(range2.value) });
      });
      const readout2 = text("manga-reader-readout");
      fade.appendChild(fadeLabel);
      fade.appendChild(range2);
      fade.appendChild(readout2);
      body.appendChild(fade);
    }
    const heading = label2("mangaReader.options");
    if (labels.options && labels.options.textContent !== heading) {
      labels.options.textContent = heading;
    }
    const check = panel2.querySelector(
      "#" + DOUBLE_PAGE_ID
    );
    if (check && check.checked !== state.settings.doublePage) {
      check.checked = state.settings.doublePage;
    }
    const doubleName = label2("mangaReader.doublePage");
    if (labels.doublePage && labels.doublePage.textContent !== doubleName) {
      labels.doublePage.textContent = doubleName;
    }
    const offset2 = panel2.querySelector(
      "#" + OFFSET_ID
    );
    if (offset2 && offset2.checked !== (state.offset === 1)) {
      offset2.checked = state.offset === 1;
    }
    const offsetName = label2("mangaReader.offset");
    if (labels.offset && labels.offset.textContent !== offsetName) {
      labels.offset.textContent = offsetName;
    }
    const range = panel2.querySelector("#" + FADE_ID);
    if (range && range.value !== String(state.settings.fadeMs)) {
      range.value = String(state.settings.fadeMs);
    }
    const readout = panel2.querySelector(".manga-reader-readout");
    const shown = state.settings.fadeMs + " ms";
    if (readout && readout.textContent !== shown) readout.textContent = shown;
    const fadeName = label2("mangaReader.fade");
    if (labels.fade && labels.fade.textContent !== fadeName) {
      labels.fade.textContent = fadeName;
    }
  }
  var DOUBLE_PAGE_ID = "manga-reader-double-page";
  var OFFSET_ID = "manga-reader-offset";
  var FADE_ID = "manga-reader-fade";
  function text(className, tag = "span") {
    const node = document.createElement(tag);
    node.className = className;
    return node;
  }
  function menuButton(opens, classes, icon) {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = classes + " " + CLASS_MENU_BUTTON;
    button2.dataset.opens = opens;
    button2.setAttribute("aria-haspopup", "true");
    button2.setAttribute("aria-expanded", "false");
    setIcon(button2, icon);
    button2.addEventListener("click", () => {
      openMenu = openMenu === opens ? null : opens;
      redraw();
    });
    return button2;
  }
  function showWhen(node, shown) {
    if (!node) return;
    if (node.getAttribute(HIDDEN) !== null === shown) {
      if (shown) node.removeAttribute(HIDDEN);
      else node.setAttribute(HIDDEN, "");
    }
  }
  function iconFor(opens, open) {
    if (opens !== "chapters") return "faCog";
    return open ? "faTimes" : "faBars";
  }
  function setIcon(host, name) {
    if (host.dataset.icon === name) return;
    host.dataset.icon = name;
    drawIcon(host, name);
  }
  function panel(opens, extra) {
    const node = document.createElement("div");
    node.className = [
      extra,
      CLASS_MENU_PANEL,
      opens === "chapters" ? CLASS_MENU_CHAPTERS : CLASS_MENU_SETTINGS
    ].join(" ");
    node.dataset.menu = opens;
    return node;
  }
  function drawIcon(host, name) {
    var _a2;
    const api = requirePluginApi();
    const Solid = api.libraries.FontAwesomeSolid || {};
    const Icon = api.components.Icon;
    const icon = Solid[name];
    const render2 = (_a2 = api.ReactDOM) == null ? void 0 : _a2.render;
    if (!Icon || !icon || !render2) return;
    render2(api.React.createElement(Icon, { icon }), host);
  }
  function zoomButton() {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = CLASS_ICON_BUTTON + " " + CLASS_ZOOM;
    button2.title = "Reset zoom";
    button2.setAttribute(HIDDEN, "");
    setIcon(button2, "faSearchMinus");
    button2.addEventListener("click", () => {
      openMenu = null;
      latest == null ? void 0 : latest.handlers.onResetZoom();
    });
    return button2;
  }
  function fullscreenButton(lightbox) {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = CLASS_ICON_BUTTON + " " + CLASS_FULLSCREEN;
    button2.title = "Toggle Fullscreen";
    setIcon(button2, "faExpand");
    button2.addEventListener("click", () => {
      openMenu = null;
      if (document.fullscreenElement) document.exitFullscreen();
      else lightbox.requestFullscreen();
    });
    return button2;
  }
  function closeButton() {
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = CLASS_ICON_BUTTON + " " + CLASS_CLOSE;
    button2.title = "Close Lightbox";
    setIcon(button2, "faTimes");
    button2.addEventListener("click", () => {
      openMenu = null;
      latest == null ? void 0 : latest.handlers.onClose();
    });
    return button2;
  }
  function forgetOpenMenu() {
    openMenu = null;
  }

  // src/reader/chapters-tab.ts
  var SEL_PANEL = ".container";
  var HIDDEN2 = "data-manga-reader-hidden";
  var IMPORT_ID = "manga-reader-chapters-import";
  var UNDO_ID = "manga-reader-chapters-undo";
  var CLASS_EDIT = "manga-reader-chapter-edit";
  var TAKEN = "data-manga-reader-taken";
  var renderedFor = "";
  var panelInHand = null;
  var inHand = null;
  var form = null;
  var formError = "";
  var undoLine = null;
  var undoButton = null;
  var control = null;
  var controlState = null;
  var controlFor = null;
  var busy = false;
  var confirming = false;
  function syncChaptersTab() {
    const id = galleryIdFromPath(window.location.pathname);
    if (!id) {
      forgetChaptersTab();
      return;
    }
    if (NS.markedInStore(id) !== true) return;
    const panel2 = findPanel();
    if (!panel2) return;
    if (!bridged()) return;
    if ((inHand == null ? void 0 : inHand.id) === id) {
      render(panel2, inHand);
      return;
    }
    if ((inHand == null ? void 0 : inHand.id) !== id) {
      inHand = null;
      renderedFor = "";
      fetchGallery(id, { sort: "path", direction: "ASC" }).then((answer) => {
        if (galleryIdFromPath(window.location.pathname) !== id) return;
        const pageIds = answer.pages.map((page) => page.id);
        const own = chaptersOf(answer);
        inHand = {
          id,
          images: answer.images,
          pages: answer.pages,
          stored: own.chapters,
          chapters: placeChapters(own.chapters, answer.pages),
          // The list an import would write, which is the same translation the tab
          // is showing for a gallery that has no list of this plugin's own.
          // Computed from the rows rather than from what is on screen: it is what
          // would be *written*, so it cannot depend on how the screen is ordered.
          importable: chaptersFromStash(answer.stashChapters, pageIds),
          own: own.own,
          locale: answer.language
        };
        syncChaptersTab();
      }).catch((e) => {
        console.error(
          "[mangaReader] could not read this gallery's chapters, so its tab is left as Stash drew it:",
          e
        );
      });
    }
  }
  function chaptersOf(answer) {
    const own = parseChapters(
      NS.pickField(answer.customFields, NS.CHAPTER_FIELD_NAME) || null
    );
    if (own) return { chapters: own, own: true };
    return {
      chapters: chaptersFromStash(
        answer.stashChapters,
        answer.pages.map((page) => page.id)
      ),
      own: false
    };
  }
  function findPanel() {
    const panels = document.querySelectorAll(SEL_PANEL);
    for (let i = 0; i < panels.length; i++) {
      const panel2 = panels[i];
      if (isStashButton(panel2.previousElementSibling)) return panel2;
    }
    return null;
  }
  function isStashButton(node) {
    return !!node && node.tagName === "BUTTON" && node.classList.contains("btn") && node.getAttribute(HIDDEN2) === null;
  }
  function render(panel2, gallery) {
    var _a2;
    const key = [
      gallery.id,
      gallery.own ? "own" : "none",
      String(gallery.importable.length),
      busy ? "busy" : confirming ? "confirm" : "idle",
      form ? "form:" + ((_a2 = form.startPageId) != null ? _a2 : "new") + (formError ? ":bad" : "") : "list",
      ...gallery.chapters.map((c) => c.title + "@" + c.at)
    ].join("|");
    if (key === renderedFor && panel2.childElementCount > 0) return;
    renderedFor = key;
    panelInHand = panel2;
    takeOverCreate(panel2);
    panel2.textContent = "";
    if (form) {
      drawForm(panel2, gallery);
    } else {
      for (const chapter of gallery.chapters) {
        panel2.appendChild(row(gallery, chapter));
      }
    }
    if (form) hideImport();
    else drawImport(panel2, gallery);
    drawUndo(panel2, gallery);
  }
  function takeOverCreate(panel2) {
    const button2 = panel2.previousElementSibling;
    if (!isStashButton(button2)) return;
    if (button2.getAttribute(TAKEN) !== null) return;
    button2.setAttribute(TAKEN, "");
    button2.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        openForm(null);
      },
      true
    );
  }
  function drawImport(panel2, gallery) {
    if (gallery.importable.length === 0) {
      control == null ? void 0 : control.remove();
      control = null;
      controlState = null;
      controlFor = null;
      confirming = false;
      return;
    }
    if ((controlFor == null ? void 0 : controlFor.id) !== gallery.id) confirming = false;
    controlFor = {
      id: gallery.id,
      importable: gallery.importable,
      own: gallery.own
    };
    if (!control) {
      control = document.createElement("div");
      control.id = IMPORT_ID;
      control.className = "manga-reader-chapters-import";
    }
    const place3 = panel2.parentNode;
    if (place3 && control.parentNode !== place3) {
      place3.insertBefore(control, panel2.nextElementSibling);
    }
    const state = busy ? "busy" : confirming ? "confirm" : "offer";
    if (state !== controlState) {
      controlState = state;
      control.textContent = "";
      buildControl(control, gallery.locale, state);
    }
  }
  function buildControl(box, locale, state) {
    if (state === "confirm") {
      const warning = document.createElement("div");
      warning.className = "manga-reader-chapters-import-warning";
      warning.textContent = stringFor(locale, "mangaReader.reimportWarning");
      box.appendChild(warning);
      box.appendChild(
        button("btn btn-danger btn-sm", "mangaReader.reimportReplace", () => {
          confirming = false;
          importChapters();
        })
      );
      box.appendChild(
        button("btn btn-secondary btn-sm", "mangaReader.reimportCancel", () => {
          confirming = false;
          redraw2();
        })
      );
      return;
    }
    const wording = state === "busy" ? "mangaReader.importingChapters" : (controlFor == null ? void 0 : controlFor.own) ? "mangaReader.reimportChapters" : "mangaReader.importChapters";
    const offer = button("btn btn-secondary btn-sm", wording, askToImport);
    offer.disabled = state === "busy";
    box.appendChild(offer);
  }
  function button(className, wording, onClick) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = className;
    node.textContent = stringFor(inHand == null ? void 0 : inHand.locale, wording);
    node.addEventListener("click", onClick);
    return node;
  }
  function askToImport() {
    if (!controlFor || busy) return;
    if (controlFor.own) {
      confirming = true;
      redraw2();
      return;
    }
    importChapters();
  }
  function importChapters() {
    const target2 = controlFor;
    if (!target2 || busy) return;
    if (typeof NS.writeChapters !== "function") {
      console.error(
        "[mangaReader] the tools half is not running, so this gallery's chapters cannot be written"
      );
      return;
    }
    busy = true;
    redraw2();
    NS.writeChapters(target2.id, serializeChapters(target2.importable)).then(
      () => {
        busy = false;
        if ((inHand == null ? void 0 : inHand.id) === target2.id) {
          inHand.own = true;
          inHand.importable = target2.importable;
        }
        confirming = false;
        redraw2();
      },
      (e) => {
        busy = false;
        confirming = false;
        console.error(
          "[mangaReader] could not import this gallery's chapters:",
          e
        );
        redraw2();
      }
    );
  }
  function redraw2() {
    if (!inHand || !panelInHand) return;
    render(panelInHand, inHand);
  }
  function drawForm(panel2, gallery) {
    var _a2, _b2;
    const editing = !!(form == null ? void 0 : form.startPageId);
    const node = document.createElement("form");
    node.className = "manga-reader-chapters-form";
    node.addEventListener("submit", (event) => event.preventDefault());
    const title = field(
      node,
      gallery.locale,
      "mangaReader.chapterTitle",
      "title",
      "text",
      (_a2 = form == null ? void 0 : form.initialTitle) != null ? _a2 : ""
    );
    const index = field(
      node,
      gallery.locale,
      "mangaReader.chapterIndex",
      "image_index",
      "number",
      (_b2 = form == null ? void 0 : form.initialIndex) != null ? _b2 : "1"
    );
    if (formError) {
      const error = document.createElement("div");
      error.className = "manga-reader-chapters-form-error";
      error.textContent = stringFor(gallery.locale, formError);
      node.appendChild(error);
    }
    const buttons = document.createElement("div");
    buttons.className = "buttons-container d-flex";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "btn btn-primary";
    save.textContent = stringFor(gallery.locale, "mangaReader.save");
    const settle2 = () => {
      const dirty = title.value !== (form == null ? void 0 : form.initialTitle) || index.value !== (form == null ? void 0 : form.initialIndex);
      save.disabled = editing ? !dirty : false;
    };
    title.addEventListener("input", settle2);
    index.addEventListener("input", settle2);
    settle2();
    save.addEventListener(
      "click",
      () => submitForm(title.value, Number(index.value))
    );
    buttons.appendChild(save);
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn-secondary ml-2";
    cancel.textContent = stringFor(gallery.locale, "mangaReader.cancel");
    cancel.addEventListener("click", closeForm);
    buttons.appendChild(cancel);
    if (editing) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn btn-danger ml-auto";
      remove.textContent = stringFor(gallery.locale, "mangaReader.delete");
      remove.addEventListener("click", deleteChapter);
      buttons.appendChild(remove);
    }
    node.appendChild(buttons);
    panel2.appendChild(node);
  }
  function field(parent, locale, labelId, name, type, value) {
    const group = document.createElement("div");
    group.className = "form-group row";
    group.setAttribute("data-field", name);
    const label2 = document.createElement("label");
    label2.className = "col-sm-3";
    label2.textContent = stringFor(locale, labelId);
    group.appendChild(label2);
    const column = document.createElement("div");
    column.className = "col-sm-9";
    const input = document.createElement("input");
    input.type = type;
    input.className = "form-control";
    input.value = value;
    column.appendChild(input);
    group.appendChild(column);
    parent.appendChild(group);
    return input;
  }
  function submitForm(title, index) {
    const gallery = inHand;
    const current2 = form;
    if (!gallery || !current2) return;
    if (!Number.isInteger(index) || index < 1 || index > gallery.pages.length) {
      formError = "mangaReader.chapterIndexRange";
      redraw2();
      return;
    }
    const order = gallery.pages.map((page) => page.id);
    const pageId = gallery.pages[index - 1].id;
    if (current2.startPageId === null) {
      const next2 = addChapterAt(gallery.stored, order, pageId, title);
      if (!next2) {
        formError = "mangaReader.chapterStartTaken";
        redraw2();
        return;
      }
      applyEdit(gallery, next2);
      return;
    }
    let next = gallery.stored;
    if (title !== current2.initialTitle) {
      next = renameChapterAt(next, order, current2.startPageId, title);
    }
    if (next && index !== Number(current2.initialIndex)) {
      next = moveChapterStart(next, order, current2.startPageId, pageId);
    }
    if (!next) {
      formError = "mangaReader.chapterNoSuch";
      redraw2();
      return;
    }
    if (next === gallery.stored) {
      closeForm();
      return;
    }
    applyEdit(gallery, next);
  }
  function deleteChapter() {
    const gallery = inHand;
    const current2 = form;
    if (!gallery || !(current2 == null ? void 0 : current2.startPageId)) return;
    const next = removeChapterAt(
      gallery.stored,
      gallery.pages.map((page) => page.id),
      current2.startPageId
    );
    if (!next) {
      formError = "mangaReader.chapterNoSuch";
      redraw2();
      return;
    }
    applyEdit(gallery, next);
  }
  function applyEdit(gallery, next) {
    busy = true;
    redraw2();
    writeChapters(gallery.id, next, gallery.stored).then(
      () => {
        busy = false;
        closeForm();
      },
      (e) => {
        busy = false;
        console.error(
          "[mangaReader] could not write this gallery's chapters:",
          e
        );
        redraw2();
      }
    );
  }
  function closeForm() {
    form = null;
    formError = "";
    redraw2();
  }
  function drawUndo(panel2, gallery) {
    if (!canUndoChapters(gallery.id)) {
      undoLine == null ? void 0 : undoLine.remove();
      undoLine = null;
      undoButton = null;
      return;
    }
    if (!undoLine || !undoButton) {
      undoButton = document.createElement("button");
      undoButton.type = "button";
      undoButton.className = "btn btn-link btn-sm";
      undoButton.addEventListener("click", undoLast);
      undoLine = document.createElement("div");
      undoLine.id = UNDO_ID;
      undoLine.className = "manga-reader-chapters-undo";
      undoLine.appendChild(undoButton);
    }
    const place3 = panel2.parentNode;
    if (place3 && undoLine.parentNode !== place3) {
      place3.insertBefore(undoLine, panel2.nextElementSibling);
    }
    const text2 = stringFor(gallery.locale, "mangaReader.undoChapters");
    if (undoButton.textContent !== text2) undoButton.textContent = text2;
  }
  function undoLast() {
    const gallery = inHand;
    if (!gallery || busy) return;
    busy = true;
    redraw2();
    undoChapters(gallery.id).then(
      () => {
        busy = false;
        redraw2();
      },
      (e) => {
        busy = false;
        console.error("[mangaReader] could not take that change back:", e);
        redraw2();
      }
    );
  }
  function hideImport() {
    control == null ? void 0 : control.remove();
  }
  watchChapters((galleryId2, chapters) => {
    if ((inHand == null ? void 0 : inHand.id) !== galleryId2) return;
    inHand.stored = chapters;
    inHand.chapters = placeChapters(chapters, inHand.pages);
    inHand.own = true;
    renderedFor = "";
    redraw2();
  });
  function row(gallery, chapter) {
    const wrap = document.createElement("div");
    const rule = document.createElement("hr");
    wrap.appendChild(rule);
    const line = document.createElement("div");
    line.className = "row";
    const button2 = document.createElement("button");
    button2.type = "button";
    button2.className = "btn btn-link";
    const label2 = document.createElement("div");
    label2.className = "row";
    label2.textContent = (chapter.title.length > 0 ? chapter.title + " - #" : "#") + (chapter.at + 1);
    button2.appendChild(label2);
    button2.addEventListener("click", () => {
      takeOver({
        images: gallery.images,
        totalCount: gallery.images.length,
        at: chapter.at
      });
    });
    line.appendChild(button2);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-link ml-auto " + CLASS_EDIT;
    edit.textContent = stringFor(gallery.locale, "mangaReader.editChapter");
    edit.addEventListener("click", () => openForm(chapter));
    line.appendChild(edit);
    wrap.appendChild(line);
    return wrap;
  }
  function openForm(chapter) {
    var _a2, _b2, _c;
    const gallery = inHand;
    if (!gallery) return;
    form = {
      startPageId: chapter ? (_b2 = (_a2 = gallery.pages[chapter.at]) == null ? void 0 : _a2.id) != null ? _b2 : null : null,
      initialTitle: (_c = chapter == null ? void 0 : chapter.title) != null ? _c : "",
      // Both are one-based already: a chapter's index is where it begins counted from
      // one, and the reading page comes back that way too.
      initialIndex: chapter ? String(chapter.at + 1) : String(indexOfReadingPage(gallery))
    };
    formError = "";
    redraw2();
  }
  function indexOfReadingPage(gallery) {
    var _a2, _b2;
    const id = (_b2 = (_a2 = NR).readingPageIdNow) == null ? void 0 : _b2.call(_a2, gallery.id);
    if (!id) return 1;
    const at = gallery.pages.findIndex((page) => page.id === id);
    return at < 0 ? 1 : at + 1;
  }
  function forgetChaptersTab() {
    inHand = null;
    renderedFor = "";
    panelInHand = null;
    control = null;
    controlState = null;
    controlFor = null;
    confirming = false;
    form = null;
    formError = "";
    undoLine = null;
    undoButton = null;
  }

  // src/reader/footer.ts
  var CLAIMED = "data-manga-reader-link";
  function syncFooter(lightbox, image) {
    const link = lightbox.querySelector(".Lightbox-footer-center .image-link");
    if (!link || !image) return;
    const name = titleOf(image);
    if (link.textContent !== name) link.textContent = name;
    const href = "/images/" + image.id;
    if (link.getAttribute("href") !== href) link.setAttribute("href", href);
    if (link.getAttribute(CLAIMED) === null) {
      link.setAttribute(CLAIMED, "");
      link.addEventListener("click", (event) => event.stopPropagation(), true);
    }
  }
  function titleOf(image) {
    var _a2, _b2;
    if (image.title) return image.title;
    const path = ((_b2 = (_a2 = image.visual_files) == null ? void 0 : _a2[0]) == null ? void 0 : _b2.path) || "";
    return path ? path.replace(/^.*[\\/]/, "") : "No File Name";
  }

  // src/reader/progress.ts
  var PROGRESS_SCRUB_MS = 120;
  var PROGRESS_IDLE_MS = 2e3;
  function fractionOfPage(page, total) {
    if (total <= 1) return 0;
    return Math.min(Math.max(page, 0), total - 1) / total;
  }
  function pageAtFraction(fraction, total) {
    if (total <= 1) return 0;
    const page = Math.round(fraction * total);
    return Math.min(Math.max(page, 0), total - 1);
  }
  function progressNodes(chapters, total) {
    const nodes2 = [];
    const seen = /* @__PURE__ */ new Set();
    chapters.forEach((chapter, index) => {
      if (chapter.at < 0 || chapter.at >= total || seen.has(chapter.at)) return;
      seen.add(chapter.at);
      nodes2.push({
        // A chapter with no name is named by its place, which is what the header's own
        // menu calls it too.
        name: chapter.title || "#" + (index + 1),
        at: chapter.at,
        fraction: fractionOfPage(chapter.at, total)
      });
    });
    return nodes2;
  }
  var CLASS_BAR = "manga-reader-progress";
  var CLASS_TRACK = "manga-reader-progress-track";
  var CLASS_READ = "manga-reader-progress-read";
  var CLASS_THUMB = "manga-reader-progress-thumb";
  var CLASS_NODES = "manga-reader-progress-nodes";
  var CLASS_PAGE_WORDS = "manga-reader-progress-page";
  var CLASS_CHAPTER_WORDS = "manga-reader-progress-chapter";
  var CLASS_NODE = "manga-reader-progress-node";
  var CLASS_LABEL = "manga-reader-progress-label";
  var CLASS_SCRUBBING = "is-scrubbing";
  var CLASS_IDLE = "is-idle";
  var CLASS_SHOWING = "is-showing";
  var latest2 = null;
  var bar = null;
  var track = null;
  var read = null;
  var thumb = null;
  var label = null;
  var labelPage = null;
  var labelChapter = null;
  var nodes = null;
  var drawn = null;
  var labelWidth = 0;
  var bubble = null;
  var pointer = null;
  var target = 0;
  var lastJump = 0;
  var pending = null;
  var idle = null;
  var lastWidth = 0;
  var owed = false;
  function ensureProgress(lightbox, state) {
    latest2 = state;
    if (!lightbox.querySelector(".Lightbox-footer")) return bar;
    if (state.total <= 1) return null;
    if (!bar) build(lightbox);
    else if (bar.parentNode !== lightbox) place(lightbox);
    if (!bar || !track || !read || !thumb || !label || !nodes) return bar;
    update2(state);
    return bar;
  }
  function removeProgress(lightbox) {
    const node = lightbox.querySelector("." + CLASS_BAR);
    if (node) node.remove();
    if (node !== bar) return;
    if (pressed) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onRelease);
    }
    stopTimers();
    bar = null;
    track = null;
    read = null;
    thumb = null;
    label = null;
    nodes = null;
    drawn = null;
    latest2 = null;
    bubble = null;
    pointer = null;
    pressed = false;
    labelWidth = 0;
  }
  function build(lightbox) {
    bar = document.createElement("div");
    bar.className = CLASS_BAR + " " + CLASS_IDLE;
    label = document.createElement("div");
    label.className = CLASS_LABEL;
    labelPage = document.createElement("div");
    labelPage.className = CLASS_PAGE_WORDS;
    labelChapter = document.createElement("div");
    labelChapter.className = CLASS_CHAPTER_WORDS;
    label.appendChild(labelPage);
    label.appendChild(labelChapter);
    track = document.createElement("div");
    track.className = CLASS_TRACK;
    read = document.createElement("div");
    read.className = CLASS_READ;
    nodes = document.createElement("div");
    nodes.className = CLASS_NODES;
    thumb = document.createElement("div");
    thumb.className = CLASS_THUMB;
    track.appendChild(read);
    track.appendChild(nodes);
    track.appendChild(thumb);
    track.appendChild(label);
    bar.appendChild(track);
    track.addEventListener("mousemove", onMoveOverBar);
    track.addEventListener("mouseleave", onLeaveTrack);
    track.addEventListener("mousedown", onPress);
    place(lightbox);
  }
  function place(lightbox) {
    if (!bar) return;
    const footer = lightbox.querySelector(".Lightbox-footer");
    if (footer) lightbox.insertBefore(bar, footer);
    else lightbox.appendChild(bar);
  }
  function update2(state) {
    if (!bar || !track || !read || !thumb || !label || !nodes) return;
    const key = state.chapters.map((c) => c.at + ":" + c.title).join("|");
    if (!drawn || drawn.nodes !== key || drawn.total !== state.total) {
      drawNodes(state);
    }
    if (state.width > 0) lastWidth = state.width;
    if (!pressed && lastWidth > 0) {
      const wanted2 = Math.round(lastWidth) + "px";
      if (track.style.width !== wanted2) track.style.width = wanted2;
    }
    const settled = fractionOfPage(state.at, state.total);
    const fraction = pointer === null ? settled : pointer;
    const where = (fraction * 100).toFixed(3) + "%";
    if (read.style.width !== where) read.style.width = where;
    if (thumb.style.left !== where) thumb.style.left = where;
    if (bubble) {
      if ((labelPage == null ? void 0 : labelPage.textContent) !== bubble.page) {
        if (labelPage) labelPage.textContent = bubble.page;
        labelWidth = label.offsetWidth;
      }
      if ((labelChapter == null ? void 0 : labelChapter.textContent) !== bubble.chapter) {
        if (labelChapter) labelChapter.textContent = bubble.chapter;
        labelWidth = label.offsetWidth;
      }
    }
    if (bubble) {
      const half = labelWidth / 2;
      const width = track.clientWidth || 0;
      const px = Math.max(half, Math.min(bubble.fraction * width, width - half)).toFixed(
        0
      ) + "px";
      if (label.style.left !== px) label.style.left = px;
    }
    if (owed && state.width > 0) {
      owed = false;
      wake();
    }
    const moved = drawn !== null && (drawn.at !== state.at || drawn.total !== state.total);
    drawn = { nodes: key, at: state.at, total: state.total };
    if (moved && !pressed) takeBubbleDown();
    if (moved) wake();
  }
  function drawNodes(state) {
    if (!nodes) return;
    nodes.textContent = "";
    for (const node of progressNodes(state.chapters, state.total)) {
      const tick = document.createElement("div");
      tick.className = CLASS_NODE;
      tick.style.left = (node.fraction * 100).toFixed(3) + "%";
      tick.dataset.name = node.name;
      tick.dataset.at = String(node.at);
      tick.dataset.fraction = String(node.fraction);
      nodes.appendChild(tick);
    }
  }
  function onMoveOverBar(event) {
    var _a2, _b2, _c;
    wake();
    if (pressed) return;
    const node = event.target;
    const tick = ((_a2 = node == null ? void 0 : node.classList) == null ? void 0 : _a2.contains(CLASS_NODE)) ? node : null;
    if (!tick) {
      takeBubbleDown();
      return;
    }
    const chapter = ((_b2 = tick.dataset) == null ? void 0 : _b2.name) || "";
    if ((bubble == null ? void 0 : bubble.chapter) === chapter) return;
    setBubble({
      page: "",
      chapter,
      fraction: Number(((_c = tick.dataset) == null ? void 0 : _c.fraction) || 0)
    });
    redraw3();
  }
  function onLeaveTrack() {
    if (!pressed) takeBubbleDown();
  }
  function tickUnder(target2) {
    var _a2;
    const node = target2;
    return ((_a2 = node == null ? void 0 : node.classList) == null ? void 0 : _a2.contains(CLASS_NODE)) ? node : null;
  }
  function setBubble(next) {
    bubble = next;
    bar == null ? void 0 : bar.classList.add(CLASS_SHOWING);
  }
  function takeBubbleDown() {
    if (!bubble) return;
    bubble = null;
    bar == null ? void 0 : bar.classList.remove(CLASS_SHOWING);
    redraw3();
  }
  function wake() {
    if (!bar) return;
    if (lastWidth <= 0) {
      bar.classList.add(CLASS_IDLE);
      owed = true;
      return;
    }
    bar.classList.remove(CLASS_IDLE);
    if (idle !== null) window.clearTimeout(idle);
    idle = window.setTimeout(() => {
      idle = null;
      bar == null ? void 0 : bar.classList.add(CLASS_IDLE);
    }, PROGRESS_IDLE_MS);
  }
  function stopTimers() {
    if (idle !== null) window.clearTimeout(idle);
    if (pending !== null) window.clearTimeout(pending);
    idle = null;
    pending = null;
  }
  var pressed = false;
  function fractionAt(clientX) {
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const width = rect.width || track.clientWidth || 1;
    return Math.min(Math.max((clientX - rect.left) / width, 0), 1);
  }
  function onPress(event) {
    var _a2, _b2, _c;
    const press = event;
    if (press.button !== 0 || !track) return;
    press.preventDefault();
    press.stopPropagation();
    pressed = true;
    bar == null ? void 0 : bar.classList.add(CLASS_SCRUBBING);
    const tick = tickUnder(press.target);
    if (tick) {
      const fraction = Number(((_a2 = tick.dataset) == null ? void 0 : _a2.fraction) || 0);
      target = Number(((_b2 = tick.dataset) == null ? void 0 : _b2.at) || 0);
      pointer = fraction;
      lastJump = Date.now();
      setBubble({ page: "", chapter: ((_c = tick.dataset) == null ? void 0 : _c.name) || "", fraction });
      latest2 == null ? void 0 : latest2.handlers.onSeek(target);
      redraw3();
    } else {
      bubble = null;
      scrubTo(fractionAt(press.clientX));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onRelease);
  }
  function onMove(event) {
    if (!pressed) return;
    scrubTo(fractionAt(event.clientX));
  }
  function onRelease() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onRelease);
    pressed = false;
    bar == null ? void 0 : bar.classList.remove(CLASS_SCRUBBING);
    settle();
  }
  function scrubTo(fraction) {
    var _a2, _b2;
    pointer = fraction;
    target = pageAtFraction(fraction, (_a2 = latest2 == null ? void 0 : latest2.total) != null ? _a2 : 1);
    setBubble({
      page: target + 1 + " / " + ((_b2 = latest2 == null ? void 0 : latest2.total) != null ? _b2 : 1),
      chapter: (latest2 == null ? void 0 : latest2.chapterNameAt(target)) || "",
      fraction
    });
    redraw3();
    if (!latest2 || target === latest2.at) return;
    const since = Date.now() - lastJump;
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
    if (since >= PROGRESS_SCRUB_MS) {
      lastJump = Date.now();
      latest2.handlers.onSeek(target);
    } else {
      pending = window.setTimeout(() => {
        pending = null;
        lastJump = Date.now();
        latest2 == null ? void 0 : latest2.handlers.onSeek(target);
      }, PROGRESS_SCRUB_MS - since);
    }
  }
  function settle() {
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
    lastJump = Date.now();
    const wanted2 = target;
    pointer = null;
    latest2 == null ? void 0 : latest2.handlers.onSeek(wanted2);
    takeBubbleDown();
    redraw3();
  }
  function redraw3() {
    if (latest2) update2(latest2);
  }

  // src/reader/spreads.ts
  var DEFAULT_SPREAD_OPTIONS = {
    coverAlone: true,
    offset: 0,
    detectSpreads: true,
    double: true
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
      const next = opts.double ? pages[i + 1] : void 0;
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
    const target2 = screens[at + direction];
    if (!target2) return 0;
    return target2.start - pageIndex;
  }
  NR.isWideSpreadPage = isWideSpreadPage;
  NR.layout = layout;
  NR.screenAt = screenAt;
  NR.stepsToAdjacent = stepsToAdjacent;

  // src/reader/zoom.ts
  var VIEW_MIN_ZOOM = 0.1;
  var VIEW_MAX_ZOOM = 8;
  var VIEW_STEP = 1.1;
  var VIEW_PAN_STEP = 75;
  var VIEW_SNAP = 0.015;
  var VIEW_CLICK_MS = 200;
  function fitView() {
    return { zoom: 1, x: 0, y: 0 };
  }
  function centred(view2) {
    return { zoom: view2.zoom, x: 0, y: 0 };
  }
  function isZoomed(view2) {
    return view2.zoom !== 1;
  }
  function zoomed(view2, factor) {
    const wanted2 = Math.min(
      Math.max(view2.zoom * factor, VIEW_MIN_ZOOM),
      VIEW_MAX_ZOOM
    );
    const zoom = Math.abs(wanted2 - 1) < VIEW_SNAP ? 1 : wanted2;
    return { ...view2, zoom };
  }
  function panned(view2, dx, dy) {
    return { zoom: view2.zoom, x: view2.x + dx, y: view2.y + dy };
  }

  // src/reader/takeover.ts
  var CLASS_SINGLE = "is-single";
  var CLASS_ZOOMED = "is-zoomed";
  var CLASS_ACTIVE = "manga-reader-active";
  var CLASS_SPREAD = "manga-reader-spread";
  var CLASS_PAGE = "manga-reader-page";
  var CLASS_TAKEOVER = "manga-reader-takeover";
  var MAX_REINSERTS = 8;
  var CACHE_LIMIT = 8;
  var settings = readSettings();
  var root = null;
  var container = null;
  var view = fitView();
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
  var clickRoot = null;
  var pending2 = null;
  var handedFor = null;
  var place2 = -1;
  function step() {
    syncChaptersTab();
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
      place2 = -1;
      reinsers = 0;
      logged = false;
      handedFor = null;
    }
    const wantedId = galleryIdFromPath(window.location.pathname);
    if (!wantedId) return;
    const marked = NS.markedInStore(wantedId);
    if (marked !== true) {
      if (marked === false) leaveUnmarked(lightbox);
      return;
    }
    claim(lightbox);
    if (galleryId !== wantedId || !loaded.has(wantedId)) {
      loadGallery(wantedId);
      return;
    }
    const gallery = current();
    if (gallery) handOverChapters(lightbox, gallery);
    if (!wanted()) return;
    sync(lightbox);
  }
  function claim(lightbox) {
    lightbox.classList.add(CLASS_ACTIVE);
    lightbox.classList.add(CLASS_TAKEOVER);
  }
  function wanted() {
    const id = galleryIdFromPath(window.location.pathname);
    return root !== null && id !== null && NS.markedInStore(id) === true;
  }
  function leaveUnmarked(lightbox) {
    if (container || root !== lightbox) deactivate();
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
    if (pending2 === id) return;
    const forLightbox = root;
    if (!forLightbox) return;
    pending2 = id;
    loadPages(id, lightboxOrder(window.location.search), forLightbox).then((answer) => {
      if (pending2 !== id) return;
      pending2 = null;
      if (root !== forLightbox) return;
      const gallery = {
        id,
        pages: answer.pages,
        images: answer.images,
        paired: settings.doublePage,
        screens: layout(answer.pages, {
          ...settings,
          offset,
          double: settings.doublePage
        }),
        chapters: placeChapters(chaptersOf2(answer), answer.pages)
      };
      remember(id, gallery);
      language = answer.language;
      galleryId = id;
      shownAt = -1;
      place2 = -1;
      step();
    }).catch((e) => {
      if (pending2 === id) pending2 = null;
      console.error(
        "[mangaReader] could not read this gallery's pages, turning the spread view off:",
        e
      );
      deactivate();
    });
  }
  async function loadPages(id, order, lightbox) {
    const answer = await fetchGallery(id, order);
    const shown = carouselImage(lightbox);
    if (!shown) return answer;
    if (!answer.pages.some((page) => page.id === shown.id)) {
      throw new Error(
        "[mangaReader] the lightbox is showing image " + shown.id + ", which is not among the pages this plugin read \u2014 the list behind it is filtered, so its pages cannot be paired"
      );
    }
    return answer;
  }
  function placeOf(gallery, lightbox) {
    const shown = carouselImage(lightbox);
    if (!shown) return -1;
    for (let i = 0; i < gallery.pages.length; i++) {
      if (gallery.pages[i].id === shown.id) return i;
    }
    return -1;
  }
  function chaptersOf2(answer) {
    const own = parseChapters(
      NS.pickField(answer.customFields, NS.CHAPTER_FIELD_NAME) || null
    );
    if (own) return own;
    if (answer.stashChapters.length === 0) return [];
    const pathIds = answer.pathIds || answer.pages.map((page) => page.id);
    return chaptersFromStash(answer.stashChapters, pathIds);
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
    if (lightboxIsLoading(lightbox)) return;
    if (gallery.paired !== settings.doublePage) {
      gallery.screens = layout(gallery.pages, {
        ...settings,
        offset,
        double: settings.doublePage
      });
      gallery.paired = settings.doublePage;
      shownAt = -1;
    }
    if (place2 < 0) {
      place2 = placeOf(gallery, lightbox);
      if (place2 < 0 && gallery.pages.length > 1) {
        console.error(
          "[mangaReader] the lightbox is showing an image this plugin did not read, so the spread view cannot follow it \u2014 turning itself off"
        );
        deactivate();
        return;
      }
    }
    ensureChrome(lightbox, chromeState(gallery, lightbox));
    lightbox.classList.add(CLASS_TAKEOVER);
    const at = screenNow(gallery);
    syncFooter(
      lightbox,
      at < 0 ? null : gallery.images[gallery.screens[at].start] || null
    );
    if (at >= 0) ensureProgress(lightbox, progressState(gallery, at, lightbox));
    if (at < 0) return;
    if (at === shownAt && container && (container.childElementCount || awaiting === at)) {
      return;
    }
    ensureContainer(lightbox);
    if (!container) return;
    draw(gallery.screens[at], at);
  }
  function progressState(gallery, at, lightbox) {
    var _a2, _b2, _c;
    const screen = gallery.screens[at];
    return {
      at: (_b2 = (_a2 = gallery.screens[at]) == null ? void 0 : _a2.start) != null ? _b2 : 0,
      total: gallery.pages.length,
      width: pictureWidth((_c = screen == null ? void 0 : screen.pages.length) != null ? _c : 0),
      chapters: gallery.chapters,
      chapterNameAt: (page) => {
        var _a3, _b3;
        return ((_b3 = chapterAt(gallery.chapters, ((_a3 = gallery.pages[page]) == null ? void 0 : _a3.id) || "")) == null ? void 0 : _b3.title) || "";
      },
      handlers: {
        onSeek: (to) => seekTo(lightbox, to)
      }
    };
  }
  function chromeState(gallery, lightbox) {
    var _a2;
    const at = screenNow(gallery);
    const image = at < 0 ? null : gallery.images[gallery.screens[at].start] || null;
    const pageId = at < 0 ? "" : ((_a2 = gallery.pages[gallery.screens[at].start]) == null ? void 0 : _a2.id) || "";
    return {
      image,
      number: Math.max(place2, 0) + 1,
      total: gallery.pages.length,
      chapter: chapterAt(gallery.chapters, pageId),
      chapters: gallery.chapters,
      placed: gallery.chapters,
      settings,
      offset,
      locale: language,
      zoomed: isZoomed(view),
      handlers: {
        onResetZoom: () => {
          view = fitView();
          applyView();
          sync(lightbox);
        },
        onChapter: (to) => {
          place2 = to;
          step();
        },
        onSetting: (next) => {
          settings = writeSettings(next);
          if (next.doublePage === void 0) return;
          if (galleryId && loaded.has(galleryId)) {
            remember(galleryId, {
              ...gallery,
              screens: layout(gallery.pages, {
                ...settings,
                offset,
                double: settings.doublePage
              }),
              paired: settings.doublePage
            });
            shownAt = -1;
            sync(lightbox);
          }
        },
        onOffset: (next) => {
          setOffset(gallery, next);
          shownAt = -1;
          sync(lightbox);
        },
        onClose: () => pressEscape()
      }
    };
  }
  function watchClicks(lightbox) {
    if (clickRoot === lightbox) return;
    if (clickRoot) clickRoot.removeEventListener("click", onNavClick, true);
    lightbox.addEventListener("click", onNavClick, true);
    clickRoot = lightbox;
  }
  function ensureContainer(lightbox) {
    const display = lightbox.querySelector(SELECTOR_DISPLAY);
    if (!display) {
      deactivate();
      return;
    }
    watchClicks(lightbox);
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
      container.addEventListener("click", onSpreadClick);
      container.addEventListener("wheel", onSpreadWheel);
      container.addEventListener("mousedown", onSpreadPress);
      container.addEventListener(
        "load",
        () => {
          if (root) sync(root);
        },
        true
      );
    }
    display.style.position = "relative";
    display.appendChild(container);
    lightbox.classList.add(CLASS_ACTIVE);
  }
  var REVEAL_BUDGET_MS = 300;
  NR.REVEAL_BUDGET_MS = REVEAL_BUDGET_MS;
  NR.readingPageIdNow = (galleryId2) => {
    var _a2, _b2;
    const gallery = loaded.get(galleryId2);
    if (!gallery || place2 < 0) return null;
    return (_b2 = (_a2 = gallery.pages[place2]) == null ? void 0 : _a2.id) != null ? _b2 : null;
  };
  watchChapters((galleryId2, chapters) => {
    const gallery = loaded.get(galleryId2);
    if (!gallery) return;
    gallery.chapters = placeChapters(chapters, gallery.pages);
    if (root) sync(root);
  });
  NR.fitView = fitView;
  NR.centred = centred;
  NR.zoomed = zoomed;
  NR.panned = panned;
  NR.isZoomed = isZoomed;
  NR.VIEW_MIN_ZOOM = VIEW_MIN_ZOOM;
  NR.VIEW_MAX_ZOOM = VIEW_MAX_ZOOM;
  NR.VIEW_STEP = VIEW_STEP;
  NR.VIEW_CLICK_MS = VIEW_CLICK_MS;
  NR.fractionOfPage = fractionOfPage;
  NR.pageAtFraction = pageAtFraction;
  NR.progressNodes = progressNodes;
  NR.PROGRESS_SCRUB_MS = PROGRESS_SCRUB_MS;
  NR.PROGRESS_IDLE_MS = PROGRESS_IDLE_MS;
  function fadeIn(element) {
    if (settings.fadeMs <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: settings.fadeMs,
      easing: "ease-out"
    });
  }
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
      image.draggable = false;
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
      view = centred(view);
      applyView();
      container.classList.toggle(CLASS_SINGLE, screen.pages.length === 1);
      boxes.forEach((box) => {
        container == null ? void 0 : container.appendChild(box);
      });
      fadeIn(container);
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
  function screenNow(gallery) {
    if (place2 < 0) return -1;
    return screenAt(gallery.screens, place2);
  }
  function deactivate() {
    if (container) {
      container.remove();
      container = null;
    }
    view = fitView();
    pressed2 = null;
    held = false;
    if (root) {
      removeChrome(root);
      removeProgress(root);
      root.classList.remove(CLASS_TAKEOVER);
    }
    forgetOpenMenu();
    place2 = -1;
    if (root) {
      root.classList.remove(CLASS_ACTIVE);
      const display = root.querySelector(SELECTOR_DISPLAY);
      if (display) display.style.position = "";
    }
    shownAt = -1;
  }
  function closeLightbox() {
    handedFor = null;
    place2 = -1;
    forgetOpenMenu();
    if (clickRoot) {
      clickRoot.removeEventListener("click", onNavClick, true);
      clickRoot = null;
    }
    deactivate();
    root = null;
    galleryId = null;
    logged = false;
  }
  function measureAgain() {
    if (root) sync(root);
  }
  function handOverChapters(lightbox, gallery) {
    if (!bridged()) return;
    if ((handedFor == null ? void 0 : handedFor.lightbox) === lightbox && handedFor.gallery === gallery.id)
      return;
    handedFor = { lightbox, gallery: gallery.id };
    takeOver({
      images: gallery.images,
      totalCount: gallery.images.length
    });
  }
  function arrowsBelongTo(target2) {
    if (!target2) return false;
    if (target2.isContentEditable) return true;
    const tag = target2.tagName;
    if (tag === "TEXTAREA") return true;
    if (tag !== "INPUT") return false;
    const type = (target2.type || "text").toLowerCase();
    return [
      "date",
      "datetime-local",
      "email",
      "month",
      "number",
      "password",
      "range",
      "search",
      "tel",
      "text",
      "time",
      "url",
      "week"
    ].indexOf(type) !== -1;
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
    if (arrowsBelongTo(event.target)) return;
    if (!turnBy(lightbox, event.key === "ArrowRight" ? 1 : -1)) return;
    event.preventDefault();
    event.stopPropagation();
  }
  function turnBy(lightbox, direction) {
    const gallery = current();
    if (!gallery) return false;
    const at = screenNow(gallery);
    if (at < 0) return false;
    const steps = stepsToAdjacent(gallery.screens, place2, direction);
    if (steps === 0) return false;
    place2 += steps;
    sync(lightbox);
    return true;
  }
  function pictureWidth(pages) {
    if (!container || pages <= 0) return 0;
    let left = Number.POSITIVE_INFINITY;
    let right = 0;
    for (const node of Array.from(container.querySelectorAll("img"))) {
      const image = node;
      left = Math.min(left, image.offsetLeft);
      right = Math.max(right, image.offsetLeft + image.offsetWidth);
    }
    return right > left ? right - left : 0;
  }
  function seekTo(lightbox, at) {
    const gallery = current();
    if (!gallery) return;
    place2 = Math.min(Math.max(at, 0), gallery.pages.length - 1);
    sync(lightbox);
  }
  function navIcon(button2) {
    var _a2;
    for (const child of Array.from(button2.children)) {
      const name = (_a2 = child.dataset) == null ? void 0 : _a2.icon;
      if (name) return name;
    }
    return "";
  }
  function navDirection(target2) {
    var _a2;
    let el = target2;
    while (el && !((_a2 = el.classList) == null ? void 0 : _a2.contains(CLASS_NAVBUTTON))) el = el.parentElement;
    if (!el) return 0;
    const icon = navIcon(el);
    if (icon === "chevron-right") return 1;
    if (icon === "chevron-left") return -1;
    return 0;
  }
  function onNavClick(event) {
    if (!wanted() || !container || !root) return;
    const direction = navDirection(event.target);
    if (!direction) return;
    if (turnBy(root, direction)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  function onSpreadClick(event) {
    const lightbox = root;
    if (!lightbox || !container) return;
    if (held) {
      held = false;
      return;
    }
    const target2 = event.target;
    if ((target2 == null ? void 0 : target2.tagName) !== "IMG") {
      if (inFullscreen(lightbox)) {
        event.stopPropagation();
        return;
      }
      event.stopPropagation();
      pressEscape();
      return;
    }
    const click = event;
    const width = target2.offsetWidth;
    const forward = !width || click.offsetX >= width / 2;
    if (turnBy(lightbox, forward ? 1 : -1)) event.stopPropagation();
  }
  function onSpreadWheel(event) {
    if (!container) return;
    const wheel = event;
    const up = wheel.deltaY < 0;
    view = wheel.shiftKey ? panned(view, 0, up ? -VIEW_PAN_STEP : VIEW_PAN_STEP) : zoomed(view, up ? VIEW_STEP : 1 / VIEW_STEP);
    applyView();
    redrawChrome();
  }
  function onSpreadPress(event) {
    const press = event;
    if (press.button !== 0) return;
    pressed2 = { x: press.clientX, y: press.clientY, at: press.timeStamp };
    held = false;
    document.addEventListener("mousemove", onSpreadMove);
    document.addEventListener("mouseup", onSpreadRelease);
  }
  var pressed2 = null;
  var held = false;
  function onSpreadMove(event) {
    if (!pressed2 || !container) return;
    const move = event;
    const dx = move.clientX - pressed2.x;
    const dy = move.clientY - pressed2.y;
    held = true;
    pressed2.x = move.clientX;
    pressed2.y = move.clientY;
    view = panned(view, dx, dy);
    applyView();
  }
  function onSpreadRelease(event) {
    document.removeEventListener("mousemove", onSpreadMove);
    document.removeEventListener("mouseup", onSpreadRelease);
    const release = event;
    if (pressed2 && release.timeStamp - pressed2.at > VIEW_CLICK_MS) held = true;
    pressed2 = null;
  }
  function applyView() {
    if (!container) return;
    container.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
    container.classList.toggle(CLASS_ZOOMED, isZoomed(view));
  }
  function redrawChrome() {
    if (root) sync(root);
  }
  function setOffset(gallery, next) {
    offset = next;
    offsetFor = gallery.id;
    writeOffset(gallery.id, next);
    gallery.screens = layout(gallery.pages, {
      ...settings,
      offset,
      double: settings.doublePage
    });
    shownAt = -1;
    step();
  }
  var seenPath = null;
  function onLocation(event) {
    var _a2, _b2, _c;
    const path = (_c = (_b2 = (_a2 = event == null ? void 0 : event.detail) == null ? void 0 : _a2.data) == null ? void 0 : _b2.location) == null ? void 0 : _c.pathname;
    if (typeof path !== "string") return;
    const moved = seenPath !== null && path !== seenPath;
    seenPath = path;
    if (moved && root) pressEscape();
  }
  function install() {
    var _a2;
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
    document.addEventListener("fullscreenchange", measureAgain);
    window.addEventListener("resize", measureAgain);
    const api = requirePluginApi();
    if ((_a2 = api.Event) == null ? void 0 : _a2.addEventListener) {
      api.Event.addEventListener("stash:location", onLocation);
    }
    installBridge();
    NS.watchStore(() => step());
    step();
  }

  // src/tools/censorship.tsx
  var PluginApi = requirePluginApi();
  var React = PluginApi.React;
  NS.CENSORSHIP_VALUES = ["censored", "uncensored"];
  NS.normalizeCensorship = (raw) => {
    if (raw === null || raw === void 0) return "";
    const s = String(raw).trim().toLowerCase();
    if (s === "") return "";
    const values = NS.CENSORSHIP_VALUES;
    for (let i = 0; i < values.length; i++) {
      if (values[i] === s) return values[i];
    }
    return "";
  };
  var ICONS = {
    censored: "faChessKnight",
    uncensored: "faChessPawn",
    "": "faChessBoard"
  };
  var missingIcons = {};
  function noteMissingIcon(name) {
    if (missingIcons[name]) return;
    missingIcons[name] = true;
    console.error(
      "[mangaTools] this Stash's FontAwesome has no " + name + ", so that icon is drawn as nothing. Run this in the console to see which names it does have: window.PluginApi.libraries.FontAwesomeSolid." + name
    );
  }
  NS.censorshipIcon = (value) => {
    const Solid = PluginApi.libraries.FontAwesomeSolid || {};
    const name = ICONS[value] || ICONS[""];
    const icon = Solid[name];
    if (!icon) {
      noteMissingIcon(name);
      return null;
    }
    return icon;
  };
  NS.censorshipLabel = (intl, value) => {
    if (value === "censored") return t(intl, "mangaTools.censorship.censored");
    if (value === "uncensored")
      return t(intl, "mangaTools.censorship.uncensored");
    return t(intl, "mangaTools.censorship.unset");
  };
  function CensorshipIcon(props) {
    const Icon = PluginApi.components.Icon;
    const icon = NS.censorshipIcon(props.value);
    return icon ? /* @__PURE__ */ React.createElement(Icon, { icon }) : null;
  }
  function formatCensorshipOption(option) {
    return /* @__PURE__ */ React.createElement("span", { className: "manga-tools-option" }, /* @__PURE__ */ React.createElement(CensorshipIcon, { value: option.value }), option.label);
  }

  // src/tools/filter-model.ts
  var CUSTOM_FIELDS_TYPE = "custom_fields";
  var LANGUAGE_TYPE = "language";
  var EMPTY_SELECTION = {
    modifier: "",
    included: [],
    excluded: []
  };
  function registerLanguageCriterionOption(filter) {
    var _a2;
    const options = (_a2 = filter == null ? void 0 : filter.options) == null ? void 0 : _a2.criterionOptions;
    if (!options) return;
    let found = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].type === LANGUAGE_TYPE) return;
      if (options[i].type === CUSTOM_FIELDS_TYPE) found = options[i];
    }
    if (!found) return;
    const customFieldsOption = found;
    const option = {
      type: LANGUAGE_TYPE,
      messageID: "config.ui.language.heading",
      makeCriterion: () => {
        const criterion = customFieldsOption.makeCriterion();
        criterion.criterionOption = option;
        criterion.value = [];
        criterion.toQueryParams = function() {
          return { type: CUSTOM_FIELDS_TYPE, value: this.value };
        };
        return criterion;
      }
    };
    options.push(option);
  }
  function customFieldsCriterion(filter) {
    var _a2;
    const criteria = (filter == null ? void 0 : filter.criteria) || [];
    for (let i = 0; i < criteria.length; i++) {
      const option = (_a2 = criteria[i]) == null ? void 0 : _a2.criterionOption;
      if (!option) continue;
      if (option.type === CUSTOM_FIELDS_TYPE || option.type === LANGUAGE_TYPE) {
        return criteria[i];
      }
    }
    return null;
  }
  function isLanguageCondition(condition) {
    return !!condition && NS.ownField(condition.field) === NS.FIELD_NAME;
  }
  function conditionValues(condition) {
    const values = condition.value || [];
    return values.map((v) => String(v));
  }
  function isLanguageCriterion(criterion) {
    const conditions = (criterion == null ? void 0 : criterion.value) || [];
    if (!conditions.length) return false;
    for (let i = 0; i < conditions.length; i++) {
      if (!isLanguageCondition(conditions[i])) return false;
    }
    return true;
  }
  function languageCriterionOf(filter) {
    const criterion = customFieldsCriterion(filter);
    return criterion && isLanguageCriterion(criterion) ? criterion : null;
  }
  function adoptLanguageCriterion(filter) {
    var _a2;
    const criterion = languageCriterionOf(filter);
    if (!criterion) return;
    if (criterion.criterionOption && criterion.criterionOption.type === LANGUAGE_TYPE) {
      return;
    }
    const options = ((_a2 = filter.options) == null ? void 0 : _a2.criterionOptions) || [];
    let option = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].type === LANGUAGE_TYPE) option = options[i];
    }
    if (!option) return;
    criterion.criterionOption = option;
    criterion.toQueryParams = function() {
      return { type: CUSTOM_FIELDS_TYPE, value: this.value };
    };
  }
  function readLanguageFilter(filter) {
    const criterion = customFieldsCriterion(filter);
    if (!(criterion == null ? void 0 : criterion.value)) return EMPTY_SELECTION;
    const selection = {
      modifier: "",
      included: [],
      excluded: []
    };
    criterion.value.forEach((condition) => {
      if (!isLanguageCondition(condition)) return;
      if (condition.modifier === "NOT_NULL") selection.modifier = "any";
      else if (condition.modifier === "IS_NULL") selection.modifier = "none";
      else if (condition.modifier === "EQUALS") {
        selection.included = conditionValues(condition);
      } else if (condition.modifier === "NOT_EQUALS") {
        selection.excluded = conditionValues(condition);
      }
    });
    return selection;
  }
  function toggleIncluded(selection, code) {
    const already = selection.included.indexOf(code) !== -1;
    return {
      modifier: "",
      included: already ? selection.included.filter((c) => c !== code) : selection.included.concat([code]),
      // A language is included or excluded, never both: EQUALS and NOT_EQUALS for
      // one value is a contradiction and matches nothing.
      excluded: selection.excluded.filter((c) => c !== code)
    };
  }
  function toggleExcluded(selection, code) {
    const already = selection.excluded.indexOf(code) !== -1;
    return {
      modifier: "",
      included: selection.included.filter((c) => c !== code),
      excluded: already ? selection.excluded.filter((c) => c !== code) : selection.excluded.concat([code])
    };
  }
  function withModifier(_selection, modifier) {
    return { modifier, included: [], excluded: [] };
  }
  function withoutModifier(selection) {
    return {
      modifier: "",
      included: selection.included.slice(),
      excluded: selection.excluded.slice()
    };
  }
  function isEmptySelection(selection) {
    return !selection.modifier && !selection.included.length && !selection.excluded.length;
  }
  function sameSelection(a, b) {
    return a.modifier === b.modifier && sameCodes(a.included, b.included) && sameCodes(a.excluded, b.excluded);
  }
  function sameCodes(a, b) {
    if (a.length !== b.length) return false;
    const x = a.slice().sort();
    const y = b.slice().sort();
    for (let i = 0; i < x.length; i++) {
      if (x[i] !== y[i]) return false;
    }
    return true;
  }
  function modifierWord(intl, modifier) {
    if (modifier === "IS_NULL") {
      return message(intl, "criterion_modifier.is_null", "is null");
    }
    if (modifier === "NOT_NULL") {
      return message(intl, "criterion_modifier.not_null", "is not null");
    }
    if (modifier === "NOT_EQUALS") {
      return message(intl, "criterion_modifier.not_equals", "is not");
    }
    if (modifier === "EQUALS") {
      return message(intl, "criterion_modifier.equals", "is");
    }
    return null;
  }
  function languageConditionLabel(intl, condition) {
    const word = modifierWord(intl, condition.modifier);
    if (word === null) return null;
    return intl.formatMessage(
      { id: "criterion_modifier.format_string" },
      {
        criterion: fieldLabel(intl),
        modifierString: word,
        valueString: conditionValues(condition).map((code) => NS.name(code, intl.locale)).join(", ")
      }
    );
  }
  function censorshipConditionLabel(intl, condition) {
    const word = modifierWord(intl, condition.modifier);
    if (word === null) return null;
    return intl.formatMessage(
      { id: "criterion_modifier.format_string" },
      {
        criterion: censorshipHeading(intl),
        modifierString: word,
        valueString: conditionValues(condition).map((value) => NS.censorshipLabel(intl, value)).join(", ")
      }
    );
  }
  function mangaConditionLabel(intl, condition) {
    const state = condition.modifier === "NOT_NULL" ? t(intl, "mangaTools.filter.manga.marked") : condition.modifier === "IS_NULL" ? t(intl, "mangaTools.filter.manga.unmarked") : null;
    if (state === null) return null;
    return intl.formatMessage(
      { id: "criterion_modifier.format_string" },
      {
        criterion: t(intl, "mangaTools.manga.marked"),
        modifierString: message(intl, "criterion_modifier.equals", "is"),
        valueString: state
      }
    );
  }
  function conditionLabel(intl, condition) {
    const field2 = NS.ownField(condition.field);
    if (field2 === NS.FIELD_NAME) return languageConditionLabel(intl, condition);
    if (field2 === NS.CENSORSHIP_FIELD_NAME)
      return censorshipConditionLabel(intl, condition);
    if (field2 === NS.MANGA_FIELD_NAME)
      return mangaConditionLabel(intl, condition);
    return null;
  }
  function tagLabels(intl, criterion) {
    const conditions = criterion.value || [];
    const labels2 = [];
    for (let i = 0; i < conditions.length; i++) {
      const label2 = conditionLabel(intl, conditions[i]);
      if (label2 === null) return null;
      labels2.push(label2);
    }
    return labels2.length ? labels2 : null;
  }
  function fieldTagLabels(intl, filter, fieldName) {
    const criterion = customFieldsCriterion(filter);
    const conditions = (criterion == null ? void 0 : criterion.value) || [];
    const labels2 = [];
    for (let i = 0; i < conditions.length; i++) {
      if (NS.ownField(conditions[i].field) !== fieldName) continue;
      const label2 = conditionLabel(intl, conditions[i]);
      if (label2 === null) return null;
      labels2.push(label2);
    }
    return labels2.length ? labels2 : null;
  }
  function selectionConditions(selection) {
    if (selection.modifier === "any") {
      return [{ field: NS.FIELD_NAME, modifier: "NOT_NULL" }];
    }
    if (selection.modifier === "none") {
      return [{ field: NS.FIELD_NAME, modifier: "IS_NULL" }];
    }
    const conditions = [];
    if (selection.included.length) {
      conditions.push({
        field: NS.FIELD_NAME,
        modifier: "EQUALS",
        value: selection.included.slice()
      });
    }
    if (selection.excluded.length) {
      conditions.push({
        field: NS.FIELD_NAME,
        modifier: "NOT_EQUALS",
        value: selection.excluded.slice()
      });
    }
    return conditions;
  }
  function languageFilterQuery(filter, selection) {
    var _a2;
    if (!filter || typeof filter.clone !== "function") return null;
    const options = ((_a2 = filter.options) == null ? void 0 : _a2.criterionOptions) || [];
    let option = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].type === CUSTOM_FIELDS_TYPE) option = options[i];
      if (options[i].type === LANGUAGE_TYPE) option = options[i];
    }
    if (!option) return null;
    const criterionOption = option;
    const next = filter.clone();
    let criterion = customFieldsCriterion(next);
    const kept = [];
    if (criterion == null ? void 0 : criterion.value) {
      for (let j = 0; j < criterion.value.length; j++) {
        if (!isLanguageCondition(criterion.value[j]))
          kept.push(criterion.value[j]);
      }
    }
    const conditions = kept.concat(selectionConditions(selection));
    if (!conditions.length) {
      next.criteria = (next.criteria || []).filter((c) => c !== criterion);
    } else {
      if (!criterion) {
        criterion = criterionOption.makeCriterion();
        next.criteria = (next.criteria || []).concat([criterion]);
      }
      criterion.value = conditions;
    }
    return next.makeQueryParameters();
  }
  function applyLanguage(filter, history, selection) {
    const search = languageFilterQuery(filter, selection);
    if (search === null) {
      console.error(
        "[mangaTools] this list has no custom-fields filter, so the language filter is unavailable"
      );
      return;
    }
    history.replace(Object.assign({}, history.location, { search }));
  }
  function isCensorshipCondition(condition) {
    return !!condition && NS.ownField(condition.field) === NS.CENSORSHIP_FIELD_NAME;
  }
  function readCensorshipFilter(filter) {
    const criterion = customFieldsCriterion(filter);
    if (!(criterion == null ? void 0 : criterion.value)) return EMPTY_SELECTION;
    const selection = {
      modifier: "",
      included: [],
      excluded: []
    };
    criterion.value.forEach((condition) => {
      if (!isCensorshipCondition(condition)) return;
      if (condition.modifier === "NOT_NULL") selection.modifier = "any";
      else if (condition.modifier === "IS_NULL") selection.modifier = "none";
      else if (condition.modifier === "EQUALS") {
        selection.included = conditionValues(condition);
      } else if (condition.modifier === "NOT_EQUALS") {
        selection.excluded = conditionValues(condition);
      }
    });
    return selection;
  }
  function censorshipSelectionConditions(selection) {
    if (selection.modifier === "any") {
      return [{ field: NS.CENSORSHIP_FIELD_NAME, modifier: "NOT_NULL" }];
    }
    if (selection.modifier === "none") {
      return [{ field: NS.CENSORSHIP_FIELD_NAME, modifier: "IS_NULL" }];
    }
    const conditions = [];
    if (selection.included.length) {
      conditions.push({
        field: NS.CENSORSHIP_FIELD_NAME,
        modifier: "EQUALS",
        value: selection.included.slice()
      });
    }
    if (selection.excluded.length) {
      conditions.push({
        field: NS.CENSORSHIP_FIELD_NAME,
        modifier: "NOT_EQUALS",
        value: selection.excluded.slice()
      });
    }
    return conditions;
  }
  function censorshipFilterQuery(filter, selection) {
    var _a2;
    if (!filter || typeof filter.clone !== "function") return null;
    const options = ((_a2 = filter.options) == null ? void 0 : _a2.criterionOptions) || [];
    let option = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].type === CUSTOM_FIELDS_TYPE) option = options[i];
    }
    if (!option) return null;
    const criterionOption = option;
    const next = filter.clone();
    let criterion = customFieldsCriterion(next);
    const kept = [];
    if (criterion == null ? void 0 : criterion.value) {
      for (let j = 0; j < criterion.value.length; j++) {
        if (!isCensorshipCondition(criterion.value[j]))
          kept.push(criterion.value[j]);
      }
    }
    const conditions = kept.concat(censorshipSelectionConditions(selection));
    if (!conditions.length) {
      next.criteria = (next.criteria || []).filter((c) => c !== criterion);
    } else {
      if (!criterion) {
        criterion = criterionOption.makeCriterion();
        next.criteria = (next.criteria || []).concat([criterion]);
      }
      criterion.value = conditions;
    }
    return next.makeQueryParameters();
  }
  function applyCensorship(filter, history, selection) {
    const search = censorshipFilterQuery(filter, selection);
    if (search === null) {
      console.error(
        "[mangaTools] this list has no custom-fields filter, so the censorship filter is unavailable"
      );
      return;
    }
    history.replace(Object.assign({}, history.location, { search }));
  }
  function isMangaCondition(condition) {
    return !!condition && NS.ownField(condition.field) === NS.MANGA_FIELD_NAME;
  }
  function readMangaFilter(filter) {
    const criterion = customFieldsCriterion(filter);
    if (!(criterion == null ? void 0 : criterion.value)) return "";
    let state = "";
    criterion.value.forEach((condition) => {
      if (!isMangaCondition(condition)) return;
      if (condition.modifier === "NOT_NULL") state = "marked";
      else if (condition.modifier === "IS_NULL") state = "unmarked";
    });
    return state;
  }
  function mangaSelectionConditions(state) {
    if (state === "marked") {
      return [{ field: NS.MANGA_FIELD_NAME, modifier: "NOT_NULL" }];
    }
    if (state === "unmarked") {
      return [{ field: NS.MANGA_FIELD_NAME, modifier: "IS_NULL" }];
    }
    return [];
  }
  function mangaFilterQuery(filter, state) {
    var _a2;
    if (!filter || typeof filter.clone !== "function") return null;
    const options = ((_a2 = filter.options) == null ? void 0 : _a2.criterionOptions) || [];
    let option = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].type === CUSTOM_FIELDS_TYPE) option = options[i];
    }
    if (!option) return null;
    const criterionOption = option;
    const next = filter.clone();
    let criterion = customFieldsCriterion(next);
    const kept = [];
    if (criterion == null ? void 0 : criterion.value) {
      for (let j = 0; j < criterion.value.length; j++) {
        if (!isMangaCondition(criterion.value[j])) kept.push(criterion.value[j]);
      }
    }
    const conditions = kept.concat(mangaSelectionConditions(state));
    if (!conditions.length) {
      next.criteria = (next.criteria || []).filter((c) => c !== criterion);
    } else {
      if (!criterion) {
        criterion = criterionOption.makeCriterion();
        next.criteria = (next.criteria || []).concat([criterion]);
      }
      criterion.value = conditions;
    }
    return next.makeQueryParameters();
  }
  function applyManga(filter, history, state) {
    const search = mangaFilterQuery(filter, state);
    if (search === null) {
      console.error(
        "[mangaTools] this list has no custom-fields filter, so the manga filter is unavailable"
      );
      return;
    }
    history.replace(Object.assign({}, history.location, { search }));
  }
  function fieldLabel(intl) {
    return intl.formatMessage({
      id: "config.ui.language.heading",
      defaultMessage: "Language"
    });
  }
  function censorshipHeading(intl) {
    return t(intl, "mangaTools.censorship.heading");
  }
  function message(intl, id, fallback) {
    return intl.formatMessage({ id, defaultMessage: fallback });
  }
  NS.toggleIncluded = toggleIncluded;
  NS.toggleExcluded = toggleExcluded;
  NS.withModifier = withModifier;
  NS.withoutModifier = withoutModifier;
  NS.isEmptySelection = isEmptySelection;
  NS.sameSelection = sameSelection;
  NS.conditionLabel = conditionLabel;
  NS.tagLabels = tagLabels;
  NS.fieldTagLabels = fieldTagLabels;
  NS.readLanguageFilter = readLanguageFilter;
  NS.languageFilterQuery = languageFilterQuery;
  NS.readCensorshipFilter = readCensorshipFilter;
  NS.censorshipFilterQuery = censorshipFilterQuery;
  NS.readMangaFilter = readMangaFilter;
  NS.mangaFilterQuery = mangaFilterQuery;
  NS.registerLanguageCriterionOption = registerLanguageCriterionOption;
  NS.adoptLanguageCriterion = adoptLanguageCriterion;

  // src/tools/filter-ui.tsx
  var PluginApi2 = requirePluginApi();
  var React2 = PluginApi2.React;
  function visibleOptions(intl, selection) {
    return NS.languageOptions(intl.locale).filter(
      (o) => !NS.enabledLanguages || NS.enabledLanguages.has(o.value) || selection.included.indexOf(o.value) !== -1 || selection.excluded.indexOf(o.value) !== -1
    );
  }
  function selectableOptions(selection, options) {
    return selection.modifier ? [] : options;
  }
  function matchesQuery(option, query) {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return option.label.toLowerCase().indexOf(needle) !== -1 || option.value.toLowerCase().indexOf(needle) !== -1;
  }
  function flagOf(option) {
    return NS.showFlags ? option.flag : null;
  }
  function Flag(props) {
    return /* @__PURE__ */ React2.createElement(
      "span",
      {
        className: "fi fi-" + props.flag + (props.className ? " " + props.className : "")
      }
    );
  }
  function LanguageRow(props) {
    const Solid = PluginApi2.libraries.FontAwesomeSolid || {};
    const Regular = PluginApi2.libraries.FontAwesomeRegular || {};
    const Icon = PluginApi2.components.Icon;
    const Bootstrap = PluginApi2.libraries.Bootstrap;
    const intl = PluginApi2.libraries.Intl.useIntl();
    const hover = React2.useState(false);
    const hovered = hover[0];
    const setHovered = hover[1];
    const selected = props.state !== "candidate";
    const excluded = props.state === "excluded";
    const sidebar = props.variant === "sidebar";
    function setHover(next) {
      return () => {
        setHovered(next);
      };
    }
    const icon = !selected ? Solid.faPlus : hovered ? Regular.faTimesCircle || Solid.faTimesCircle : excluded ? Solid.faTimesCircle : Solid.faCheckCircle;
    const labelClass = excluded ? "excluded-object-label" : selected ? "selected-object-label" : "unselected-object-label";
    return /* @__PURE__ */ React2.createElement(
      "li",
      {
        className: (selected ? "selected-object" : "unselected-object") + (props.modifier ? " modifier-object" : "")
      },
      /* @__PURE__ */ React2.createElement(
        "a",
        {
          tabIndex: 0,
          onClick: props.onClick,
          onMouseEnter: setHover(true),
          onMouseLeave: setHover(false),
          onFocus: setHover(true),
          onBlur: setHover(false)
        },
        /* @__PURE__ */ React2.createElement("div", { className: sidebar ? "label-group" : void 0 }, /* @__PURE__ */ React2.createElement(
          Icon,
          {
            className: "fa-fw " + (excluded ? "exclude-icon" : "include-button") + (props.singleValue ? " single-value" : ""),
            icon
          }
        ), props.leading != null ? props.leading : props.flag ? /* @__PURE__ */ React2.createElement(Flag, { flag: props.flag }) : null, sidebar ? /* @__PURE__ */ React2.createElement("span", { className: "TruncatedText inline " + labelClass }, props.label) : /* @__PURE__ */ React2.createElement("span", { className: labelClass }, props.label)),
        !selected || !sidebar ? /* @__PURE__ */ React2.createElement("div", null, props.canExclude && !selected && Bootstrap ? /* @__PURE__ */ React2.createElement(
          Bootstrap.Button,
          {
            variant: "secondary",
            className: "minimal exclude-button",
            onClick: (e) => {
              e.stopPropagation();
              if (props.onExclude) props.onExclude();
            },
            onKeyDown: (e) => {
              e.stopPropagation();
            }
          },
          /* @__PURE__ */ React2.createElement("span", { className: "exclude-button-text" }, sidebar ? "exclude" : message(intl, "actions.exclude_lowercase", "exclude")),
          /* @__PURE__ */ React2.createElement(Icon, { className: "fa-fw exclude-icon", icon: Solid.faMinus })
        ) : null) : null
      )
    );
  }
  var TAG_SELECTOR = ".filter-tags .tag-item";
  var TAG_MARK = "data-manga-tools-language";
  function isFieldTag(tag, fieldName, mark) {
    const text2 = tag.firstChild;
    if ((text2 == null ? void 0 : text2.nodeType) !== 3) return false;
    const value = String(text2.nodeValue).trim();
    if (tag.getAttribute(mark) === value) return true;
    const prefix = fieldName.toLowerCase() + " ";
    return value.toLowerCase().indexOf(prefix) === 0;
  }
  function isLanguageTag(tag) {
    return isFieldTag(tag, NS.FIELD_NAME, TAG_MARK);
  }
  function tagText(tag) {
    return tag.firstChild;
  }

  // src/tools/dialog-filter.tsx
  var PluginApi3 = requirePluginApi();
  var React3 = PluginApi3.React;
  var OWN_TAG_MARK = "data-manga-tools-own-tag";
  function dialogLanguageTags() {
    const all = document.querySelectorAll(TAG_SELECTOR);
    const ours = [];
    for (let i = 0; i < all.length; i++) {
      if (!all[i].closest(".edit-filter-dialog")) continue;
      if (all[i].closest(".criterion-list")) continue;
      if (all[i].hasAttribute(OWN_TAG_MARK)) continue;
      if (isLanguageTag(all[i])) ours.push(all[i]);
    }
    return ours;
  }
  var DIALOG_HOST_CLASS = "manga-tools-dialog-host";
  function dialogEditorBox() {
    return document.querySelector(
      '.criterion-list [data-type="' + LANGUAGE_TYPE + '"] .criterion-editor'
    );
  }
  var dialogTagsFallback = null;
  function stashDialogTagsRow() {
    const content = document.querySelector(".edit-filter-dialog .dialog-content");
    if (!content) return null;
    const rows = content.querySelectorAll(".filter-tags");
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] === dialogTagsFallback) continue;
      if (!rows[i].closest(".criterion-list")) return rows[i];
    }
    return null;
  }
  function dialogTagsRow() {
    const stash = stashDialogTagsRow();
    if (stash) {
      dropFallbackRow();
      return stash;
    }
    const content = document.querySelector(".edit-filter-dialog .dialog-content");
    if (!content) {
      dropFallbackRow();
      return null;
    }
    if (!dialogTagsFallback) {
      dialogTagsFallback = document.createElement("div");
      dialogTagsFallback.className = "wrap-tags filter-tags";
    }
    if (dialogTagsFallback.parentNode !== content) {
      content.appendChild(dialogTagsFallback);
    }
    return dialogTagsFallback;
  }
  function dropFallbackRow() {
    if (dialogTagsFallback == null ? void 0 : dialogTagsFallback.parentNode) {
      dialogTagsFallback.parentNode.removeChild(dialogTagsFallback);
    }
  }
  function manageDialogTags(labels2) {
    const tags = dialogLanguageTags();
    for (let i = 0; i < tags.length; i++) {
      const label2 = i < labels2.length ? labels2[i] : null;
      const text2 = tagText(tags[i]);
      if (label2 !== null && text2.nodeValue !== label2) {
        text2.nodeValue = label2;
        tags[i].setAttribute(TAG_MARK, label2);
      }
      const display = label2 === null ? "none" : "";
      if (tags[i].style.display !== display) tags[i].style.display = display;
    }
  }
  function ownTagLabels(labels2) {
    return labels2.slice(dialogLanguageTags().length);
  }
  function clickedTagRemove(target2) {
    if (!target2 || typeof target2.closest !== "function") return false;
    if (!target2.closest(".edit-filter-dialog")) return false;
    if (!target2.closest(".filter-tags .tag-item button")) return false;
    const tag = target2.closest(".tag-item");
    return !!tag && !tag.closest(".criterion-list") && isLanguageTag(tag);
  }
  function LanguageTag(props) {
    const Solid = PluginApi3.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi3.components.Icon;
    const Bootstrap = PluginApi3.libraries.Bootstrap;
    return /* @__PURE__ */ React3.createElement(
      "span",
      {
        className: "tag-item badge badge-secondary",
        "data-manga-tools-own-tag": ""
      },
      props.label,
      Bootstrap ? (
        // `variant` alone: adding the class names as well is how this came out
        // as `btn btn-secondary btn btn-secondary`.
        /* @__PURE__ */ React3.createElement(Bootstrap.Button, { variant: "secondary", onClick: props.onRemove }, /* @__PURE__ */ React3.createElement(Icon, { icon: Solid.faXmark || Solid.faTimes }))
      ) : null
    );
  }
  function dialogDomState() {
    const dialog = document.querySelector(".edit-filter-dialog");
    if (!dialog) return "";
    return (dialogEditorBox() ? "card " : "") + (stashDialogTagsRow() ? "tags" : "");
  }
  function DialogLanguageFilter(props) {
    const intl = PluginApi3.libraries.Intl.useIntl();
    const history = PluginApi3.libraries.ReactRouterDOM.useHistory();
    const bumpState = React3.useState(0);
    const bump = bumpState[1];
    const applied = readLanguageFilter(props.filter);
    const choiceState = React3.useState(applied);
    const choice = choiceState[0];
    const setChoice = choiceState[1];
    const queryState = React3.useState("");
    const query = queryState[0];
    const setQuery = queryState[1];
    const searchRef = React3.useRef(null);
    const applyPending = React3.useRef(false);
    const dialogDom = React3.useRef("");
    React3.useEffect(() => {
      if (typeof MutationObserver !== "function") return;
      const observer = new MutationObserver(() => {
        const state = dialogDomState();
        if (state === dialogDom.current) return;
        dialogDom.current = state;
        bump((v) => v + 1);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => {
        observer.disconnect();
      };
    }, []);
    React3.useEffect(() => {
      function onClick(event) {
        const clicked = event.target;
        if (!clicked || typeof clicked.closest !== "function") return;
        if (!clicked.closest(".edit-filter-dialog")) return;
        if (clicked.closest(".modal-footer button.btn-primary")) {
          applyPending.current = true;
          window.setTimeout(() => {
            if (!applyPending.current) return;
            applyPending.current = false;
            console.warn(
              "[mangaTools] Apply changed nothing in Stash's filter, so the language picked in the card was not applied. Pick it in the sidebar instead."
            );
          }, 2e3);
        }
        if (clicked.closest(".clear-all-button") || clicked.closest(
          '.criterion-list [data-type="' + LANGUAGE_TYPE + '"] .remove-criterion-button'
        ) || clickedTagRemove(clicked)) {
          setChoice(EMPTY_SELECTION);
          setQuery("");
        }
      }
      document.addEventListener("click", onClick, true);
      return () => {
        document.removeEventListener("click", onClick, true);
      };
    }, []);
    const lastModel = React3.useRef(null);
    React3.useEffect(() => {
      const model = props.filter;
      const previous = lastModel.current;
      lastModel.current = model;
      if (!applyPending.current) return;
      if (!previous || previous === model) return;
      applyPending.current = false;
      const unchanged = sameSelection(choice, readLanguageFilter(model));
      if (unchanged) return;
      const search = languageFilterQuery(model, choice);
      if (search === null) {
        console.error(
          "[mangaTools] this list has no custom-fields criterion, so the language filter could not be applied"
        );
        return;
      }
      history.replace(Object.assign({}, history.location, { search }));
    });
    const dialogTagLabels = isEmptySelection(choice) ? [] : tagLabels(intl, { value: selectionConditions(choice) }) || [];
    const ownTags = ownTagLabels(dialogTagLabels);
    const ownTagsRow = ownTags.length ? dialogTagsRow() : null;
    React3.useLayoutEffect(() => {
      manageDialogTags(dialogTagLabels);
      if (!ownTagsRow) dropFallbackRow();
    });
    const sessionRef = React3.useRef(0);
    const syncedRef = React3.useRef(-1);
    React3.useLayoutEffect(() => {
      if (!document.querySelector(".edit-filter-dialog")) {
        sessionRef.current += 1;
        syncedRef.current = -1;
        return;
      }
      if (syncedRef.current === sessionRef.current) return;
      syncedRef.current = sessionRef.current;
      const applied2 = readLanguageFilter(props.filter);
      setChoice(
        (previous) => sameSelection(previous, applied2) ? previous : applied2
      );
      setQuery("");
    });
    const options = visibleOptions(intl, choice);
    const selectable = selectableOptions(choice, options);
    const chosen = selectable.filter(
      (o) => choice.included.indexOf(o.value) !== -1
    );
    const excludedChosen = selectable.filter(
      (o) => choice.excluded.indexOf(o.value) !== -1
    );
    const candidates = selectable.filter(
      (o) => choice.included.indexOf(o.value) === -1 && choice.excluded.indexOf(o.value) === -1 && matchesQuery(o, query)
    );
    const showModifiers = isEmptySelection(choice);
    const box = dialogEditorBox();
    let host = null;
    if (box) {
      host = box.querySelector("." + DIALOG_HOST_CLASS);
      if (!host) {
        host = document.createElement("div");
        host.className = DIALOG_HOST_CLASS;
        box.insertBefore(host, box.firstChild);
      }
    }
    const list = /* @__PURE__ */ React3.createElement("div", { className: "manga-tools-dialog-card" }, /* @__PURE__ */ React3.createElement("div", { className: "selectable-filter" }, /* @__PURE__ */ React3.createElement("div", { className: "clearable-input-group" }, /* @__PURE__ */ React3.createElement(
      "input",
      {
        ref: searchRef,
        className: "clearable-text-field form-control",
        value: query,
        placeholder: message(intl, "actions.search", "Search") + "\u2026",
        onChange: (e) => {
          setQuery(e.target.value);
        },
        onKeyDown: (e) => {
          if (e.key === "Escape") {
            if (searchRef.current) searchRef.current.blur();
            return;
          }
          if (e.key !== "Enter" || candidates.length !== 1) return;
          setChoice(toggleIncluded(choice, candidates[0].value));
          setQuery("");
        }
      }
    )), /* @__PURE__ */ React3.createElement("ul", null, choice.modifier ? /* @__PURE__ */ React3.createElement(
      LanguageRow,
      {
        variant: "dialog",
        modifier: true,
        state: "included",
        label: choice.modifier === "any" ? message(intl, "criterion_modifier_values.any", "Any") : message(intl, "criterion_modifier_values.none", "None"),
        onClick: () => {
          setChoice(withoutModifier(choice));
        }
      }
    ) : null, chosen.map((o) => /* @__PURE__ */ React3.createElement(
      LanguageRow,
      {
        key: "in-" + o.value,
        variant: "dialog",
        state: "included",
        label: o.label,
        flag: flagOf(o),
        onClick: () => {
          setChoice(toggleIncluded(choice, o.value));
        }
      }
    )), excludedChosen.map((o) => /* @__PURE__ */ React3.createElement("li", { key: "ex-" + o.value, className: "excluded-object" }, /* @__PURE__ */ React3.createElement(
      LanguageRow,
      {
        variant: "dialog",
        state: "excluded",
        label: o.label,
        flag: flagOf(o),
        onClick: () => {
          setChoice(toggleExcluded(choice, o.value));
        }
      }
    ))), showModifiers ? /* @__PURE__ */ React3.createElement(
      LanguageRow,
      {
        variant: "dialog",
        modifier: true,
        state: "candidate",
        canExclude: false,
        label: message(intl, "criterion_modifier_values.any", "Any"),
        onClick: () => {
          setChoice(withModifier(choice, "any"));
        }
      }
    ) : null, showModifiers ? /* @__PURE__ */ React3.createElement(
      LanguageRow,
      {
        variant: "dialog",
        modifier: true,
        state: "candidate",
        canExclude: false,
        label: message(intl, "criterion_modifier_values.none", "None"),
        onClick: () => {
          setChoice(withModifier(choice, "none"));
        }
      }
    ) : null, candidates.map((o) => /* @__PURE__ */ React3.createElement(
      LanguageRow,
      {
        key: o.value,
        variant: "dialog",
        state: "candidate",
        label: o.label,
        flag: flagOf(o),
        canExclude: true,
        onClick: () => {
          setChoice(toggleIncluded(choice, o.value));
        },
        onExclude: () => {
          setChoice(toggleExcluded(choice, o.value));
        }
      }
    )))));
    return /* @__PURE__ */ React3.createElement(React3.Fragment, null, host ? PluginApi3.ReactDOM.createPortal(list, host) : null, ownTagsRow ? PluginApi3.ReactDOM.createPortal(
      ownTags.map((label2, index) => /* @__PURE__ */ React3.createElement(
        LanguageTag,
        {
          key: index,
          label: label2,
          onRemove: () => {
            setChoice(EMPTY_SELECTION);
            setQuery("");
          }
        }
      )),
      ownTagsRow
    ) : null);
  }
  NS.manageDialogTags = manageDialogTags;
  NS.ownTagLabels = ownTagLabels;
  NS.clickedTagRemove = clickedTagRemove;

  // src/tools/sidebar-filter.tsx
  var PluginApi4 = requirePluginApi();
  var React4 = PluginApi4.React;
  var SECTION_STATE_KEY = "mangaToolsLanguageOpen";
  var CENSORSHIP_SECTION_STATE_KEY = "mangaToolsCensorshipOpen";
  var MANGA_SECTION_STATE_KEY = "mangaToolsMangaOpen";
  function isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches;
  }
  var CENSORSHIP_TAG_MARK = "data-manga-tools-censorship";
  var MANGA_TAG_MARK = "data-manga-tools-manga";
  function isCensorshipTag(tag) {
    return isFieldTag(tag, NS.CENSORSHIP_FIELD_NAME, CENSORSHIP_TAG_MARK);
  }
  function isMangaTag(tag) {
    return isFieldTag(tag, NS.MANGA_FIELD_NAME, MANGA_TAG_MARK);
  }
  function listFieldTags(isField) {
    const all = document.querySelectorAll(TAG_SELECTOR);
    const ours = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].closest(".edit-filter-dialog")) continue;
      if (isField(all[i])) ours.push(all[i]);
    }
    return ours;
  }
  function listLanguageTags() {
    return listFieldTags(isLanguageTag);
  }
  function listCensorshipTags() {
    return listFieldTags(isCensorshipTag);
  }
  function listMangaTags() {
    return listFieldTags(isMangaTag);
  }
  function writeTagLabels(tags, labels2, mark) {
    for (let i = 0; i < tags.length && i < labels2.length; i++) {
      tagText(tags[i]).nodeValue = labels2[i];
      tags[i].setAttribute(mark, labels2[i]);
    }
  }
  function relabelTags(labels2) {
    writeTagLabels(listLanguageTags(), labels2, TAG_MARK);
  }
  function relabelCensorshipTags(labels2) {
    writeTagLabels(listCensorshipTags(), labels2, CENSORSHIP_TAG_MARK);
  }
  function relabelMangaTags(labels2) {
    writeTagLabels(listMangaTags(), labels2, MANGA_TAG_MARK);
  }
  var sidebarFilter = null;
  function publishSidebarFilter(filter) {
    sidebarFilter = filter;
  }
  function currentSidebarFilter() {
    return sidebarFilter;
  }
  function useSidebarSection(stateKey) {
    const intl = PluginApi4.libraries.Intl.useIntl();
    const history = PluginApi4.libraries.ReactRouterDOM.useHistory();
    const openState = React4.useState(() => {
      const state = history.location.state;
      const stored = state ? state[stateKey] : void 0;
      return typeof stored === "boolean" ? stored : false;
    });
    const open = openState[0];
    const setOpen = openState[1];
    function toggleOpen() {
      const next = !open;
      setOpen(next);
      history.replace(
        Object.assign({}, history.location, {
          state: Object.assign({}, history.location.state, {
            [stateKey]: next
          })
        })
      );
    }
    return { intl, history, open, toggleOpen };
  }
  function SidebarSection(props) {
    const Bootstrap = PluginApi4.libraries.Bootstrap;
    if (!Bootstrap) {
      console.error(
        "[mangaTools] react-bootstrap not available, cannot draw the " + props.what + " filter"
      );
      return null;
    }
    const Solid = PluginApi4.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi4.components.Icon;
    return /* @__PURE__ */ React4.createElement("div", { className: "sidebar-section sidebar-list-filter" }, /* @__PURE__ */ React4.createElement("div", { className: "collapse-header" }, /* @__PURE__ */ React4.createElement(
      Bootstrap.Button,
      {
        onClick: props.onToggle,
        className: "minimal collapse-button"
      },
      /* @__PURE__ */ React4.createElement(
        Icon,
        {
          icon: props.open ? Solid.faChevronDown : Solid.faChevronRight,
          fixedWidth: true
        }
      ),
      /* @__PURE__ */ React4.createElement("span", null, props.heading)
    )), props.chosenItems.length ? /* @__PURE__ */ React4.createElement("ul", { className: "selected-list" }, props.chosenItems) : null, props.excludedItems.length ? /* @__PURE__ */ React4.createElement("ul", { className: "selected-list excluded-list" }, props.excludedItems) : null, /* @__PURE__ */ React4.createElement(Bootstrap.Collapse, { in: props.open, mountOnEnter: true, unmountOnExit: true }, /* @__PURE__ */ React4.createElement("div", null, /* @__PURE__ */ React4.createElement("div", { className: "queryable-candidate-list" }, props.children))));
  }
  function censorshipLeading(value) {
    const Icon = PluginApi4.components.Icon;
    const icon = NS.censorshipIcon(value);
    return icon ? /* @__PURE__ */ React4.createElement(Icon, { className: "fa-fw", icon }) : null;
  }
  function censorshipOptions(intl) {
    return NS.CENSORSHIP_VALUES.map((value) => ({
      value,
      label: NS.censorshipLabel(intl, value),
      // No flag: the row draws a chess piece instead, via censorshipLeading.
      flag: null
    }));
  }
  function SidebarLanguageFilter(props) {
    const { intl, history, open, toggleOpen } = useSidebarSection(SECTION_STATE_KEY);
    const queryState = React4.useState("");
    const query = queryState[0];
    const setQuery = queryState[1];
    const searchRef = React4.useRef(null);
    const selection = readLanguageFilter(props.filter);
    const tagLabelsFor = fieldTagLabels(intl, props.filter, NS.FIELD_NAME);
    React4.useLayoutEffect(() => {
      adoptLanguageCriterion(props.filter);
      if (tagLabelsFor) relabelTags(tagLabelsFor);
    });
    const Solid = PluginApi4.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi4.components.Icon;
    const Bootstrap = PluginApi4.libraries.Bootstrap;
    function update3(next) {
      applyLanguage(props.filter, history, next);
      if (!isTouchDevice() && searchRef.current) {
        searchRef.current.focus();
      }
    }
    function toggleInclude(code) {
      update3(toggleIncluded(selection, code));
    }
    function toggleExclude(code) {
      update3(toggleExcluded(selection, code));
    }
    function setModifier(modifier) {
      update3(withModifier(selection, modifier));
    }
    function clearModifier() {
      update3(withoutModifier(selection));
    }
    const options = visibleOptions(intl, selection);
    const selectable = selectableOptions(selection, options);
    const chosen = selectable.filter(
      (o) => selection.included.indexOf(o.value) !== -1
    );
    const excludedChosen = selectable.filter(
      (o) => selection.excluded.indexOf(o.value) !== -1
    );
    const candidates = selectable.filter(
      (o) => selection.included.indexOf(o.value) === -1 && selection.excluded.indexOf(o.value) === -1 && matchesQuery(o, query)
    );
    const showModifiers = isEmptySelection(selection);
    const chosenItems = [];
    if (selection.modifier) {
      chosenItems.push(
        /* @__PURE__ */ React4.createElement("li", { className: "selected-object modifier-object", key: "modifier" }, /* @__PURE__ */ React4.createElement("a", { tabIndex: 0, onClick: clearModifier }, /* @__PURE__ */ React4.createElement("div", { className: "label-group" }, /* @__PURE__ */ React4.createElement(Icon, { className: "fa-fw include-button", icon: Solid.faCheckCircle }), /* @__PURE__ */ React4.createElement("span", { className: "TruncatedText inline selected-object-label" }, "(" + message(
          intl,
          "criterion_modifier_values." + selection.modifier,
          selection.modifier === "any" ? "Any" : "None"
        ) + ")"))))
      );
    }
    chosen.forEach((o) => {
      chosenItems.push(
        /* @__PURE__ */ React4.createElement(
          LanguageRow,
          {
            variant: "sidebar",
            key: "in-" + o.value,
            label: o.label,
            flag: flagOf(o),
            state: "included",
            onClick: () => {
              toggleInclude(o.value);
            }
          }
        )
      );
    });
    const excludedItems = excludedChosen.map((o) => /* @__PURE__ */ React4.createElement(
      LanguageRow,
      {
        variant: "sidebar",
        key: "ex-" + o.value,
        label: o.label,
        flag: flagOf(o),
        state: "excluded",
        onClick: () => {
          toggleExclude(o.value);
        }
      }
    ));
    return /* @__PURE__ */ React4.createElement(
      SidebarSection,
      {
        heading: fieldLabel(intl),
        open,
        onToggle: toggleOpen,
        chosenItems,
        excludedItems,
        what: "language"
      },
      /* @__PURE__ */ React4.createElement("div", { className: "clearable-input-group" }, /* @__PURE__ */ React4.createElement(
        "input",
        {
          ref: searchRef,
          className: "clearable-text-field form-control",
          value: query,
          placeholder: message(intl, "actions.search", "Search") + "\u2026",
          onChange: (e) => {
            setQuery(e.target.value);
          },
          onKeyDown: (e) => {
            if (e.key !== "Enter" || candidates.length !== 1) return;
            toggleInclude(candidates[0].value);
            setQuery("");
          }
        }
      ), query && Bootstrap ? /* @__PURE__ */ React4.createElement(
        Bootstrap.Button,
        {
          variant: "secondary",
          className: "clearable-text-field-clear",
          title: message(intl, "actions.clear", "Clear"),
          onClick: () => {
            setQuery("");
          }
        },
        /* @__PURE__ */ React4.createElement(Icon, { icon: Solid.faTimes })
      ) : null),
      /* @__PURE__ */ React4.createElement("ul", null, showModifiers ? /* @__PURE__ */ React4.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          label: "(" + message(intl, "criterion_modifier_values.any", "Any") + ")",
          state: "candidate",
          modifier: true,
          canExclude: false,
          onClick: () => {
            setModifier("any");
          }
        }
      ) : null, showModifiers ? /* @__PURE__ */ React4.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          label: "(" + message(intl, "criterion_modifier_values.none", "None") + ")",
          state: "candidate",
          modifier: true,
          canExclude: false,
          onClick: () => {
            setModifier("none");
          }
        }
      ) : null, candidates.map((o) => /* @__PURE__ */ React4.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          key: o.value,
          label: o.label,
          flag: flagOf(o),
          state: "candidate",
          canExclude: true,
          onClick: () => {
            toggleInclude(o.value);
            setQuery("");
          },
          onExclude: () => {
            toggleExclude(o.value);
            setQuery("");
          }
        }
      )))
    );
  }
  function SidebarCensorshipFilter(props) {
    const { intl, history, open, toggleOpen } = useSidebarSection(
      CENSORSHIP_SECTION_STATE_KEY
    );
    const selection = readCensorshipFilter(props.filter);
    const tagLabelsFor = fieldTagLabels(
      intl,
      props.filter,
      NS.CENSORSHIP_FIELD_NAME
    );
    React4.useLayoutEffect(() => {
      if (tagLabelsFor) relabelCensorshipTags(tagLabelsFor);
    });
    const Solid = PluginApi4.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi4.components.Icon;
    function update3(next) {
      applyCensorship(props.filter, history, next);
    }
    function toggleInclude(value) {
      update3(toggleIncluded(selection, value));
    }
    function toggleExclude(value) {
      update3(toggleExcluded(selection, value));
    }
    function setModifier(modifier) {
      update3(withModifier(selection, modifier));
    }
    function clearModifier() {
      update3(withoutModifier(selection));
    }
    const options = censorshipOptions(intl);
    const chosen = options.filter(
      (o) => selection.included.indexOf(o.value) !== -1
    );
    const excludedChosen = options.filter(
      (o) => selection.excluded.indexOf(o.value) !== -1
    );
    const candidates = selectableOptions(selection, options).filter(
      (o) => selection.included.indexOf(o.value) === -1 && selection.excluded.indexOf(o.value) === -1
    );
    const showModifiers = isEmptySelection(selection);
    const chosenItems = [];
    if (selection.modifier) {
      chosenItems.push(
        /* @__PURE__ */ React4.createElement("li", { className: "selected-object modifier-object", key: "modifier" }, /* @__PURE__ */ React4.createElement("a", { tabIndex: 0, onClick: clearModifier }, /* @__PURE__ */ React4.createElement("div", { className: "label-group" }, /* @__PURE__ */ React4.createElement(Icon, { className: "fa-fw include-button", icon: Solid.faCheckCircle }), /* @__PURE__ */ React4.createElement("span", { className: "TruncatedText inline selected-object-label" }, "(" + message(
          intl,
          "criterion_modifier_values." + selection.modifier,
          selection.modifier === "any" ? "Any" : "None"
        ) + ")"))))
      );
    }
    chosen.forEach((o) => {
      chosenItems.push(
        /* @__PURE__ */ React4.createElement(
          LanguageRow,
          {
            variant: "sidebar",
            key: "in-" + o.value,
            label: o.label,
            leading: censorshipLeading(o.value),
            state: "included",
            onClick: () => {
              toggleInclude(o.value);
            }
          }
        )
      );
    });
    const excludedItems = excludedChosen.map((o) => /* @__PURE__ */ React4.createElement(
      LanguageRow,
      {
        variant: "sidebar",
        key: "ex-" + o.value,
        label: o.label,
        leading: censorshipLeading(o.value),
        state: "excluded",
        onClick: () => {
          toggleExclude(o.value);
        }
      }
    ));
    return /* @__PURE__ */ React4.createElement(
      SidebarSection,
      {
        heading: censorshipHeading(intl),
        open,
        onToggle: toggleOpen,
        chosenItems,
        excludedItems,
        what: "censorship"
      },
      /* @__PURE__ */ React4.createElement("ul", null, showModifiers ? /* @__PURE__ */ React4.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          label: "(" + message(intl, "criterion_modifier_values.any", "Any") + ")",
          state: "candidate",
          modifier: true,
          canExclude: false,
          onClick: () => {
            setModifier("any");
          }
        }
      ) : null, showModifiers ? /* @__PURE__ */ React4.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          label: "(" + message(intl, "criterion_modifier_values.none", "None") + ")",
          state: "candidate",
          modifier: true,
          canExclude: false,
          onClick: () => {
            setModifier("none");
          }
        }
      ) : null, candidates.map((o) => /* @__PURE__ */ React4.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          key: o.value,
          label: o.label,
          leading: censorshipLeading(o.value),
          state: "candidate",
          canExclude: true,
          onClick: () => {
            toggleInclude(o.value);
          },
          onExclude: () => {
            toggleExclude(o.value);
          }
        }
      )))
    );
  }
  function SidebarMangaFilter(props) {
    const { intl, history, open, toggleOpen } = useSidebarSection(
      MANGA_SECTION_STATE_KEY
    );
    const state = readMangaFilter(props.filter);
    const tagLabelsFor = fieldTagLabels(intl, props.filter, NS.MANGA_FIELD_NAME);
    React4.useLayoutEffect(() => {
      if (tagLabelsFor) relabelMangaTags(tagLabelsFor);
    });
    const options = [
      { value: "marked", label: message(intl, "true", "Yes") },
      { value: "unmarked", label: message(intl, "false", "No") }
    ];
    function choose(value) {
      applyManga(props.filter, history, state === value ? "" : value);
    }
    const chosen = options.filter((o) => o.value === state);
    const candidates = options.filter((o) => o.value !== state);
    const chosenItems = chosen.map((o) => /* @__PURE__ */ React4.createElement(
      LanguageRow,
      {
        variant: "sidebar",
        key: o.value,
        label: o.label,
        state: "included",
        canExclude: false,
        onClick: () => {
          choose(o.value);
        }
      }
    ));
    return /* @__PURE__ */ React4.createElement(
      SidebarSection,
      {
        heading: t(intl, "mangaTools.manga.isManga"),
        open,
        onToggle: toggleOpen,
        chosenItems,
        excludedItems: [],
        what: "manga"
      },
      /* @__PURE__ */ React4.createElement("ul", null, candidates.map((o) => /* @__PURE__ */ React4.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          key: o.value,
          label: o.label,
          state: "candidate",
          canExclude: false,
          singleValue: true,
          onClick: () => {
            choose(o.value);
          }
        }
      )))
    );
  }
  NS.relabelTags = relabelTags;
  NS.relabelCensorshipTags = relabelCensorshipTags;
  NS.relabelMangaTags = relabelMangaTags;

  // src/tools/index.tsx
  var PluginApi5 = requirePluginApi();
  var React5 = PluginApi5.React;
  var FIELD_NAME = NS.FIELD_NAME;
  var CENSORSHIP_FIELD_NAME = NS.CENSORSHIP_FIELD_NAME;
  var MANGA_FIELD_NAME = NS.MANGA_FIELD_NAME;
  var TRANSLATION_GROUP_FIELD_NAME = NS.TRANSLATION_GROUP_FIELD_NAME;
  var ORIGINAL_FIELD_NAME = NS.ORIGINAL_FIELD_NAME;
  var CHAPTER_FIELD_NAME = NS.CHAPTER_FIELD_NAME;
  var PLUGIN_ID = "mangaTools";
  var EDIT_ANCHOR = '.form-group[data-field="studio_id"]';
  var BULK_ANCHOR = '[data-field="studio"]';
  var BULK_DIALOG_MARK = '[data-field="rating"]';
  var REFRESH_MS = 6e4;
  function originalFrom(args) {
    return args[args.length - 1];
  }
  function resultFrom(args) {
    return args[args.length - 1];
  }
  function findFilter(node) {
    if (node === null || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = findFilter(child);
        if (found) return found;
      }
      return null;
    }
    const props = node.props;
    if (!props) return null;
    if (Array.isArray(props.filter)) return null;
    const filter = props.filter;
    if (filter && Array.isArray(filter.criteria)) return filter;
    return findFilter(props.children);
  }
  function hasSidebarSectionsContainer() {
    const components = PluginApi5.components;
    return !!components && !!components["FilteredGalleryList.SidebarSections"];
  }
  var warnedMissingSidebarContainer = false;
  function registerPatch(kind, target2, fn) {
    try {
      PluginApi5.patch[kind](target2, fn);
    } catch (e) {
      console.error(
        "[mangaTools] could not register the " + target2 + " patch:",
        e
      );
    }
  }
  var firedOnce = {};
  function noteFired(target2) {
    if (firedOnce[target2]) return;
    firedOnce[target2] = true;
    console.info("[mangaTools] patch active: " + target2);
  }
  var store = null;
  var listeners2 = /* @__PURE__ */ new Set();
  var inFlight = null;
  var started = false;
  var lastLoggedSize = -1;
  var currentPath = window.location.pathname || "";
  function emit() {
    listeners2.forEach((fn) => {
      fn();
    });
  }
  function subscribe(fn) {
    listeners2.add(fn);
    return () => {
      listeners2.delete(fn);
    };
  }
  function useGlobalVersion() {
    const state = React5.useState(0);
    const version = state[0];
    const setVersion = state[1];
    React5.useEffect(
      () => subscribe(() => {
        setVersion((v) => v + 1);
      }),
      []
    );
    return version;
  }
  function isGalleryContext() {
    return currentPath.indexOf("/galleries") === 0;
  }
  function currentGalleryId() {
    const m = /^\/galleries\/(\d+)(?:\/|$)/.exec(currentPath);
    return m ? m[1] : "";
  }
  function pickLanguage(customFields) {
    return NS.pickField(customFields, FIELD_NAME);
  }
  function censorshipOf(customFields) {
    return NS.normalizeCensorship(
      NS.pickField(customFields, CENSORSHIP_FIELD_NAME)
    );
  }
  function stashClient() {
    try {
      return PluginApi5.utils.StashService.getClient();
    } catch (e) {
      console.error("[mangaTools] failed to get the Apollo client:", e);
      return null;
    }
  }
  var QUERIES = {};
  function getQuery(field2) {
    if (QUERIES[field2]) return QUERIES[field2];
    QUERIES[field2] = gqlDoc(
      [
        "query MangaToolsMap {",
        "  findGalleries(",
        "    gallery_filter: {",
        '      custom_fields: [{ field: "' + field2 + '", modifier: NOT_NULL }]',
        "    }",
        "    filter: { per_page: -1 }",
        "  ) {",
        "    count",
        "    galleries {",
        "      id",
        "      custom_fields",
        "    }",
        "  }",
        "}"
      ].join("\n"),
      "build the query"
    );
    return QUERIES[field2];
  }
  function refresh() {
    if (inFlight) return inFlight;
    const fields = [MANGA_FIELD_NAME];
    const queries = fields.map(getQuery);
    if (queries.some((q) => !q)) return Promise.resolve();
    const client = stashClient();
    if (!client) return Promise.resolve();
    inFlight = Promise.all(
      queries.map(
        (query) => client.query({ query, fetchPolicy: "no-cache" })
      )
    ).then((results) => {
      const next = /* @__PURE__ */ new Map();
      results.forEach((res) => {
        const data = res == null ? void 0 : res.data;
        const result = data ? data.findGalleries : void 0;
        const galleries = (result == null ? void 0 : result.galleries) || [];
        galleries.forEach((g) => {
          if (g.custom_fields) next.set(String(g.id), g.custom_fields);
        });
      });
      store = next;
      emit();
      if (next.size !== lastLoggedSize) {
        lastLoggedSize = next.size;
        console.info(
          "[mangaTools] loaded " + next.size + " gallery(ies) marked as manga"
        );
      }
    }).catch((e) => {
      console.error(
        "[mangaTools] failed to fetch custom fields, marks will not show. Raw error:",
        e
      );
    }).then(() => {
      inFlight = null;
    });
    return inFlight;
  }
  var SETTINGS_QUERY = null;
  function getSettingsQuery() {
    if (SETTINGS_QUERY) return SETTINGS_QUERY;
    SETTINGS_QUERY = gqlDoc(
      [
        "query MangaToolsSettings {",
        "  configuration {",
        "    plugins",
        "  }",
        "}"
      ].join("\n"),
      "read settings"
    );
    return SETTINGS_QUERY;
  }
  function refreshSettings() {
    const query = getSettingsQuery();
    if (!query) return;
    const client = stashClient();
    if (!client) return;
    client.query({ query, fetchPolicy: "no-cache" }).then((res) => {
      var _a2;
      const data = res == null ? void 0 : res.data;
      const plugins = (_a2 = data == null ? void 0 : data.configuration) == null ? void 0 : _a2.plugins;
      const pluginCfg = plugins == null ? void 0 : plugins[PLUGIN_ID];
      NS.enabledLanguages = NS.parseEnabledLanguages(
        pluginCfg ? pluginCfg.enabledLanguages : null
      );
      NS.showFlags = NS.parseFlag(pluginCfg ? pluginCfg.showFlags : null, true);
      NS.showCoverBadge = NS.parseFlag(
        pluginCfg ? pluginCfg.showCoverBadge : null,
        true
      );
      NS.openDetailsBlock = NS.parseFlag(
        pluginCfg ? pluginCfg.openDetailsBlock : null,
        DETAILS_OPEN_BY_DEFAULT
      );
      NS.openEditBlock = NS.parseFlag(
        pluginCfg ? pluginCfg.openEditBlock : null,
        EDIT_OPEN_BY_DEFAULT
      );
      NS.hidePerformers = NS.parseFlag(
        pluginCfg ? pluginCfg.hidePerformers : null,
        HIDE_PERFORMERS_BY_DEFAULT
      );
      emit();
    }).catch((e) => {
      console.error("[mangaTools] failed to fetch plugin settings:", e);
    });
  }
  function ownBaseUrl() {
    const tags = [];
    const scripts = document.querySelectorAll("script[src]");
    for (let i = 0; i < scripts.length; i++) tags.push(scripts[i]);
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let i = 0; i < links.length; i++) tags.push(links[i]);
    for (const tag of tags) {
      const url = tag.src || tag.href || "";
      if (/mangaTools/.test(url)) return url.replace(/[^/]*$/, "");
    }
    return "";
  }
  function pageAssetUrls() {
    const urls = [];
    const tags = document.querySelectorAll("script[src], link[rel=stylesheet]");
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i];
      urls.push(
        tag.src || tag.href || ""
      );
    }
    return urls;
  }
  var assetBase = "";
  function start() {
    var _a2;
    if (started) return;
    started = true;
    assetBase = ownBaseUrl();
    if (!assetBase) {
      console.error(
        "[mangaTools] could not tell where my own files are served from, so the switch's icon falls back to the stylesheet's own relative URL. Scripts and stylesheets on this page: " + pageAssetUrls().join(", ")
      );
    }
    refresh();
    refreshSettings();
    window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
    if ((_a2 = PluginApi5.Event) == null ? void 0 : _a2.addEventListener) {
      PluginApi5.Event.addEventListener("stash:location", (e) => {
        var _a3, _b2;
        const ev = e;
        const loc = (_b2 = (_a3 = ev == null ? void 0 : ev.detail) == null ? void 0 : _a3.data) == null ? void 0 : _b2.location;
        currentPath = (loc == null ? void 0 : loc.pathname) || window.location.pathname || "";
        refresh();
        refreshSettings();
        emit();
      });
    }
  }
  function refreshAfterWrite() {
    const pending3 = inFlight;
    if (pending3) {
      pending3.then(() => {
        refresh();
      });
    } else {
      refresh();
    }
  }
  function refreshForSuggestions() {
    refreshAfterWrite();
  }
  function useLocale() {
    return PluginApi5.libraries.Intl.useIntl().locale;
  }
  function Flag2(props) {
    return /* @__PURE__ */ React5.createElement(
      "span",
      {
        className: "fi fi-" + props.flag + (props.className ? " " + props.className : "")
      }
    );
  }
  function LanguageBadge(props) {
    useGlobalVersion();
    const locale = useLocale();
    const info = NS.describe(
      pickLanguage(store == null ? void 0 : store.get(String(props.galleryId))),
      locale
    );
    if (!info) return null;
    if (!info.known) {
      return /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-badge is-unknown" }, info.name);
    }
    if (!NS.showFlags) {
      return /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-badge is-name" }, info.name);
    }
    return /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-badge", "aria-label": info.name }, /* @__PURE__ */ React5.createElement(Flag2, { flag: info.flag }));
  }
  var POPOVER_ANCHOR_CLASS = "manga-tools-popover-anchor";
  var POPOVER_SLOT_CLASS = "manga-tools-popover-slot";
  var POPOVER_ROW_CLASS = "manga-tools-popovers";
  function useAfterMount() {
    const bump = React5.useState(0)[1];
    React5.useLayoutEffect(() => {
      bump(1);
    }, []);
  }
  function hasClass(el, name) {
    return !!el && (el.className || "").split(/\s+/).indexOf(name) >= 0;
  }
  function ensurePopoverSlot(galleryId2) {
    const anchor = document.querySelector(
      '[data-gallery="' + galleryId2 + '"]'
    );
    if (!(anchor == null ? void 0 : anchor.parentNode)) return null;
    const previous = anchor.previousElementSibling;
    let row2;
    if (hasClass(previous, "card-popovers") || hasClass(previous, POPOVER_ROW_CLASS)) {
      row2 = previous;
    } else {
      row2 = document.createElement("div");
      row2.className = "btn-group card-popovers " + POPOVER_ROW_CLASS;
      anchor.parentNode.insertBefore(row2, anchor);
    }
    let slot = null;
    for (let i = 0; i < row2.children.length; i++) {
      if (hasClass(row2.children[i], POPOVER_SLOT_CLASS)) {
        slot = row2.children[i];
        break;
      }
    }
    if (slot) {
      if (row2.lastElementChild !== slot) row2.appendChild(slot);
      return slot;
    }
    slot = document.createElement("span");
    slot.className = POPOVER_SLOT_CLASS;
    row2.appendChild(slot);
    return slot;
  }
  function MangaPopoverMark(props) {
    useGlobalVersion();
    useAfterMount();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const manga = storedIsManga(props.galleryId);
    const slot = manga ? ensurePopoverSlot(props.galleryId) : null;
    if (!manga) return null;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement("span", { className: POPOVER_ANCHOR_CLASS, "data-gallery": props.galleryId }), slot ? PluginApi5.ReactDOM.createPortal(
      /* @__PURE__ */ React5.createElement(
        "button",
        {
          type: "button",
          className: "minimal btn btn-primary manga-tools-mark",
          title: t(intl, "mangaTools.manga.marked")
        },
        /* @__PURE__ */ React5.createElement(MangaIcon, null)
      ),
      slot
    ) : null);
  }
  var TOOLBAR_HOST_CLASS = "manga-tools-toolbar-host";
  var _a, _b;
  var CAN_WRITE = typeof ((_b = (_a = PluginApi5.utils) == null ? void 0 : _a.StashService) == null ? void 0 : _b.getClient) === "function";
  if (!CAN_WRITE) {
    console.error(
      "[mangaTools] this Stash has no Apollo client, so the toolbar switch cannot be shown. The rest of the plugin is unaffected."
    );
  }
  var toolbarHost = null;
  function ensureToolbarHost() {
    const button2 = document.querySelector(".gallery-toolbar .organized-button");
    if (!button2) return toolbarHost;
    const anchor = (button2 == null ? void 0 : button2.parentNode) || null;
    if (!(anchor == null ? void 0 : anchor.parentNode)) {
      toolbarHost = null;
      return null;
    }
    if (!toolbarHost) {
      toolbarHost = document.createElement("span");
      toolbarHost.className = TOOLBAR_HOST_CLASS;
    }
    if (anchor.nextElementSibling !== toolbarHost) {
      anchor.parentNode.insertBefore(toolbarHost, anchor.nextElementSibling);
    }
    return toolbarHost;
  }
  function AssetIcon(props) {
    const style = assetBase ? {
      "--manga-tools-icon": `url("${assetBase}assets/icons/${props.file}")`
    } : void 0;
    return /* @__PURE__ */ React5.createElement("span", { className: props.className, "aria-hidden": "true", style });
  }
  function MangaIcon() {
    return /* @__PURE__ */ React5.createElement(AssetIcon, { className: "manga-tools-manga-icon", file: "manga.svg" });
  }
  function SteakIcon(props) {
    return props.raw ? /* @__PURE__ */ React5.createElement(AssetIcon, { className: "manga-tools-raw-icon", file: "raw.svg" }) : /* @__PURE__ */ React5.createElement(AssetIcon, { className: "manga-tools-cooked-icon", file: "cooked.svg" });
  }
  function knownTranslationGroups() {
    if (!store) return [];
    const seen = {};
    store.forEach((fields) => {
      const name = NS.translationGroupOf(fields);
      if (name) seen[name] = true;
    });
    return Object.keys(seen).sort();
  }
  function storedIsManga(galleryId2) {
    var _a2;
    return (_a2 = store == null ? void 0 : store.has(String(galleryId2))) != null ? _a2 : false;
  }
  function ConfirmDialog(props) {
    const Bootstrap = PluginApi5.libraries.Bootstrap;
    const Modal = Bootstrap == null ? void 0 : Bootstrap.Modal;
    const Button = Bootstrap == null ? void 0 : Bootstrap.Button;
    if (!Modal || !Button || !Modal.Body || !Modal.Footer) return null;
    return /* @__PURE__ */ React5.createElement(Modal, { show: true, size: "sm", onHide: props.onCancel }, /* @__PURE__ */ React5.createElement(Modal.Body, null, props.children), /* @__PURE__ */ React5.createElement(Modal.Footer, null, /* @__PURE__ */ React5.createElement(Button, { variant: "secondary", onClick: props.onCancel }, props.cancelLabel), /* @__PURE__ */ React5.createElement(Button, { variant: props.variant, onClick: props.onConfirm }, props.confirmLabel)));
  }
  function ConfirmUnmark(props) {
    const intl = PluginApi5.libraries.Intl.useIntl();
    return /* @__PURE__ */ React5.createElement(
      ConfirmDialog,
      {
        variant: "danger",
        confirmLabel: t(intl, "mangaTools.manga.confirmOk"),
        cancelLabel: t(intl, "mangaTools.manga.confirmCancel"),
        onCancel: props.onCancel,
        onConfirm: props.onConfirm
      },
      /* @__PURE__ */ React5.createElement("div", null, t(intl, "mangaTools.manga.confirm")),
      props.resetsForm ? /* @__PURE__ */ React5.createElement("div", null, t(intl, "mangaTools.manga.confirmResetsForm")) : null
    );
  }
  var chapterJob = { phase: "idle" };
  function readerChapters() {
    const reader = window.MangaReader;
    if (!reader || typeof reader.planChapterImports !== "function" || typeof reader.runChapterImports !== "function") {
      return null;
    }
    return reader;
  }
  function ChapterImportSetting(props) {
    const intl = props.intl;
    const Bootstrap = PluginApi5.libraries.Bootstrap;
    const Button = Bootstrap == null ? void 0 : Bootstrap.Button;
    const job = chapterJob;
    function plan() {
      const reader = readerChapters();
      if (!reader) {
        console.error(
          "[mangaTools] the reader half is not running, so its chapter import cannot be asked for"
        );
        return;
      }
      chapterJob = { phase: "planning" };
      emit();
      reader.planChapterImports().then(
        (next) => {
          chapterJob = next.toImport.length > 0 || next.owned.length > 0 ? { phase: "confirming", plan: next, replace: false } : { phase: "done", outcome: emptyRun() };
          emit();
        },
        (e) => {
          console.error("[mangaTools] could not work out what to import:", e);
          chapterJob = { phase: "idle" };
          emit();
        }
      );
    }
    function run(plan2, replace) {
      const reader = readerChapters();
      if (!reader) return;
      const total = replace ? plan2.toImport.length + plan2.owned.length : plan2.toImport.length;
      chapterJob = { phase: "running", plan: plan2, replace, done: 0, total };
      emit();
      reader.runChapterImports(plan2, {
        reimport: replace,
        onProgress: (done, total2) => {
          chapterJob = { phase: "running", plan: plan2, replace, done, total: total2 };
          emit();
        }
      }).then(
        (outcome) => {
          chapterJob = { phase: "done", outcome };
          emit();
        },
        (e) => {
          console.error("[mangaTools] the chapter import did not finish:", e);
          chapterJob = { phase: "idle" };
          emit();
        }
      );
    }
    if (!Button) return null;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement("div", { className: "setting manga-tools-settings" }, /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-settings-block" }, /* @__PURE__ */ React5.createElement("h3", null, t(intl, "mangaTools.settings.chapters.heading")), /* @__PURE__ */ React5.createElement("div", { className: "sub-heading" }, t(intl, "mangaTools.settings.chapters.description")), /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-settings-control" }, job.phase === "running" ? /* @__PURE__ */ React5.createElement("span", { className: "manga-tools-settings-progress" }, t(intl, "mangaTools.settings.chapters.progress"), " ", job.done, " ", t(intl, "mangaTools.settings.chapters.of"), " ", job.total) : /* @__PURE__ */ React5.createElement(
      Button,
      {
        variant: "secondary",
        disabled: job.phase === "planning",
        onClick: plan
      },
      t(
        intl,
        job.phase === "planning" ? "mangaTools.settings.chapters.checking" : "mangaTools.settings.chapters.check"
      )
    )), job.phase === "done" ? /* @__PURE__ */ React5.createElement("div", { className: "sub-heading" }, t(intl, "mangaTools.settings.chapters.progress"), " ", job.outcome.written.length, " \xB7", " ", t(intl, "mangaTools.settings.chapters.skipped"), " ", job.outcome.skippedEmpty.length, " \xB7", " ", t(intl, "mangaTools.settings.chapters.failed"), " ", job.outcome.failed.length) : null)), job.phase === "confirming" ? /* @__PURE__ */ React5.createElement(
      ConfirmDialog,
      {
        variant: "danger",
        confirmLabel: t(intl, "mangaTools.settings.chapters.start"),
        cancelLabel: t(intl, "mangaTools.manga.confirmCancel"),
        onCancel: () => {
          chapterJob = { phase: "idle" };
          emit();
        },
        onConfirm: () => run(job.plan, job.replace)
      },
      /* @__PURE__ */ React5.createElement("div", null, t(intl, "mangaTools.settings.chapters.toImport"), " ", job.plan.toImport.length, " \xB7", " ", t(intl, "mangaTools.settings.chapters.owned"), " ", job.plan.owned.length),
      /* @__PURE__ */ React5.createElement("label", { className: "manga-tools-settings-check" }, /* @__PURE__ */ React5.createElement(
        "input",
        {
          type: "checkbox",
          checked: job.replace,
          onChange: () => {
            chapterJob = {
              phase: "confirming",
              plan: job.plan,
              replace: !job.replace
            };
            emit();
          }
        }
      ), " ", t(intl, "mangaTools.settings.chapters.replace"))
    ) : null);
  }
  function emptyRun() {
    return { written: [], failed: [], skippedEmpty: [] };
  }
  var editForm = null;
  function editFormFor(galleryId2) {
    return editForm && editForm.galleryId === galleryId2 ? editForm : null;
  }
  var originalGroupTaken = null;
  function isMarkedNow(galleryId2, values) {
    if (store === null || !galleryId2) return NS.isManga(values);
    return storedIsManga(galleryId2);
  }
  NS.markedInStore = (galleryId2) => store === null || !galleryId2 ? null : storedIsManga(galleryId2);
  NS.watchStore = (fn) => subscribe(fn);
  function editFormIsDirty() {
    const save = document.querySelector(".edit-buttons-container .edit-button");
    return !!save && save.disabled !== true;
  }
  var MARK_QUERY_TEXT = [
    "mutation MangaToolsSetFields($input: GalleryUpdateInput!) {",
    "  galleryUpdate(input: $input) {",
    "    id",
    "  }",
    "}"
  ].join("\n");
  var markUpdate = null;
  function getMarkUpdate() {
    if (markUpdate) return markUpdate;
    markUpdate = gqlDoc(MARK_QUERY_TEXT, "build the mutation");
    return markUpdate;
  }
  function writeQuietly(galleryId2, fields) {
    const mutation = getMarkUpdate();
    if (!mutation) {
      return Promise.reject(
        new Error("[mangaTools] no mutation document, the write was not sent")
      );
    }
    const client = stashClient();
    if (!client) {
      return Promise.reject(
        new Error("[mangaTools] no Apollo client, the write was not sent")
      );
    }
    return client.mutate({
      mutation,
      variables: { input: { id: galleryId2, custom_fields: fields } }
    });
  }
  NS.writeChapters = (galleryId2, json) => {
    const current2 = store == null ? void 0 : store.get(galleryId2);
    if (current2) {
      store == null ? void 0 : store.set(galleryId2, NS.setField(current2, CHAPTER_FIELD_NAME, json));
    }
    const form2 = editFormFor(galleryId2);
    if (form2) {
      form2.onChange(NS.setField(form2.values, CHAPTER_FIELD_NAME, json));
    }
    emit();
    return writeQuietly(galleryId2, {
      partial: { [CHAPTER_FIELD_NAME]: json }
    }).then(
      () => {
        refreshAfterWrite();
      },
      (e) => {
        console.error("[mangaTools] could not write this gallery's chapters:", e);
        refreshAfterWrite();
        throw e;
      }
    );
  };
  function GalleryToolbar(props) {
    useGlobalVersion();
    useAfterMount();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const busyState = React5.useState(false);
    const busy2 = busyState[0];
    const setBusy = busyState[1];
    const confirmState = React5.useState(false);
    const confirming2 = confirmState[0];
    const setConfirming = confirmState[1];
    const host = ensureToolbarHost();
    if (!host) return null;
    const marked = isMarkedNow(props.galleryId, props.values);
    const write2 = (fields) => {
      store == null ? void 0 : store.delete(props.galleryId);
      const form2 = editFormFor(props.galleryId);
      if (form2) {
        form2.onChange(NS.clearFields(form2.values));
      }
      emit();
      setBusy(true);
      writeQuietly(props.galleryId, fields).then(
        () => {
          setBusy(false);
          setConfirming(false);
          refreshAfterWrite();
        },
        (e) => {
          setBusy(false);
          setConfirming(false);
          console.error("[mangaTools] could not write the manga mark:", e);
          refreshAfterWrite();
        }
      );
    };
    const onToggle = () => {
      if (!marked) {
        mark();
        return;
      }
      setConfirming(true);
    };
    const mark = () => {
      var _a2;
      const form2 = editFormFor(props.galleryId);
      if (form2) {
        form2.onChange(NS.setField(form2.values, MANGA_FIELD_NAME, NS.MANGA_VALUE));
      }
      store == null ? void 0 : store.set(
        props.galleryId,
        NS.setField(
          (_a2 = store == null ? void 0 : store.get(props.galleryId)) != null ? _a2 : props.values,
          MANGA_FIELD_NAME,
          NS.MANGA_VALUE
        )
      );
      emit();
      setBusy(true);
      writeQuietly(props.galleryId, {
        partial: { [MANGA_FIELD_NAME]: NS.MANGA_VALUE }
      }).then(
        () => {
          setBusy(false);
          refreshAfterWrite();
        },
        (e) => {
          setBusy(false);
          console.error("[mangaTools] could not write the manga mark:", e);
          refreshAfterWrite();
        }
      );
    };
    const onConfirmUnmark = () => {
      write2({ remove: NS.fieldsToClear(props.values) });
    };
    return PluginApi5.ReactDOM.createPortal(
      /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement(
        "button",
        {
          type: "button",
          className: "minimal manga-tools-manga-toggle btn btn-secondary" + (marked ? " is-manga" : ""),
          title: t(
            intl,
            marked ? "mangaTools.manga.marked" : "mangaTools.manga.mark"
          ),
          "aria-pressed": marked,
          disabled: busy2,
          onClick: onToggle
        },
        /* @__PURE__ */ React5.createElement(MangaIcon, null)
      ), confirming2 ? /* @__PURE__ */ React5.createElement(
        ConfirmUnmark,
        {
          onCancel: () => setConfirming(false),
          onConfirm: onConfirmUnmark,
          resetsForm: editFormIsDirty()
        }
      ) : null),
      host
    );
  }
  var SELECT = null;
  function resolveSelect() {
    if (SELECT) return SELECT;
    const RS = PluginApi5.libraries.ReactSelect;
    if (!RS) {
      console.error("[mangaTools] react-select not available");
      return null;
    }
    SELECT = RS.default || RS.Select || RS;
    return SELECT;
  }
  function formatLanguageOption(option) {
    return /* @__PURE__ */ React5.createElement("span", { className: "manga-tools-option" }, NS.showFlags && option.flag ? /* @__PURE__ */ React5.createElement(Flag2, { flag: option.flag, className: "manga-tools-flag" }) : null, /* @__PURE__ */ React5.createElement("span", null, option.label));
  }
  function formatGroupOption(option, meta) {
    if ((meta == null ? void 0 : meta.context) !== "menu") return option.label;
    const hint = option.hint ? NS.showFlags && option.hint.flag ? /* @__PURE__ */ React5.createElement(
      Flag2,
      {
        flag: option.hint.flag,
        className: "manga-tools-flag manga-tools-hint"
      }
    ) : /* @__PURE__ */ React5.createElement("span", { className: "manga-tools-hint-text" }, option.hint.name) : null;
    if (!option.createLabel) {
      if (!hint) return option.label;
      return /* @__PURE__ */ React5.createElement("span", { className: "manga-tools-group-option" }, /* @__PURE__ */ React5.createElement("span", null, option.label), hint);
    }
    return /* @__PURE__ */ React5.createElement("span", { className: "manga-tools-option" }, option.createLabel);
  }
  function readNativeFieldClasses(anchor) {
    if (!anchor) return null;
    const label2 = anchor.querySelector("label");
    const control2 = label2 == null ? void 0 : label2.nextElementSibling;
    if (!label2 || !control2) return null;
    return {
      group: anchor.className,
      label: label2.className,
      control: control2.className
    };
  }
  function MangaFieldBlock(props) {
    var _a2;
    useGlobalVersion();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const Select = resolveSelect();
    const state = React5.useState(NS.openEditBlock);
    const open = state[0];
    const setOpen = state[1];
    const Solid = PluginApi5.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi5.components.Icon;
    const Button = (_a2 = PluginApi5.libraries.Bootstrap) == null ? void 0 : _a2.Button;
    const host = isGalleryContext() ? ensureFieldHost() : null;
    if (host) {
      host.classList.toggle("hide-performers", NS.hidePerformers);
    }
    const bump = React5.useState(0)[1];
    React5.useLayoutEffect(() => {
      if (isGalleryContext() && ensureFieldHost() !== host) {
        bump((v) => v + 1);
      }
    });
    if (!isGalleryContext() || !Select || !host) return null;
    const write2 = (name, value) => {
      if (props.onChange) {
        props.onChange(NS.setField(props.values, name, value));
      }
    };
    const writeGroup = (value) => {
      let next = NS.setField(props.values, TRANSLATION_GROUP_FIELD_NAME, value);
      if (value) next = NS.setField(next, ORIGINAL_FIELD_NAME, "");
      if (props.onChange) props.onChange(next);
    };
    const isOriginal = NS.isOriginal(props.values);
    const toggleOriginal = () => {
      const galleryId2 = currentGalleryId();
      let next = props.values;
      if (isOriginal) {
        const taken = originalGroupTaken;
        originalGroupTaken = null;
        next = NS.setField(next, ORIGINAL_FIELD_NAME, "");
        if (taken && taken.galleryId === galleryId2 && taken.group) {
          next = NS.setField(next, TRANSLATION_GROUP_FIELD_NAME, taken.group);
        }
      } else {
        const group = NS.translationGroupOf(props.values);
        originalGroupTaken = group ? { galleryId: galleryId2, group } : null;
        next = NS.setField(next, ORIGINAL_FIELD_NAME, NS.ORIGINAL_VALUE);
        next = NS.setField(next, TRANSLATION_GROUP_FIELD_NAME, "");
      }
      if (props.onChange) props.onChange(next);
    };
    const restoresGroup = !!originalGroupTaken && originalGroupTaken.galleryId === currentGalleryId() && !!originalGroupTaken.group;
    const current2 = NS.describe(pickLanguage(props.values), intl.locale);
    let options = NS.languageOptions(intl.locale).filter(
      (o) => {
        return !NS.enabledLanguages || NS.enabledLanguages.has(o.value);
      }
    );
    if (current2 && !current2.known) {
      options = [
        { value: current2.code, label: current2.name, flag: null },
        ...options
      ];
    }
    const selected = current2 ? { value: current2.code, label: current2.name, flag: current2.flag } : null;
    const usualLanguages = NS.usualLanguagesOf(store);
    const usual = usualLanguages[NS.groupKey(NS.translationGroupOf(props.values))];
    const offered = usual && (!NS.enabledLanguages || NS.enabledLanguages.has(usual.code)) && (!current2 || current2.code !== usual.code) ? usual : null;
    const offeredInfo = offered ? NS.describe(offered.code, intl.locale) : null;
    const chipIcon = Solid.faWandMagicSparkles || Solid.faMagic || Solid.faLanguage || null;
    const chipTitle = offered && offeredInfo ? t(intl, "mangaTools.translationGroup.fill") + " " + offeredInfo.name + " \u2014 " + t(intl, "mangaTools.translationGroup.suggestedLanguage") + " (" + offered.count + ")" : "";
    const languageChip = offered && offeredInfo ? /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary manga-tools-chip",
        "aria-label": chipTitle,
        title: chipTitle,
        onClick: () => write2(FIELD_NAME, offered.code)
      },
      NS.showFlags && offeredInfo.flag ? /* @__PURE__ */ React5.createElement(Flag2, { flag: offeredInfo.flag, className: "manga-tools-flag" }) : chipIcon ? /* @__PURE__ */ React5.createElement(Icon, { icon: chipIcon }) : /* @__PURE__ */ React5.createElement("span", null, offeredInfo.name)
    ) : null;
    const cls = readNativeFieldClasses(document.querySelector(EDIT_ANCHOR)) || {
      group: "form-group row",
      label: "form-label col-form-label col-sm-3",
      control: "col-sm-9"
    };
    const languageField = (
      // Plain div/label carrying the copied class names, rather than
      // Form.Group/Form.Label/Col: those components regenerate the width classes
      // from their own defaults, which is what broke the alignment before.
      /* @__PURE__ */ React5.createElement("div", { className: cls.group, "data-field": "manga_tools_language" }, /* @__PURE__ */ React5.createElement("label", { className: cls.label, htmlFor: "manga_tools_language" }, fieldLabel2(intl)), /* @__PURE__ */ React5.createElement(
        "div",
        {
          className: cls.control + (languageChip ? " manga-tools-chip-row" : "")
        },
        /* @__PURE__ */ React5.createElement(
          Select,
          {
            className: "manga-tools-select",
            classNamePrefix: "react-select",
            inputId: "manga_tools_language",
            isClearable: true,
            isSearchable: false,
            placeholder: t(intl, "mangaTools.select.placeholder"),
            value: selected,
            options,
            components: { IndicatorSeparator: () => null },
            formatOptionLabel: formatLanguageOption,
            onChange: (opt) => {
              write2(FIELD_NAME, opt ? opt.value : "");
            }
          }
        ),
        languageChip
      ))
    );
    const mark = censorshipOf(props.values);
    const markOptions = [
      { value: "censored", label: t(intl, "mangaTools.censorship.censored") },
      {
        value: "uncensored",
        label: t(intl, "mangaTools.censorship.uncensored")
      }
    ];
    const markSelected = markOptions.find((o) => o.value === mark) || null;
    const markField = /* @__PURE__ */ React5.createElement("div", { className: cls.group, "data-field": "manga_tools_censorship" }, /* @__PURE__ */ React5.createElement("label", { className: cls.label, htmlFor: "manga_tools_censorship" }, t(intl, "mangaTools.censorship.heading")), /* @__PURE__ */ React5.createElement("div", { className: cls.control }, /* @__PURE__ */ React5.createElement(
      Select,
      {
        className: "manga-tools-select",
        classNamePrefix: "react-select",
        inputId: "manga_tools_censorship",
        isClearable: true,
        isSearchable: false,
        placeholder: t(intl, "mangaTools.censorship.unset"),
        value: markSelected,
        options: markOptions,
        components: { IndicatorSeparator: () => null },
        formatOptionLabel: formatCensorshipOption,
        onChange: (opt) => {
          write2(CENSORSHIP_FIELD_NAME, opt ? opt.value : "");
        }
      }
    )));
    const groupRaw = NS.pickField(props.values, TRANSLATION_GROUP_FIELD_NAME);
    const groupName = NS.translationGroupOf(props.values);
    const known = knownTranslationGroups();
    const namesANewGroup = !!groupName && !known.some((name) => NS.sameTranslationGroup(name, groupName));
    const usualOf = (name) => usualLanguages[NS.groupKey(name)];
    const matchesNow = (name) => {
      const usualHere = usualOf(name);
      return !!current2 && !!usualHere && usualHere.code === current2.code;
    };
    const ordered = known.filter(matchesNow).concat(known.filter((name) => !matchesNow(name)));
    const groupOptions = [
      ...namesANewGroup ? [
        {
          value: groupName,
          label: groupName,
          // Composed here rather than in formatGroupOption, which runs inside
          // react-select's render and cannot use a hook. Quoted, because the
          // name is a name and reading "Create Lily Manga" makes the offer look
          // like the answer.
          createLabel: t(intl, "mangaTools.translationGroup.create") + ' "' + groupName + '"'
        }
      ] : [],
      ...ordered.map((name) => {
        const usualHere = usualOf(name);
        const described = usualHere ? NS.describe(usualHere.code, intl.locale) : null;
        const hint = described ? { flag: described.flag, name: described.name } : null;
        return { value: name, label: name, hint };
      })
    ];
    const originalLabel = t(intl, "mangaTools.translationGroup.original");
    const originalChip = /* @__PURE__ */ React5.createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary manga-tools-chip manga-tools-original" + (isOriginal ? " active" : ""),
        "aria-pressed": isOriginal,
        "aria-label": originalLabel,
        title: t(
          intl,
          isOriginal ? restoresGroup ? "mangaTools.translationGroup.originalOffRestore" : "mangaTools.translationGroup.originalOff" : "mangaTools.translationGroup.originalOn"
        ),
        onClick: toggleOriginal
      },
      /* @__PURE__ */ React5.createElement(SteakIcon, { raw: isOriginal })
    );
    const groupField = /* @__PURE__ */ React5.createElement("div", { className: cls.group, "data-field": "manga_tools_translation_group" }, /* @__PURE__ */ React5.createElement("label", { className: cls.label, htmlFor: "manga_tools_translation_group" }, t(intl, "mangaTools.translationGroup.heading")), /* @__PURE__ */ React5.createElement("div", { className: cls.control + " manga-tools-chip-row" }, /* @__PURE__ */ React5.createElement(
      Select,
      {
        className: "manga-tools-select manga-tools-group-select",
        classNamePrefix: "react-select",
        inputId: "manga_tools_translation_group",
        isClearable: true,
        isDisabled: isOriginal,
        placeholder: t(
          intl,
          isOriginal ? "mangaTools.translationGroup.originalDetail" : "mangaTools.translationGroup.placeholder"
        ),
        value: groupRaw ? { value: groupRaw, label: groupName } : null,
        options: groupOptions,
        formatOptionLabel: formatGroupOption,
        components: { IndicatorSeparator: () => null },
        onMenuOpen: () => refreshForSuggestions(),
        onInputChange: (text2, meta) => {
          if ((meta == null ? void 0 : meta.action) !== "input-change") return;
          writeGroup(text2.trim() ? text2 : "");
        },
        onChange: (opt) => {
          writeGroup(opt ? opt.value : "");
        }
      }
    ), originalChip));
    return PluginApi5.ReactDOM.createPortal(
      /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-panel" }, /* @__PURE__ */ React5.createElement("div", { className: cls.group }, /* @__PURE__ */ React5.createElement("div", { className: "col-12" }, /* @__PURE__ */ React5.createElement("div", { className: "collapse-header" }, Button ? /* @__PURE__ */ React5.createElement(
        Button,
        {
          className: "minimal collapse-button",
          "aria-expanded": open,
          onClick: () => setOpen(!open)
        },
        /* @__PURE__ */ React5.createElement(
          Icon,
          {
            icon: open ? Solid.faChevronDown : Solid.faChevronRight,
            fixedWidth: true
          }
        ),
        /* @__PURE__ */ React5.createElement("span", null, t(intl, "mangaTools.panel.heading"))
      ) : null))), open ? markField : null, open ? languageField : null, open ? groupField : null),
      host
    );
  }
  function BooleanSetting(props) {
    const Bootstrap = PluginApi5.libraries.Bootstrap;
    if (!Bootstrap) {
      console.error(
        "[mangaTools] react-bootstrap not available, cannot render the settings switches"
      );
      return null;
    }
    return /* @__PURE__ */ React5.createElement("div", { className: "setting" }, /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement("h3", null, props.heading), /* @__PURE__ */ React5.createElement("div", { className: "sub-heading" }, props.subHeading)), /* @__PURE__ */ React5.createElement("div", null, /* @__PURE__ */ React5.createElement(
      Bootstrap.Form.Switch,
      {
        id: props.id,
        checked: props.checked,
        onChange: () => {
          props.onChange(!props.checked);
        }
      }
    )));
  }
  function MangaToolsSettings(props) {
    useGlobalVersion();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const Select = resolveSelect();
    const savePlugin = PluginApi5.utils.StashService.useConfigurePlugin()[0];
    function persist() {
      savePlugin({
        variables: {
          plugin_id: props.pluginID,
          input: {
            enabledLanguages: NS.enabledLanguages ? NS.serializeEnabledLanguages(NS.enabledLanguages) : "",
            showFlags: NS.showFlags,
            showCoverBadge: NS.showCoverBadge,
            openDetailsBlock: NS.openDetailsBlock,
            openEditBlock: NS.openEditBlock,
            hidePerformers: NS.hidePerformers
          }
        }
      }).catch((e) => {
        console.error("[mangaTools] failed to save plugin settings:", e);
      });
    }
    const options = NS.languageOptions(intl.locale);
    const enabled = NS.enabledLanguages;
    const value = enabled ? options.filter((o) => enabled == null ? void 0 : enabled.has(o.value)) : [];
    if (!Select) return null;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement("div", { className: "setting manga-tools-settings" }, /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-settings-block" }, /* @__PURE__ */ React5.createElement("h3", null, t(intl, "mangaTools.settings.enabledLanguages.heading")), /* @__PURE__ */ React5.createElement("div", { className: "sub-heading" }, t(intl, "mangaTools.settings.enabledLanguages.description")), /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-settings-control" }, /* @__PURE__ */ React5.createElement(
      Select,
      {
        className: "manga-tools-settings-select",
        classNamePrefix: "react-select",
        isMulti: true,
        isClearable: true,
        menuPlacement: "auto",
        placeholder: t(
          intl,
          "mangaTools.settings.enabledLanguages.placeholder"
        ),
        value,
        options,
        formatOptionLabel: formatLanguageOption,
        components: { IndicatorSeparator: () => null },
        onChange: (selected) => {
          const codes = (selected || []).map((o) => o.value);
          NS.enabledLanguages = NS.parseEnabledLanguages(
            NS.serializeEnabledLanguages(codes)
          );
          emit();
          persist();
        }
      }
    )))), /* @__PURE__ */ React5.createElement(
      BooleanSetting,
      {
        id: "mangaTools-showFlags",
        heading: t(intl, "mangaTools.settings.showFlags.heading"),
        subHeading: t(intl, "mangaTools.settings.showFlags.description"),
        checked: NS.showFlags,
        onChange: (next) => {
          NS.showFlags = next;
          emit();
          persist();
        }
      }
    ), /* @__PURE__ */ React5.createElement(
      BooleanSetting,
      {
        id: "mangaTools-showCoverBadge",
        heading: t(intl, "mangaTools.settings.showCoverBadge.heading"),
        subHeading: t(intl, "mangaTools.settings.showCoverBadge.description"),
        checked: NS.showCoverBadge,
        onChange: (next) => {
          NS.showCoverBadge = next;
          emit();
          persist();
        }
      }
    ), /* @__PURE__ */ React5.createElement(
      BooleanSetting,
      {
        id: "mangaTools-openDetailsBlock",
        heading: t(intl, "mangaTools.settings.openDetailsBlock.heading"),
        subHeading: t(intl, "mangaTools.settings.openDetailsBlock.description"),
        checked: NS.openDetailsBlock,
        onChange: (next) => {
          NS.openDetailsBlock = next;
          emit();
          persist();
        }
      }
    ), /* @__PURE__ */ React5.createElement(
      BooleanSetting,
      {
        id: "mangaTools-openEditBlock",
        heading: t(intl, "mangaTools.settings.openEditBlock.heading"),
        subHeading: t(intl, "mangaTools.settings.openEditBlock.description"),
        checked: NS.openEditBlock,
        onChange: (next) => {
          NS.openEditBlock = next;
          emit();
          persist();
        }
      }
    ), /* @__PURE__ */ React5.createElement(ChapterImportSetting, { intl }), /* @__PURE__ */ React5.createElement(
      BooleanSetting,
      {
        id: "mangaTools-hidePerformers",
        heading: t(intl, "mangaTools.settings.hidePerformers.heading"),
        subHeading: t(intl, "mangaTools.settings.hidePerformers.description"),
        checked: NS.hidePerformers,
        onChange: (next) => {
          NS.hidePerformers = next;
          emit();
          persist();
        }
      }
    ));
  }
  var bulkLanguage = null;
  var bulkCensorship = null;
  var bulkManga = null;
  var selectedGalleryIds = [];
  function captureSelection(selectedIds) {
    const next = [];
    if (selectedIds && typeof selectedIds.forEach === "function") {
      selectedIds.forEach((id) => {
        next.push(String(id));
      });
    }
    const unchanged = next.length === selectedGalleryIds.length && next.every((id, i) => id === selectedGalleryIds[i]);
    if (!unchanged) selectedGalleryIds = next;
  }
  function selectedLanguageAggregate() {
    if (!selectedGalleryIds.length) return null;
    const first = pickLanguage(store == null ? void 0 : store.get(selectedGalleryIds[0]));
    for (let i = 1; i < selectedGalleryIds.length; i++) {
      if (pickLanguage(store == null ? void 0 : store.get(selectedGalleryIds[i])) !== first) return null;
    }
    return first || null;
  }
  function selectedCensorshipAggregate() {
    if (!selectedGalleryIds.length) return null;
    const first = censorshipOf(store == null ? void 0 : store.get(selectedGalleryIds[0]));
    for (let i = 1; i < selectedGalleryIds.length; i++) {
      if (censorshipOf(store == null ? void 0 : store.get(selectedGalleryIds[i])) !== first) return null;
    }
    return first || null;
  }
  function selectedMangaAggregate() {
    if (!selectedGalleryIds.length) return "none";
    let anyManga = false;
    let anyOther = false;
    for (let i = 0; i < selectedGalleryIds.length; i++) {
      if (NS.isManga(store == null ? void 0 : store.get(selectedGalleryIds[i]))) anyManga = true;
      else anyOther = true;
      if (anyManga && anyOther) return "mixed";
    }
    return anyManga ? "all" : "none";
  }
  var bulkLinkInstalled = false;
  function isGalleryBulkUpdate(query) {
    var _a2;
    const defs = query ? query.definitions : null;
    if (!(defs == null ? void 0 : defs.length)) return false;
    const op = defs[0];
    if ((op == null ? void 0 : op.kind) !== "OperationDefinition") return false;
    const selections = (_a2 = op.selectionSet) == null ? void 0 : _a2.selections;
    if (!(selections == null ? void 0 : selections.length)) return false;
    const first = selections[0];
    return !!((first == null ? void 0 : first.name) && first.name.value === "bulkGalleryUpdate");
  }
  function applyPendingFields(operation) {
    const partial = {};
    const remove = [];
    if (bulkManga === "unmark") {
      remove.push(FIELD_NAME, CENSORSHIP_FIELD_NAME, MANGA_FIELD_NAME);
    } else {
      if (bulkManga === "mark") partial[MANGA_FIELD_NAME] = NS.MANGA_VALUE;
      if ((bulkLanguage == null ? void 0 : bulkLanguage.kind) === "set") partial[FIELD_NAME] = bulkLanguage.value;
      else if ((bulkLanguage == null ? void 0 : bulkLanguage.kind) === "remove") remove.push(FIELD_NAME);
      if ((bulkCensorship == null ? void 0 : bulkCensorship.kind) === "set")
        partial[CENSORSHIP_FIELD_NAME] = bulkCensorship.value;
      else if ((bulkCensorship == null ? void 0 : bulkCensorship.kind) === "remove")
        remove.push(CENSORSHIP_FIELD_NAME);
    }
    if (!Object.keys(partial).length && !remove.length) return false;
    if (!isGalleryContext()) return false;
    if (!isGalleryBulkUpdate(operation.query)) return false;
    const input = operation.variables ? operation.variables.input : void 0;
    if (!input || !Array.isArray(input.ids)) return false;
    const fields = {};
    if (Object.keys(partial).length) fields.partial = partial;
    if (remove.length) fields.remove = remove;
    operation.variables = Object.assign({}, operation.variables, {
      input: Object.assign({}, input, {
        custom_fields: Object.assign(
          {},
          input.custom_fields,
          fields
        )
      })
    });
    return true;
  }
  function installBulkLink() {
    if (bulkLinkInstalled) return;
    const Apollo = PluginApi5.libraries.Apollo;
    const client = stashClient();
    if (!client) return;
    if (!(Apollo == null ? void 0 : Apollo.ApolloLink) || typeof client.setLink !== "function" || !client.link) {
      console.error(
        "[mangaTools] ApolloLink/setLink unavailable \u2014 the manga fields cannot be set from the bulk edit dialog"
      );
      return;
    }
    const previous = client.link;
    client.setLink(
      Apollo.ApolloLink.from([
        new Apollo.ApolloLink((operation, forward) => {
          if (!applyPendingFields(operation)) {
            return forward(operation);
          }
          console.info(
            "[mangaTools] bulk update: sending the manga fields with the dialog's own update"
          );
          return forward(operation).map((result) => {
            bulkLanguage = null;
            bulkCensorship = null;
            bulkManga = null;
            refreshAfterWrite();
            emit();
            return result;
          });
        }),
        previous
      ])
    );
    bulkLinkInstalled = true;
  }
  var BULK_REMOVE_VALUE = "__manga_tools_remove__";
  function BulkFieldsRow() {
    useGlobalVersion();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const Select = resolveSelect();
    const Solid = PluginApi5.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi5.components.Icon;
    const host = isGalleryContext() ? ensureBulkFieldHost() : null;
    const bump = React5.useState(0)[1];
    React5.useLayoutEffect(() => {
      if (isGalleryContext()) {
        installBulkLink();
        if (ensureBulkFieldHost() !== host) {
          bump((v) => v + 1);
        }
      }
    });
    React5.useEffect(
      () => () => {
        if (!bulkAnchor()) {
          bulkLanguage = null;
          bulkCensorship = null;
          bulkManga = null;
        }
      },
      []
    );
    if (!isGalleryContext() || !Select || !host) return null;
    const cls = readNativeFieldClasses(bulkAnchor()) || {
      group: "row",
      label: "col-form-label col-3",
      control: "col-9"
    };
    const aggregate = selectedMangaAggregate();
    const tri = bulkManga === "mark" ? true : bulkManga === "unmark" ? false : aggregate === "all" ? true : aggregate === "none" ? false : void 0;
    const setIndeterminate = (el) => {
      if (el) el.indeterminate = tri === void 0;
    };
    const cycleManga = () => {
      if (aggregate === "all") {
        bulkManga = bulkManga === "unmark" ? null : "unmark";
      } else if (aggregate === "none") {
        bulkManga = bulkManga === "mark" ? null : "mark";
      } else {
        bulkManga = bulkManga === null ? "mark" : bulkManga === "mark" ? "unmark" : null;
      }
      emit();
    };
    const mangaRow = /* @__PURE__ */ React5.createElement("div", { className: "form-group", "data-field": "manga_tools_manga" }, /* @__PURE__ */ React5.createElement("div", { className: "form-check" }, /* @__PURE__ */ React5.createElement(
      "input",
      {
        type: "checkbox",
        className: "form-check-input",
        id: "manga_tools_manga",
        ref: setIndeterminate,
        checked: tri === true,
        onChange: cycleManga
      }
    ), /* @__PURE__ */ React5.createElement("label", { className: "form-check-label", htmlFor: "manga_tools_manga" }, t(intl, "mangaTools.manga.isManga"))));
    const removeOption = {
      value: BULK_REMOVE_VALUE,
      label: t(intl, "mangaTools.bulk.remove"),
      flag: null
    };
    const banIcon = Solid.faBan || null;
    const removeLabel = /* @__PURE__ */ React5.createElement("span", { className: "manga-tools-option" }, banIcon ? /* @__PURE__ */ React5.createElement(Icon, { icon: banIcon }) : null, removeOption.label);
    const formatLanguageWithRemove = (opt) => opt.value === BULK_REMOVE_VALUE ? removeLabel : formatLanguageOption(opt);
    const formatCensorshipWithRemove = (opt) => opt.value === BULK_REMOVE_VALUE ? removeLabel : formatCensorshipOption(opt);
    let options = NS.languageOptions(intl.locale).filter(
      (o) => !NS.enabledLanguages || NS.enabledLanguages.has(o.value)
    );
    const langShown = (bulkLanguage == null ? void 0 : bulkLanguage.kind) === "set" ? bulkLanguage.value : (bulkLanguage == null ? void 0 : bulkLanguage.kind) === "remove" ? BULK_REMOVE_VALUE : selectedLanguageAggregate() || "";
    const current2 = langShown && langShown !== BULK_REMOVE_VALUE ? NS.describe(langShown, intl.locale) : null;
    const currentCode = current2 ? current2.code : "";
    if (current2 && !options.some((o) => o.value === currentCode)) {
      options = [
        { value: current2.code, label: current2.name, flag: current2.flag },
        ...options
      ];
    }
    const selected = langShown === BULK_REMOVE_VALUE ? removeOption : current2 ? { value: current2.code, label: current2.name, flag: current2.flag } : null;
    const languageRow = /* @__PURE__ */ React5.createElement("div", { className: cls.group, "data-field": "manga_tools_language" }, /* @__PURE__ */ React5.createElement("label", { className: cls.label, htmlFor: "manga_tools_language" }, fieldLabel2(intl)), /* @__PURE__ */ React5.createElement("div", { className: cls.control }, /* @__PURE__ */ React5.createElement(
      Select,
      {
        className: "manga-tools-select",
        classNamePrefix: "react-select",
        inputId: "manga_tools_language",
        isClearable: true,
        isSearchable: false,
        menuPortalTarget: document.body,
        placeholder: t(intl, "mangaTools.select.placeholder"),
        value: selected,
        options: [...options, removeOption],
        formatOptionLabel: formatLanguageWithRemove,
        components: { IndicatorSeparator: () => null },
        onChange: (opt) => {
          if (!opt) {
            bulkLanguage = null;
          } else if (opt.value === BULK_REMOVE_VALUE) {
            bulkLanguage = { kind: "remove" };
          } else {
            bulkLanguage = { kind: "set", value: opt.value };
          }
          emit();
        }
      }
    )));
    const censorshipOptions2 = [
      { value: "censored", label: t(intl, "mangaTools.censorship.censored") },
      {
        value: "uncensored",
        label: t(intl, "mangaTools.censorship.uncensored")
      }
    ];
    const censoredShown = (bulkCensorship == null ? void 0 : bulkCensorship.kind) === "set" ? bulkCensorship.value : (bulkCensorship == null ? void 0 : bulkCensorship.kind) === "remove" ? BULK_REMOVE_VALUE : selectedCensorshipAggregate() || "";
    const censoredSelected = censoredShown === BULK_REMOVE_VALUE ? removeOption : censoredShown ? {
      value: censoredShown,
      label: NS.censorshipLabel(intl, censoredShown)
    } : null;
    const censorshipRow = /* @__PURE__ */ React5.createElement("div", { className: cls.group, "data-field": "manga_tools_censorship" }, /* @__PURE__ */ React5.createElement("label", { className: cls.label, htmlFor: "manga_tools_censorship" }, t(intl, "mangaTools.censorship.heading")), /* @__PURE__ */ React5.createElement("div", { className: cls.control }, /* @__PURE__ */ React5.createElement(
      Select,
      {
        className: "manga-tools-select",
        classNamePrefix: "react-select",
        inputId: "manga_tools_censorship",
        isClearable: true,
        isSearchable: false,
        menuPortalTarget: document.body,
        placeholder: t(intl, "mangaTools.censorship.unset"),
        value: censoredSelected,
        options: [...censorshipOptions2, removeOption],
        formatOptionLabel: formatCensorshipWithRemove,
        components: { IndicatorSeparator: () => null },
        onChange: (opt) => {
          if (!opt) {
            bulkCensorship = null;
          } else if (opt.value === BULK_REMOVE_VALUE) {
            bulkCensorship = { kind: "remove" };
          } else {
            bulkCensorship = { kind: "set", value: opt.value };
          }
          emit();
        }
      }
    )));
    return PluginApi5.ReactDOM.createPortal(
      /* @__PURE__ */ React5.createElement(React5.Fragment, null, tri === false && aggregate !== "none" ? /* @__PURE__ */ React5.createElement("div", { className: "alert alert-warning", role: "alert" }, t(intl, "mangaTools.bulk.unmarkWarning")) : null, mangaRow, tri === true ? languageRow : null, tri === true ? censorshipRow : null),
      host
    );
  }
  var guardedBlockClass = null;
  function guardedBlock() {
    if (guardedBlockClass) return guardedBlockClass;
    guardedBlockClass = class extends React5.Component {
      constructor() {
        super(...arguments);
        __publicField(this, "state", { failed: false });
      }
      static getDerivedStateFromError() {
        return { failed: true };
      }
      componentDidCatch(error) {
        console.error(
          "[mangaTools] the " + this.props.name + " threw while rendering, so it is not on the page. Everything else the plugin does is unaffected.",
          error
        );
      }
      render() {
        return this.state.failed ? null : this.props.children;
      }
    };
    return guardedBlockClass;
  }
  var DETAILS_OPEN_BY_DEFAULT = false;
  var EDIT_OPEN_BY_DEFAULT = true;
  var HIDE_PERFORMERS_BY_DEFAULT = true;
  NS.openDetailsBlock = DETAILS_OPEN_BY_DEFAULT;
  NS.openEditBlock = EDIT_OPEN_BY_DEFAULT;
  NS.hidePerformers = HIDE_PERFORMERS_BY_DEFAULT;
  function MangaDetailsPanel(props) {
    var _a2, _b2;
    useGlobalVersion();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const state = React5.useState(NS.openDetailsBlock);
    const open = state[0];
    const setOpen = state[1];
    const language2 = NS.describe(pickLanguage(props.values), intl.locale);
    const mark = censorshipOf(props.values);
    const group = NS.translationGroupOf(props.values);
    const original = NS.isOriginal(props.values);
    const Solid = PluginApi5.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi5.components.Icon;
    const Button = (_a2 = PluginApi5.libraries.Bootstrap) == null ? void 0 : _a2.Button;
    const Collapse = (_b2 = PluginApi5.libraries.Bootstrap) == null ? void 0 : _b2.Collapse;
    if (!language2 && !mark && !group && !original) return null;
    const host = ensureDetailHost();
    if (!host) return null;
    const showFlag = NS.showFlags && !!(language2 == null ? void 0 : language2.flag);
    const body = /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-panel-body" }, mark ? /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.censorship.heading") + ": ", /* @__PURE__ */ React5.createElement(CensorshipIcon, { value: mark }), mark ? " " : null, NS.censorshipLabel(intl, mark)) : null, language2 ? /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, fieldLabel2(intl) + ": ", showFlag ? /* @__PURE__ */ React5.createElement(Flag2, { flag: language2.flag, className: "manga-tools-flag" }) : null, showFlag ? " " : null, language2.name, original ? t(intl, "mangaTools.translationGroup.originalInline") : null) : null, group ? (
      // No icon and no flag: a group's name is its own, and there is nothing
      // here to draw beside it. Drawn last, because it is the one row that is
      // the same shape on every gallery rather than picked from a list.
      /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.translationGroup.heading") + ": ", group)
    ) : null, original && !language2 ? (
      // Raw with no language to carry the mark, so it stands on its own — and
      // without the group's label, for the reason above. The wording carries the
      // rest: a bare "原文" under that label would read like a group called that,
      // which is why the string says what it does.
      /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.translationGroup.originalDetail"))
    ) : null);
    return PluginApi5.ReactDOM.createPortal(
      /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-panel" }, /* @__PURE__ */ React5.createElement("div", { className: "collapse-header" }, Button ? /* @__PURE__ */ React5.createElement(
        Button,
        {
          className: "minimal collapse-button",
          "aria-expanded": open,
          onClick: () => setOpen(!open)
        },
        /* @__PURE__ */ React5.createElement(
          Icon,
          {
            icon: open ? Solid.faChevronDown : Solid.faChevronRight,
            fixedWidth: true
          }
        ),
        /* @__PURE__ */ React5.createElement("span", null, t(intl, "mangaTools.panel.heading"))
      ) : null), Collapse ? /* @__PURE__ */ React5.createElement(Collapse, { in: open }, body) : body),
      host
    );
  }
  registerPatch("after", "GalleryCard.Overlays", (...args) => {
    var _a2;
    const props = args[0];
    const result = resultFrom(args);
    noteFired("GalleryCard.Overlays");
    const id = (_a2 = props.gallery) == null ? void 0 : _a2.id;
    const value = id ? pickLanguage(store == null ? void 0 : store.get(String(id))) : "";
    if (!value || !NS.showCoverBadge) return result;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, result, /* @__PURE__ */ React5.createElement(LanguageBadge, { galleryId: id }));
  });
  registerPatch("after", "GalleryCard.Popovers", (...args) => {
    var _a2;
    const props = args[0];
    const result = resultFrom(args);
    noteFired("GalleryCard.Popovers");
    const id = (_a2 = props.gallery) == null ? void 0 : _a2.id;
    if (!id || !storedIsManga(String(id))) return result;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, result, /* @__PURE__ */ React5.createElement(MangaPopoverMark, { galleryId: String(id) }));
  });
  registerPatch("instead", "CustomFieldsInput", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("CustomFieldsInput");
    useGlobalVersion();
    React5.useEffect(() => {
      var _a2;
      const galleryId2 = currentGalleryId();
      if (props.onChange && galleryId2) {
        editForm = {
          galleryId: galleryId2,
          values: (_a2 = props.values) != null ? _a2 : {},
          onChange: props.onChange
        };
      }
      return () => {
        editForm = null;
      };
    });
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, isMarkedNow(currentGalleryId(), props.values) ? /* @__PURE__ */ React5.createElement(MangaFieldBlock, { values: props.values, onChange: props.onChange }) : null, /* @__PURE__ */ React5.createElement(Original, { ...props }));
  });
  registerPatch("instead", "CustomFieldInput", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("CustomFieldInput");
    const isOwnRow = NS.isOwnField(props.field);
    if (!props.isNew && isOwnRow) {
      return null;
    }
    return /* @__PURE__ */ React5.createElement(Original, { ...props });
  });
  var DETAIL_HOST_CLASS = "manga-tools-detail-host";
  var detailHost = null;
  function ensureDetailHost() {
    const panel2 = document.querySelector(".gallery-details");
    if (!panel2) {
      detailHost = null;
      return null;
    }
    if (!detailHost) {
      detailHost = document.createElement("div");
      detailHost.className = DETAIL_HOST_CLASS;
    }
    if (detailHost.parentNode !== panel2 || panel2.lastElementChild !== detailHost) {
      panel2.appendChild(detailHost);
    }
    return detailHost;
  }
  var FIELD_HOST_CLASS = "manga-tools-field-host";
  function bulkAnchor() {
    let el = document.querySelector(BULK_DIALOG_MARK);
    while (el) {
      const element = el;
      if (element.tagName === "form") {
        return element.querySelector(BULK_ANCHOR);
      }
      el = el.parentNode;
    }
    return null;
  }
  var fieldHosts = {
    edit: null,
    bulk: null
  };
  function ensureHostAfter(anchor, key) {
    if (!(anchor == null ? void 0 : anchor.parentNode)) {
      fieldHosts[key] = null;
      return null;
    }
    let host = fieldHosts[key];
    if (!host) {
      host = document.createElement("div");
      host.className = FIELD_HOST_CLASS;
      fieldHosts[key] = host;
    }
    if (host.parentNode !== anchor.parentNode || anchor.nextElementSibling !== host) {
      anchor.parentNode.insertBefore(host, anchor.nextElementSibling);
    }
    return host;
  }
  function ensureFieldHost() {
    return ensureHostAfter(document.querySelector(EDIT_ANCHOR), "edit");
  }
  function ensureBulkFieldHost() {
    return ensureHostAfter(bulkAnchor(), "bulk");
  }
  function fieldLabel2(intl) {
    return intl.formatMessage({
      id: "config.ui.language.heading",
      defaultMessage: "Language"
    });
  }
  registerPatch("instead", "CustomFields", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("CustomFields");
    useGlobalVersion();
    const values = props.values;
    if (!values || typeof values !== "object") return /* @__PURE__ */ React5.createElement(Original, { ...props });
    const rest = Object.assign({}, values);
    let lifted = false;
    Object.keys(values).forEach((k) => {
      if (!NS.isOwnField(k)) return;
      lifted = true;
      delete rest[k];
    });
    const galleryId2 = currentGalleryId();
    const Guard = guardedBlock();
    if (!lifted && !galleryId2) return /* @__PURE__ */ React5.createElement(Original, { ...props });
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement(
      Original,
      {
        ...lifted ? Object.assign({}, props, { values: rest }) : props
      }
    ), galleryId2 && isMarkedNow(galleryId2, values) ? /* @__PURE__ */ React5.createElement(Guard, { name: "manga panel" }, /* @__PURE__ */ React5.createElement(MangaDetailsPanel, { values })) : null, galleryId2 && CAN_WRITE ? /* @__PURE__ */ React5.createElement(GalleryToolbar, { galleryId: galleryId2, values }) : null);
  });
  registerPatch("instead", "PluginSettings", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("PluginSettings");
    if (props.pluginID === PLUGIN_ID) {
      return /* @__PURE__ */ React5.createElement(MangaToolsSettings, { pluginID: props.pluginID });
    }
    return /* @__PURE__ */ React5.createElement(Original, { ...props });
  });
  registerPatch("before", "GalleryList", (...args) => {
    const props = args[0];
    noteFired("GalleryList");
    captureSelection(props ? props.selectedIds : null);
    return args;
  });
  registerPatch("after", "FilteredGalleryList.SidebarSections", (...args) => {
    const result = resultFrom(args);
    noteFired("FilteredGalleryList.SidebarSections");
    const filter = currentSidebarFilter();
    if (!filter) return result;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement(SidebarLanguageFilter, { filter }), /* @__PURE__ */ React5.createElement(SidebarCensorshipFilter, { filter }), /* @__PURE__ */ React5.createElement(SidebarMangaFilter, { filter }), result);
  });
  registerPatch("after", "FilteredGalleryList", (...args) => {
    const result = resultFrom(args);
    noteFired("FilteredGalleryList");
    if (!warnedMissingSidebarContainer && !hasSidebarSectionsContainer()) {
      warnedMissingSidebarContainer = true;
      console.error(
        "[mangaTools] this Stash has no FilteredGalleryList.SidebarSections, so the language, censorship and manga filter sections are unavailable. Stash v0.31 added the patch container they are mounted through."
      );
    }
    publishSidebarFilter(findFilter(result));
    return result;
  });
  registerPatch("instead", "GalleryList", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("GalleryList.filter");
    if (props.filter) registerLanguageCriterionOption(props.filter);
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement(DialogLanguageFilter, { filter: props.filter }), /* @__PURE__ */ React5.createElement(Original, { ...props }));
  });
  registerPatch("after", "RatingSystem", (...args) => {
    noteFired("RatingSystem");
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, resultFrom(args), /* @__PURE__ */ React5.createElement(BulkFieldsRow, null));
  });
  function install2() {
    start();
  }

  // src/mangaTools.tsx
  requirePluginApi();
  function isolate(half, install3) {
    try {
      install3();
    } catch (e) {
      console.error(
        `[mangaTools] the ${half} could not be started, so it is not on the page. The other half is unaffected.`,
        e
      );
    }
  }
  isolate("tools half", install2);
  isolate("reader half", install);
})();
