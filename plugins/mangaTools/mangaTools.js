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
    var _a3, _b3;
    const api = requirePluginApi();
    const gql = ((_a3 = api.libraries.Apollo) == null ? void 0 : _a3.gql) || ((_b3 = api.GQL) == null ? void 0 : _b3.gql);
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
    id: { flag: "id" },
    // **The one entry that is not a language of somewhere.** `zxx` is ISO 639-2's
    // "no linguistic content" — a CG collection, an art book, anything with no text of
    // its own to be in a language — and it is a *value* of this field like any other:
    // a gallery carrying it is marked deliberately, which is the difference between it
    // and an empty field. What it says is that the language question does not apply,
    // and the plugin acts on that: see NS.isNoLanguage.
    //
    // No flag, because there is no country to draw one of; the mark drawn in a flag's
    // place is in fields-ui.tsx. The name is not here either — Intl.DisplayNames knows
    // this code, so it reads "No linguistic content" / "无语言内容" / 言語的内容なし
    // without a string of ours.
    zxx: { flag: null }
  };
  NS.NO_LANGUAGE = "zxx";
  NS.isNoLanguage = (raw) => NS.findCanonical(NS.normalize(raw)) === NS.NO_LANGUAGE;
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
    const named = names ? names.of(canonical) || canonical : canonical;
    if (named !== canonical) return named;
    if (canonical !== NS.NO_LANGUAGE) return canonical;
    return NS.stringFor(
      locale || NS.FALLBACK_LOCALE,
      "mangaTools.language.noLanguage"
    ) || "No language";
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
    const optionFor = (code) => ({
      value: code,
      label: NS.name(code, uiLocale),
      flag: NS.LANGUAGES[code].flag
    });
    const languages = Object.keys(NS.LANGUAGES).filter(
      (code) => code !== NS.NO_LANGUAGE
    );
    return languages.map(optionFor).sort((a, b) => collator.compare(a.label, b.label)).concat([optionFor(NS.NO_LANGUAGE)]);
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
  NS.isRaw = (customFields) => NS.isOriginal(customFields) || NS.isNoLanguage(NS.pickField(customFields, NS.FIELD_NAME));
  NS.CHAPTER_FIELD_NAME = "plugin.mangaTools.chapters";
  NS.fieldShowing = (field2) => {
    if (!NS.fields) return false;
    if (field2 === "language") return NS.fieldLanguage;
    if (field2 === "censorship") return NS.fieldCensorship;
    if (field2 === "translationGroup") return NS.fieldTranslationGroup;
    return NS.fieldOriginal;
  };
  NS.SIDEBAR_FILTERS = [
    "language",
    "censorship",
    "translationGroup",
    "original"
  ];
  var SIDEBAR_FILTERS_NONE = "none";
  NS.parseSidebarFilters = (raw) => {
    if (raw === null || raw === void 0) return null;
    const s = String(raw).trim();
    if (s === "") return null;
    if (s === SIDEBAR_FILTERS_NONE) return /* @__PURE__ */ new Set();
    const out = /* @__PURE__ */ new Set();
    s.split(",").forEach((piece) => {
      const name = piece.trim();
      if (NS.SIDEBAR_FILTERS.includes(name)) out.add(name);
    });
    return out;
  };
  NS.serializeSidebarFilters = (names) => {
    const all = Array.from(names).sort();
    return all.length ? all.join(",") : SIDEBAR_FILTERS_NONE;
  };
  NS.filterShowing = (field2) => NS.fieldShowing(field2) && (NS.sidebarFilters === null || NS.sidebarFilters.has(field2));
  NS.sidebarFilters = null;
  NS.anyFieldShowing = () => NS.fieldShowing("language") || NS.fieldShowing("censorship") || NS.fieldShowing("translationGroup") || NS.fieldShowing("original");
  NS.fieldNameOf = (key) => {
    const k = NS.ownField(key);
    if (k === NS.FIELD_NAME) return "language";
    if (k === NS.CENSORSHIP_FIELD_NAME) return "censorship";
    if (k === NS.TRANSLATION_GROUP_FIELD_NAME) return "translationGroup";
    if (k === NS.ORIGINAL_FIELD_NAME) return "original";
    return "";
  };
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
    const mine = keys.length ? keys : [NS.MANGA_FIELD_NAME];
    return NS.deleteOnUnmark ? mine : mine.filter((key) => NS.ownField(key) === NS.MANGA_FIELD_NAME);
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
      let to = -1;
      for (const id of chapter.images) {
        const index = position.get(id);
        if (index === void 0) continue;
        if (at < 0 || index < at) at = index;
        if (index > to) to = index;
      }
      if (at < 0) continue;
      placed.push({ title: chapter.title, images: chapter.images, at, to });
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
      var _a3;
      return (_a3 = position.get(id)) != null ? _a3 : Number.MAX_SAFE_INTEGER;
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
  var BULLETS = "\u30FB\uFF65\u2022\u2023\u2219-\u2013\u2014*+\u25A0\u25A1\u25CF\u25CB\u25CE\u203B>";
  var WRAPPERS = [
    ["\u300E", "\u300F"],
    ["\u300C", "\u300D"],
    ["\u3010", "\u3011"],
    ["\u3008", "\u3009"],
    ["\u300A", "\u300B"],
    ["\u3014", "\u3015"],
    ["\uFF1C", "\uFF1E"],
    ["<", ">"],
    ["[", "]"],
    ["\uFF08", "\uFF09"],
    ["(", ")"],
    ["\uFF5B", "\uFF5D"],
    ["{", "}"]
  ];
  function unwrapped(line) {
    for (let i = 0; i < WRAPPERS.length; i++) {
      const open = WRAPPERS[i][0];
      const close = WRAPPERS[i][1];
      if (line.length >= open.length + close.length && line.startsWith(open) && line.endsWith(close)) {
        return line.slice(open.length, line.length - close.length).trim();
      }
    }
    return line;
  }
  function parseChapterList(text2) {
    const out = [];
    String(text2 != null ? text2 : "").split(/\r?\n/).forEach((raw) => {
      let line = raw.trim();
      while (line.length > 0 && BULLETS.indexOf(line[0]) !== -1) {
        line = line.slice(1).trim();
      }
      let was = "";
      while (line !== was) {
        was = line;
        line = unwrapped(line);
      }
      if (line) out.push(line);
    });
    return out;
  }
  function addChaptersAt(chapters, order, entries) {
    let next = chapters;
    for (let i = 0; i < entries.length; i++) {
      const added = addChapterAt(
        next,
        order,
        entries[i].pageId,
        entries[i].title
      );
      if (!added) return null;
      next = added;
    }
    return next;
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
  NR.addChaptersAt = addChaptersAt;
  NR.parseChapterList = parseChapterList;
  NR.renameChapterAt = renameChapterAt;
  NR.moveChapterStart = moveChapterStart;
  NR.removeChapterAt = removeChapterAt;

  // src/reader/chapters-edit.ts
  var listeners = [];
  function writeChapters(galleryId2, next) {
    return write(galleryId2, next).then(() => {
      announce(galleryId2, next);
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
  var IMAGE_GALLERIES_QUERY_TEXT = [
    "query MangaReaderImageGalleries($id: ID) {",
    "  findImage(id: $id) {",
    "    id",
    "    galleries {",
    "      id",
    "    }",
    "  }",
    "}"
  ].join("\n");
  var imageGalleriesQuery = null;
  async function galleryIdOfImage(imageId) {
    var _a3, _b3;
    if (!imageGalleriesQuery) {
      imageGalleriesQuery = gqlDoc(
        IMAGE_GALLERIES_QUERY_TEXT,
        "build the image's galleries query"
      );
    }
    const query = imageGalleriesQuery;
    if (!query) return null;
    const data = await requirePluginApi().utils.StashService.getClient().query({
      query,
      variables: { id: imageId },
      fetchPolicy: "no-cache"
    }).then((res) => res == null ? void 0 : res.data);
    const galleries = ((_a3 = data == null ? void 0 : data.findImage) == null ? void 0 : _a3.galleries) || [];
    for (let i = 0; i < galleries.length; i++) {
      const id = ((_b3 = galleries[i]) == null ? void 0 : _b3.id) ? String(galleries[i].id) : "";
      if (id && NS.markedInStore(id) === true) return id;
    }
    return null;
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
    var _a3, _b3;
    const carousel = lightbox.querySelector(
      SELECTOR_CAROUSEL
    );
    if (!carousel) return null;
    const offset = /^(-?\d+(?:\.\d+)?)vw$/.exec(((_a3 = carousel.style) == null ? void 0 : _a3.left) || "");
    if (!offset) return null;
    const at = Math.round(-Number(offset[1]) / 100);
    if (!Number.isFinite(at) || at < 0) return null;
    const slide = carousel.children[at];
    const media = (slide == null ? void 0 : slide.querySelector("img")) || (slide == null ? void 0 : slide.querySelector("video"));
    const src = (media == null ? void 0 : media.src) || "";
    const id = (_b3 = /\/image\/([^/]+)\//.exec(src)) == null ? void 0 : _b3[1];
    if (!id) return null;
    return { at, id };
  }
  async function fetchGallery(galleryId2, order) {
    var _a3, _b3, _c, _d, _e, _f, _g;
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
    const pages = (((_a3 = data == null ? void 0 : data.pages) == null ? void 0 : _a3.images) || []).map((image) => {
      var _a4;
      const file = (image.visual_files || []).find(
        (f) => typeof (f == null ? void 0 : f.width) === "number" && typeof (f == null ? void 0 : f.height) === "number"
      );
      return {
        id: String(image.id),
        width: (file == null ? void 0 : file.width) || 0,
        height: (file == null ? void 0 : file.height) || 0,
        // Stash's own URL for the image, kept for the query on it — which is a
        // version stamp, and is the whole reason this field is fetched at all. See
        // pageUrl in spreads.ts.
        url: ((_a4 = image.paths) == null ? void 0 : _a4.image) || ""
      };
    });
    const images = (((_b3 = data == null ? void 0 : data.pages) == null ? void 0 : _b3.images) || []).map((image) => {
      var _a4, _b4, _c2, _d2, _e2;
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
        title: String((_a4 = image.title) != null ? _a4 : ""),
        paths: { image: ((_b4 = image.paths) == null ? void 0 : _b4.image) || "" },
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
          var _a5, _b5;
          return {
            id: String(gallery.id),
            title: String((_a5 = gallery.title) != null ? _a5 : ""),
            folder: gallery.folder ? { path: String((_b5 = gallery.folder.path) != null ? _b5 : "") } : null
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
  NR.IMAGE_GALLERIES_QUERY_TEXT = IMAGE_GALLERIES_QUERY_TEXT;
  NR.galleryIdOfImage = galleryIdOfImage;
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
    var _a3;
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
    const galleries = ((_a3 = data == null ? void 0 : data.findGalleries) == null ? void 0 : _a3.galleries) || [];
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
    var _a3;
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
          await writeChapters(id, chapters);
          run.written.push(id);
        }
      } catch (error) {
        run.failed.push({ id, error });
      }
      done += 1;
      (_a3 = options.onProgress) == null ? void 0 : _a3.call(options, done, ids.length);
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
    var _a3;
    (_a3 = handles[handles.length - 1]) == null ? void 0 : _a3.takeOver(request);
  }
  function LightboxBridge() {
    const api = requirePluginApi();
    const React16 = api.React;
    const show = api.hooks.useLightbox();
    React16.useEffect(() => {
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
    const React16 = api.React;
    for (const target2 of ["ImageList", "HeaderImage"]) {
      installAgainst(api, React16, target2);
    }
  }
  function installAgainst(api, React16, target2) {
    api.patch.after(target2, (...args) => {
      const result = args[args.length - 1];
      return React16.createElement(
        React16.Fragment,
        null,
        result,
        React16.createElement(LightboxBridge)
      );
    });
  }

  // src/messages/en.json
  var en_default = {
    "mangaReader.chapters": "Chapters",
    "mangaReader.chapterCount": "{n} chapters",
    "mangaReader.chapterNumber": "Chapter {n}",
    "mangaReader.options": "Reading options",
    "mangaReader.groupReading": "Reading",
    "mangaReader.singlePage": "Single page",
    "mangaReader.doublePage": "Double page",
    "mangaReader.scrollMode": "Scroll",
    "mangaReader.coverAlone": "Cover on a page of its own",
    "mangaReader.detectSpreads": "Detect spreads automatically",
    "mangaReader.offset": "Shift the pairing by one page",
    "mangaReader.groupAnimation": "Animation",
    "mangaReader.fade": "Fade in",
    "mangaReader.fadeOff": "None",
    "mangaReader.groupProgress": "Progress",
    "mangaReader.groupWheel": "Wheel",
    "mangaReader.perMode": "The settings are stored on the server. Each way of reading has a set of its own, and they do not affect one another.",
    "mangaReader.wheel": "Wheel",
    "mangaReader.wheelShift": "Shift + wheel",
    "mangaReader.wheelCtrl": "Ctrl + wheel",
    "mangaReader.wheelOff": "Off",
    "mangaReader.wheelTurn": "Turn page",
    "mangaReader.wheelZoom": "Zoom",
    "mangaReader.wheelScroll": "Scroll",
    "mangaReader.showProgress": "Progress bar",
    "mangaReader.showChapterMarks": "Chapter marks",
    "mangaReader.progressIdle": "Hide after",
    "mangaReader.seconds": "{n} s",
    "mangaReader.never": "Never",
    "mangaReader.importChapters": "Import Stash's chapters",
    "mangaReader.reimportChapters": "Re-import Stash's chapters",
    "mangaReader.importingChapters": "Importing\u2026",
    "mangaReader.editChapter": "Edit",
    "mangaReader.chapterTitle": "Title",
    "mangaReader.chapterIndex": "Image #",
    "mangaReader.save": "Save",
    "mangaReader.cancel": "Cancel",
    "mangaReader.delete": "Delete",
    "mangaReader.chapterStartTaken": "A chapter already begins here",
    "mangaReader.chapterIndexRange": "That is not one of this gallery's pages",
    "mangaReader.chapterNoSuch": "No chapter begins here",
    "mangaReader.undoChapters": "Chapters changed \u2014 undo",
    "mangaReader.chaptersFromList": "Bulk create",
    "mangaReader.bulkPaste": "One title per line",
    "mangaReader.bulkTitle": "Title",
    "mangaReader.bulkPage": "Page #",
    "mangaReader.pagePeek": "Look at this page",
    "mangaReader.bulkCreate": "Create {n} chapters",
    "mangaReader.bulkRemove": "Delete",
    "mangaReader.bulkTooMany": "Too many lines \u2014 do it in parts",
    "mangaReader.bulkNoTitle": "The title is empty",
    "mangaReader.bulkNoPage": "No page yet \u2014 a chapter has to begin somewhere",
    "mangaReader.bulkPageRange": "That is not one of this gallery's pages",
    "mangaReader.bulkPageTwice": "This page is in the table twice",
    "mangaReader.bulkPageTaken": "A chapter already begins here",
    "mangaReader.reimportWarning": "Replace this gallery's chapters with Stash's? The plugin's own list for it is overwritten.",
    "mangaReader.reimportReplace": "Replace",
    "mangaReader.reimportCancel": "Cancel",
    "mangaTools.language.noLanguage": "No language",
    "mangaTools.select.placeholder": "Select language\u2026",
    "mangaTools.settings.readerTakeover.heading": "Take over Stash's lightbox",
    "mangaTools.settings.readerTakeover.description": "A gallery marked as manga is read in this plugin's own lightbox, redesigned from the ground up. Nothing about Stash's own lightbox settings is changed.",
    "mangaTools.settings.readerTakeover.note": "The lightbox's own settings are adjusted on the lightbox page, not here.",
    "mangaTools.settings.manageChapters.heading": "Take over the Chapters tab",
    "mangaTools.settings.manageChapters.description": "Creating and editing chapters is this plugin's job, and writing them stores this plugin's own chapter field. Stash's existing chapters are brought over quietly, and are never modified.",
    "mangaTools.settings.manageChapters.note": "From here on, editing chapters does not touch Stash's own chapter rows.",
    "mangaTools.settings.fields.heading": "Custom fields",
    "mangaTools.settings.fields.description": "The plugin's fields are written as custom fields, so none of Stash's own data is touched. Turning one off does not clear the values already on your galleries.",
    "mangaTools.settings.enabledLanguages.heading": "Enabled languages",
    "mangaTools.settings.enabledLanguages.description": "Only these languages appear in the edit-page dropdown. Display (badge and detail row) is unaffected. Leave empty to show every language.",
    "mangaTools.settings.enabledLanguages.placeholder": "All languages",
    "mangaTools.settings.showFlags.heading": "Show flags",
    "mangaTools.settings.showFlags.description": "Draw the flag beside the language name. Turn this off to show the name on its own.",
    "mangaTools.settings.showCoverBadge.heading": "Show the language on gallery covers",
    "mangaTools.settings.showCoverBadge.description": "The badge in the bottom-right of a gallery's cover. With flags turned off it shows the language name instead of a flag.",
    "mangaTools.settings.showCoverBadge.help": "This is only about drawing the badge: turned off, a cover carries no language. Nothing is cleared from the gallery, which keeps the value and shows it again the moment this is back on.",
    "mangaTools.settings.display.heading": "How the manga info is shown",
    "mangaTools.settings.openDetailsBlock.heading": "Start the manga info section expanded",
    "mangaTools.settings.openEditBlock.heading": "Start the manga info block expanded",
    "mangaTools.settings.hidePerformers.heading": "Hide the performers field on the edit page",
    "mangaTools.settings.hidePerformers.description": "A manga gallery rarely has performers, so its edit page leaves the field out to make the form easier to fill in. Whatever a gallery already has stays on the gallery.",
    "mangaTools.settings.showDisabledFields.heading": "Show disabled plugin fields",
    "mangaTools.settings.showDisabledFields.description": "With this on, a disabled field is no longer hidden: Stash draws its own custom-field row for it in the details tab and the edit form. The value itself is not changed.",
    "mangaTools.settings.showDisabledFields.note": "An enabled field is always this plugin's.",
    "mangaTools.settings.mark.heading": "The manga mark",
    "mangaTools.settings.confirmUnmark.heading": "Ask before unmarking",
    "mangaTools.settings.deleteOnUnmark.heading": "Remove this plugin's fields when unmarking",
    "mangaTools.settings.deleteOnUnmark.description": "On, unmarking clears the plugin's custom fields with it. Off, the values are kept on the gallery.",
    "mangaTools.settings.coverIcon.heading": "Show the manga icon on gallery covers",
    "mangaTools.settings.coverIcon.help": "Not the same thing as the language badge: this one says the gallery is one the plugin manages, which is not a value anyone scans a cover for.",
    "mangaTools.settings.help.cover": "Cover",
    "mangaTools.settings.help.card.title": "A sample manga title",
    "mangaTools.settings.help.card.date": "2026-09-30",
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
    "mangaTools.translationGroup.noLanguageDetail": "no language (no translation group)",
    "mangaTools.translationGroup.originalNoLanguage": "No language: there is nothing to translate, so this is the original",
    "mangaTools.translationGroup.originalDetail": "raw (no translation group)",
    "mangaTools.translationGroup.originalInline": " (raw)",
    "mangaTools.translationGroup.originalMixed": "Some of these are raw \u2014 click to mark them all",
    "mangaTools.translationGroup.suggestedLanguage": "This group's galleries usually carry this language",
    "mangaTools.bulk.remove": "Remove",
    "mangaTools.bulk.unmarkWarning": "Unmarking removes every one of this plugin's custom fields from the selected galleries (chapters included).",
    "mangaTools.bulk.unmarkWarningKeep": "Only the manga mark is removed; this plugin's custom fields are kept.",
    "mangaTools.filter.original.heading": "Original text",
    "mangaTools.filter.original.raw": "Raw",
    "mangaTools.filter.original.cooked": "Translated",
    "mangaTools.filter.original.isOriginal": "Is the original",
    "mangaTools.settings.sidebarFilters.heading": "Sidebar filters",
    "mangaTools.settings.sidebarFilters.description": "Which of this plugin's filters the gallery list's sidebar offers. A filter whose field is switched off cannot be shown, and is not remembered while it is hidden \u2014 turning the field back on brings its filter back.",
    "mangaTools.settings.sidebarFilters.placeholder": "No filters"
  };

  // src/messages/zh-Hans.json
  var zh_Hans_default = {
    "mangaReader.chapters": "\u7AE0\u8282",
    "mangaReader.chapterCount": "{n} \u7AE0",
    "mangaReader.chapterNumber": "\u7B2C {n} \u7AE0",
    "mangaReader.options": "\u9605\u8BFB\u9009\u9879",
    "mangaReader.groupReading": "\u9605\u8BFB",
    "mangaReader.singlePage": "\u5355\u9875",
    "mangaReader.doublePage": "\u53CC\u9875",
    "mangaReader.scrollMode": "\u7EB5\u5411",
    "mangaReader.coverAlone": "\u5C01\u9762\u5355\u72EC\u4E00\u9875",
    "mangaReader.detectSpreads": "\u81EA\u52A8\u68C0\u6D4B\u8DE8\u9875",
    "mangaReader.offset": "\u914D\u5BF9\u504F\u79FB\u4E00\u9875",
    "mangaReader.groupAnimation": "\u52A8\u753B",
    "mangaReader.fade": "\u6DE1\u5165",
    "mangaReader.fadeOff": "\u65E0",
    "mangaReader.groupProgress": "\u8FDB\u5EA6",
    "mangaReader.groupWheel": "\u6EDA\u8F6E",
    "mangaReader.perMode": "\u8BBE\u7F6E\u5B58\u5728\u670D\u52A1\u5668\u4E0A\uFF0C\u6BCF\u4E2A\u9605\u8BFB\u65B9\u5F0F\u5404\u6709\u4E00\u5957\u8BBE\u7F6E\uFF0C\u4E92\u4E0D\u5F71\u54CD\u3002",
    "mangaReader.wheel": "\u6EDA\u8F6E",
    "mangaReader.wheelShift": "Shift + \u6EDA\u8F6E",
    "mangaReader.wheelCtrl": "Ctrl + \u6EDA\u8F6E",
    "mangaReader.wheelOff": "\u7981\u7528",
    "mangaReader.wheelTurn": "\u7FFB\u9875",
    "mangaReader.wheelZoom": "\u653E\u5927",
    "mangaReader.wheelScroll": "\u6EDA\u52A8",
    "mangaReader.showProgress": "\u8FDB\u5EA6\u6761",
    "mangaReader.showChapterMarks": "\u7AE0\u8282\u6807\u8BB0",
    "mangaReader.progressIdle": "\u9690\u85CF\u65F6\u95F4",
    "mangaReader.seconds": "{n} \u79D2",
    "mangaReader.never": "\u6C38\u4E0D",
    "mangaReader.importChapters": "\u5BFC\u5165 Stash \u7684\u7AE0\u8282",
    "mangaReader.reimportChapters": "\u91CD\u65B0\u5BFC\u5165 Stash \u7684\u7AE0\u8282",
    "mangaReader.importingChapters": "\u6B63\u5728\u5BFC\u5165\u2026",
    "mangaReader.editChapter": "\u7F16\u8F91",
    "mangaReader.chapterTitle": "\u6807\u9898",
    "mangaReader.chapterIndex": "\u56FE\u50CF #",
    "mangaReader.save": "\u4FDD\u5B58",
    "mangaReader.cancel": "\u53D6\u6D88",
    "mangaReader.delete": "\u5220\u9664",
    "mangaReader.chapterStartTaken": "\u8FD9\u4E00\u9875\u5DF2\u7ECF\u662F\u67D0\u4E00\u7AE0\u7684\u5F00\u5934",
    "mangaReader.chapterIndexRange": "\u8FD9\u4E0D\u662F\u8FD9\u672C\u753B\u5ECA\u7684\u9875\u7801",
    "mangaReader.chapterNoSuch": "\u8FD9\u91CC\u6CA1\u6709\u7AE0\u8282\u5F00\u5934",
    "mangaReader.undoChapters": "\u7AE0\u8282\u5DF2\u6539\u52A8 \u2014 \u64A4\u9500",
    "mangaReader.chaptersFromList": "\u6279\u91CF\u521B\u5EFA",
    "mangaReader.bulkPaste": "\u4E00\u884C\u4E00\u4E2A\u6807\u9898",
    "mangaReader.bulkTitle": "\u6807\u9898",
    "mangaReader.bulkPage": "\u8D77\u59CB\u9875",
    "mangaReader.pagePeek": "\u770B\u4E00\u773C\u8FD9\u4E00\u9875",
    "mangaReader.bulkCreate": "\u521B\u5EFA {n} \u7AE0",
    "mangaReader.bulkRemove": "\u5220\u9664",
    "mangaReader.bulkTooMany": "\u884C\u6570\u592A\u591A\u4E86 \u2014\u2014 \u5206\u6279\u6765\u5427",
    "mangaReader.bulkNoTitle": "\u6807\u9898\u662F\u7A7A\u7684",
    "mangaReader.bulkNoPage": "\u8FD8\u6CA1\u6709\u9875\u7801 \u2014\u2014 \u6BCF\u4E00\u7AE0\u90FD\u5F97\u4ECE\u67D0\u4E00\u9875\u5F00\u59CB",
    "mangaReader.bulkPageRange": "\u4E0D\u5728\u8FD9\u672C\u7684\u9875\u6570\u8303\u56F4\u5185",
    "mangaReader.bulkPageTwice": "\u8FD9\u4E00\u9875\u5728\u8868\u91CC\u51FA\u73B0\u4E86\u4E24\u6B21",
    "mangaReader.bulkPageTaken": "\u8FD9\u4E00\u9875\u5DF2\u7ECF\u662F\u4E00\u7AE0\u7684\u5F00\u5934",
    "mangaReader.reimportWarning": "\u7528 Stash \u7684\u7AE0\u8282\u66FF\u6362\u8FD9\u672C\u7684\uFF1F\u63D2\u4EF6\u5DF2\u6709\u7684\u90A3\u4EFD\u4F1A\u88AB\u8986\u76D6\u3002",
    "mangaReader.reimportReplace": "\u66FF\u6362",
    "mangaReader.reimportCancel": "\u53D6\u6D88",
    "mangaTools.language.noLanguage": "\u65E0\u8BED\u8A00",
    "mangaTools.select.placeholder": "\u9009\u62E9\u8BED\u8A00\u2026",
    "mangaTools.settings.readerTakeover.heading": "\u63A5\u7BA1 Stash \u539F\u751F\u706F\u7BB1",
    "mangaTools.settings.readerTakeover.description": "\u6807\u8BB0\u4E3A\u6F2B\u753B\u7684\u753B\u5ECA\uFF0C\u706F\u7BB1\u7531\u672C\u63D2\u4EF6\u91CD\u65B0\u8BBE\u8BA1\uFF0C\u4E0D\u4F1A\u66F4\u6539\u539F\u751F\u706F\u7BB1\u8BBE\u7F6E\u3002",
    "mangaTools.settings.readerTakeover.note": "\u63D2\u4EF6\u706F\u7BB1\u76F8\u5173\u8BBE\u7F6E\u5728\u706F\u7BB1\u9875\u9762\u8BBE\u7F6E\u4E2D\u8C03\u6574\u3002",
    "mangaTools.settings.manageChapters.heading": "\u63A5\u7BA1 Stash \u7684\u7AE0\u8282\u7CFB\u7EDF",
    "mangaTools.settings.manageChapters.description": "\u6807\u7B7E\u9875\u7684\u521B\u5EFA\u548C\u7F16\u8F91\u7531\u63D2\u4EF6\u63A5\u7BA1\uFF0C\u5199\u5165\u63D2\u4EF6\u81EA\u5DF1\u7684\u7AE0\u8282\u5B57\u6BB5\u3002\u5DF2\u5B58\u5728\u7684 Stash \u539F\u751F\u7AE0\u8282\u4F1A\u88AB\u9759\u9ED8\u5BFC\u5165\uFF0C\u4F46\u4E0D\u4F1A\u88AB\u4FEE\u6539\u3002",
    "mangaTools.settings.manageChapters.note": "\u5F00\u542F\u540E\uFF0C\u5BF9\u7AE0\u8282\u7684\u4EFB\u4F55\u7F16\u8F91\u90FD\u4E0D\u4F1A\u4FEE\u6539 Stash \u7684\u539F\u751F\u7AE0\u8282\u3002",
    "mangaTools.settings.fields.heading": "\u81EA\u5B9A\u4E49\u5B57\u6BB5",
    "mangaTools.settings.fields.description": "\u63D2\u4EF6\u7684\u5B57\u6BB5\u901A\u8FC7\u5199\u5165 custom fields \u6DFB\u52A0\uFF0C\u4E0D\u5F71\u54CD\u539F\u751F\u6570\u636E\uFF1B\u5173\u6389\u4EFB\u4F55\u4E00\u4E2A\uFF0C\u90FD\u4E0D\u4F1A\u6E05\u9664\u753B\u5ECA\u4E0A\u5DF2\u6709\u7684\u503C\u3002",
    "mangaTools.settings.enabledLanguages.heading": "\u542F\u7528\u7684\u8BED\u8A00",
    "mangaTools.settings.enabledLanguages.description": "\u53EA\u6709\u8FD9\u4E9B\u8BED\u8A00\u4F1A\u51FA\u73B0\u5728\u7F16\u8F91\u9875\u7684\u4E0B\u62C9\u6846\u91CC\u3002\u663E\u793A\u65B9\u5F0F\uFF08\u5C01\u9762\u5FBD\u7AE0\u548C\u8BE6\u60C5\u9875\u90A3\u4E00\u884C\uFF09\u4E0D\u53D7\u5F71\u54CD\u3002\u7559\u7A7A\u8868\u793A\u663E\u793A\u5168\u90E8\u8BED\u8A00\u3002",
    "mangaTools.settings.enabledLanguages.placeholder": "\u5168\u90E8\u8BED\u8A00",
    "mangaTools.settings.showFlags.heading": "\u663E\u793A\u56FD\u65D7",
    "mangaTools.settings.showFlags.description": "\u5728\u8BED\u8A00\u540D\u79F0\u65C1\u753B\u51FA\u56FD\u65D7\u3002\u5173\u6389\u540E\u53EA\u663E\u793A\u540D\u79F0\u3002",
    "mangaTools.settings.showCoverBadge.heading": "\u5728\u5C01\u9762\u4E0A\u663E\u793A\u8BED\u8A00",
    "mangaTools.settings.showCoverBadge.description": "\u753B\u5ECA\u5C01\u9762\u53F3\u4E0B\u89D2\u7684\u5FBD\u7AE0\u3002\u5173\u6389\u56FD\u65D7\u65F6\u663E\u793A\u8BED\u8A00\u540D\u79F0\u800C\u4E0D\u662F\u56FD\u65D7\u3002",
    "mangaTools.settings.showCoverBadge.help": "\u53EA\u51B3\u5B9A\u753B\u4E0D\u753B\uFF1A\u5173\u6389\u540E\u5C01\u9762\u4E0D\u5E26\u8BED\u8A00\u3002\u753B\u5ECA\u4E0A\u7684\u503C\u4E00\u4E2A\u90FD\u4E0D\u4F1A\u5C11\uFF0C\u91CD\u65B0\u6253\u5F00\u5C31\u8FD8\u5728\u3002",
    "mangaTools.settings.display.heading": "\u6F2B\u753B\u4FE1\u606F\u7684\u663E\u793A",
    "mangaTools.settings.openDetailsBlock.heading": "\u6F2B\u753B\u4FE1\u606F\u8BE6\u60C5\u9ED8\u8BA4\u5C55\u5F00",
    "mangaTools.settings.openEditBlock.heading": "\u6F2B\u753B\u4FE1\u606F\u7F16\u8F91\u9ED8\u8BA4\u5C55\u5F00",
    "mangaTools.settings.hidePerformers.heading": "\u7F16\u8F91\u9875\u9690\u85CF\u6F14\u51FA\u8005",
    "mangaTools.settings.hidePerformers.description": "\u6F2B\u753B\u4E00\u822C\u6CA1\u6709\u6F14\u51FA\u8005\uFF0C\u7F16\u8F91\u9875\u4E0D\u663E\u793A\u8FD9\u4E00\u680F\u4EE5\u65B9\u4FBF\u7F16\u8F91\u3002\u753B\u5ECA\u5DF2\u6709\u7684\u6F14\u51FA\u8005\u4ECD\u7136\u7559\u5728\u753B\u5ECA\u4E0A\u3002",
    "mangaTools.settings.showDisabledFields.heading": "\u663E\u793A\u7981\u7528\u7684\u63D2\u4EF6\u5B57\u6BB5",
    "mangaTools.settings.showDisabledFields.description": "\u5F00\u542F\u65F6\uFF0C\u7981\u7528\u7684\u5B57\u6BB5\u4E0D\u518D\u9690\u85CF\uFF0C\u8BE6\u60C5\u9875\u548C\u7F16\u8F91\u9875\u4E0A\u7531 Stash \u539F\u751F\u663E\u793A\u81EA\u5B9A\u4E49\u5B57\u6BB5\u3002\u8BE5\u9009\u9879\u4E0D\u4F1A\u4FEE\u6539\u5BF9\u5E94\u7684\u503C\u3002",
    "mangaTools.settings.showDisabledFields.note": "\u542F\u7528\u7684\u5B57\u6BB5\u59CB\u7EC8\u7531\u63D2\u4EF6\u63A5\u7BA1",
    "mangaTools.settings.mark.heading": "\u6F2B\u753B\u6807\u8BB0",
    "mangaTools.settings.confirmUnmark.heading": "\u53D6\u6D88\u6F2B\u753B\u6807\u8BB0\u65F6\u786E\u8BA4",
    "mangaTools.settings.deleteOnUnmark.heading": "\u53D6\u6D88\u6F2B\u753B\u6807\u8BB0\u65F6\u6E05\u9664\u63D2\u4EF6\u5B57\u6BB5",
    "mangaTools.settings.deleteOnUnmark.description": "\u5F00\u542F\u65F6\uFF0C\u53D6\u6D88\u6807\u8BB0\u4F1A\u8FDE\u540C\u63D2\u4EF6\u81EA\u5B9A\u4E49\u5B57\u6BB5\u4E00\u8D77\u6E05\u9664\u3002\u5173\u95ED\u540E\uFF0C\u53D6\u6D88\u6807\u8BB0\u65F6\u8FD9\u4E9B\u503C\u4F1A\u4FDD\u7559\u5728\u753B\u5ECA\u4E0A\u3002",
    "mangaTools.settings.coverIcon.heading": "\u5728\u5C01\u9762\u4FE1\u606F\u680F\u663E\u793A\u6F2B\u753B\u56FE\u6807",
    "mangaTools.settings.coverIcon.help": "\u548C\u8BED\u8A00\u5FBD\u7AE0\u4E0D\u662F\u4E00\u56DE\u4E8B\uFF1A\u5B83\u8BF4\u7684\u662F\u300C\u8FD9\u672C\u5F52\u63D2\u4EF6\u7BA1\u7406\u300D\uFF0C\u800C\u8FD9\u4E0D\u662F\u4E00\u4E2A\u4F1A\u5728\u5C01\u9762\u4E0A\u53BB\u626B\u7684\u503C\u3002",
    "mangaTools.settings.help.cover": "\u5C01\u9762",
    "mangaTools.settings.help.card.title": "\u793A\u4F8B\u6F2B\u753B\u6807\u9898",
    "mangaTools.settings.help.card.date": "2026-09-30",
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
    "mangaTools.translationGroup.noLanguageDetail": "\u65E0\u8BED\u8A00\uFF08\u65E0\u7FFB\u8BD1\u7EC4\uFF09",
    "mangaTools.translationGroup.originalNoLanguage": "\u65E0\u8BED\u8A00\uFF1A\u6CA1\u6709\u53EF\u7FFB\u8BD1\u7684\u6587\u5B57\uFF0C\u6240\u4EE5\u5C31\u662F\u539F\u6587",
    "mangaTools.translationGroup.originalDetail": "\u751F\u8089\uFF08\u65E0\u7FFB\u8BD1\u7EC4\uFF09",
    "mangaTools.translationGroup.originalInline": "\uFF08\u751F\u8089\uFF09",
    "mangaTools.translationGroup.originalMixed": "\u90E8\u5206\u5DF2\u6807\u4E3A\u751F\u8089 \u2014\u2014 \u70B9\u51FB\u5168\u90E8\u6807\u4E0A",
    "mangaTools.translationGroup.suggestedLanguage": "\u8BE5\u7FFB\u8BD1\u7EC4\u7684\u753B\u5ECA\u901A\u5E38\u662F\u8FD9\u79CD\u8BED\u8A00",
    "mangaTools.bulk.remove": "\u79FB\u9664",
    "mangaTools.bulk.unmarkWarning": "\u53D6\u6D88\u6807\u8BB0\u4F1A\u4ECE\u9009\u4E2D\u7684\u753B\u5ECA\u4E0A\u79FB\u9664\u672C\u63D2\u4EF6\u7684\u5168\u90E8\u81EA\u5B9A\u4E49\u5B57\u6BB5\uFF08\u5305\u62EC\u7AE0\u8282\uFF09\u3002",
    "mangaTools.bulk.unmarkWarningKeep": "\u53EA\u79FB\u9664\u6F2B\u753B\u6807\u8BB0\uFF0C\u4E0D\u4F1A\u79FB\u9664\u672C\u63D2\u4EF6\u7684\u81EA\u5B9A\u4E49\u5B57\u6BB5\u3002",
    "mangaTools.filter.original.heading": "\u539F\u6587",
    "mangaTools.filter.original.raw": "\u751F\u8089",
    "mangaTools.filter.original.cooked": "\u719F\u8089",
    "mangaTools.filter.original.isOriginal": "\u662F\u5426\u4E3A\u751F\u8089",
    "mangaTools.settings.sidebarFilters.heading": "\u4FA7\u680F\u7B5B\u9009",
    "mangaTools.settings.sidebarFilters.description": "\u753B\u5ECA\u5217\u8868\u7684\u4FA7\u680F\u91CC\u663E\u793A\u54EA\u4E9B\u7B5B\u9009\u3002\u5B57\u6BB5\u5173\u6389\u7684\u7B5B\u9009\u663E\u793A\u4E0D\u51FA\u6765\uFF0C\u9690\u85CF\u671F\u95F4\u4E5F\u4E0D\u8BB0\u72B6\u6001\u2014\u2014\u91CD\u65B0\u6253\u5F00\u5B57\u6BB5\uFF0C\u5B83\u7684\u7B5B\u9009\u5C31\u56DE\u6765\u3002",
    "mangaTools.settings.sidebarFilters.placeholder": "\u4E0D\u663E\u793A\u4EFB\u4F55\u7B5B\u9009"
  };

  // src/messages/zh-Hant.json
  var zh_Hant_default = {
    "mangaReader.chapters": "\u7AE0\u7BC0",
    "mangaReader.chapterCount": "{n} \u7AE0",
    "mangaReader.chapterNumber": "\u7B2C {n} \u7AE0",
    "mangaReader.options": "\u95B1\u8B80\u9078\u9805",
    "mangaReader.groupReading": "\u95B1\u8B80",
    "mangaReader.singlePage": "\u55AE\u9801",
    "mangaReader.doublePage": "\u96D9\u9801",
    "mangaReader.scrollMode": "\u7E31\u5411",
    "mangaReader.coverAlone": "\u5C01\u9762\u55AE\u7368\u4E00\u9801",
    "mangaReader.detectSpreads": "\u81EA\u52D5\u5075\u6E2C\u8DE8\u9801",
    "mangaReader.offset": "\u914D\u5C0D\u504F\u79FB\u4E00\u9801",
    "mangaReader.groupAnimation": "\u52D5\u756B",
    "mangaReader.fade": "\u6DE1\u5165",
    "mangaReader.fadeOff": "\u7121",
    "mangaReader.groupProgress": "\u9032\u5EA6",
    "mangaReader.groupWheel": "\u6EFE\u8F2A",
    "mangaReader.perMode": "\u8A2D\u5B9A\u5B58\u5728\u4F3A\u670D\u5668\u4E0A\uFF0C\u6BCF\u500B\u95B1\u8B80\u65B9\u5F0F\u5404\u6709\u4E00\u5957\u8A2D\u5B9A\uFF0C\u4E92\u4E0D\u5F71\u97FF\u3002",
    "mangaReader.wheel": "\u6EFE\u8F2A",
    "mangaReader.wheelShift": "Shift + \u6EFE\u8F2A",
    "mangaReader.wheelCtrl": "Ctrl + \u6EFE\u8F2A",
    "mangaReader.wheelOff": "\u505C\u7528",
    "mangaReader.wheelTurn": "\u7FFB\u9801",
    "mangaReader.wheelZoom": "\u653E\u5927",
    "mangaReader.wheelScroll": "\u6372\u52D5",
    "mangaReader.showProgress": "\u9032\u5EA6\u689D",
    "mangaReader.showChapterMarks": "\u7AE0\u7BC0\u6A19\u8A18",
    "mangaReader.progressIdle": "\u96B1\u85CF\u6642\u9593",
    "mangaReader.seconds": "{n} \u79D2",
    "mangaReader.never": "\u6C38\u4E0D",
    "mangaReader.importChapters": "\u532F\u5165 Stash \u7684\u7AE0\u7BC0",
    "mangaReader.reimportChapters": "\u91CD\u65B0\u532F\u5165 Stash \u7684\u7AE0\u7BC0",
    "mangaReader.importingChapters": "\u6B63\u5728\u532F\u5165\u2026",
    "mangaReader.editChapter": "\u7DE8\u8F2F",
    "mangaReader.chapterTitle": "\u6A19\u984C",
    "mangaReader.chapterIndex": "\u5716\u7247 #",
    "mangaReader.save": "\u5132\u5B58",
    "mangaReader.cancel": "\u53D6\u6D88",
    "mangaReader.delete": "\u522A\u9664",
    "mangaReader.chapterStartTaken": "\u9019\u4E00\u9801\u5DF2\u7D93\u662F\u67D0\u4E00\u7AE0\u7684\u958B\u982D",
    "mangaReader.chapterIndexRange": "\u9019\u4E0D\u662F\u9019\u672C\u756B\u5ECA\u7684\u9801\u78BC",
    "mangaReader.chapterNoSuch": "\u9019\u88E1\u6C92\u6709\u7AE0\u7BC0\u958B\u982D",
    "mangaReader.undoChapters": "\u7AE0\u7BC0\u5DF2\u6539\u52D5 \u2014 \u64A4\u92B7",
    "mangaReader.chaptersFromList": "\u6279\u6B21\u5EFA\u7ACB",
    "mangaReader.bulkPaste": "\u4E00\u884C\u4E00\u500B\u6A19\u984C",
    "mangaReader.bulkTitle": "\u6A19\u984C",
    "mangaReader.bulkPage": "\u8D77\u59CB\u9801",
    "mangaReader.pagePeek": "\u770B\u4E00\u773C\u9019\u4E00\u9801",
    "mangaReader.bulkCreate": "\u5EFA\u7ACB {n} \u7AE0",
    "mangaReader.bulkRemove": "\u522A\u9664",
    "mangaReader.bulkTooMany": "\u884C\u6578\u592A\u591A\u4E86 \u2014\u2014 \u5206\u6279\u4F86\u5427",
    "mangaReader.bulkNoTitle": "\u6A19\u984C\u662F\u7A7A\u7684",
    "mangaReader.bulkNoPage": "\u9084\u6C92\u6709\u9801\u78BC \u2014\u2014 \u6BCF\u4E00\u7AE0\u90FD\u5F97\u5F9E\u67D0\u4E00\u9801\u958B\u59CB",
    "mangaReader.bulkPageRange": "\u4E0D\u5728\u9019\u672C\u7684\u9801\u6578\u7BC4\u570D\u5167",
    "mangaReader.bulkPageTwice": "\u9019\u4E00\u9801\u5728\u8868\u88E1\u51FA\u73FE\u4E86\u5169\u6B21",
    "mangaReader.bulkPageTaken": "\u9019\u4E00\u9801\u5DF2\u7D93\u662F\u4E00\u7AE0\u7684\u958B\u982D",
    "mangaReader.reimportWarning": "\u7528 Stash \u7684\u7AE0\u7BC0\u53D6\u4EE3\u9019\u672C\u7684\uFF1F\u5916\u639B\u5DF2\u6709\u7684\u90A3\u4EFD\u6703\u88AB\u8986\u84CB\u3002",
    "mangaReader.reimportReplace": "\u53D6\u4EE3",
    "mangaReader.reimportCancel": "\u53D6\u6D88",
    "mangaTools.language.noLanguage": "\u7121\u8A9E\u8A00",
    "mangaTools.select.placeholder": "\u9078\u64C7\u8A9E\u8A00\u2026",
    "mangaTools.settings.readerTakeover.heading": "\u63A5\u7BA1 Stash \u539F\u751F\u71C8\u7BB1",
    "mangaTools.settings.readerTakeover.description": "\u6A19\u8A18\u70BA\u6F2B\u756B\u7684\u756B\u5ECA\uFF0C\u71C8\u7BB1\u7531\u672C\u5916\u639B\u91CD\u65B0\u8A2D\u8A08\uFF0C\u4E0D\u6703\u66F4\u6539\u539F\u751F\u71C8\u7BB1\u8A2D\u5B9A\u3002",
    "mangaTools.settings.readerTakeover.note": "\u5916\u639B\u71C8\u7BB1\u76F8\u95DC\u8A2D\u5B9A\u5728\u71C8\u7BB1\u9801\u9762\u8A2D\u5B9A\u4E2D\u8ABF\u6574\u3002",
    "mangaTools.settings.manageChapters.heading": "\u63A5\u7BA1 Stash \u7684\u7AE0\u7BC0\u7CFB\u7D71",
    "mangaTools.settings.manageChapters.description": "\u5206\u9801\u7684\u5EFA\u7ACB\u548C\u7DE8\u8F2F\u7531\u5916\u639B\u63A5\u7BA1\uFF0C\u5BEB\u5165\u5916\u639B\u81EA\u5DF1\u7684\u7AE0\u7BC0\u6B04\u4F4D\u3002\u5DF2\u5B58\u5728\u7684 Stash \u539F\u751F\u7AE0\u7BC0\u6703\u88AB\u975C\u9ED8\u532F\u5165\uFF0C\u4F46\u4E0D\u6703\u88AB\u4FEE\u6539\u3002",
    "mangaTools.settings.manageChapters.note": "\u958B\u555F\u5F8C\uFF0C\u5C0D\u7AE0\u7BC0\u7684\u4EFB\u4F55\u7DE8\u8F2F\u90FD\u4E0D\u6703\u4FEE\u6539 Stash \u7684\u539F\u751F\u7AE0\u7BC0\u3002",
    "mangaTools.settings.fields.heading": "\u81EA\u8A02\u6B04\u4F4D",
    "mangaTools.settings.fields.description": "\u5916\u639B\u7684\u6B04\u4F4D\u900F\u904E\u5BEB\u5165 custom fields \u52A0\u5165\uFF0C\u4E0D\u5F71\u97FF\u539F\u751F\u8CC7\u6599\uFF1B\u95DC\u6389\u4EFB\u4F55\u4E00\u500B\uFF0C\u90FD\u4E0D\u6703\u6E05\u9664\u756B\u5ECA\u4E0A\u5DF2\u6709\u7684\u503C\u3002",
    "mangaTools.settings.enabledLanguages.heading": "\u555F\u7528\u7684\u8A9E\u8A00",
    "mangaTools.settings.enabledLanguages.description": "\u53EA\u6709\u9019\u4E9B\u8A9E\u8A00\u6703\u51FA\u73FE\u5728\u7DE8\u8F2F\u9801\u7684\u4E0B\u62C9\u9078\u55AE\u88E1\u3002\u986F\u793A\u65B9\u5F0F\uFF08\u5C01\u9762\u5FBD\u7AE0\u548C\u8A73\u7D30\u9801\u90A3\u4E00\u884C\uFF09\u4E0D\u53D7\u5F71\u97FF\u3002\u7559\u7A7A\u8868\u793A\u986F\u793A\u5168\u90E8\u8A9E\u8A00\u3002",
    "mangaTools.settings.enabledLanguages.placeholder": "\u5168\u90E8\u8A9E\u8A00",
    "mangaTools.settings.showFlags.heading": "\u986F\u793A\u570B\u65D7",
    "mangaTools.settings.showFlags.description": "\u5728\u8A9E\u8A00\u540D\u7A31\u65C1\u756B\u51FA\u570B\u65D7\u3002\u95DC\u6389\u5F8C\u53EA\u986F\u793A\u540D\u7A31\u3002",
    "mangaTools.settings.showCoverBadge.heading": "\u5728\u5C01\u9762\u986F\u793A\u8A9E\u8A00",
    "mangaTools.settings.showCoverBadge.description": "\u756B\u5ECA\u5C01\u9762\u53F3\u4E0B\u89D2\u7684\u5FBD\u7AE0\u3002\u95DC\u6389\u570B\u65D7\u6642\u986F\u793A\u8A9E\u8A00\u540D\u7A31\u800C\u4E0D\u662F\u570B\u65D7\u3002",
    "mangaTools.settings.showCoverBadge.help": "\u53EA\u6C7A\u5B9A\u756B\u4E0D\u756B\uFF1A\u95DC\u6389\u5F8C\u5C01\u9762\u4E0D\u5E36\u8A9E\u8A00\u3002\u756B\u5ECA\u4E0A\u7684\u503C\u4E00\u500B\u90FD\u4E0D\u6703\u5C11\uFF0C\u91CD\u65B0\u6253\u958B\u5C31\u9084\u5728\u3002",
    "mangaTools.settings.display.heading": "\u6F2B\u756B\u8CC7\u8A0A\u7684\u986F\u793A",
    "mangaTools.settings.openDetailsBlock.heading": "\u6F2B\u756B\u8CC7\u8A0A\u8A73\u60C5\u9810\u8A2D\u5C55\u958B",
    "mangaTools.settings.openEditBlock.heading": "\u6F2B\u756B\u8CC7\u8A0A\u7DE8\u8F2F\u9810\u8A2D\u5C55\u958B",
    "mangaTools.settings.hidePerformers.heading": "\u7DE8\u8F2F\u9801\u96B1\u85CF\u6F14\u51FA\u8005",
    "mangaTools.settings.hidePerformers.description": "\u6F2B\u756B\u4E00\u822C\u6C92\u6709\u6F14\u51FA\u8005\uFF0C\u7DE8\u8F2F\u9801\u4E0D\u986F\u793A\u9019\u4E00\u6B04\u4EE5\u65B9\u4FBF\u7DE8\u8F2F\u3002\u756B\u5ECA\u5DF2\u6709\u7684\u6F14\u51FA\u8005\u4ECD\u7136\u7559\u5728\u756B\u5ECA\u4E0A\u3002",
    "mangaTools.settings.showDisabledFields.heading": "\u986F\u793A\u505C\u7528\u7684\u5916\u639B\u6B04\u4F4D",
    "mangaTools.settings.showDisabledFields.description": "\u958B\u555F\u6642\uFF0C\u505C\u7528\u7684\u6B04\u4F4D\u4E0D\u518D\u96B1\u85CF\uFF0C\u8A73\u7D30\u9801\u548C\u7DE8\u8F2F\u9801\u4E0A\u7531 Stash \u539F\u751F\u986F\u793A\u81EA\u8A02\u6B04\u4F4D\u3002\u8A72\u9078\u9805\u4E0D\u6703\u4FEE\u6539\u5C0D\u61C9\u7684\u503C\u3002",
    "mangaTools.settings.showDisabledFields.note": "\u555F\u7528\u7684\u6B04\u4F4D\u59CB\u7D42\u7531\u5916\u639B\u63A5\u7BA1",
    "mangaTools.settings.mark.heading": "\u6F2B\u756B\u6A19\u8A18",
    "mangaTools.settings.confirmUnmark.heading": "\u53D6\u6D88\u6F2B\u756B\u6A19\u8A18\u6642\u78BA\u8A8D",
    "mangaTools.settings.deleteOnUnmark.heading": "\u53D6\u6D88\u6F2B\u756B\u6A19\u8A18\u6642\u6E05\u9664\u5916\u639B\u6B04\u4F4D",
    "mangaTools.settings.deleteOnUnmark.description": "\u958B\u555F\u6642\uFF0C\u53D6\u6D88\u6A19\u8A18\u6703\u9023\u540C\u5916\u639B\u81EA\u8A02\u6B04\u4F4D\u4E00\u8D77\u6E05\u9664\u3002\u95DC\u9589\u5F8C\uFF0C\u53D6\u6D88\u6A19\u8A18\u6642\u9019\u4E9B\u503C\u6703\u4FDD\u7559\u5728\u756B\u5ECA\u4E0A\u3002",
    "mangaTools.settings.coverIcon.heading": "\u5728\u5C01\u9762\u8CC7\u8A0A\u6B04\u986F\u793A\u6F2B\u756B\u5716\u793A",
    "mangaTools.settings.coverIcon.help": "\u548C\u8A9E\u8A00\u5FBD\u7AE0\u4E0D\u662F\u4E00\u56DE\u4E8B\uFF1A\u5B83\u8AAA\u7684\u662F\u300C\u9019\u672C\u6B78\u5916\u639B\u7BA1\u7406\u300D\uFF0C\u800C\u9019\u4E0D\u662F\u4E00\u500B\u6703\u5728\u5C01\u9762\u4E0A\u53BB\u6383\u7684\u503C\u3002",
    "mangaTools.settings.help.cover": "\u5C01\u9762",
    "mangaTools.settings.help.card.title": "\u7BC4\u4F8B\u6F2B\u756B\u6A19\u984C",
    "mangaTools.settings.help.card.date": "2026-09-30",
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
    "mangaTools.translationGroup.noLanguageDetail": "\u7121\u8A9E\u8A00\uFF08\u7121\u7FFB\u8B6F\u7D44\uFF09",
    "mangaTools.translationGroup.originalNoLanguage": "\u7121\u8A9E\u8A00\uFF1A\u6C92\u6709\u53EF\u7FFB\u8B6F\u7684\u6587\u5B57\uFF0C\u6240\u4EE5\u5C31\u662F\u539F\u6587",
    "mangaTools.translationGroup.originalDetail": "\u751F\u8089\uFF08\u7121\u7FFB\u8B6F\u7D44\uFF09",
    "mangaTools.translationGroup.originalInline": "\uFF08\u751F\u8089\uFF09",
    "mangaTools.translationGroup.originalMixed": "\u90E8\u5206\u5DF2\u6A19\u70BA\u751F\u8089 \u2014\u2014 \u9EDE\u64CA\u5168\u90E8\u6A19\u4E0A",
    "mangaTools.translationGroup.suggestedLanguage": "\u8A72\u7FFB\u8B6F\u7D44\u7684\u756B\u5ECA\u901A\u5E38\u662F\u9019\u7A2E\u8A9E\u8A00",
    "mangaTools.bulk.remove": "\u79FB\u9664",
    "mangaTools.bulk.unmarkWarning": "\u53D6\u6D88\u6A19\u8A18\u6703\u5F9E\u9078\u4E2D\u7684\u756B\u5ECA\u4E0A\u79FB\u9664\u672C\u5916\u639B\u7684\u5168\u90E8\u81EA\u8A02\u6B04\u4F4D\uFF08\u5305\u62EC\u7AE0\u7BC0\uFF09\u3002",
    "mangaTools.bulk.unmarkWarningKeep": "\u53EA\u79FB\u9664\u6F2B\u756B\u6A19\u8A18\uFF0C\u4E0D\u6703\u79FB\u9664\u672C\u5916\u639B\u7684\u81EA\u8A02\u6B04\u4F4D\u3002",
    "mangaTools.filter.original.heading": "\u539F\u6587",
    "mangaTools.filter.original.raw": "\u751F\u8089",
    "mangaTools.filter.original.cooked": "\u719F\u8089",
    "mangaTools.filter.original.isOriginal": "\u662F\u5426\u70BA\u751F\u8089",
    "mangaTools.settings.sidebarFilters.heading": "\u5074\u6B04\u7BE9\u9078",
    "mangaTools.settings.sidebarFilters.description": "\u756B\u5ECA\u5217\u8868\u7684\u5074\u6B04\u88E1\u986F\u793A\u54EA\u4E9B\u7BE9\u9078\u3002\u6B04\u4F4D\u95DC\u6389\u7684\u7BE9\u9078\u986F\u793A\u4E0D\u51FA\u4F86\uFF0C\u96B1\u85CF\u671F\u9593\u4E5F\u4E0D\u8A18\u72C0\u614B\u2014\u2014\u91CD\u65B0\u6253\u958B\u6B04\u4F4D\uFF0C\u5B83\u7684\u7BE9\u9078\u5C31\u56DE\u4F86\u3002",
    "mangaTools.settings.sidebarFilters.placeholder": "\u4E0D\u986F\u793A\u4EFB\u4F55\u7BE9\u9078"
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
    const parts2 = String(locale || "").replace("_", "-").split("-");
    while (parts2.length > 0) {
      const tag = parts2.join("-");
      const catalog = CATALOGS[ALIASES[tag] || tag];
      if (catalog) return catalog;
      parts2.pop();
    }
    return CATALOGS.en;
  }
  function t(intl, id) {
    return stringFor(intl.locale, id);
  }
  function stringFor(locale, id) {
    var _a3, _b3;
    return (_b3 = (_a3 = catalogFor(locale != null ? locale : "")[id]) != null ? _a3 : CATALOGS.en[id]) != null ? _b3 : id;
  }
  function numbered(locale, id, n) {
    return stringFor(locale, id).replace("{n}", String(n));
  }
  NS.t = t;
  NS.stringFor = stringFor;
  NS.catalogFor = catalogFor;
  NS.catalogs = catalogs;

  // src/reader/progress.ts
  var PROGRESS_SCRUB_MS = 120;
  var PROGRESS_IDLE_MS = 2e3;
  var PROGRESS_HOLD_MS = 0;
  var PROGRESS_NEVER = -1;
  var PROGRESS_IDLE_MAX_MS = 1e4;
  function fractionOfPage(page, total) {
    if (total <= 1) return 0;
    return Math.min(Math.max(page, 0), total - 1) / total;
  }
  function pageAtFraction(fraction, total) {
    if (total <= 1) return 0;
    const page = Math.round(fraction * total);
    return Math.min(Math.max(page, 0), total - 1);
  }
  function progressNodes(chapters, total, locale) {
    const nodes2 = [];
    const seen = /* @__PURE__ */ new Set();
    chapters.forEach((chapter, index) => {
      if (chapter.at < 0 || chapter.at >= total || seen.has(chapter.at)) return;
      seen.add(chapter.at);
      nodes2.push({
        // A chapter with no name is named by its place, through the one helper the
        // header's menu also names it with: the two must not be able to disagree about
        // what an unnamed chapter is called.
        name: chapter.title || numbered(locale, "mangaReader.chapterNumber", index + 1),
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
  var CLASS_VERTICAL = "is-vertical";
  var CLASS_SHOWING = "is-showing";
  var latest = null;
  var bar = null;
  var track = null;
  var read = null;
  var thumb = null;
  var label = null;
  var labelPage = null;
  var labelChapter = null;
  var nodes = null;
  var drawn = null;
  var lastVertical = null;
  var labelWidth = 0;
  var labelHeight = 0;
  var bubble = null;
  var pointer = null;
  var target = 0;
  var lastJump = 0;
  var pending = null;
  var idle = null;
  var lastWidth = 0;
  var owed = false;
  function ensureProgress(lightbox, state) {
    latest = state;
    if (!lightbox.querySelector(".Lightbox-footer")) return bar;
    if (state.total <= 1) return null;
    const parent = parentFor(lightbox);
    if (!parent) return null;
    if (!bar) build();
    place(parent);
    if (!bar || !track || !read || !thumb || !label || !nodes) return bar;
    update(state);
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
    latest = null;
    bubble = null;
    pointer = null;
    pressed = false;
    onTrack = false;
    labelWidth = 0;
    labelHeight = 0;
    lastWidth = 0;
    owed = false;
  }
  function vertical() {
    return (latest == null ? void 0 : latest.vertical) === true;
  }
  function barReserve(area) {
    if (!vertical() || !bar) return 0;
    const box = bar.getBoundingClientRect();
    if (!box.width) return 0;
    const right = area.left + area.width;
    const air = right - (box.left + box.width);
    return Math.max(0, right - box.left + air);
  }
  function setAlong(node, fraction) {
    const at = (fraction * 100).toFixed(3) + "%";
    if (vertical()) {
      if (node.style.top !== at) node.style.top = at;
      if (node.style.left) node.style.left = "";
    } else {
      if (node.style.left !== at) node.style.left = at;
      if (node.style.top) node.style.top = "";
    }
  }
  function setAlongLength(node, fraction) {
    const at = (fraction * 100).toFixed(3) + "%";
    if (vertical()) {
      if (node.style.height !== at) node.style.height = at;
      if (node.style.width) node.style.width = "";
    } else {
      if (node.style.width !== at) node.style.width = at;
      if (node.style.height) node.style.height = "";
    }
  }
  function build() {
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
  }
  var SELECTOR_DISPLAY2 = ".Lightbox-display";
  function parentFor(lightbox) {
    if (!vertical()) return lightbox;
    return lightbox.querySelector(SELECTOR_DISPLAY2);
  }
  function place(parent) {
    if (!bar || bar.parentNode === parent) return;
    if (parent.classList.contains("Lightbox-display")) {
      parent.appendChild(bar);
      return;
    }
    const footer = parent.querySelector(".Lightbox-footer");
    if (footer) parent.insertBefore(bar, footer);
    else parent.appendChild(bar);
  }
  function update(state) {
    if (!bar || !track || !read || !thumb || !label || !nodes) return;
    if (state.vertical !== lastVertical) {
      lastVertical = state.vertical;
      drawn = null;
    }
    const key = state.chapters.map((c) => c.at + ":" + c.title).join("|");
    if (!drawn || drawn.nodes !== key || drawn.total !== state.total) {
      drawNodes(state);
    }
    bar.classList.toggle(CLASS_VERTICAL, state.vertical);
    if (state.relaid) lastWidth = 0;
    if (state.width > 0) lastWidth = state.width;
    if (state.vertical) {
      if (track.style.width) track.style.width = "";
    } else if (!pressed && lastWidth > 0) {
      const wanted2 = Math.round(lastWidth) + "px";
      if (track.style.width !== wanted2) track.style.width = wanted2;
    } else if (!lastWidth) {
      if (track.style.width) track.style.width = "";
    }
    const settled = fractionOfPage(state.at, state.total);
    const fraction = pointer === null ? settled : pointer;
    setAlongLength(read, fraction);
    setAlong(thumb, fraction);
    if (bubble) {
      if ((labelPage == null ? void 0 : labelPage.textContent) !== bubble.page) {
        if (labelPage) labelPage.textContent = bubble.page;
        labelWidth = label.offsetWidth;
        labelHeight = label.offsetHeight;
      }
      if ((labelChapter == null ? void 0 : labelChapter.textContent) !== bubble.chapter) {
        if (labelChapter) labelChapter.textContent = bubble.chapter;
        labelWidth = label.offsetWidth;
        labelHeight = label.offsetHeight;
      }
    }
    if (bubble) {
      const half = (vertical() ? labelHeight : labelWidth) / 2;
      const span = vertical() ? track.clientHeight : track.clientWidth;
      const px = Math.max(
        half,
        Math.min(bubble.fraction * (span || 0), (span || 0) - half)
      ).toFixed(0) + "px";
      if (vertical()) {
        if (label.style.top !== px) label.style.top = px;
      } else if (label.style.left !== px) label.style.left = px;
    }
    if ((owed || state.idleMs === PROGRESS_NEVER) && (state.vertical || state.width > 0)) {
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
    for (const node of progressNodes(state.chapters, state.total, state.locale)) {
      const tick = document.createElement("div");
      tick.className = CLASS_NODE;
      setAlong(tick, node.fraction);
      tick.dataset.name = node.name;
      tick.dataset.at = String(node.at);
      tick.dataset.fraction = String(node.fraction);
      nodes.appendChild(tick);
    }
  }
  function onMoveOverBar(event) {
    var _a3, _b3, _c;
    onTrack = true;
    wake();
    if (pressed) return;
    const node = event.target;
    const tick = ((_a3 = node == null ? void 0 : node.classList) == null ? void 0 : _a3.contains(CLASS_NODE)) ? node : null;
    if (!tick) {
      takeBubbleDown();
      return;
    }
    const chapter = ((_b3 = tick.dataset) == null ? void 0 : _b3.name) || "";
    if ((bubble == null ? void 0 : bubble.chapter) === chapter) return;
    setBubble({
      page: "",
      chapter,
      fraction: Number(((_c = tick.dataset) == null ? void 0 : _c.fraction) || 0)
    });
    redraw();
  }
  function onLeaveTrack() {
    onTrack = false;
    if (!pressed) takeBubbleDown();
    if (!pressed && (latest == null ? void 0 : latest.idleMs) === PROGRESS_HOLD_MS) {
      bar == null ? void 0 : bar.classList.add(CLASS_IDLE);
    }
  }
  function tickUnder(target2) {
    var _a3;
    const node = target2;
    return ((_a3 = node == null ? void 0 : node.classList) == null ? void 0 : _a3.contains(CLASS_NODE)) ? node : null;
  }
  function setBubble(next) {
    bubble = next;
    bar == null ? void 0 : bar.classList.add(CLASS_SHOWING);
  }
  function takeBubbleDown() {
    if (!bubble) return;
    bubble = null;
    bar == null ? void 0 : bar.classList.remove(CLASS_SHOWING);
    redraw();
  }
  function wake() {
    var _a3;
    if (!bar) return;
    if (!vertical() && lastWidth <= 0) {
      bar.classList.add(CLASS_IDLE);
      owed = true;
      return;
    }
    if (idle !== null) {
      window.clearTimeout(idle);
      idle = null;
    }
    const idleMs = (_a3 = latest == null ? void 0 : latest.idleMs) != null ? _a3 : PROGRESS_IDLE_MS;
    if (idleMs === PROGRESS_HOLD_MS) {
      bar.classList.toggle(CLASS_IDLE, !onTrack);
      return;
    }
    bar.classList.remove(CLASS_IDLE);
    if (idleMs === PROGRESS_NEVER) return;
    idle = window.setTimeout(() => {
      idle = null;
      bar == null ? void 0 : bar.classList.add(CLASS_IDLE);
    }, idleMs);
  }
  function stopTimers() {
    if (idle !== null) window.clearTimeout(idle);
    if (pending !== null) window.clearTimeout(pending);
    idle = null;
    pending = null;
  }
  var pressed = false;
  var onTrack = false;
  function fractionAt(event) {
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    const span = vertical() ? rect.height || track.clientHeight || 1 : rect.width || track.clientWidth || 1;
    const from = vertical() ? event.clientY - rect.top : event.clientX - rect.left;
    return Math.min(Math.max(from / span, 0), 1);
  }
  function onPress(event) {
    var _a3, _b3, _c;
    const press = event;
    if (press.button !== 0 || !track) return;
    press.preventDefault();
    press.stopPropagation();
    onTrack = true;
    pressed = true;
    bar == null ? void 0 : bar.classList.add(CLASS_SCRUBBING);
    const tick = tickUnder(press.target);
    if (tick) {
      const fraction = Number(((_a3 = tick.dataset) == null ? void 0 : _a3.fraction) || 0);
      target = Number(((_b3 = tick.dataset) == null ? void 0 : _b3.at) || 0);
      pointer = fraction;
      lastJump = Date.now();
      setBubble({ page: "", chapter: ((_c = tick.dataset) == null ? void 0 : _c.name) || "", fraction });
      latest == null ? void 0 : latest.handlers.onSeek(target);
      redraw();
    } else {
      bubble = null;
      scrubTo(fractionAt(press));
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onRelease);
  }
  function onMove(event) {
    if (!pressed) return;
    scrubTo(fractionAt(event));
  }
  function onRelease() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onRelease);
    pressed = false;
    bar == null ? void 0 : bar.classList.remove(CLASS_SCRUBBING);
    settle();
  }
  function scrubTo(fraction) {
    var _a3, _b3;
    pointer = fraction;
    target = pageAtFraction(fraction, (_a3 = latest == null ? void 0 : latest.total) != null ? _a3 : 1);
    setBubble({
      page: target + 1 + " / " + ((_b3 = latest == null ? void 0 : latest.total) != null ? _b3 : 1),
      chapter: (latest == null ? void 0 : latest.chapterNameAt(target)) || "",
      fraction
    });
    redraw();
    if (!latest || target === latest.at) return;
    const since = Date.now() - lastJump;
    if (pending !== null) {
      window.clearTimeout(pending);
      pending = null;
    }
    if (since >= PROGRESS_SCRUB_MS) {
      lastJump = Date.now();
      latest.handlers.onSeek(target);
    } else {
      pending = window.setTimeout(() => {
        pending = null;
        lastJump = Date.now();
        latest == null ? void 0 : latest.handlers.onSeek(target);
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
    latest == null ? void 0 : latest.handlers.onSeek(wanted2);
    takeBubbleDown();
    redraw();
  }
  function redraw() {
    if (latest) update(latest);
  }

  // src/reader/wheel.ts
  var READING_MODES = [
    "single",
    "double",
    "scroll"
  ];
  var WHEEL_GESTURES = [
    "plain",
    "shift",
    "ctrl"
  ];
  var WHEEL_ACTIONS = [
    "off",
    "turn",
    "zoom",
    "scroll"
  ];
  function isWheelAction(value) {
    return value === "off" || value === "turn" || value === "zoom" || value === "scroll";
  }
  function wheelGesture(wheel) {
    if (wheel.ctrlKey || wheel.metaKey) return "ctrl";
    return wheel.shiftKey ? "shift" : "plain";
  }
  function wheelDelta(wheel) {
    return wheel.deltaY || wheel.deltaX;
  }
  function wheelEffect(action, scrolling) {
    if (action === "off") return "none";
    if (action === "turn") return "turn";
    if (action === "zoom") return "zoom";
    return scrolling ? "scroll" : "pan";
  }
  function withWheelAction(wheel, gesture, action) {
    return { ...wheel, [gesture]: action };
  }
  function defaultWheel(mode) {
    return mode === "scroll" ? { plain: "scroll", shift: "turn", ctrl: "zoom" } : { plain: "turn", shift: "scroll", ctrl: "zoom" };
  }

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
  var CLASS_MENU_HEAD = "manga-reader-menu-head";
  var CLASS_MENU_HEADING = "manga-reader-menu-heading";
  var CLASS_MENU_COUNT = "manga-reader-menu-count";
  var CLASS_MENU_LIST = "manga-reader-chapter-list";
  var CLASS_CHAPTER_NAME = "manga-reader-chapter-name";
  var CLASS_CHAPTER_RANGE = "manga-reader-chapter-range";
  var CLASS_GROUP = "manga-reader-group";
  var CLASS_GROUP_LABEL = "manga-reader-group-label";
  var CLASS_DIVIDER = "manga-reader-divider";
  var CLASS_ROW = "manga-reader-row";
  var CLASS_ROW_LABEL = "manga-reader-row-label";
  var CLASS_ROW_SLIDER = "manga-reader-row-slider";
  var CLASS_READOUT = "manga-reader-readout";
  var CLASS_SELECT = "manga-reader-select";
  var CLASS_HEADING_LINE = "manga-reader-heading-line";
  var CLASS_HELP = "manga-reader-help";
  var CLASS_HELP_BUTTON = "manga-reader-help-button";
  var CLASS_HELP_PANEL = "manga-reader-help-panel";
  var CLASS_PAGES = "manga-reader-pages";
  var CLASS_SEGMENT = "manga-reader-segment";
  var CLASS_CHAPTER_TOGGLE = "minimal Lightbox-header-chapter-button dropdown-toggle btn btn-primary";
  var CLASS_ICON_BUTTON = "btn btn-link";
  function ensureChrome(lightbox, state) {
    latest2 = state;
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
    update2(chrome, state);
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
    redraw2();
  }
  var latest2 = null;
  var chromeNode = null;
  function redraw2() {
    if (chromeNode && latest2) update2(chromeNode, latest2);
  }
  var labels = {};
  var parts = {};
  var openMenu = null;
  function update2(chrome, state) {
    var _a3;
    const chapter = chrome.querySelector("." + CLASS_CHAPTER);
    const counter = chrome.querySelector("." + CLASS_COUNTER);
    const name = ((_a3 = state.chapter) == null ? void 0 : _a3.title) || "";
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
    if (openMenu === "chapters") fitMenu(chapterPanel);
    else if (openMenu === "settings") fitMenu(settingsPanel);
  }
  var MENU_MARGIN = 8;
  var MENU_MIN_HEIGHT = 180;
  function fitShift(left, width, viewport, margin) {
    const over = left + width + margin - viewport;
    if (over > 0) {
      return Math.max(-over, margin - left);
    }
    if (left < margin) return margin - left;
    return 0;
  }
  function fitMenu(panel2) {
    if (typeof panel2.getBoundingClientRect !== "function") return;
    const viewport = window.innerWidth;
    if (!viewport) return;
    const rect = panel2.getBoundingClientRect();
    if (!rect.width) return;
    const had = Number(panel2.dataset.shift || 0);
    const shift = fitShift(rect.left - had, rect.width, viewport, MENU_MARGIN);
    if (shift !== had) {
      panel2.dataset.shift = String(shift);
      panel2.style.transform = shift === 0 ? "" : "translateX(" + shift + "px)";
    }
    if (!panel2.classList.contains(CLASS_SETTINGS)) return;
    const height = window.innerHeight;
    if (typeof rect.top !== "number" || !height) return;
    const room = Math.max(MENU_MIN_HEIGHT, height - rect.top - MENU_MARGIN);
    const wanted2 = Math.round(room) + "px";
    if (panel2.style.maxHeight !== wanted2) panel2.style.maxHeight = wanted2;
  }
  function drawChapters(panel2, state) {
    var _a3, _b3, _c;
    const rows = state.placed.map((chapter, index) => ({
      chapter,
      // A chapter with no name is named by its place, which is what the reader sees in
      // the list — the same number the jump goes to.
      name: chapter.title || numbered(state.locale, "mangaReader.chapterNumber", index + 1),
      range: chapter.at + 1 + "\u2013" + (chapter.to + 1)
    }));
    const key = [
      (_a3 = state.locale) != null ? _a3 : "",
      String(rows.length),
      ...rows.map((row2) => row2.chapter.at + ":" + row2.name + ":" + row2.range)
    ].join("|");
    if (panel2.getAttribute("data-drawn") !== key) {
      panel2.setAttribute("data-drawn", key);
      panel2.textContent = "";
      const head = text(CLASS_MENU_HEAD);
      const heading = text(CLASS_MENU_HEADING);
      heading.textContent = stringFor(state.locale, "mangaReader.chapters");
      const count = text(CLASS_MENU_COUNT);
      count.textContent = numbered(
        state.locale,
        "mangaReader.chapterCount",
        rows.length
      );
      head.appendChild(heading);
      head.appendChild(count);
      panel2.appendChild(head);
      const list = text(CLASS_MENU_LIST, "div");
      for (const row2 of rows) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "dropdown-item " + CLASS_MENU_ITEM;
        item.dataset.at = String(row2.chapter.at);
        const name = text(CLASS_CHAPTER_NAME);
        name.textContent = row2.name;
        const range = text(CLASS_CHAPTER_RANGE);
        range.textContent = row2.range;
        item.appendChild(name);
        item.appendChild(range);
        item.addEventListener("click", () => {
          openMenu = null;
          state.handlers.onChapter(row2.chapter.at);
        });
        list.appendChild(item);
      }
      panel2.appendChild(list);
    }
    for (const item of panel2.querySelectorAll("." + CLASS_MENU_ITEM)) {
      const mine = item.dataset.at === String((_c = (_b3 = state.chapter) == null ? void 0 : _b3.at) != null ? _c : -1);
      item.classList.toggle("is-current", mine);
    }
  }
  function drawSettings(panel2, state) {
    const label2 = (id) => stringFor(state.locale, id);
    if (panel2.getAttribute("data-built") !== "yes") {
      panel2.setAttribute("data-built", "yes");
      panel2.classList.add(CLASS_SETTINGS);
      panel2.textContent = "";
      const heading = document.createElement("div");
      heading.className = "popover-header";
      labels["mangaReader.options"] = heading;
      panel2.appendChild(heading);
      const body = document.createElement("div");
      body.className = "popover-body";
      panel2.appendChild(body);
      const group = (labelId) => {
        const node = document.createElement("div");
        node.className = "form-group " + CLASS_GROUP;
        const title = text(CLASS_GROUP_LABEL);
        labels[labelId] = title;
        node.appendChild(title);
        body.appendChild(node);
        return node;
      };
      const rule = () => {
        const line = document.createElement("hr");
        line.className = CLASS_DIVIDER;
        body.appendChild(line);
        return line;
      };
      const row2 = (id, textId, control2) => {
        const node = text(CLASS_ROW, "div");
        const name = document.createElement("label");
        name.className = CLASS_ROW_LABEL;
        name.htmlFor = id;
        labels[textId] = name;
        node.appendChild(name);
        node.appendChild(control2);
        return node;
      };
      const switchAt = (id, onChange) => {
        const wrap = document.createElement("div");
        wrap.className = "custom-control custom-switch";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.className = "custom-control-input";
        input.id = id;
        input.addEventListener("change", () => {
          onChange(input.checked);
        });
        const empty = document.createElement("label");
        empty.className = "custom-control-label";
        empty.htmlFor = id;
        wrap.appendChild(input);
        wrap.appendChild(empty);
        return wrap;
      };
      const reading = group("mangaReader.groupReading");
      const readingTitle = labels["mangaReader.groupReading"];
      if (readingTitle == null ? void 0 : readingTitle.parentNode) {
        const line = text(CLASS_HEADING_LINE, "div");
        readingTitle.parentNode.insertBefore(line, readingTitle);
        line.appendChild(readingTitle);
        line.appendChild(helpAt("mangaReader.perMode"));
      }
      const pair = (halves, choose) => {
        const track2 = text(CLASS_PAGES, "div");
        for (const half of halves) {
          const button2 = document.createElement("button");
          button2.type = "button";
          button2.id = half.id;
          button2.className = "btn minimal " + CLASS_SEGMENT;
          button2.addEventListener("click", () => {
            if (button2.classList.contains("is-on")) return;
            choose(half.id);
          });
          labels[half.textId] = button2;
          track2.appendChild(button2);
        }
        return track2;
      };
      reading.appendChild(
        pair(
          [
            { id: SINGLE_PAGE_ID, textId: "mangaReader.singlePage" },
            { id: DOUBLE_PAGE_ID, textId: "mangaReader.doublePage" },
            { id: SCROLL_ID, textId: "mangaReader.scrollMode" }
          ],
          (id) => latest2 == null ? void 0 : latest2.handlers.onSetting({
            readingMode: id === DOUBLE_PAGE_ID ? "double" : id === SCROLL_ID ? "scroll" : "single"
          })
        )
      );
      parts.coverRow = row2(
        COVER_ID,
        "mangaReader.coverAlone",
        switchAt(COVER_ID, (on) => latest2 == null ? void 0 : latest2.handlers.onSetting({ coverAlone: on }))
      );
      reading.appendChild(parts.coverRow);
      parts.spreadsRow = row2(
        SPREAD_ID,
        "mangaReader.detectSpreads",
        switchAt(
          SPREAD_ID,
          (on) => latest2 == null ? void 0 : latest2.handlers.onSetting({ detectSpreads: on })
        )
      );
      reading.appendChild(parts.spreadsRow);
      parts.offsetRow = row2(
        OFFSET_ID,
        "mangaReader.offset",
        switchAt(OFFSET_ID, (on) => latest2 == null ? void 0 : latest2.handlers.onOffset(on))
      );
      reading.appendChild(parts.offsetRow);
      parts.animationRule = rule();
      const animation = group("mangaReader.groupAnimation");
      parts.animationGroup = animation;
      animation.appendChild(
        pair(
          [
            { id: FADE_OFF_ID, textId: "mangaReader.fadeOff" },
            { id: FADE_ON_ID, textId: "mangaReader.fade" }
          ],
          (id) => latest2 == null ? void 0 : latest2.handlers.onSetting({ fade: id === FADE_ON_ID })
        )
      );
      parts.progressRule = rule();
      const progress = group("mangaReader.groupProgress");
      parts.progressGroup = progress;
      parts.progressRow = row2(
        PROGRESS_ID,
        "mangaReader.showProgress",
        switchAt(
          PROGRESS_ID,
          (on) => latest2 == null ? void 0 : latest2.handlers.onSetting({ showProgress: on })
        )
      );
      progress.appendChild(parts.progressRow);
      parts.marksRow = row2(
        MARKS_ID,
        "mangaReader.showChapterMarks",
        switchAt(
          MARKS_ID,
          (on) => latest2 == null ? void 0 : latest2.handlers.onSetting({ showChapterMarks: on })
        )
      );
      progress.appendChild(parts.marksRow);
      parts.idleRow = text(CLASS_ROW + " " + CLASS_ROW_SLIDER, "div");
      const idleLabel = document.createElement("label");
      idleLabel.className = CLASS_ROW_LABEL;
      idleLabel.htmlFor = IDLE_ID;
      labels["mangaReader.progressIdle"] = idleLabel;
      parts.idleReadout = text(CLASS_READOUT);
      parts.idleRow.appendChild(idleLabel);
      parts.idleRow.appendChild(parts.idleReadout);
      progress.appendChild(parts.idleRow);
      const idle2 = document.createElement("input");
      idle2.type = "range";
      idle2.className = "custom-range";
      idle2.id = IDLE_ID;
      idle2.min = "0";
      idle2.max = String(IDLE_NEVER_STEP);
      idle2.step = "1";
      idle2.addEventListener("input", () => {
        latest2 == null ? void 0 : latest2.handlers.onSetting({
          progressIdleMs: idleMsOf(Number(idle2.value))
        });
      });
      parts.idleSlider = idle2;
      progress.appendChild(idle2);
      parts.wheelRule = rule();
      const wheelGroup = group("mangaReader.groupWheel");
      parts.wheelGroup = wheelGroup;
      for (const chord of WHEEL_CHORDS) {
        parts[chord.id] = row2(chord.id, chord.textId, selectAt(chord));
        wheelGroup.appendChild(parts[chord.id]);
      }
    }
    function helpAt(textId) {
      const wrap = text(CLASS_HELP, "span");
      const button2 = document.createElement("button");
      button2.type = "button";
      button2.className = CLASS_HELP_BUTTON;
      button2.textContent = "?";
      setIcon(button2, "faQuestionCircle");
      const note = text(CLASS_HELP_PANEL);
      labels[textId] = note;
      wrap.appendChild(button2);
      wrap.appendChild(note);
      return wrap;
    }
    function selectAt(chord) {
      const select = document.createElement("select");
      select.className = "form-control btn-secondary " + CLASS_SELECT;
      select.id = chord.id;
      for (const action of WHEEL_ACTIONS) {
        const option = document.createElement("option");
        option.value = action;
        select.appendChild(option);
      }
      select.addEventListener("change", () => {
        const value = select.value;
        const wheel = latest2 == null ? void 0 : latest2.settings.wheel;
        if (!isWheelAction(value) || !wheel) return;
        latest2 == null ? void 0 : latest2.handlers.onSetting({
          wheel: withWheelAction(wheel, chord.gesture, value)
        });
      });
      return select;
    }
    const say = (id) => {
      const node = labels[id];
      const words = label2(id);
      if (node && node.textContent !== words) node.textContent = words;
    };
    const set = (id, on) => {
      const box = panel2.querySelector("#" + id);
      if (box && box.checked !== on) box.checked = on;
    };
    say("mangaReader.options");
    say("mangaReader.groupReading");
    say("mangaReader.groupAnimation");
    say("mangaReader.singlePage");
    say("mangaReader.doublePage");
    say("mangaReader.scrollMode");
    say("mangaReader.fadeOff");
    say("mangaReader.fade");
    say("mangaReader.groupProgress");
    say("mangaReader.showProgress");
    say("mangaReader.showChapterMarks");
    say("mangaReader.progressIdle");
    say("mangaReader.groupWheel");
    say("mangaReader.perMode");
    const helpName = label2("mangaReader.perMode");
    const helpButton = panel2.querySelector("." + CLASS_HELP_BUTTON);
    if (helpButton && helpButton.getAttribute("aria-label") !== helpName) {
      helpButton.setAttribute("aria-label", helpName);
    }
    say("mangaReader.wheel");
    say("mangaReader.wheelShift");
    say("mangaReader.wheelCtrl");
    const chosen = (id, on) => {
      const half = panel2.querySelector("#" + id);
      if (half) half.classList.toggle("is-on", on);
    };
    chosen(SINGLE_PAGE_ID, state.settings.readingMode === "single");
    chosen(DOUBLE_PAGE_ID, state.settings.readingMode === "double");
    chosen(SCROLL_ID, state.settings.readingMode === "scroll");
    chosen(FADE_OFF_ID, !state.settings.fade);
    chosen(FADE_ON_ID, state.settings.fade);
    set(COVER_ID, state.settings.coverAlone);
    set(SPREAD_ID, state.settings.detectSpreads);
    set(OFFSET_ID, state.settings.offset);
    set(PROGRESS_ID, state.settings.showProgress);
    set(MARKS_ID, state.settings.showChapterMarks);
    say("mangaReader.coverAlone");
    say("mangaReader.detectSpreads");
    say("mangaReader.offset");
    const paired = state.settings.readingMode === "double";
    showWhen(parts.coverRow, paired);
    showWhen(parts.spreadsRow, paired);
    showWhen(parts.offsetRow, paired);
    const screening = state.settings.readingMode !== "scroll";
    showWhen(parts.animationGroup, screening);
    showWhen(parts.animationRule, screening);
    for (const chord of WHEEL_CHORDS) {
      const select = panel2.querySelector(
        "#" + chord.id
      );
      if (!select) continue;
      WHEEL_ACTIONS.forEach((action, at) => {
        var _a3;
        const option = (_a3 = select.children) == null ? void 0 : _a3[at];
        if (!option) return;
        const words = label2(WHEEL_WORDS[action]);
        if (option.textContent !== words) option.textContent = words;
      });
      const chosen2 = state.settings.wheel[chord.gesture];
      if (select.value !== chosen2) select.value = chosen2;
    }
    showWhen(parts.marksRow, state.settings.showProgress);
    showWhen(parts.idleRow, state.settings.showProgress);
    showWhen(parts.idleSlider, state.settings.showProgress);
    const slider = panel2.querySelector("#" + IDLE_ID);
    const step2 = String(idleStepOf(state.settings.progressIdleMs));
    if (slider && slider.value !== step2) slider.value = step2;
    const idleWords = state.settings.progressIdleMs === PROGRESS_NEVER ? stringFor(state.locale, "mangaReader.never") : numbered(
      state.locale,
      "mangaReader.seconds",
      state.settings.progressIdleMs / 1e3
    );
    if (parts.idleReadout.textContent !== idleWords) {
      parts.idleReadout.textContent = idleWords;
    }
  }
  var SINGLE_PAGE_ID = "manga-reader-single-page";
  var DOUBLE_PAGE_ID = "manga-reader-double-page";
  var SCROLL_ID = "manga-reader-scroll";
  var COVER_ID = "manga-reader-cover-alone";
  var SPREAD_ID = "manga-reader-detect-spreads";
  var OFFSET_ID = "manga-reader-offset";
  var FADE_OFF_ID = "manga-reader-fade-off";
  var FADE_ON_ID = "manga-reader-fade-on";
  var PROGRESS_ID = "manga-reader-show-progress";
  var MARKS_ID = "manga-reader-show-marks";
  var IDLE_ID = "manga-reader-idle";
  var WHEEL_ID = "manga-reader-wheel";
  var SHIFT_WHEEL_ID = "manga-reader-shift-wheel";
  var CTRL_WHEEL_ID = "manga-reader-ctrl-wheel";
  var WHEEL_CHORDS = [
    { id: WHEEL_ID, textId: "mangaReader.wheel", gesture: "plain" },
    { id: SHIFT_WHEEL_ID, textId: "mangaReader.wheelShift", gesture: "shift" },
    { id: CTRL_WHEEL_ID, textId: "mangaReader.wheelCtrl", gesture: "ctrl" }
  ];
  var WHEEL_WORDS = {
    off: "mangaReader.wheelOff",
    turn: "mangaReader.wheelTurn",
    zoom: "mangaReader.wheelZoom",
    scroll: "mangaReader.wheelScroll"
  };
  var IDLE_STEP_MS = 500;
  var IDLE_TOP_STEP = PROGRESS_IDLE_MAX_MS / IDLE_STEP_MS;
  var IDLE_NEVER_STEP = IDLE_TOP_STEP + 1;
  var idleStepOf = (ms) => ms === PROGRESS_NEVER ? IDLE_NEVER_STEP : Math.round(ms / IDLE_STEP_MS);
  var idleMsOf = (step2) => step2 > IDLE_TOP_STEP ? PROGRESS_NEVER : step2 * IDLE_STEP_MS;
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
      redraw2();
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
    var _a3;
    const api = requirePluginApi();
    const Solid = api.libraries.FontAwesomeSolid || {};
    const Icon = api.components.Icon;
    const icon = Solid[name];
    const render2 = (_a3 = api.ReactDOM) == null ? void 0 : _a3.render;
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
      latest2 == null ? void 0 : latest2.handlers.onResetZoom();
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
      latest2 == null ? void 0 : latest2.handlers.onClose();
    });
    return button2;
  }
  function forgetOpenMenu() {
    openMenu = null;
  }
  NR.fitShift = fitShift;

  // src/reader/spreads.ts
  function pageUrl(page) {
    const query = /\?.*$/.exec(page.url || "");
    return "/image/" + page.id + "/image" + (query ? query[0] : "");
  }
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

  // src/reader/chapters-tab.ts
  var SEL_PANEL = ".container";
  var HIDDEN2 = "data-manga-reader-hidden";
  var IMPORT_ID = "manga-reader-chapters-import";
  var CLASS_EDIT = "manga-reader-chapter-edit";
  var TAKEN = "data-manga-reader-taken";
  var CLASS_EDITING = "manga-reader-chapters-editing";
  var renderedFor = "";
  var panelInHand = null;
  var inHand = null;
  var form = null;
  var formError = "";
  var control = null;
  var controlState = null;
  var controlFor = null;
  var busy = false;
  var confirming = false;
  var bulkButton = null;
  var bulk = false;
  var bulkPages = [];
  var BULK_LIMIT = 64;
  function syncChaptersTab() {
    const id = galleryIdFromPath(window.location.pathname);
    if (!id || !NS.manageChapters) {
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
      if (isStashButton(stashButtonBefore(panel2))) return panel2;
    }
    return null;
  }
  function stashButtonBefore(panel2) {
    let at = panel2.previousElementSibling;
    while (at && at.id === BULK_ID) at = at.previousElementSibling;
    return at;
  }
  function isStashButton(node) {
    return !!node && node.tagName === "BUTTON" && node.classList.contains("btn") && node.getAttribute(HIDDEN2) === null;
  }
  function render(panel2, gallery) {
    var _a3;
    const key = [
      gallery.id,
      gallery.own ? "own" : "none",
      String(gallery.importable.length),
      busy ? "busy" : confirming ? "confirm" : "idle",
      bulk ? "bulk" : form ? "form:" + ((_a3 = form.startPageId) != null ? _a3 : "new") + (formError ? ":bad" : "") : "list",
      ...gallery.chapters.map((c) => c.title + "@" + c.at)
    ].join("|");
    const wanted2 = bulk || form ? 1 : gallery.chapters.length;
    if (key === renderedFor && panel2.children.length >= wanted2) return;
    renderedFor = key;
    panelInHand = panel2;
    takeOverCreate(panel2);
    ensureBulkButton(panel2);
    toggleCreate(panel2, !form && !bulk);
    if (panel2.children.length > 0) panel2.textContent = "";
    if (bulk) {
      drawBulk(panel2, gallery);
    } else if (form) {
      drawForm(panel2, gallery);
    } else {
      for (const chapter of gallery.chapters) {
        panel2.appendChild(row(gallery, chapter));
      }
    }
    if (form || bulk) hideImport();
    else drawImport(panel2, gallery);
  }
  function takeOverCreate(panel2) {
    const button2 = stashButtonBefore(panel2);
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
  var BULK_ID = "manga-reader-chapters-bulk";
  var BULK_CREATE_ID = "manga-reader-bulk-create";
  function ensureBulkButton(panel2) {
    var _a3;
    const owner = panel2.previousElementSibling;
    if (!isStashButton(owner)) return;
    if (!bulkButton) {
      bulkButton = document.createElement("button");
      bulkButton.type = "button";
      bulkButton.id = BULK_ID;
      bulkButton.className = "btn btn-secondary btn-sm";
      bulkButton.addEventListener("click", (event) => {
        event.preventDefault();
        openBulk();
      });
    }
    const wanted2 = owner.className + " ml-2";
    if (bulkButton.className !== wanted2) bulkButton.className = wanted2;
    if (owner.nextElementSibling !== bulkButton) {
      (_a3 = owner.parentNode) == null ? void 0 : _a3.insertBefore(bulkButton, owner.nextElementSibling);
    }
    const wording = stringFor(inHand == null ? void 0 : inHand.locale, "mangaReader.chaptersFromList");
    if (bulkButton.textContent !== wording) bulkButton.textContent = wording;
    const away = bulk || form !== null;
    if (bulkButton.hidden !== away) bulkButton.hidden = away;
  }
  function openBulk() {
    if (!inHand) return;
    bulk = true;
    bulkPages = [];
    redraw3();
  }
  function closeBulk() {
    bulk = false;
    bulkPages = [];
    redraw3();
  }
  function pageAt(input, gallery) {
    const n = Number(input.value);
    return Number.isFinite(n) && n >= 1 && n <= gallery.pages.length ? n - 1 : -1;
  }
  function pagePreview(gallery, input, host) {
    const peek = document.createElement("button");
    peek.type = "button";
    peek.className = "btn btn-secondary btn-sm manga-reader-page-peek";
    peek.setAttribute(
      "aria-label",
      stringFor(gallery.locale, "mangaReader.pagePeek")
    );
    peek.setAttribute("title", stringFor(gallery.locale, "mangaReader.pagePeek"));
    drawIcon(peek, "faImage");
    let box = null;
    let picture = null;
    let shown = "";
    peek.addEventListener("mouseenter", () => {
      const at = pageAt(input, gallery);
      const src = at < 0 ? "" : pageUrl(gallery.pages[at]);
      if (!src) return;
      if (!box) {
        box = document.createElement("div");
        box.className = "manga-reader-page-peek-box";
        picture = document.createElement("img");
        box.appendChild(picture);
        host.appendChild(box);
      }
      if (picture && shown !== src) {
        shown = src;
        picture.src = src;
      }
      if (box.hidden) box.hidden = false;
    });
    peek.addEventListener("mouseleave", () => {
      if (box) box.hidden = true;
    });
    peek.addEventListener("click", () => {
      const at = pageAt(input, gallery);
      if (at < 0) return;
      takeOver({
        images: gallery.images,
        totalCount: gallery.images.length,
        at
      });
    });
    return peek;
  }
  function drawBulk(panel2, gallery) {
    const node = document.createElement("form");
    node.setAttribute("novalidate", "");
    node.addEventListener("submit", (event) => event.preventDefault());
    const container2 = document.createElement("div");
    container2.className = "form-container";
    const label2 = document.createElement("label");
    label2.className = "form-label";
    label2.setAttribute("for", "chapter_list");
    label2.textContent = stringFor(gallery.locale, "mangaReader.bulkPaste");
    container2.appendChild(label2);
    const area = document.createElement("textarea");
    area.id = "chapter_list";
    area.className = "text-input form-control";
    area.rows = 8;
    container2.appendChild(area);
    const table = document.createElement("table");
    table.className = "manga-reader-bulk-table";
    container2.appendChild(table);
    const create = document.createElement("button");
    create.type = "button";
    create.id = BULK_CREATE_ID;
    create.className = "btn btn-primary";
    let built = [];
    const rows = () => built.map((row3) => ({
      title: row3.title.value.trim(),
      page: row3.page.value.trim()
    }));
    const wrongWith = (row3, all, at) => {
      if (!row3.title) return "mangaReader.bulkNoTitle";
      if (!row3.page) return "mangaReader.bulkNoPage";
      const page = Number(row3.page);
      if (!Number.isFinite(page) || page < 1 || page > gallery.pages.length) {
        return "mangaReader.bulkPageRange";
      }
      for (let i = 0; i < all.length; i++) {
        if (i !== at && all[i].page === row3.page)
          return "mangaReader.bulkPageTwice";
      }
      if (gallery.chapters.some((c) => c.at === page - 1)) {
        return "mangaReader.bulkPageTaken";
      }
      return "";
    };
    const validate = () => {
      var _a3;
      const all = rows();
      let good = 0;
      const lined = bulkPages.slice();
      for (let i = 0; i < all.length; i++) {
        const row3 = built[i];
        if (row3) lined[row3.line] = all[i].page;
        const wrong = wrongWith(all[i], all, i);
        const mark = (_a3 = built[i]) == null ? void 0 : _a3.mark;
        if (mark) {
          setIcon(mark, wrong ? "faTimes" : "faCheck");
          const look = wrong ? "manga-reader-bulk-bad" : "manga-reader-bulk-ok";
          if (mark.className !== look) mark.className = look;
          if (wrong)
            mark.setAttribute("data-why", stringFor(gallery.locale, wrong));
          else mark.removeAttribute("data-why");
        }
        if (!wrong) good++;
      }
      bulkPages = lined;
      table.hidden = all.length === 0;
      create.disabled = all.length === 0 || good !== all.length;
      create.textContent = numbered(
        gallery.locale,
        "mangaReader.bulkCreate",
        all.length
      );
    };
    const build2 = () => {
      const titles = parseChapterList(area.value);
      table.textContent = "";
      if (titles.length > BULK_LIMIT) {
        const over = document.createElement("div");
        over.className = "manga-reader-bulk-empty";
        over.textContent = stringFor(gallery.locale, "mangaReader.bulkTooMany");
        container2.insertBefore(over, table);
        return;
      }
      const head = document.createElement("tr");
      head.setAttribute("data-head", "");
      ["", "mangaReader.bulkTitle", "mangaReader.bulkPage", ""].forEach(
        (key, at) => {
          const th = document.createElement("th");
          if (key) th.textContent = stringFor(gallery.locale, key);
          if (at === 2) th.className = "manga-reader-bulk-page";
          head.appendChild(th);
        }
      );
      table.appendChild(head);
      built = [];
      titles.forEach((title, at) => {
        var _a3;
        const tr = document.createElement("tr");
        const valid = document.createElement("td");
        valid.className = "manga-reader-bulk-valid";
        const mark = document.createElement("span");
        valid.appendChild(mark);
        tr.appendChild(valid);
        const titleCell = document.createElement("td");
        const titleInput = document.createElement("input");
        titleInput.type = "text";
        titleInput.className = "text-input form-control";
        titleInput.value = title;
        titleInput.addEventListener("input", validate);
        titleCell.appendChild(titleInput);
        tr.appendChild(titleCell);
        const pageCell = document.createElement("td");
        pageCell.className = "manga-reader-bulk-page";
        const pageInput = document.createElement("input");
        pageInput.type = "number";
        pageInput.className = "text-input form-control";
        pageInput.value = (_a3 = bulkPages[at]) != null ? _a3 : "";
        pageInput.addEventListener("input", validate);
        pageInput.addEventListener("change", place3);
        pageCell.appendChild(pageInput);
        tr.appendChild(pageCell);
        const actsCell = document.createElement("td");
        actsCell.className = "manga-reader-bulk-acts";
        actsCell.appendChild(pagePreview(gallery, pageInput, actsCell));
        const gone = document.createElement("button");
        gone.type = "button";
        gone.className = "btn btn-danger btn-sm";
        gone.setAttribute(
          "aria-label",
          stringFor(gallery.locale, "mangaReader.bulkRemove")
        );
        gone.setAttribute(
          "title",
          stringFor(gallery.locale, "mangaReader.bulkRemove")
        );
        drawIcon(gone, "faTrash");
        gone.addEventListener("click", () => {
          const goneAt = built.findIndex((shown) => shown.tr === tr);
          if (goneAt >= 0) built.splice(goneAt, 1);
          tr.remove();
          validate();
        });
        actsCell.appendChild(gone);
        tr.appendChild(actsCell);
        table.appendChild(tr);
        built.push({ tr, line: at, mark, title: titleInput, page: pageInput });
      });
      place3();
    };
    const place3 = () => {
      if (built.length < 2) return;
      const seat = (row3) => {
        const n = Number(row3.page.value);
        return Number.isFinite(n) && n >= 1 ? n : Number.POSITIVE_INFINITY;
      };
      const order = built.slice().sort((a, b) => seat(a) - seat(b));
      let moved = false;
      for (let i = 0; i < order.length; i++) {
        if (order[i] !== built[i]) {
          moved = true;
          break;
        }
      }
      if (!moved) return;
      for (const row3 of order) table.appendChild(row3.tr);
      built = order;
    };
    area.addEventListener("input", () => {
      build2();
      validate();
    });
    const buttons = document.createElement("div");
    buttons.className = "buttons-container mt-3";
    const row2 = document.createElement("div");
    row2.className = "d-flex";
    create.addEventListener("click", () => {
      const all = rows();
      if (all.some((r, i) => wrongWith(r, all, i))) return;
      createFromList(
        gallery,
        all.map((r) => ({ title: r.title, page: Number(r.page) }))
      );
    });
    row2.appendChild(create);
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "ml-2 btn btn-secondary";
    cancel.textContent = stringFor(gallery.locale, "mangaReader.cancel");
    cancel.addEventListener("click", closeBulk);
    row2.appendChild(cancel);
    buttons.appendChild(row2);
    node.appendChild(container2);
    node.appendChild(buttons);
    panel2.appendChild(node);
    build2();
    validate();
  }
  function createFromList(gallery, entries) {
    const order = gallery.pages.map((page) => page.id);
    const next = addChaptersAt(
      gallery.stored,
      order,
      entries.map((e) => ({ pageId: order[e.page - 1], title: e.title }))
    );
    if (!next) {
      console.error(
        "[mangaReader] those chapters could not be cut, so none were written"
      );
      return;
    }
    bulk = false;
    bulkPages = [];
    applyEdit(gallery, next);
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
          redraw3();
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
      redraw3();
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
    redraw3();
    NS.writeChapters(target2.id, serializeChapters(target2.importable)).then(
      () => {
        busy = false;
        if ((inHand == null ? void 0 : inHand.id) === target2.id) {
          inHand.own = true;
          inHand.importable = target2.importable;
        }
        confirming = false;
        redraw3();
      },
      (e) => {
        busy = false;
        confirming = false;
        console.error(
          "[mangaReader] could not import this gallery's chapters:",
          e
        );
        redraw3();
      }
    );
  }
  function toggleCreate(panel2, shown) {
    const button2 = stashButtonBefore(panel2);
    if (!isStashButton(button2)) return;
    button2.classList.toggle(CLASS_EDITING, !shown);
  }
  function redraw3() {
    if (!inHand || !panelInHand) return;
    render(panelInHand, inHand);
  }
  function drawForm(panel2, gallery) {
    var _a3, _b3;
    const editing = !!(form == null ? void 0 : form.startPageId);
    const node = document.createElement("form");
    node.setAttribute("novalidate", "");
    node.addEventListener("submit", (event) => event.preventDefault());
    const container2 = document.createElement("div");
    container2.className = "form-container px-3";
    const titleField = field(
      container2,
      gallery.locale,
      "mangaReader.chapterTitle",
      "title",
      "text",
      (_a3 = form == null ? void 0 : form.initialTitle) != null ? _a3 : ""
    );
    const indexField = field(
      container2,
      gallery.locale,
      "mangaReader.chapterIndex",
      "image_index",
      "number",
      (_b3 = form == null ? void 0 : form.initialIndex) != null ? _b3 : "1"
    );
    node.appendChild(container2);
    indexField.column.classList.add("manga-reader-chapter-page");
    indexField.column.insertBefore(
      pagePreview(gallery, indexField.input, indexField.column),
      indexField.error
    );
    if (formError) refuse(indexField.error, stringFor(gallery.locale, formError));
    const title = titleField.input;
    const index = indexField.input;
    const buttons = document.createElement("div");
    buttons.className = "buttons-container px-3";
    const buttonsRow = document.createElement("div");
    buttonsRow.className = "d-flex";
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
    buttonsRow.appendChild(save);
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "ml-2 btn btn-secondary";
    cancel.textContent = stringFor(gallery.locale, "mangaReader.cancel");
    cancel.addEventListener("click", closeForm);
    buttonsRow.appendChild(cancel);
    if (editing) {
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "ml-auto btn btn-danger";
      remove.textContent = stringFor(gallery.locale, "mangaReader.delete");
      remove.addEventListener("click", deleteChapter);
      buttonsRow.appendChild(remove);
    }
    buttons.appendChild(buttonsRow);
    node.appendChild(buttons);
    panel2.appendChild(node);
  }
  function field(parent, locale, labelId, name, type, value) {
    const group = document.createElement("div");
    group.className = "form-group row";
    group.setAttribute("data-field", name);
    const label2 = document.createElement("label");
    label2.className = "form-label col-form-label col-sm-3";
    label2.setAttribute("for", name);
    label2.textContent = stringFor(locale, labelId);
    group.appendChild(label2);
    const column2 = document.createElement("div");
    column2.className = "col-sm-9";
    const input = document.createElement("input");
    input.className = "text-input form-control";
    input.setAttribute("name", name);
    input.setAttribute("id", name);
    input.type = type;
    input.placeholder = stringFor(locale, labelId);
    input.value = value;
    column2.appendChild(input);
    const error = document.createElement("div");
    error.className = "invalid-feedback";
    column2.appendChild(error);
    group.appendChild(column2);
    parent.appendChild(group);
    return { input, error, column: column2 };
  }
  function refuse(error, message2) {
    var _a3;
    const input = (_a3 = error == null ? void 0 : error.parentNode) == null ? void 0 : _a3.querySelector(
      "input"
    );
    if (!error || !input) return;
    input.classList.add("is-invalid");
    error.textContent = message2;
  }
  function submitForm(title, index) {
    const gallery = inHand;
    const current2 = form;
    if (!gallery || !current2) return;
    if (!Number.isInteger(index) || index < 1 || index > gallery.pages.length) {
      formError = "mangaReader.chapterIndexRange";
      redraw3();
      return;
    }
    const order = gallery.pages.map((page) => page.id);
    const pageId = gallery.pages[index - 1].id;
    if (current2.startPageId === null) {
      const next2 = addChapterAt(gallery.stored, order, pageId, title);
      if (!next2) {
        formError = "mangaReader.chapterStartTaken";
        redraw3();
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
      redraw3();
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
      redraw3();
      return;
    }
    applyEdit(gallery, next);
  }
  function applyEdit(gallery, next) {
    busy = true;
    redraw3();
    writeChapters(gallery.id, next).then(
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
        redraw3();
      }
    );
  }
  function closeForm() {
    form = null;
    formError = "";
    redraw3();
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
    redraw3();
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
    var _a3, _b3, _c;
    const gallery = inHand;
    if (!gallery) return;
    form = {
      startPageId: chapter ? (_b3 = (_a3 = gallery.pages[chapter.at]) == null ? void 0 : _a3.id) != null ? _b3 : null : null,
      initialTitle: (_c = chapter == null ? void 0 : chapter.title) != null ? _c : "",
      // Both are one-based already: a chapter's index is where it begins counted from
      // one, and the reading page comes back that way too.
      initialIndex: chapter ? String(chapter.at + 1) : String(indexOfReadingPage(gallery))
    };
    formError = "";
    redraw3();
  }
  function indexOfReadingPage(gallery) {
    var _a3, _b3;
    const id = (_b3 = (_a3 = NR).readingPageIdNow) == null ? void 0 : _b3.call(_a3, gallery.id);
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
    var _a3, _b3;
    if (image.title) return image.title;
    const path = ((_b3 = (_a3 = image.visual_files) == null ? void 0 : _a3[0]) == null ? void 0 : _b3.path) || "";
    return path ? path.replace(/^.*[\\/]/, "") : "No File Name";
  }

  // src/reader/settings.ts
  var FADE_MS = 200;
  function defaultProfile(mode) {
    return {
      coverAlone: true,
      detectSpreads: true,
      offset: false,
      fade: true,
      showProgress: true,
      showChapterMarks: true,
      progressIdleMs: PROGRESS_IDLE_MS,
      wheel: defaultWheel(mode)
    };
  }
  var DEFAULT_SETTINGS = {
    readingMode: "single",
    ...defaultProfile("single")
  };
  var PROFILE_KEYS = [
    "coverAlone",
    "detectSpreads",
    "offset",
    "fade",
    "showProgress",
    "showChapterMarks",
    "progressIdleMs",
    "wheel"
  ];
  function settingsObject(raw) {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  function asObject(value) {
    return value && typeof value === "object" ? value : {};
  }
  function readMode(stored) {
    const value = stored.readingMode;
    return value === "single" || value === "double" || value === "scroll" ? value : DEFAULT_SETTINGS.readingMode;
  }
  function readProfile(stored, mode) {
    const fallback = defaultProfile(mode);
    const at = asObject(asObject(stored.profiles)[mode]);
    const flag = (key) => typeof at[key] === "boolean" ? at[key] : fallback[key];
    const idleMs = () => {
      const value = at.progressIdleMs;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return fallback.progressIdleMs;
      }
      if (value === PROGRESS_NEVER || value === PROGRESS_HOLD_MS) return value;
      return Math.min(
        Math.max(Math.round(value), PROGRESS_HOLD_MS),
        PROGRESS_IDLE_MAX_MS
      );
    };
    const wheel = () => {
      const bindings = asObject(at.wheel);
      const chords = { ...fallback.wheel };
      for (const gesture of WHEEL_GESTURES) {
        const value = bindings[gesture];
        if (isWheelAction(value)) chords[gesture] = value;
      }
      return chords;
    };
    return {
      coverAlone: flag("coverAlone"),
      detectSpreads: flag("detectSpreads"),
      offset: flag("offset"),
      fade: flag("fade"),
      showProgress: flag("showProgress"),
      showChapterMarks: flag("showChapterMarks"),
      progressIdleMs: idleMs(),
      wheel: wheel()
    };
  }
  function storedProfiles(raw) {
    const stored = settingsObject(raw);
    const profiles = {};
    for (const mode of READING_MODES) profiles[mode] = readProfile(stored, mode);
    return profiles;
  }
  function parseSettings(raw) {
    const stored = settingsObject(raw);
    const readingMode = readMode(stored);
    return { readingMode, ...readProfile(stored, readingMode) };
  }
  function readSettings() {
    try {
      return parseSettings(NS.readerSettingsRaw);
    } catch (e) {
      console.error(
        "[mangaReader] settings are not readable, using defaults:",
        e
      );
      return { ...DEFAULT_SETTINGS };
    }
  }
  function writeSettings(next) {
    var _a3, _b3;
    const merged = { ...readSettings(), ...next };
    try {
      const profiles = storedProfiles(NS.readerSettingsRaw);
      const mode = merged.readingMode;
      const profile = { ...profiles[mode] };
      for (const key of PROFILE_KEYS) {
        if (key in next) {
          profile[key] = merged[key];
        }
      }
      profiles[mode] = profile;
      (_b3 = (_a3 = NS).writeReaderSettings) == null ? void 0 : _b3.call(_a3, JSON.stringify({ readingMode: mode, profiles }));
      return { readingMode: mode, ...profile };
    } catch (e) {
      console.error("[mangaReader] settings are not writable:", e);
    }
    return merged;
  }
  NR.parseSettings = parseSettings;
  NR.readSettings = readSettings;
  NR.defaultProfile = defaultProfile;
  NR.FADE_MS = FADE_MS;

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
    const zoom2 = Math.abs(wanted2 - 1) < VIEW_SNAP ? 1 : wanted2;
    return { ...view2, zoom: zoom2 };
  }
  function panned(view2, dx, dy) {
    return { zoom: view2.zoom, x: view2.x + dx, y: view2.y + dy };
  }

  // src/reader/scroll.ts
  var CLASS_SCROLL = "is-scroll";
  var CLASS_SCROLL_PAGE = "manga-reader-scroll-page";
  var CLASS_SCROLLING = "manga-reader-position-scrolling";
  var zoom = 1;
  function columnZoom() {
    return zoom;
  }
  function columnFitted(width, height, reserved = 0) {
    if (!(width > 0) || !(height > 0)) return 0;
    return Math.max(1, Math.min(width - 2 * reserved, height));
  }
  function zoomedBy(current2, factor) {
    return Math.min(Math.max(current2 * factor, VIEW_MIN_ZOOM), VIEW_MAX_ZOOM);
  }
  function setStyle(node, name, value) {
    if (node.style[name] !== value) node.style[name] = value;
  }
  function setColumnZoom(next, reserved = 0) {
    zoom = next;
    const box = column == null ? void 0 : column.getBoundingClientRect();
    const fitted = box ? columnFitted(box.width || 0, box.height || 0, reserved) : 0;
    column == null ? void 0 : column.querySelectorAll("." + CLASS_SCROLL_PAGE).forEach((row2) => {
      const node = row2;
      const natural = Number(node.dataset.width || 0);
      if (fitted > 0) {
        setStyle(node, "width", zoom * fitted + "px");
        setStyle(
          node,
          "maxWidth",
          zoom * (natural > 0 ? Math.min(natural, fitted) : fitted) + "px"
        );
        return;
      }
      setStyle(node, "width", zoom * 100 + "%");
      if (natural > 0) setStyle(node, "maxWidth", zoom * natural + "px");
    });
    return zoom;
  }
  var column = null;
  function pageAtTop(rows, edge) {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].bottom > edge) return i;
    }
    return rows.length > 0 ? rows.length - 1 : -1;
  }
  function buildColumn(into, pages, urlOf) {
    column = into;
    into.textContent = "";
    pages.forEach((page, index) => {
      const row2 = document.createElement("div");
      row2.className = CLASS_SCROLL_PAGE;
      row2.dataset.width = String(page.width > 0 ? page.width : 0);
      if (page.width > 0 && page.height > 0) {
        row2.style.aspectRatio = page.width + " / " + page.height;
      }
      const image = document.createElement("img");
      image.src = urlOf(page, index);
      image.alt = String(index + 1);
      image.decoding = "async";
      image.loading = "lazy";
      image.draggable = false;
      row2.appendChild(image);
      into.appendChild(row2);
    });
  }
  function rowOffset(into, index) {
    const row2 = into.querySelectorAll("." + CLASS_SCROLL_PAGE)[index];
    return row2 ? row2.offsetTop : null;
  }
  NR.pageAtTop = pageAtTop;
  NR.zoomedBy = zoomedBy;
  NR.columnFitted = columnFitted;

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
  var pageGalleryId = null;
  var clickedGalleryId = null;
  var askedAboutImage = {};
  var galleriesOfImage = {};
  var shownAt = -1;
  var drawGeneration = 0;
  var awaiting = -1;
  var reinsers = 0;
  var language = null;
  var logged = false;
  var clickRoot = null;
  var pending2 = null;
  var handedFor = null;
  var place2 = -1;
  function galleryOf(lightbox) {
    const fromPath = galleryIdFromPath(window.location.pathname);
    if (fromPath) return fromPath;
    if (pageGalleryId) return pageGalleryId;
    if (clickedGalleryId) {
      pageGalleryId = clickedGalleryId;
      return pageGalleryId;
    }
    const image = carouselImage(lightbox);
    if (!image) return null;
    if (image.id in galleriesOfImage) {
      pageGalleryId = galleriesOfImage[image.id];
      return pageGalleryId;
    }
    askAboutImage(image.id, () => {
      pageGalleryId = galleriesOfImage[image.id];
      if (root) step();
    });
    return pageGalleryId;
  }
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
      pageGalleryId = null;
      shownAt = -1;
      place2 = -1;
      reinsers = 0;
      logged = false;
      handedFor = null;
    }
    const wantedId = galleryOf(lightbox);
    if (!wantedId) return;
    const marked = NS.markedInStore(wantedId);
    if (marked !== true) {
      if (marked === false) leaveUnmarked(lightbox);
      return;
    }
    if (!NS.readerTakeover) {
      leaveUnmarked(lightbox);
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
    if (!NS.readerTakeover) return false;
    const id = root ? galleryOf(root) : null;
    return root !== null && id !== null && NS.markedInStore(id) === true;
  }
  function leaveUnmarked(lightbox) {
    if (container || root !== lightbox) deactivate();
  }
  function current() {
    return galleryId ? loaded.get(galleryId) || null : null;
  }
  function laidOut(pages) {
    return layout(pages, {
      coverAlone: settings.coverAlone,
      detectSpreads: settings.detectSpreads,
      // The setting is a yes or no; the layout's own word for it is a page count.
      offset: settings.offset ? 1 : 0,
      double: settings.readingMode === "double"
    });
  }
  function pairingKey() {
    return [
      settings.readingMode,
      settings.coverAlone,
      settings.detectSpreads,
      settings.offset
    ].join("|");
  }
  function loadGallery(id) {
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
        pairedWith: pairingKey(),
        screens: laidOut(answer.pages),
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
    let relaid = false;
    if (gallery.pairedWith !== pairingKey()) {
      gallery.screens = laidOut(gallery.pages);
      gallery.pairedWith = pairingKey();
      shownAt = -1;
      relaid = true;
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
    const page = pageAt2(gallery, at);
    syncFooter(lightbox, page < 0 ? null : gallery.images[page] || null);
    const scrolling = settings.readingMode === "scroll";
    if (scrolling) {
      if (settings.showProgress) {
        ensureProgress(lightbox, progressState(gallery, at, lightbox, relaid));
      } else {
        removeProgress(lightbox);
      }
      ensureColumn(lightbox, gallery);
      return;
    }
    removeColumn();
    if (at >= 0 && settings.showProgress) {
      ensureProgress(lightbox, progressState(gallery, at, lightbox, relaid));
    } else {
      removeProgress(lightbox);
    }
    if (at < 0) return;
    if (at === shownAt && container && (container.childElementCount || awaiting === at)) {
      return;
    }
    ensureContainer(lightbox);
    if (!container) return;
    draw(gallery.screens[at], at);
  }
  function progressState(gallery, at, lightbox, relaid) {
    var _a3;
    const screen = gallery.screens[at];
    const scrolling = settings.readingMode === "scroll";
    return {
      at: Math.max(pageAt2(gallery, at), 0),
      total: gallery.pages.length,
      // The column's bar is a column too, and its extent is the picture area's rather
      // than a measurement of the pages — see progress.ts.
      //
      // And on the pass that re-cut the pages there is no width to report either, because
      // what is in the picture area is still the *previous* layout's: the old screen's
      // images, or the column's own rows. `pictureWidth` cannot tell one from the other,
      // and the number it gives back is not this screen's width in any sense — a column's
      // page is as wide as the picture area, which is what made the bar flash at very
      // nearly its full length for a moment on the way out of the column. The bar hears
      // "no width" and does what it does for the first screen of a gallery: it stays out of
      // the way until the screen it is about has been measured, and comes out then on the
      // wake it was owed.
      width: scrolling || relaid ? 0 : pictureWidth((_a3 = screen == null ? void 0 : screen.pages.length) != null ? _a3 : 0),
      vertical: scrolling,
      idleMs: settings.progressIdleMs,
      // …and the same fact said to the bar itself, which is where the width it was holding
      // is forgotten. See `lastWidth` in progress.ts.
      relaid,
      // The ticks, and only the ticks: "chapter marks" is a setting about the bar, so the
      // list the bar draws its marks from is the one that is emptied. What the drag's
      // bubble says comes from `chapterNameAt` below, which reads the chapters whatever
      // this says — a reader who turned the marks off has not asked the bar to stop
      // knowing where the chapters are.
      chapters: settings.showChapterMarks ? gallery.chapters : [],
      chapterNameAt: (page) => {
        var _a4, _b3;
        return ((_b3 = chapterAt(gallery.chapters, ((_a4 = gallery.pages[page]) == null ? void 0 : _a4.id) || "")) == null ? void 0 : _b3.title) || "";
      },
      locale: language,
      handlers: {
        onSeek: (to) => seekTo(lightbox, to)
      }
    };
  }
  function chromeState(gallery, lightbox) {
    var _a3;
    const at = screenNow(gallery);
    const image = at < 0 ? null : gallery.images[gallery.screens[at].start] || null;
    const pageId = ((_a3 = gallery.pages[pageAt2(gallery, at)]) == null ? void 0 : _a3.id) || "";
    return {
      image,
      number: Math.max(place2, 0) + 1,
      total: gallery.pages.length,
      chapter: chapterAt(gallery.chapters, pageId),
      chapters: gallery.chapters,
      placed: gallery.chapters,
      settings,
      locale: language,
      zoomed: zoomedNow(),
      handlers: {
        onResetZoom: () => {
          view = fitView();
          if (settings.readingMode === "scroll") {
            refitColumn(1);
            scrollTo = Math.max(place2, 0);
          }
          applyView();
          sync(lightbox);
        },
        onChapter: (to) => {
          place2 = to;
          if (settings.readingMode === "scroll") scrollTo = to;
          step();
        },
        onSetting: (next) => {
          settings = writeSettings(next);
          sync(lightbox);
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
      container.addEventListener("scroll", onColumnScroll);
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
  var columnFor = null;
  var columnIn = null;
  var scrollTo = null;
  function ensureColumn(lightbox, gallery) {
    ensureContainer(lightbox);
    if (!container) return;
    container.classList.add(CLASS_SCROLL);
    lightbox.classList.add(CLASS_SCROLLING);
    container.style.transform = "";
    view = fitView();
    let built = false;
    if (columnFor !== gallery.id || columnIn !== container) {
      buildColumn(container, gallery.pages, (page) => pageUrl(page));
      columnFor = gallery.id;
      columnIn = container;
      built = true;
      awaiting = -1;
      refitColumn(1);
    } else {
      refitIfReserveChanged();
    }
    const to = built ? place2 : scrollTo;
    scrollTo = null;
    if (to === null || to < 0) return;
    const offset = rowOffset(container, to);
    if (offset !== null) container.scrollTop = offset;
  }
  function removeColumn() {
    if (columnFor === null) return;
    columnFor = null;
    columnIn = null;
    scrollTo = null;
    view = fitView();
    setColumnZoom(1);
    shownAt = -1;
    container == null ? void 0 : container.classList.remove(CLASS_SCROLL);
    root == null ? void 0 : root.classList.remove(CLASS_SCROLLING);
  }
  function columnPageAt(column2) {
    const rows = Array.from(column2.querySelectorAll("." + CLASS_SCROLL_PAGE)).map(
      (row2) => row2.getBoundingClientRect()
    );
    return NR.pageAtTop(
      rows.map((rect) => ({ top: rect.top, bottom: rect.bottom })),
      column2.getBoundingClientRect().top
    );
  }
  function onColumnScroll() {
    const lightbox = root;
    if (!lightbox || !container) return;
    if (settings.readingMode !== "scroll" || !wanted()) return;
    const at = columnPageAt(container);
    if (at < 0 || at === place2) return;
    place2 = at;
    sync(lightbox);
  }
  var REVEAL_BUDGET_MS = 300;
  NR.REVEAL_BUDGET_MS = REVEAL_BUDGET_MS;
  NR.readingPageIdNow = (galleryId2) => {
    var _a3, _b3;
    const gallery = loaded.get(galleryId2);
    if (!gallery || place2 < 0) return null;
    return (_b3 = (_a3 = gallery.pages[place2]) == null ? void 0 : _a3.id) != null ? _b3 : null;
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
  NR.PROGRESS_IDLE_MAX_MS = PROGRESS_IDLE_MAX_MS;
  NR.PROGRESS_HOLD_MS = PROGRESS_HOLD_MS;
  NR.PROGRESS_NEVER = PROGRESS_NEVER;
  function fadeIn(element) {
    if (!settings.fade) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: FADE_MS,
      easing: "ease-out"
    });
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
        "[mangaReader] " + gallery.screens.length + " screen(s) from " + gallery.pages.length + " page(s), offset " + (settings.offset ? 1 : 0) + " \u2014 the lightbox's options menu can shift the pairing, and O does the same"
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
  function pageAt2(gallery, at) {
    if (settings.readingMode === "scroll") return Math.max(place2, 0);
    return at < 0 ? -1 : gallery.screens[at].start;
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
  var fittedWith = null;
  function refitColumn(next) {
    if (!container) return;
    const reserve = barReserve(container.getBoundingClientRect());
    fittedWith = reserve;
    setColumnZoom(next, reserve);
  }
  function refitIfReserveChanged() {
    if (!container) return;
    if (barReserve(container.getBoundingClientRect()) !== fittedWith) {
      refitColumn(columnZoom());
    }
  }
  function measureAgain() {
    if (settings.readingMode === "scroll") refitColumn(columnZoom());
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
  function noteClickedCard(event) {
    var _a3;
    const target2 = event.target;
    if (!target2 || typeof target2.closest !== "function") return;
    const link = (_a3 = target2.closest(".gallery-card")) == null ? void 0 : _a3.querySelector('a[href^="/galleries/"]');
    const match = /^\/galleries\/(\d+)/.exec((link == null ? void 0 : link.getAttribute("href")) || "");
    if (match) clickedGalleryId = match[1];
  }
  function askAboutImage(imageId, whenAnswered) {
    if (askedAboutImage[imageId]) {
      if (imageId in galleriesOfImage) whenAnswered();
      return;
    }
    askedAboutImage[imageId] = true;
    galleryIdOfImage(imageId).then(
      (galleryId2) => {
        galleriesOfImage[imageId] = galleryId2;
        whenAnswered();
      },
      (e) => {
        delete askedAboutImage[imageId];
        console.error(
          "[mangaReader] could not ask which gallery this image is in:",
          e
        );
      }
    );
  }
  function prefetchImage(event) {
    var _a3;
    if (galleryIdFromPath(window.location.pathname)) return;
    const target2 = event.target;
    const imageId = (_a3 = /\/image\/([^/]+)\//.exec((target2 == null ? void 0 : target2.src) || "")) == null ? void 0 : _a3[1];
    if (imageId) askAboutImage(imageId, () => {
    });
  }
  function onKeyDown(event) {
    if (!event.isTrusted || !wanted() || !root) return;
    const lightbox = root;
    const gallery = current();
    if (!gallery) return;
    if (event.key === "o" || event.key === "O") {
      if (event.repeat) return;
      if (settings.readingMode !== "double") return;
      setOffset(gallery, !settings.offset);
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
    if (settings.readingMode === "scroll") {
      const next = Math.min(
        Math.max(place2 + direction, 0),
        gallery.pages.length - 1
      );
      if (next === place2) return false;
      place2 = next;
      scrollTo = next;
      sync(lightbox);
      return true;
    }
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
    const images = Array.from(
      container.querySelectorAll("." + CLASS_PAGE)
    ).flatMap((box) => Array.from(box.querySelectorAll("img")));
    if (!images.length) return 0;
    for (const image of images) {
      if (!image.offsetWidth) return 0;
    }
    let left = Number.POSITIVE_INFINITY;
    let right = 0;
    for (const image of images) {
      left = Math.min(left, image.offsetLeft);
      right = Math.max(right, image.offsetLeft + image.offsetWidth);
    }
    return right > left ? right - left : 0;
  }
  function seekTo(lightbox, at) {
    const gallery = current();
    if (!gallery) return;
    place2 = Math.min(Math.max(at, 0), gallery.pages.length - 1);
    if (settings.readingMode === "scroll") scrollTo = place2;
    sync(lightbox);
  }
  function navIcon(button2) {
    var _a3;
    for (const child of Array.from(button2.children)) {
      const name = (_a3 = child.dataset) == null ? void 0 : _a3.icon;
      if (name) return name;
    }
    return "";
  }
  function navDirection(target2) {
    var _a3;
    let el = target2;
    while (el && !((_a3 = el.classList) == null ? void 0 : _a3.contains(CLASS_NAVBUTTON))) el = el.parentElement;
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
  function isOnPage(event) {
    var _a3;
    return ((_a3 = event.target) == null ? void 0 : _a3.tagName) === "IMG";
  }
  function onSpreadClick(event) {
    const lightbox = root;
    if (!lightbox || !container) return;
    if (held) {
      held = false;
      return;
    }
    if (settings.readingMode === "scroll" && isOnPage(event)) return;
    if (!isOnPage(event)) {
      if (inFullscreen(lightbox)) {
        event.stopPropagation();
        return;
      }
      event.stopPropagation();
      pressEscape();
      return;
    }
    const click = event;
    const width = event.target.offsetWidth;
    const forward = !width || click.offsetX >= width / 2;
    if (turnBy(lightbox, forward ? 1 : -1)) event.stopPropagation();
  }
  var WHEEL_TURN = 100;
  var WHEEL_REST_MS = 250;
  NR.WHEEL_TURN = WHEEL_TURN;
  NR.WHEEL_REST_MS = WHEEL_REST_MS;
  NR.wheelGesture = wheelGesture;
  NR.wheelDelta = wheelDelta;
  NR.wheelEffect = wheelEffect;
  var wheelRun = 0;
  var wheelRest = null;
  function actionOf(gesture) {
    return settings.wheel[gesture];
  }
  function onSpreadWheel(event) {
    const lightbox = root;
    if (!lightbox || !container) return;
    const wheel = event;
    const scrolling = settings.readingMode === "scroll";
    const gesture = wheelGesture(wheel);
    const effect = wheelEffect(actionOf(gesture), scrolling);
    const delta = wheelDelta(wheel);
    if (effect === "scroll") return;
    wheel.preventDefault();
    if (effect === "none") return;
    if (effect === "zoom" && scrolling) {
      const was = columnZoom();
      const next = zoomedBy(was, delta < 0 ? VIEW_STEP : 1 / VIEW_STEP);
      if (next === was) return;
      const wasAt = container ? { top: container.scrollTop || 0, left: container.scrollLeft || 0 } : null;
      refitColumn(next);
      if (container && wasAt) {
        container.scrollTop = wasAt.top * (next / was);
        container.scrollLeft = wasAt.left * (next / was);
      }
      sync(lightbox);
      return;
    }
    if (effect === "zoom") {
      view = zoomed(view, delta < 0 ? VIEW_STEP : 1 / VIEW_STEP);
      applyView();
      redrawChrome();
      return;
    }
    if (effect === "pan") {
      view = panned(view, 0, delta < 0 ? -VIEW_PAN_STEP : VIEW_PAN_STEP);
      applyView();
      redrawChrome();
      return;
    }
    wheelRun += delta;
    if (wheelRest !== null) window.clearTimeout(wheelRest);
    wheelRest = window.setTimeout(() => {
      wheelRest = null;
      wheelRun = 0;
    }, WHEEL_REST_MS);
    while (Math.abs(wheelRun) >= WHEEL_TURN) {
      const forward = wheelRun > 0;
      wheelRun -= forward ? WHEEL_TURN : -WHEEL_TURN;
      if (!turnBy(lightbox, forward ? 1 : -1)) {
        wheelRun = 0;
        break;
      }
    }
  }
  function onSpreadPress(event) {
    const press = event;
    if (press.button !== 0) return;
    if (!isOnPage(event)) {
      pressed2 = null;
      dragFrom = null;
      held = false;
      return;
    }
    if (settings.readingMode === "scroll") {
      if (!container) return;
      dragFrom = {
        x: press.clientX,
        y: press.clientY,
        left: container.scrollLeft || 0,
        top: container.scrollTop || 0,
        at: press.timeStamp
      };
      held = false;
      press.preventDefault();
      document.addEventListener("mousemove", onSpreadMove);
      document.addEventListener("mouseup", onSpreadRelease);
      return;
    }
    pressed2 = { x: press.clientX, y: press.clientY, at: press.timeStamp };
    held = false;
    document.addEventListener("mousemove", onSpreadMove);
    document.addEventListener("mouseup", onSpreadRelease);
  }
  var dragFrom = null;
  var pressed2 = null;
  var held = false;
  function onSpreadMove(event) {
    if (!container) return;
    if (dragFrom) {
      const drag = event;
      container.scrollLeft = dragFrom.left - (drag.clientX - dragFrom.x);
      container.scrollTop = dragFrom.top - (drag.clientY - dragFrom.y);
      held = true;
      return;
    }
    if (!pressed2) return;
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
    const from = dragFrom || pressed2;
    if (from && release.timeStamp - from.at > VIEW_CLICK_MS) held = true;
    dragFrom = null;
    pressed2 = null;
  }
  function applyView() {
    if (!container) return;
    if (settings.readingMode !== "scroll") {
      container.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`;
    }
    container.classList.toggle(CLASS_ZOOMED, zoomedNow());
  }
  function zoomedNow() {
    if (settings.readingMode === "scroll") return columnZoom() !== 1;
    return isZoomed(view);
  }
  function redrawChrome() {
    if (root) sync(root);
  }
  function setOffset(gallery, next) {
    settings = writeSettings({ offset: next });
    gallery.screens = laidOut(gallery.pages);
    gallery.pairedWith = pairingKey();
    shownAt = -1;
    step();
  }
  var seenPath = null;
  function onLocation(event) {
    var _a3, _b3, _c;
    const path = (_c = (_b3 = (_a3 = event == null ? void 0 : event.detail) == null ? void 0 : _a3.data) == null ? void 0 : _b3.location) == null ? void 0 : _c.pathname;
    if (typeof path !== "string") return;
    const moved = seenPath !== null && path !== seenPath;
    seenPath = path;
    if (moved && root) pressEscape();
  }
  function install() {
    var _a3, _b3, _c;
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
    document.addEventListener("click", noteClickedCard, true);
    document.addEventListener("pointerdown", prefetchImage, true);
    document.addEventListener("fullscreenchange", measureAgain);
    window.addEventListener("resize", measureAgain);
    const api = requirePluginApi();
    if ((_a3 = api.Event) == null ? void 0 : _a3.addEventListener) {
      api.Event.addEventListener("stash:location", onLocation);
    }
    installBridge();
    NS.watchStore(() => step());
    (_c = (_b3 = NS).watchReaderSettings) == null ? void 0 : _c.call(_b3, () => {
      if (NS.readerSettingsRaw === null) return;
      settings = readSettings();
      if (!NS.readerTakeover) {
        if (root) deactivate();
        return;
      }
      if (root) sync(root);
    });
    step();
  }

  // src/tools/core.ts
  var PluginApi = requirePluginApi();
  var React = PluginApi.React;
  var FIELD_NAME = NS.FIELD_NAME;
  var CENSORSHIP_FIELD_NAME = NS.CENSORSHIP_FIELD_NAME;
  var MANGA_FIELD_NAME = NS.MANGA_FIELD_NAME;
  var TRANSLATION_GROUP_FIELD_NAME = NS.TRANSLATION_GROUP_FIELD_NAME;
  var ORIGINAL_FIELD_NAME = NS.ORIGINAL_FIELD_NAME;
  var CHAPTER_FIELD_NAME = NS.CHAPTER_FIELD_NAME;
  var PLUGIN_ID = "mangaTools";
  var REFRESH_MS = 6e4;
  var store = null;
  var listeners2 = /* @__PURE__ */ new Set();
  var inFlight = null;
  var started = false;
  var lastLoggedSize = -1;
  var locationListener = false;
  var currentPath = window.location.pathname || "";
  function pathNow() {
    return window.location.pathname || "";
  }
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
    const state = React.useState(0);
    const version = state[0];
    const setVersion = state[1];
    React.useEffect(
      () => subscribe(() => {
        setVersion((v) => v + 1);
      }),
      []
    );
    return version;
  }
  function isGalleryContext() {
    return pathNow().split("/").indexOf("galleries") !== -1;
  }
  function currentGalleryId() {
    const m = /^\/galleries\/(\d+)(?:\/|$)/.exec(pathNow());
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
      return PluginApi.utils.StashService.getClient();
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
  var FEATURE_ON_BY_DEFAULT = true;
  NS.readerTakeover = FEATURE_ON_BY_DEFAULT;
  NS.manageChapters = FEATURE_ON_BY_DEFAULT;
  NS.fields = FEATURE_ON_BY_DEFAULT;
  NS.fieldLanguage = FEATURE_ON_BY_DEFAULT;
  NS.fieldCensorship = FEATURE_ON_BY_DEFAULT;
  NS.fieldTranslationGroup = FEATURE_ON_BY_DEFAULT;
  NS.fieldOriginal = FEATURE_ON_BY_DEFAULT;
  NS.coverIcon = FEATURE_ON_BY_DEFAULT;
  NS.confirmUnmark = FEATURE_ON_BY_DEFAULT;
  NS.deleteOnUnmark = FEATURE_ON_BY_DEFAULT;
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
      var _a3;
      const data = res == null ? void 0 : res.data;
      const plugins = (_a3 = data == null ? void 0 : data.configuration) == null ? void 0 : _a3.plugins;
      const pluginCfg = plugins == null ? void 0 : plugins[PLUGIN_ID];
      NS.enabledLanguages = NS.parseEnabledLanguages(
        pluginCfg ? pluginCfg.enabledLanguages : null
      );
      NS.sidebarFilters = NS.parseSidebarFilters(
        pluginCfg ? pluginCfg.sidebarFilters : null
      );
      NS.readerTakeover = NS.parseFlag(
        pluginCfg ? pluginCfg.readerTakeover : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.manageChapters = NS.parseFlag(
        pluginCfg ? pluginCfg.manageChapters : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.fields = NS.parseFlag(
        pluginCfg ? pluginCfg.fields : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.fieldLanguage = NS.parseFlag(
        pluginCfg ? pluginCfg.fieldLanguage : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.fieldCensorship = NS.parseFlag(
        pluginCfg ? pluginCfg.fieldCensorship : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.fieldTranslationGroup = NS.parseFlag(
        pluginCfg ? pluginCfg.fieldTranslationGroup : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.fieldOriginal = NS.parseFlag(
        pluginCfg ? pluginCfg.fieldOriginal : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.coverIcon = NS.parseFlag(
        pluginCfg ? pluginCfg.coverIcon : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.confirmUnmark = NS.parseFlag(
        pluginCfg ? pluginCfg.confirmUnmark : null,
        FEATURE_ON_BY_DEFAULT
      );
      NS.deleteOnUnmark = NS.parseFlag(
        pluginCfg ? pluginCfg.deleteOnUnmark : null,
        FEATURE_ON_BY_DEFAULT
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
      NS.showDisabledFields = NS.parseFlag(
        pluginCfg ? pluginCfg.showDisabledFields : null,
        SHOW_DISABLED_FIELDS_BY_DEFAULT
      );
      NS.readerSettingsRaw = pluginCfg && typeof pluginCfg.readerSettings === "string" && pluginCfg.readerSettings ? pluginCfg.readerSettings : null;
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
    var _a3;
    if (started) return;
    started = true;
    assetBase = ownBaseUrl();
    if (!assetBase) {
      console.error(
        "[mangaTools] could not tell where my own files are served from, so the switch's icon falls back to the stylesheet's own relative URL. Scripts and stylesheets on this page: " + pageAssetUrls().join(", ")
      );
    }
    if ((_a3 = PluginApi.Event) == null ? void 0 : _a3.addEventListener) {
      locationListener = true;
      PluginApi.Event.addEventListener("stash:location", (e) => {
        var _a4, _b3;
        const ev = e;
        const loc = (_b3 = (_a4 = ev == null ? void 0 : ev.detail) == null ? void 0 : _a4.data) == null ? void 0 : _b3.location;
        currentPath = (loc == null ? void 0 : loc.pathname) || window.location.pathname || "";
        refresh();
        refreshSettings();
        emit();
      });
    } else {
      console.error(
        "[mangaTools] Stash has no stash:location event, so the plugin will not hear about navigation on its own; rows it gates on the route may only appear once something else redraws. MangaTools.diag() reports this."
      );
    }
    refresh();
    refreshSettings();
    window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);
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
  NS.translationGroups = () => knownTranslationGroups();
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
    var _a3;
    return (_a3 = store == null ? void 0 : store.has(String(galleryId2))) != null ? _a3 : false;
  }
  NS.markedInStore = (galleryId2) => store === null || !galleryId2 ? null : storedIsManga(galleryId2);
  NS.watchStore = (fn) => subscribe(fn);
  function settingsInput() {
    var _a3;
    return {
      enabledLanguages: NS.enabledLanguages ? NS.serializeEnabledLanguages(NS.enabledLanguages) : "",
      // An empty list serialises to "", which parses back as null ("every filter whose
      // field is on") — the same round trip enabledLanguages makes, with the opposite
      // default at the end of it: absence there means "no restriction", here it means
      // "all of them", and both are what an install that predates the setting did.
      sidebarFilters: NS.serializeSidebarFilters(
        NS.sidebarFilters || NS.SIDEBAR_FILTERS
      ),
      readerTakeover: NS.readerTakeover,
      manageChapters: NS.manageChapters,
      fields: NS.fields,
      fieldLanguage: NS.fieldLanguage,
      fieldCensorship: NS.fieldCensorship,
      fieldTranslationGroup: NS.fieldTranslationGroup,
      fieldOriginal: NS.fieldOriginal,
      coverIcon: NS.coverIcon,
      confirmUnmark: NS.confirmUnmark,
      deleteOnUnmark: NS.deleteOnUnmark,
      showFlags: NS.showFlags,
      showCoverBadge: NS.showCoverBadge,
      openDetailsBlock: NS.openDetailsBlock,
      openEditBlock: NS.openEditBlock,
      hidePerformers: NS.hidePerformers,
      showDisabledFields: NS.showDisabledFields,
      // Absent reads as a library that has never been written to, which is what puts the
      // browser's own remembered value back in force — see readSettings in the reader.
      readerSettings: (_a3 = NS.readerSettingsRaw) != null ? _a3 : ""
    };
  }
  function saveSettings() {
    const client = stashClient();
    if (!client) {
      console.error("[mangaTools] no Apollo client, the settings were not saved");
      return;
    }
    client.mutate({
      mutation: gqlDoc(
        [
          "mutation MangaToolsSettings($plugin_id: ID!, $input: Map!) {",
          "  configurePlugin(plugin_id: $plugin_id, input: $input)",
          "}"
        ].join("\n"),
        "write settings"
      ),
      variables: { plugin_id: PLUGIN_ID, input: settingsInput() }
    }).catch((e) => {
      console.error("[mangaTools] failed to save plugin settings:", e);
    });
  }
  NS.writeReaderSettings = (raw) => {
    if (NS.readerSettingsRaw === raw) return;
    NS.readerSettingsRaw = raw;
    saveSettings();
  };
  NS.watchReaderSettings = (fn) => subscribe(fn);
  NS.readerSettingsRaw = null;
  var DETAILS_OPEN_BY_DEFAULT = false;
  var EDIT_OPEN_BY_DEFAULT = true;
  var HIDE_PERFORMERS_BY_DEFAULT = true;
  NS.openDetailsBlock = DETAILS_OPEN_BY_DEFAULT;
  var SHOW_DISABLED_FIELDS_BY_DEFAULT = false;
  NS.openEditBlock = EDIT_OPEN_BY_DEFAULT;
  NS.hidePerformers = HIDE_PERFORMERS_BY_DEFAULT;

  // src/tools/hosts.ts
  var PluginApi2 = requirePluginApi();
  var React2 = PluginApi2.React;
  function useAfterMount() {
    const bump = React2.useState(0)[1];
    React2.useLayoutEffect(() => {
      bump(1);
    }, []);
  }
  var EDIT_ANCHOR = '.form-group[data-field="studio_id"]';
  var BULK_ANCHOR = '[data-field="studio"]';
  var BULK_DIALOG_MARK = '[data-field="rating"]';
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
  var TOOLBAR_HOST_CLASS = "manga-tools-toolbar-host";
  var _a, _b;
  var CAN_WRITE = typeof ((_b = (_a = PluginApi2.utils) == null ? void 0 : _a.StashService) == null ? void 0 : _b.getClient) === "function";
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
  var FIELD_HOST_CLASS = "manga-tools-field-host";
  function bulkAnchor() {
    var _a3;
    const form2 = (_a3 = document.querySelector(BULK_DIALOG_MARK)) == null ? void 0 : _a3.closest("form");
    return form2 ? form2.querySelector(BULK_ANCHOR) : null;
  }
  function bulkDialogUp() {
    return !!document.querySelector(BULK_DIALOG_MARK);
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

  // src/tools/censorship.tsx
  var PluginApi3 = requirePluginApi();
  var React3 = PluginApi3.React;
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
    const Solid = PluginApi3.libraries.FontAwesomeSolid || {};
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
    const Icon = PluginApi3.components.Icon;
    const icon = NS.censorshipIcon(props.value);
    return icon ? /* @__PURE__ */ React3.createElement(Icon, { icon }) : null;
  }
  function formatCensorshipOption(option) {
    return /* @__PURE__ */ React3.createElement("span", { className: "manga-tools-option" }, /* @__PURE__ */ React3.createElement(CensorshipIcon, { value: option.value }), option.label);
  }

  // src/tools/fields-ui.tsx
  var PluginApi4 = requirePluginApi();
  var React4 = PluginApi4.React;
  function Flag(props) {
    return /* @__PURE__ */ React4.createElement(
      "span",
      {
        className: "fi fi-" + props.flag + (props.className ? " " + props.className : "")
      }
    );
  }
  function noLanguageMark(code, className) {
    if (!NS.showFlags || !NS.isNoLanguage(code)) return null;
    const Solid = PluginApi4.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi4.components.Icon;
    if (!Icon) return null;
    return /* @__PURE__ */ React4.createElement(
      Icon,
      {
        icon: Solid.faCommentSlash,
        className: "fa-fw manga-tools-language-mark" + (className ? " " + className : "")
      }
    );
  }
  function languageChip(info, className) {
    const extra = className ? " " + className : "";
    if (!info.known) {
      return /* @__PURE__ */ React4.createElement("div", { className: "manga-tools-badge is-unknown" + extra }, info.name);
    }
    if (!NS.showFlags) {
      return /* @__PURE__ */ React4.createElement("div", { className: "manga-tools-badge is-name" + extra }, info.name);
    }
    if (!info.flag) {
      return /* @__PURE__ */ React4.createElement("div", { className: "manga-tools-badge" + extra, "aria-label": info.name }, noLanguageMark(info.code));
    }
    return /* @__PURE__ */ React4.createElement("div", { className: "manga-tools-badge" + extra, "aria-label": info.name }, /* @__PURE__ */ React4.createElement(Flag, { flag: info.flag }));
  }
  var SELECT = null;
  function resolveSelect() {
    if (SELECT) return SELECT;
    const RS = PluginApi4.libraries.ReactSelect;
    if (!RS) {
      console.error("[mangaTools] react-select not available");
      return null;
    }
    SELECT = RS.default || RS.Select || RS;
    return SELECT;
  }
  function formatLanguageOption(option) {
    return /* @__PURE__ */ React4.createElement("span", { className: "manga-tools-option" }, NS.showFlags && option.flag ? /* @__PURE__ */ React4.createElement(Flag, { flag: option.flag, className: "manga-tools-flag" }) : noLanguageMark(option.value, "manga-tools-flag"), /* @__PURE__ */ React4.createElement("span", null, option.label));
  }
  function formatGroupOption(option, meta) {
    if ((meta == null ? void 0 : meta.context) !== "menu") return option.label;
    const hint = option.hint ? NS.showFlags && option.hint.flag ? /* @__PURE__ */ React4.createElement(
      Flag,
      {
        flag: option.hint.flag,
        className: "manga-tools-flag manga-tools-hint"
      }
    ) : /* @__PURE__ */ React4.createElement("span", { className: "manga-tools-hint-text" }, option.hint.name) : null;
    if (!option.createLabel) {
      if (!hint) return option.label;
      return /* @__PURE__ */ React4.createElement("span", { className: "manga-tools-group-option" }, /* @__PURE__ */ React4.createElement("span", null, option.label), hint);
    }
    return /* @__PURE__ */ React4.createElement("span", { className: "manga-tools-option" }, option.createLabel);
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

  // src/tools/filter-model.ts
  var CUSTOM_FIELDS_TYPE = "custom_fields";
  var LANGUAGE_TYPE = "language";
  var EMPTY_SELECTION = {
    modifier: "",
    included: [],
    excluded: []
  };
  var VALUED_FIELDS = {
    language: {
      key: NS.FIELD_NAME,
      // Stash's own word for it, out of its locale files — see fieldLabel
      heading: fieldLabel,
      valueName: (intl, code) => NS.name(code, intl.locale)
    },
    censorship: {
      key: NS.CENSORSHIP_FIELD_NAME,
      heading: censorshipHeading,
      valueName: NS.censorshipLabel
    },
    translationGroup: {
      key: NS.TRANSLATION_GROUP_FIELD_NAME,
      heading: translationGroupHeading,
      valueName: (_intl, value) => value
    }
  };
  var PRESENCE_FIELDS = {
    manga: {
      key: NS.MANGA_FIELD_NAME,
      // The mark's own name rather than the verb: "Manga is Marked" is the
      // sentence a reader filtering a shelf is looking for.
      heading: (intl) => t(intl, "mangaTools.manga.marked"),
      on: (intl) => t(intl, "mangaTools.filter.manga.marked"),
      off: (intl) => t(intl, "mangaTools.filter.manga.unmarked")
    },
    original: {
      key: NS.ORIGINAL_FIELD_NAME,
      // Not the field's own name — see originalHeading, which says why
      heading: originalHeading,
      on: (intl) => t(intl, "mangaTools.filter.original.raw"),
      off: (intl) => t(intl, "mangaTools.filter.original.cooked")
    }
  };
  function valuedFieldOf(key) {
    for (const name in VALUED_FIELDS) {
      if (VALUED_FIELDS[name].key === key) return VALUED_FIELDS[name];
    }
    return null;
  }
  function presenceFieldOf(key) {
    for (const name in PRESENCE_FIELDS) {
      if (PRESENCE_FIELDS[name].key === key) return PRESENCE_FIELDS[name];
    }
    return null;
  }
  function registerLanguageCriterionOption(filter) {
    var _a3;
    const options = (_a3 = filter == null ? void 0 : filter.options) == null ? void 0 : _a3.criterionOptions;
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
    var _a3;
    const criteria = (filter == null ? void 0 : filter.criteria) || [];
    for (let i = 0; i < criteria.length; i++) {
      const option = (_a3 = criteria[i]) == null ? void 0 : _a3.criterionOption;
      if (!option) continue;
      if (option.type === CUSTOM_FIELDS_TYPE || option.type === LANGUAGE_TYPE) {
        return criteria[i];
      }
    }
    return null;
  }
  function isConditionOf(key, condition) {
    return !!condition && NS.ownField(condition.field) === key;
  }
  function conditionValues(condition) {
    const values = condition.value || [];
    return values.map((v) => String(v));
  }
  function isLanguageCriterion(criterion) {
    const conditions = (criterion == null ? void 0 : criterion.value) || [];
    if (!conditions.length) return false;
    for (let i = 0; i < conditions.length; i++) {
      if (!isConditionOf(NS.FIELD_NAME, conditions[i])) return false;
    }
    return true;
  }
  function languageCriterionOf(filter) {
    const criterion = customFieldsCriterion(filter);
    return criterion && isLanguageCriterion(criterion) ? criterion : null;
  }
  function adoptLanguageCriterion(filter) {
    var _a3;
    const criterion = languageCriterionOf(filter);
    if (!criterion) return;
    if (criterion.criterionOption && criterion.criterionOption.type === LANGUAGE_TYPE) {
      return;
    }
    const options = ((_a3 = filter.options) == null ? void 0 : _a3.criterionOptions) || [];
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
  function readValued(filter, key) {
    const criterion = customFieldsCriterion(filter);
    if (!(criterion == null ? void 0 : criterion.value)) return EMPTY_SELECTION;
    const selection = {
      modifier: "",
      included: [],
      excluded: []
    };
    criterion.value.forEach((condition) => {
      if (!isConditionOf(key, condition)) return;
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
  function readPresence(filter, key) {
    const criterion = customFieldsCriterion(filter);
    if (!(criterion == null ? void 0 : criterion.value)) return "";
    let state = "";
    criterion.value.forEach((condition) => {
      if (!isConditionOf(key, condition)) return;
      if (condition.modifier === "NOT_NULL") state = "marked";
      else if (condition.modifier === "IS_NULL") state = "unmarked";
    });
    return state;
  }
  function readLanguageFilter(filter) {
    return readValued(filter, NS.FIELD_NAME);
  }
  function readCensorshipFilter(filter) {
    return readValued(filter, NS.CENSORSHIP_FIELD_NAME);
  }
  function readGroupFilter(filter) {
    return readValued(filter, NS.TRANSLATION_GROUP_FIELD_NAME);
  }
  function readMangaFilter(filter) {
    return readPresence(filter, NS.MANGA_FIELD_NAME);
  }
  function readOriginalFilter(filter) {
    return readPresence(filter, NS.ORIGINAL_FIELD_NAME);
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
  function valuedConditionLabel(intl, condition, field2) {
    const word = modifierWord(intl, condition.modifier);
    if (word === null) return null;
    return intl.formatMessage(
      { id: "criterion_modifier.format_string" },
      {
        criterion: field2.heading(intl),
        modifierString: word,
        valueString: conditionValues(condition).map((value) => field2.valueName(intl, value)).join(", ")
      }
    );
  }
  function presenceConditionLabel(intl, condition, field2) {
    const state = condition.modifier === "NOT_NULL" ? field2.on(intl) : condition.modifier === "IS_NULL" ? field2.off(intl) : null;
    if (state === null) return null;
    return intl.formatMessage(
      { id: "criterion_modifier.format_string" },
      {
        criterion: field2.heading(intl),
        modifierString: message(intl, "criterion_modifier.equals", "is"),
        valueString: state
      }
    );
  }
  function conditionLabel(intl, condition) {
    const key = NS.ownField(condition.field);
    const valued = valuedFieldOf(key);
    if (valued) return valuedConditionLabel(intl, condition, valued);
    const presence = presenceFieldOf(key);
    if (presence) return presenceConditionLabel(intl, condition, presence);
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
  function valuedConditions(key, selection) {
    if (selection.modifier === "any") {
      return [{ field: key, modifier: "NOT_NULL" }];
    }
    if (selection.modifier === "none") {
      return [{ field: key, modifier: "IS_NULL" }];
    }
    const conditions = [];
    if (selection.included.length) {
      conditions.push({
        field: key,
        modifier: "EQUALS",
        value: selection.included.slice()
      });
    }
    if (selection.excluded.length) {
      conditions.push({
        field: key,
        modifier: "NOT_EQUALS",
        value: selection.excluded.slice()
      });
    }
    return conditions;
  }
  function presenceConditions(key, state) {
    if (state === "marked") return [{ field: key, modifier: "NOT_NULL" }];
    if (state === "unmarked") return [{ field: key, modifier: "IS_NULL" }];
    return [];
  }
  function selectionConditions(selection) {
    return valuedConditions(NS.FIELD_NAME, selection);
  }
  function queryFor(filter, key, conditions, adopt) {
    var _a3;
    if (!filter || typeof filter.clone !== "function") return null;
    const options = ((_a3 = filter.options) == null ? void 0 : _a3.criterionOptions) || [];
    let option = null;
    for (let i = 0; i < options.length; i++) {
      if (options[i].type === CUSTOM_FIELDS_TYPE) option = options[i];
      if (adopt && options[i].type === LANGUAGE_TYPE) option = options[i];
    }
    if (!option) return null;
    const criterionOption = option;
    const next = filter.clone();
    let criterion = customFieldsCriterion(next);
    const kept = [];
    if (criterion == null ? void 0 : criterion.value) {
      for (let j = 0; j < criterion.value.length; j++) {
        if (!isConditionOf(key, criterion.value[j]))
          kept.push(criterion.value[j]);
      }
    }
    const all = kept.concat(conditions);
    if (!all.length) {
      next.criteria = (next.criteria || []).filter((c) => c !== criterion);
    } else {
      if (!criterion) {
        criterion = criterionOption.makeCriterion();
        next.criteria = (next.criteria || []).concat([criterion]);
      }
      criterion.value = all;
    }
    return next.makeQueryParameters();
  }
  function applyQuery(history, search, what) {
    if (search === null) {
      console.error(
        "[mangaTools] this list has no custom-fields filter, so the " + what + " filter is unavailable"
      );
      return;
    }
    history.replace(Object.assign({}, history.location, { search }));
  }
  function languageFilterQuery(filter, selection) {
    return queryFor(
      filter,
      NS.FIELD_NAME,
      valuedConditions(NS.FIELD_NAME, selection),
      true
    );
  }
  function applyLanguage(filter, history, selection) {
    applyQuery(history, languageFilterQuery(filter, selection), "language");
  }
  function censorshipFilterQuery(filter, selection) {
    return queryFor(
      filter,
      NS.CENSORSHIP_FIELD_NAME,
      valuedConditions(NS.CENSORSHIP_FIELD_NAME, selection),
      false
    );
  }
  function applyCensorship(filter, history, selection) {
    applyQuery(history, censorshipFilterQuery(filter, selection), "censorship");
  }
  function groupFilterQuery(filter, selection) {
    return queryFor(
      filter,
      NS.TRANSLATION_GROUP_FIELD_NAME,
      valuedConditions(NS.TRANSLATION_GROUP_FIELD_NAME, selection),
      false
    );
  }
  function applyGroup(filter, history, selection) {
    applyQuery(history, groupFilterQuery(filter, selection), "translation group");
  }
  function mangaFilterQuery(filter, state) {
    return queryFor(
      filter,
      NS.MANGA_FIELD_NAME,
      presenceConditions(NS.MANGA_FIELD_NAME, state),
      false
    );
  }
  function applyManga(filter, history, state) {
    applyQuery(history, mangaFilterQuery(filter, state), "manga");
  }
  function originalFilterQuery(filter, state) {
    return queryFor(
      filter,
      NS.ORIGINAL_FIELD_NAME,
      presenceConditions(NS.ORIGINAL_FIELD_NAME, state),
      false
    );
  }
  function applyOriginal(filter, history, state) {
    applyQuery(history, originalFilterQuery(filter, state), "raw");
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
  function translationGroupHeading(intl) {
    return t(intl, "mangaTools.translationGroup.heading");
  }
  function originalHeading(intl) {
    return t(intl, "mangaTools.filter.original.heading");
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
  NS.readGroupFilter = readGroupFilter;
  NS.groupFilterQuery = groupFilterQuery;
  NS.readOriginalFilter = readOriginalFilter;
  NS.originalFilterQuery = originalFilterQuery;
  NS.registerLanguageCriterionOption = registerLanguageCriterionOption;
  NS.adoptLanguageCriterion = adoptLanguageCriterion;

  // src/tools/icons.tsx
  var PluginApi5 = requirePluginApi();
  var React5 = PluginApi5.React;
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

  // src/tools/patches.ts
  var PluginApi6 = requirePluginApi();
  function registerPatch(kind, target2, fn) {
    try {
      PluginApi6.patch[kind](target2, fn);
    } catch (e) {
      console.error(
        "[mangaTools] could not register the " + target2 + " patch:",
        e
      );
    }
  }
  var firedOnce = {};
  var notedOnce = {};
  function noteFired(target2) {
    if (firedOnce[target2]) return;
    firedOnce[target2] = true;
    console.info("[mangaTools] patch active: " + target2);
  }
  function noteOnce(key, message2) {
    if (notedOnce[key]) return;
    notedOnce[key] = true;
    console.warn("[mangaTools] " + message2);
  }

  // src/tools/bulk.tsx
  var PluginApi7 = requirePluginApi();
  var React6 = PluginApi7.React;
  var bulkLanguage = null;
  var bulkCensorship = null;
  var bulkGroup = null;
  var bulkManga = null;
  var bulkOriginal = null;
  var bulkGroupBeforeRaw = null;
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
    var _a3, _b3;
    if (!selectedGalleryIds.length) return null;
    const first = pickLanguage((_a3 = store) == null ? void 0 : _a3.get(selectedGalleryIds[0]));
    for (let i = 1; i < selectedGalleryIds.length; i++) {
      if (pickLanguage((_b3 = store) == null ? void 0 : _b3.get(selectedGalleryIds[i])) !== first) return null;
    }
    return first || null;
  }
  function selectedCensorshipAggregate() {
    var _a3, _b3;
    if (!selectedGalleryIds.length) return null;
    const first = censorshipOf((_a3 = store) == null ? void 0 : _a3.get(selectedGalleryIds[0]));
    for (let i = 1; i < selectedGalleryIds.length; i++) {
      if (censorshipOf((_b3 = store) == null ? void 0 : _b3.get(selectedGalleryIds[i])) !== first) return null;
    }
    return first || null;
  }
  function selectedGroupAggregate() {
    var _a3, _b3;
    if (!selectedGalleryIds.length) return null;
    const first = NS.translationGroupOf((_a3 = store) == null ? void 0 : _a3.get(selectedGalleryIds[0]));
    for (let i = 1; i < selectedGalleryIds.length; i++) {
      const name = NS.translationGroupOf((_b3 = store) == null ? void 0 : _b3.get(selectedGalleryIds[i]));
      if (!NS.sameTranslationGroup(name, first)) return null;
    }
    return first || null;
  }
  function selectedOriginalAggregate() {
    var _a3;
    if (!selectedGalleryIds.length) return "none";
    let anyRaw = false;
    let anyOther = false;
    for (let i = 0; i < selectedGalleryIds.length; i++) {
      if (NS.isOriginal((_a3 = store) == null ? void 0 : _a3.get(selectedGalleryIds[i]))) anyRaw = true;
      else anyOther = true;
      if (anyRaw && anyOther) return "mixed";
    }
    return anyRaw ? "all" : "none";
  }
  function selectedMangaAggregate() {
    var _a3;
    if (!selectedGalleryIds.length) return "none";
    let anyManga = false;
    let anyOther = false;
    for (let i = 0; i < selectedGalleryIds.length; i++) {
      if (NS.isManga((_a3 = store) == null ? void 0 : _a3.get(selectedGalleryIds[i]))) anyManga = true;
      else anyOther = true;
      if (anyManga && anyOther) return "mixed";
    }
    return anyManga ? "all" : "none";
  }
  var bulkLinkInstalled = false;
  function isGalleryBulkUpdate(query) {
    var _a3;
    const defs = query ? query.definitions : null;
    if (!(defs == null ? void 0 : defs.length)) return false;
    const op = defs[0];
    if ((op == null ? void 0 : op.kind) !== "OperationDefinition") return false;
    const selections = (_a3 = op.selectionSet) == null ? void 0 : _a3.selections;
    if (!(selections == null ? void 0 : selections.length)) return false;
    const first = selections[0];
    return !!((first == null ? void 0 : first.name) && first.name.value === "bulkGalleryUpdate");
  }
  function bulkUnmarkKeys() {
    var _a3;
    const keys = [];
    const seen = {};
    for (const id of selectedGalleryIds) {
      for (const key of NS.fieldsToClear((_a3 = store) == null ? void 0 : _a3.get(id))) {
        if (seen[key]) continue;
        seen[key] = true;
        keys.push(key);
      }
    }
    return keys.length ? keys : [MANGA_FIELD_NAME];
  }
  function applyPendingFields(operation) {
    const partial = {};
    const remove = [];
    if (bulkManga === "unmark") {
      remove.push(...bulkUnmarkKeys());
    } else {
      if (bulkManga === "mark") partial[MANGA_FIELD_NAME] = NS.MANGA_VALUE;
      if ((bulkLanguage == null ? void 0 : bulkLanguage.kind) === "set") partial[FIELD_NAME] = bulkLanguage.value;
      else if ((bulkLanguage == null ? void 0 : bulkLanguage.kind) === "remove") remove.push(FIELD_NAME);
      if ((bulkCensorship == null ? void 0 : bulkCensorship.kind) === "set")
        partial[CENSORSHIP_FIELD_NAME] = bulkCensorship.value;
      else if ((bulkCensorship == null ? void 0 : bulkCensorship.kind) === "remove")
        remove.push(CENSORSHIP_FIELD_NAME);
      if ((bulkGroup == null ? void 0 : bulkGroup.kind) === "set")
        partial[TRANSLATION_GROUP_FIELD_NAME] = bulkGroup.value;
      else if ((bulkGroup == null ? void 0 : bulkGroup.kind) === "remove")
        remove.push(TRANSLATION_GROUP_FIELD_NAME);
      if (bulkOriginal === "raw")
        partial[ORIGINAL_FIELD_NAME] = NS.ORIGINAL_VALUE;
      else if (bulkOriginal === "notRaw") remove.push(ORIGINAL_FIELD_NAME);
      if ((bulkLanguage == null ? void 0 : bulkLanguage.kind) === "set" && NS.isNoLanguage(bulkLanguage.value)) {
        partial[ORIGINAL_FIELD_NAME] = NS.ORIGINAL_VALUE;
        delete partial[TRANSLATION_GROUP_FIELD_NAME];
        [ORIGINAL_FIELD_NAME, TRANSLATION_GROUP_FIELD_NAME].forEach((name) => {
          const at = remove.indexOf(name);
          if (at !== -1) remove.splice(at, 1);
        });
        remove.push(TRANSLATION_GROUP_FIELD_NAME);
      }
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
    const Apollo = PluginApi7.libraries.Apollo;
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
    const intl = PluginApi7.libraries.Intl.useIntl();
    const Select = resolveSelect();
    const Solid = PluginApi7.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi7.components.Icon;
    const host = isGalleryContext() ? ensureBulkFieldHost() : null;
    const bump = React6.useState(0)[1];
    React6.useLayoutEffect(() => {
      if (!isGalleryContext()) return;
      installBulkLink();
      if (ensureBulkFieldHost() !== host) {
        bump((v) => v + 1);
      } else if (!host && bulkDialogUp()) {
        noteOnce(
          "bulk-no-host",
          "the bulk edit dialog's mount point could not be placed \u2014 " + BULK_ANCHOR + " was not found inside the dialog's own form. MangaTools.diag() reports what it sees."
        );
      }
    });
    React6.useEffect(
      () => () => {
        if (!bulkAnchor()) {
          bulkLanguage = null;
          bulkCensorship = null;
          bulkGroup = null;
          bulkOriginal = null;
          bulkGroupBeforeRaw = null;
          bulkManga = null;
        }
      },
      []
    );
    bulkRenders += 1;
    if (!isGalleryContext() || !Select || !host) {
      return null;
    }
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
    const mangaRow = /* @__PURE__ */ React6.createElement("div", { className: "form-group", "data-field": "manga_tools_manga" }, /* @__PURE__ */ React6.createElement("div", { className: "form-check" }, /* @__PURE__ */ React6.createElement(
      "input",
      {
        type: "checkbox",
        className: "form-check-input",
        id: "manga_tools_manga",
        ref: setIndeterminate,
        checked: tri === true,
        onChange: cycleManga
      }
    ), /* @__PURE__ */ React6.createElement("label", { className: "form-check-label", htmlFor: "manga_tools_manga" }, t(intl, "mangaTools.manga.isManga"))));
    const removeOption = {
      value: BULK_REMOVE_VALUE,
      label: t(intl, "mangaTools.bulk.remove"),
      flag: null
    };
    const banIcon = Solid.faBan || null;
    const removeLabel = /* @__PURE__ */ React6.createElement("span", { className: "manga-tools-option" }, banIcon ? /* @__PURE__ */ React6.createElement(Icon, { icon: banIcon }) : null, removeOption.label);
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
    const groupNow = (bulkGroup == null ? void 0 : bulkGroup.kind) === "set" ? bulkGroup.value : (bulkGroup == null ? void 0 : bulkGroup.kind) === "remove" ? "" : selectedGroupAggregate() || "";
    const usualForGroup = NS.usualLanguagesOf(store)[NS.groupKey(groupNow)];
    const offered = usualForGroup && (!NS.enabledLanguages || NS.enabledLanguages.has(usualForGroup.code)) && (!current2 || current2.code !== usualForGroup.code) ? usualForGroup : null;
    const offeredInfo = offered ? NS.describe(offered.code, intl.locale) : null;
    const wandIcon = Solid.faWandMagicSparkles || Solid.faMagic || Solid.faLanguage || null;
    const languageChip2 = offered && offeredInfo ? /* @__PURE__ */ React6.createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary manga-tools-chip",
        "aria-label": offeredInfo.name,
        title: t(intl, "mangaTools.translationGroup.fill") + " " + offeredInfo.name + " \u2014 " + t(intl, "mangaTools.translationGroup.suggestedLanguage") + " (" + offered.count + ")",
        onClick: () => {
          bulkLanguage = { kind: "set", value: offered.code };
          emit();
        }
      },
      wandIcon ? /* @__PURE__ */ React6.createElement(Icon, { icon: wandIcon }) : null
    ) : null;
    const languageRow = /* @__PURE__ */ React6.createElement("div", { className: cls.group, "data-field": "manga_tools_language" }, /* @__PURE__ */ React6.createElement("label", { className: cls.label, htmlFor: "manga_tools_language" }, fieldLabel(intl)), /* @__PURE__ */ React6.createElement(
      "div",
      {
        className: cls.control + (languageChip2 ? " manga-tools-chip-row" : "")
      },
      /* @__PURE__ */ React6.createElement(
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
      ),
      languageChip2
    ));
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
    const censorshipRow = /* @__PURE__ */ React6.createElement("div", { className: cls.group, "data-field": "manga_tools_censorship" }, /* @__PURE__ */ React6.createElement("label", { className: cls.label, htmlFor: "manga_tools_censorship" }, t(intl, "mangaTools.censorship.heading")), /* @__PURE__ */ React6.createElement("div", { className: cls.control }, /* @__PURE__ */ React6.createElement(
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
    const showOriginal = NS.fieldShowing("original");
    const groupShown = (bulkGroup == null ? void 0 : bulkGroup.kind) === "set" ? bulkGroup.value : (bulkGroup == null ? void 0 : bulkGroup.kind) === "remove" ? BULK_REMOVE_VALUE : selectedGroupAggregate() || "";
    const rawState = bulkOriginal === "raw" ? "raw" : bulkOriginal === "notRaw" ? "notRaw" : selectedOriginalAggregate() === "all" ? "raw" : selectedOriginalAggregate() === "none" ? "notRaw" : "mixed";
    const rawShown = showOriginal && rawState === "raw";
    const noLanguage = (bulkLanguage == null ? void 0 : bulkLanguage.kind) === "set" && NS.isNoLanguage(bulkLanguage.value);
    const restoresGroup = !!bulkGroupBeforeRaw && (bulkGroupBeforeRaw.pending ? bulkGroupBeforeRaw.pending.kind === "set" : !!selectedGroupAggregate());
    const cycleOriginal = () => {
      if (noLanguage) return;
      const aggregate2 = selectedOriginalAggregate();
      const next = aggregate2 === "all" ? bulkOriginal === "notRaw" ? null : "notRaw" : aggregate2 === "none" ? bulkOriginal === "raw" ? null : "raw" : bulkOriginal === null ? "raw" : bulkOriginal === "raw" ? "notRaw" : null;
      if (next === "raw") {
        bulkGroupBeforeRaw = { pending: bulkGroup };
        bulkGroup = { kind: "remove" };
      } else if (bulkGroupBeforeRaw) {
        bulkGroup = bulkGroupBeforeRaw.pending;
        bulkGroupBeforeRaw = null;
      }
      bulkOriginal = next;
      emit();
    };
    const groupValue = groupShown === BULK_REMOVE_VALUE ? "" : groupShown;
    const known = knownTranslationGroups();
    const namesANewGroup = !!groupValue && !known.some((name) => NS.sameTranslationGroup(name, groupValue));
    const agreedLanguage = (bulkLanguage == null ? void 0 : bulkLanguage.kind) === "set" ? bulkLanguage.value : (bulkLanguage == null ? void 0 : bulkLanguage.kind) === "remove" ? "" : selectedLanguageAggregate() || "";
    const usualLanguages = NS.usualLanguagesOf(store);
    const usualOf = (name) => usualLanguages[NS.groupKey(name)];
    const matchesAgreed = (name) => {
      const usualHere = usualOf(name);
      return !!agreedLanguage && !!usualHere && usualHere.code === agreedLanguage;
    };
    const ordered = known.filter(matchesAgreed).concat(known.filter((name) => !matchesAgreed(name)));
    const groupOptions = [
      ...namesANewGroup ? [
        {
          value: groupValue,
          label: groupValue,
          createLabel: t(intl, "mangaTools.translationGroup.create") + ' "' + groupValue + '"'
        }
      ] : [],
      ...ordered.map((name) => {
        const usualHere = usualOf(name);
        const described = usualHere ? NS.describe(usualHere.code, intl.locale) : null;
        return {
          value: name,
          label: name,
          hint: described ? { flag: described.flag, name: described.name } : null
        };
      })
    ];
    const groupRemoveOption = {
      value: BULK_REMOVE_VALUE,
      label: t(intl, "mangaTools.bulk.remove")
    };
    const formatGroupWithRemove = (opt, meta) => opt.value === BULK_REMOVE_VALUE ? removeLabel : formatGroupOption(opt, meta);
    const steakIcon = /* @__PURE__ */ React6.createElement(SteakIcon, { raw: rawState === "raw" });
    const originalChip = /* @__PURE__ */ React6.createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary manga-tools-chip manga-tools-original" + (rawState === "raw" ? " active" : "") + (rawState === "mixed" ? " mixed" : ""),
        "aria-pressed": noLanguage ? true : rawState === "mixed" ? "mixed" : rawState === "raw",
        "aria-label": t(intl, "mangaTools.translationGroup.original"),
        title: t(
          intl,
          noLanguage ? "mangaTools.translationGroup.originalNoLanguage" : rawState === "raw" ? restoresGroup ? "mangaTools.translationGroup.originalOffRestore" : "mangaTools.translationGroup.originalOff" : rawState === "mixed" ? "mangaTools.translationGroup.originalMixed" : "mangaTools.translationGroup.originalOn"
        ),
        disabled: noLanguage,
        onClick: cycleOriginal
      },
      steakIcon
    );
    const groupRow = /* @__PURE__ */ React6.createElement("div", { className: cls.group, "data-field": "manga_tools_translation_group" }, /* @__PURE__ */ React6.createElement("label", { className: cls.label, htmlFor: "manga_tools_translation_group" }, t(intl, "mangaTools.translationGroup.heading")), /* @__PURE__ */ React6.createElement(
      "div",
      {
        className: cls.control + (showOriginal ? " manga-tools-chip-row" : "")
      },
      /* @__PURE__ */ React6.createElement(
        Select,
        {
          className: "manga-tools-select manga-tools-group-select",
          classNamePrefix: "react-select",
          inputId: "manga_tools_translation_group",
          isClearable: true,
          isDisabled: rawShown || noLanguage,
          menuPortalTarget: document.body,
          placeholder: t(
            intl,
            noLanguage ? "mangaTools.translationGroup.noLanguageDetail" : rawShown ? "mangaTools.translationGroup.originalDetail" : "mangaTools.translationGroup.placeholder"
          ),
          value: groupShown === BULK_REMOVE_VALUE ? groupRemoveOption : groupValue ? { value: groupValue, label: groupValue } : null,
          options: [...groupOptions, groupRemoveOption],
          formatOptionLabel: formatGroupWithRemove,
          components: { IndicatorSeparator: () => null },
          onInputChange: (text2, meta) => {
            if ((meta == null ? void 0 : meta.action) !== "input-change") return;
            const typed = text2.trim();
            bulkGroup = typed ? { kind: "set", value: typed } : null;
            emit();
          },
          onChange: (opt) => {
            if (!opt) {
              bulkGroup = null;
            } else if (opt.value === BULK_REMOVE_VALUE) {
              bulkGroup = { kind: "remove" };
            } else {
              bulkGroup = { kind: "set", value: opt.value };
              if (showOriginal) bulkOriginal = "notRaw";
            }
            emit();
          }
        }
      ),
      showOriginal ? originalChip : null
    ));
    return PluginApi7.ReactDOM.createPortal(
      /* @__PURE__ */ React6.createElement(React6.Fragment, null, tri === false && aggregate !== "none" ? /* @__PURE__ */ React6.createElement("div", { className: "alert alert-warning", role: "alert" }, t(
        intl,
        NS.deleteOnUnmark ? "mangaTools.bulk.unmarkWarning" : "mangaTools.bulk.unmarkWarningKeep"
      )) : null, mangaRow, tri === true && NS.fieldShowing("language") ? languageRow : null, tri === true && NS.fieldShowing("censorship") ? censorshipRow : null, tri === true && NS.fieldShowing("translationGroup") ? groupRow : null),
      host
    );
  }
  var bulkRenders = 0;

  // src/tools/diag.ts
  var PluginApi8 = requirePluginApi();
  NS.diag = () => {
    var _a3;
    return {
      url: window.location.pathname || "",
      path: pathNow(),
      rememberedPath: currentPath,
      galleryContext: isGalleryContext(),
      galleryId: currentGalleryId(),
      started,
      locationListener,
      eventApi: !!((_a3 = PluginApi8.Event) == null ? void 0 : _a3.addEventListener),
      bulkRenders,
      bulkAnchor: !!bulkAnchor(),
      hosts: Object.keys(fieldHosts).map((key) => {
        var _a4;
        return [
          key,
          fieldHosts[key] ? ((_a4 = fieldHosts[key]) == null ? void 0 : _a4.parentNode) ? "attached" : "detached" : "none"
        ];
      })
    };
  };

  // src/tools/filter-ui.tsx
  var PluginApi9 = requirePluginApi();
  var React7 = PluginApi9.React;
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
  function languageMark(option) {
    const mark = noLanguageMark(option.value);
    return mark ? { leading: mark } : { flag: flagOf(option) };
  }
  function Flag2(props) {
    return /* @__PURE__ */ React7.createElement(
      "span",
      {
        className: "fi fi-" + props.flag + (props.className ? " " + props.className : "")
      }
    );
  }
  function LanguageRow(props) {
    const Solid = PluginApi9.libraries.FontAwesomeSolid || {};
    const Regular = PluginApi9.libraries.FontAwesomeRegular || {};
    const Icon = PluginApi9.components.Icon;
    const Bootstrap = PluginApi9.libraries.Bootstrap;
    const intl = PluginApi9.libraries.Intl.useIntl();
    const hover = React7.useState(false);
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
    return /* @__PURE__ */ React7.createElement(
      "li",
      {
        className: (selected ? "selected-object" : "unselected-object") + (props.modifier ? " modifier-object" : "")
      },
      /* @__PURE__ */ React7.createElement(
        "a",
        {
          tabIndex: 0,
          onClick: props.onClick,
          onMouseEnter: setHover(true),
          onMouseLeave: setHover(false),
          onFocus: setHover(true),
          onBlur: setHover(false)
        },
        /* @__PURE__ */ React7.createElement("div", { className: sidebar ? "label-group" : void 0 }, /* @__PURE__ */ React7.createElement(
          Icon,
          {
            className: "fa-fw " + (excluded ? "exclude-icon" : "include-button") + (props.singleValue ? " single-value" : ""),
            icon
          }
        ), props.leading != null ? props.leading : props.flag ? (
          // The gap between flag and label is this class's one job — flag-icons
          // leaves `.fi` with a width and no margin, so without it they touch.
          /* @__PURE__ */ React7.createElement(Flag2, { flag: props.flag, className: "manga-tools-row-flag" })
        ) : null, sidebar ? /* @__PURE__ */ React7.createElement("span", { className: "TruncatedText inline " + labelClass }, props.label) : /* @__PURE__ */ React7.createElement("span", { className: labelClass }, props.label)),
        !selected || !sidebar ? /* @__PURE__ */ React7.createElement("div", null, props.canExclude && !selected && Bootstrap ? /* @__PURE__ */ React7.createElement(
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
          /* @__PURE__ */ React7.createElement("span", { className: "exclude-button-text" }, sidebar ? "exclude" : message(intl, "actions.exclude_lowercase", "exclude")),
          /* @__PURE__ */ React7.createElement(Icon, { className: "fa-fw exclude-icon", icon: Solid.faMinus })
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
  var PluginApi10 = requirePluginApi();
  var React8 = PluginApi10.React;
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
    const Solid = PluginApi10.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi10.components.Icon;
    const Bootstrap = PluginApi10.libraries.Bootstrap;
    return /* @__PURE__ */ React8.createElement(
      "span",
      {
        className: "tag-item badge badge-secondary",
        "data-manga-tools-own-tag": ""
      },
      props.label,
      Bootstrap ? (
        // `variant` alone: adding the class names as well is how this came out
        // as `btn btn-secondary btn btn-secondary`.
        /* @__PURE__ */ React8.createElement(Bootstrap.Button, { variant: "secondary", onClick: props.onRemove }, /* @__PURE__ */ React8.createElement(Icon, { icon: Solid.faXmark || Solid.faTimes }))
      ) : null
    );
  }
  function dialogDomState() {
    const dialog = document.querySelector(".edit-filter-dialog");
    if (!dialog) return "";
    return (dialogEditorBox() ? "card " : "") + (stashDialogTagsRow() ? "tags" : "");
  }
  function DialogLanguageFilter(props) {
    const intl = PluginApi10.libraries.Intl.useIntl();
    const history = PluginApi10.libraries.ReactRouterDOM.useHistory();
    const bumpState = React8.useState(0);
    const bump = bumpState[1];
    const applied = readLanguageFilter(props.filter);
    const choiceState = React8.useState(applied);
    const choice = choiceState[0];
    const setChoice = choiceState[1];
    const queryState = React8.useState("");
    const query = queryState[0];
    const setQuery = queryState[1];
    const searchRef = React8.useRef(null);
    const applyPending = React8.useRef(false);
    const dialogDom = React8.useRef("");
    React8.useEffect(() => {
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
    React8.useEffect(() => {
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
    const lastModel = React8.useRef(null);
    React8.useEffect(() => {
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
    React8.useLayoutEffect(() => {
      manageDialogTags(dialogTagLabels);
      if (!ownTagsRow) dropFallbackRow();
    });
    const sessionRef = React8.useRef(0);
    const syncedRef = React8.useRef(-1);
    React8.useLayoutEffect(() => {
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
    const list = /* @__PURE__ */ React8.createElement("div", { className: "manga-tools-dialog-card" }, /* @__PURE__ */ React8.createElement("div", { className: "selectable-filter" }, /* @__PURE__ */ React8.createElement("div", { className: "clearable-input-group" }, /* @__PURE__ */ React8.createElement(
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
    )), /* @__PURE__ */ React8.createElement("ul", null, choice.modifier ? /* @__PURE__ */ React8.createElement(
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
    ) : null, chosen.map((o) => /* @__PURE__ */ React8.createElement(
      LanguageRow,
      {
        key: "in-" + o.value,
        variant: "dialog",
        state: "included",
        label: o.label,
        ...languageMark(o),
        onClick: () => {
          setChoice(toggleIncluded(choice, o.value));
        }
      }
    )), excludedChosen.map((o) => /* @__PURE__ */ React8.createElement("li", { key: "ex-" + o.value, className: "excluded-object" }, /* @__PURE__ */ React8.createElement(
      LanguageRow,
      {
        variant: "dialog",
        state: "excluded",
        label: o.label,
        ...languageMark(o),
        onClick: () => {
          setChoice(toggleExcluded(choice, o.value));
        }
      }
    ))), showModifiers ? /* @__PURE__ */ React8.createElement(
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
    ) : null, showModifiers ? /* @__PURE__ */ React8.createElement(
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
    ) : null, candidates.map((o) => /* @__PURE__ */ React8.createElement(
      LanguageRow,
      {
        key: o.value,
        variant: "dialog",
        state: "candidate",
        label: o.label,
        ...languageMark(o),
        canExclude: true,
        onClick: () => {
          setChoice(toggleIncluded(choice, o.value));
        },
        onExclude: () => {
          setChoice(toggleExcluded(choice, o.value));
        }
      }
    )))));
    return /* @__PURE__ */ React8.createElement(React8.Fragment, null, host ? PluginApi10.ReactDOM.createPortal(list, host) : null, ownTagsRow ? PluginApi10.ReactDOM.createPortal(
      ownTags.map((label2, index) => /* @__PURE__ */ React8.createElement(
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
  var PluginApi11 = requirePluginApi();
  var React9 = PluginApi11.React;
  var SECTION_STATE_KEY = "mangaToolsLanguageOpen";
  var CENSORSHIP_SECTION_STATE_KEY = "mangaToolsCensorshipOpen";
  var MANGA_SECTION_STATE_KEY = "mangaToolsMangaOpen";
  var GROUP_SECTION_STATE_KEY = "mangaToolsTranslationGroupOpen";
  var ORIGINAL_SECTION_STATE_KEY = "mangaToolsOriginalOpen";
  function isTouchDevice() {
    return window.matchMedia("(pointer: coarse)").matches;
  }
  var TAGGED_FIELDS = [
    { name: "language", key: NS.FIELD_NAME, mark: TAG_MARK },
    {
      name: "censorship",
      key: NS.CENSORSHIP_FIELD_NAME,
      mark: "data-manga-tools-censorship"
    },
    { name: "manga", key: NS.MANGA_FIELD_NAME, mark: "data-manga-tools-manga" },
    {
      name: "translationGroup",
      key: NS.TRANSLATION_GROUP_FIELD_NAME,
      mark: "data-manga-tools-group"
    },
    {
      name: "original",
      key: NS.ORIGINAL_FIELD_NAME,
      mark: "data-manga-tools-original"
    }
  ];
  function taggedField(name) {
    for (let i = 0; i < TAGGED_FIELDS.length; i++) {
      if (TAGGED_FIELDS[i].name === name) return TAGGED_FIELDS[i];
    }
    return TAGGED_FIELDS[0];
  }
  function isTagOf(name, tag) {
    const field2 = taggedField(name);
    return isFieldTag(tag, field2.key, field2.mark);
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
  function listTagsOf(name) {
    return listFieldTags((tag) => isTagOf(name, tag));
  }
  function writeTagLabels(tags, labels2, mark) {
    for (let i = 0; i < tags.length && i < labels2.length; i++) {
      tagText(tags[i]).nodeValue = labels2[i];
      tags[i].setAttribute(mark, labels2[i]);
    }
  }
  function relabelTags(labels2) {
    writeTagLabels(listTagsOf("language"), labels2, TAG_MARK);
  }
  function relabelCensorshipTags(labels2) {
    writeTagLabels(
      listTagsOf("censorship"),
      labels2,
      taggedField("censorship").mark
    );
  }
  function relabelMangaTags(labels2) {
    writeTagLabels(listTagsOf("manga"), labels2, taggedField("manga").mark);
  }
  function relabelGroupTags(labels2) {
    writeTagLabels(
      listTagsOf("translationGroup"),
      labels2,
      taggedField("translationGroup").mark
    );
  }
  function relabelOriginalTags(labels2) {
    writeTagLabels(listTagsOf("original"), labels2, taggedField("original").mark);
  }
  var sidebarFilter = null;
  function publishSidebarFilter(filter) {
    sidebarFilter = filter;
  }
  function currentSidebarFilter() {
    return sidebarFilter;
  }
  function useSidebarSection(stateKey) {
    const intl = PluginApi11.libraries.Intl.useIntl();
    const history = PluginApi11.libraries.ReactRouterDOM.useHistory();
    const openState = React9.useState(() => {
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
    const Bootstrap = PluginApi11.libraries.Bootstrap;
    if (!Bootstrap) {
      console.error(
        "[mangaTools] react-bootstrap not available, cannot draw the " + props.what + " filter"
      );
      return null;
    }
    const Solid = PluginApi11.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi11.components.Icon;
    return /* @__PURE__ */ React9.createElement("div", { className: "sidebar-section sidebar-list-filter" }, /* @__PURE__ */ React9.createElement("div", { className: "collapse-header" }, /* @__PURE__ */ React9.createElement(
      Bootstrap.Button,
      {
        onClick: props.onToggle,
        className: "minimal collapse-button"
      },
      /* @__PURE__ */ React9.createElement(
        Icon,
        {
          icon: props.open ? Solid.faChevronDown : Solid.faChevronRight,
          fixedWidth: true
        }
      ),
      /* @__PURE__ */ React9.createElement("span", null, props.heading),
      /* @__PURE__ */ React9.createElement(
        "span",
        {
          className: "manga-tools-manga-icon manga-tools-sidebar-mark",
          "aria-hidden": "true"
        }
      )
    )), props.chosenItems.length ? /* @__PURE__ */ React9.createElement("ul", { className: "selected-list" }, props.chosenItems) : null, props.excludedItems.length ? /* @__PURE__ */ React9.createElement("ul", { className: "selected-list excluded-list" }, props.excludedItems) : null, /* @__PURE__ */ React9.createElement(Bootstrap.Collapse, { in: props.open, mountOnEnter: true, unmountOnExit: true }, /* @__PURE__ */ React9.createElement("div", null, /* @__PURE__ */ React9.createElement("div", { className: "queryable-candidate-list" }, props.children))));
  }
  function censorshipLeading(value) {
    const Icon = PluginApi11.components.Icon;
    const icon = NS.censorshipIcon(value);
    return icon ? /* @__PURE__ */ React9.createElement(Icon, { className: "fa-fw", icon }) : null;
  }
  function censorshipOptions(intl) {
    return NS.CENSORSHIP_VALUES.map((value) => ({
      value,
      label: NS.censorshipLabel(intl, value),
      // No flag: the row draws a chess piece instead, via censorshipLeading.
      flag: null
    }));
  }
  function decoration(field2, option) {
    if (!field2.leading) return { flag: flagOf(option) };
    const leading = field2.leading(option);
    return leading ? { leading } : { flag: flagOf(option) };
  }
  function useValuedSection(props) {
    const { intl, history, open, toggleOpen } = useSidebarSection(props.stateKey);
    const queryState = React9.useState("");
    const query = queryState[0];
    const setQuery = queryState[1];
    const searchRef = React9.useRef(null);
    const selection = props.read(props.filter);
    const tagLabelsFor = fieldTagLabels(intl, props.filter, props.fieldKey);
    React9.useLayoutEffect(() => {
      if (props.adopt) props.adopt(props.filter);
      if (tagLabelsFor) props.relabel(tagLabelsFor);
    });
    const Solid = PluginApi11.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi11.components.Icon;
    const Bootstrap = PluginApi11.libraries.Bootstrap;
    function update3(next) {
      props.apply(props.filter, history, next);
      if (!isTouchDevice() && searchRef.current) {
        searchRef.current.focus();
      }
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
    function pick(value) {
      toggleInclude(value);
      setQuery("");
    }
    function unpick(value) {
      toggleExclude(value);
      setQuery("");
    }
    const options = props.options(intl, selection);
    const listed = selectableOptions(selection, options);
    const chosen = listed.filter(
      (o) => selection.included.indexOf(o.value) !== -1
    );
    const excludedChosen = listed.filter(
      (o) => selection.excluded.indexOf(o.value) !== -1
    );
    const candidates = listed.filter(
      (o) => selection.included.indexOf(o.value) === -1 && selection.excluded.indexOf(o.value) === -1 && matchesQuery(o, query)
    );
    const showModifiers = isEmptySelection(selection);
    const chosenItems = [];
    if (selection.modifier) {
      chosenItems.push(
        /* @__PURE__ */ React9.createElement("li", { className: "selected-object modifier-object", key: "modifier" }, /* @__PURE__ */ React9.createElement("a", { tabIndex: 0, onClick: clearModifier }, /* @__PURE__ */ React9.createElement("div", { className: "label-group" }, /* @__PURE__ */ React9.createElement(Icon, { className: "fa-fw include-button", icon: Solid.faCheckCircle }), /* @__PURE__ */ React9.createElement("span", { className: "TruncatedText inline selected-object-label" }, "(" + message(
          intl,
          "criterion_modifier_values." + selection.modifier,
          selection.modifier === "any" ? "Any" : "None"
        ) + ")"))))
      );
    }
    chosen.forEach((o) => {
      chosenItems.push(
        /* @__PURE__ */ React9.createElement(
          LanguageRow,
          {
            variant: "sidebar",
            key: "in-" + o.value,
            label: o.label,
            ...decoration(props, o),
            state: "included",
            onClick: () => {
              toggleInclude(o.value);
            }
          }
        )
      );
    });
    const excludedItems = excludedChosen.map((o) => /* @__PURE__ */ React9.createElement(
      LanguageRow,
      {
        variant: "sidebar",
        key: "ex-" + o.value,
        label: o.label,
        ...decoration(props, o),
        state: "excluded",
        onClick: () => {
          toggleExclude(o.value);
        }
      }
    ));
    return /* @__PURE__ */ React9.createElement(
      SidebarSection,
      {
        heading: props.heading(intl),
        open,
        onToggle: toggleOpen,
        chosenItems,
        excludedItems,
        what: props.what
      },
      props.search ? (
        /* Stash searches its candidates server-side and debounces the input;
           these are already in memory, so filtering is immediate. */
        /* @__PURE__ */ React9.createElement("div", { className: "clearable-input-group" }, /* @__PURE__ */ React9.createElement(
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
        ), query && Bootstrap ? /* @__PURE__ */ React9.createElement(
          Bootstrap.Button,
          {
            variant: "secondary",
            className: "clearable-text-field-clear",
            title: message(intl, "actions.clear", "Clear"),
            onClick: () => {
              setQuery("");
            }
          },
          /* @__PURE__ */ React9.createElement(Icon, { icon: Solid.faTimes })
        ) : null)
      ) : null,
      /* @__PURE__ */ React9.createElement("ul", null, showModifiers ? /* @__PURE__ */ React9.createElement(
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
      ) : null, showModifiers ? /* @__PURE__ */ React9.createElement(
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
      ) : null, candidates.map((o) => /* @__PURE__ */ React9.createElement(
        LanguageRow,
        {
          variant: "sidebar",
          key: o.value,
          label: o.label,
          ...props.plainCandidates ? {} : decoration(props, o),
          state: "candidate",
          canExclude: true,
          onClick: () => {
            pick(o.value);
          },
          onExclude: () => {
            unpick(o.value);
          }
        }
      )))
    );
  }
  var VALUED_SECTIONS = {
    language: {
      fieldKey: NS.FIELD_NAME,
      stateKey: SECTION_STATE_KEY,
      heading: fieldLabel,
      what: "language",
      read: readLanguageFilter,
      apply: applyLanguage,
      relabel: relabelTags,
      options: visibleOptions,
      search: true,
      adopt: adoptLanguageCriterion,
      // A flag where a language has one — see decoration, which falls back to it —
      // and this plugin's own mark for the one value that is not a place.
      leading: (o) => {
        var _a3;
        return (_a3 = languageMark(o).leading) != null ? _a3 : null;
      }
    },
    censorship: {
      fieldKey: NS.CENSORSHIP_FIELD_NAME,
      stateKey: CENSORSHIP_SECTION_STATE_KEY,
      heading: censorshipHeading,
      what: "censorship",
      read: readCensorshipFilter,
      apply: applyCensorship,
      relabel: relabelCensorshipTags,
      options: (intl) => censorshipOptions(intl),
      leading: (o) => censorshipLeading(o.value)
    },
    translationGroup: {
      fieldKey: NS.TRANSLATION_GROUP_FIELD_NAME,
      stateKey: GROUP_SECTION_STATE_KEY,
      heading: translationGroupHeading,
      what: "translation group",
      read: readGroupFilter,
      apply: applyGroup,
      relabel: relabelGroupTags,
      options: (_intl, selection) => translationGroupOptions(selection),
      search: true,
      plainCandidates: true
    }
  };
  function SidebarLanguageFilter(props) {
    return useValuedSection({
      ...VALUED_SECTIONS.language,
      filter: props.filter
    });
  }
  function SidebarCensorshipFilter(props) {
    return useValuedSection({
      ...VALUED_SECTIONS.censorship,
      filter: props.filter
    });
  }
  function usePresenceSection(props) {
    const { intl, history, open, toggleOpen } = useSidebarSection(props.stateKey);
    const state = props.read(props.filter);
    const tagLabelsFor = fieldTagLabels(intl, props.filter, props.fieldKey);
    React9.useLayoutEffect(() => {
      if (tagLabelsFor) props.relabel(tagLabelsFor);
    });
    const options = [
      { value: "marked", label: message(intl, "true", "Yes") },
      { value: "unmarked", label: message(intl, "false", "No") }
    ];
    function choose(value) {
      props.apply(props.filter, history, state === value ? "" : value);
    }
    const chosen = options.filter((o) => o.value === state);
    const candidates = options.filter((o) => o.value !== state);
    const chosenItems = chosen.map((o) => /* @__PURE__ */ React9.createElement(
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
    return /* @__PURE__ */ React9.createElement(
      SidebarSection,
      {
        heading: props.heading(intl),
        open,
        onToggle: toggleOpen,
        chosenItems,
        excludedItems: [],
        what: props.what
      },
      /* @__PURE__ */ React9.createElement("ul", null, candidates.map((o) => /* @__PURE__ */ React9.createElement(
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
  var PRESENCE_SECTIONS = {
    manga: {
      fieldKey: NS.MANGA_FIELD_NAME,
      stateKey: MANGA_SECTION_STATE_KEY,
      heading: (intl) => t(intl, "mangaTools.manga.isManga"),
      what: "manga",
      read: readMangaFilter,
      apply: applyManga,
      relabel: relabelMangaTags
    },
    original: {
      fieldKey: NS.ORIGINAL_FIELD_NAME,
      stateKey: ORIGINAL_SECTION_STATE_KEY,
      heading: (intl) => t(intl, "mangaTools.filter.original.isOriginal"),
      what: "raw",
      read: readOriginalFilter,
      apply: applyOriginal,
      relabel: relabelOriginalTags
    }
  };
  function SidebarMangaFilter(props) {
    return usePresenceSection({
      ...PRESENCE_SECTIONS.manga,
      filter: props.filter
    });
  }
  function SidebarOriginalFilter(props) {
    return usePresenceSection({
      ...PRESENCE_SECTIONS.original,
      filter: props.filter
    });
  }
  function translationGroupOptions(selection) {
    const options = NS.translationGroups().map((name) => ({
      value: name,
      label: name,
      flag: null
    }));
    const known = {};
    options.forEach((o) => {
      known[o.value] = true;
    });
    const asked = selection.included.concat(selection.excluded);
    asked.forEach((name) => {
      if (known[name]) return;
      known[name] = true;
      options.push({ value: name, label: name, flag: null });
    });
    return options;
  }
  function SidebarTranslationGroupFilter(props) {
    return useValuedSection({
      ...VALUED_SECTIONS.translationGroup,
      filter: props.filter
    });
  }
  NS.relabelTags = relabelTags;
  NS.relabelCensorshipTags = relabelCensorshipTags;
  NS.relabelMangaTags = relabelMangaTags;
  NS.relabelGroupTags = relabelGroupTags;
  NS.relabelOriginalTags = relabelOriginalTags;

  // src/tools/settings-page.tsx
  var PluginApi12 = requirePluginApi();
  var React10 = PluginApi12.React;
  function SettingsNote(props) {
    const Solid = PluginApi12.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi12.components.Icon;
    const icon = Solid.faInfoCircle || null;
    return /* @__PURE__ */ React10.createElement("span", { className: "manga-tools-settings-note" }, icon ? /* @__PURE__ */ React10.createElement(Icon, { icon }) : null, /* @__PURE__ */ React10.createElement("span", null, props.children));
  }
  function SidebarFiltersSetting(props) {
    const intl = PluginApi12.libraries.Intl.useIntl();
    const Select = resolveSelect();
    const persist = props.persist;
    if (!Select) return null;
    if (!NS.anyFieldShowing()) return null;
    const available = NS.SIDEBAR_FILTERS.filter(
      (name) => NS.fieldShowing(name)
    );
    const labelOf = (name) => {
      if (name === "language") return fieldLabel(intl);
      if (name === "censorship") return t(intl, "mangaTools.censorship.heading");
      if (name === "translationGroup")
        return t(intl, "mangaTools.translationGroup.heading");
      return t(intl, "mangaTools.filter.original.isOriginal");
    };
    const options = available.map((name) => ({
      value: name,
      label: labelOf(name),
      flag: null
    }));
    const value = options.filter(
      (o) => NS.sidebarFilters === null || NS.sidebarFilters.has(o.value)
    );
    return /* @__PURE__ */ React10.createElement("div", { className: "setting manga-tools-settings" }, /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-settings-block" }, /* @__PURE__ */ React10.createElement("h3", null, t(intl, "mangaTools.settings.sidebarFilters.heading")), /* @__PURE__ */ React10.createElement("div", { className: "sub-heading" }, t(intl, "mangaTools.settings.sidebarFilters.description")), /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-settings-control" }, /* @__PURE__ */ React10.createElement(
      Select,
      {
        className: "manga-tools-settings-select",
        classNamePrefix: "react-select",
        inputId: "mangaTools-sidebarFilters",
        isMulti: true,
        isClearable: true,
        menuPlacement: "auto",
        placeholder: t(
          intl,
          "mangaTools.settings.sidebarFilters.placeholder"
        ),
        value,
        options,
        components: { IndicatorSeparator: () => null },
        onChange: (selected) => {
          const ticked = (selected || []).map((o) => o.value);
          const hidden = NS.SIDEBAR_FILTERS.filter(
            (name) => available.indexOf(name) === -1
          );
          const all = ticked.concat(hidden);
          NS.sidebarFilters = NS.parseSidebarFilters(
            NS.serializeSidebarFilters(all)
          );
          emit();
          persist();
        }
      }
    ))));
  }
  function sampleLanguageCode(uiLocale) {
    const parts2 = String(uiLocale || "").split(/[-_]/);
    for (let n = parts2.length; n > 0; n--) {
      const canonical = NS.findCanonical(parts2.slice(0, n).join("-"));
      if (canonical) return canonical;
    }
    if ((parts2[0] || "").toLowerCase() === "zh") {
      const region = (parts2[1] || "").toUpperCase();
      return region === "TW" || region === "HK" || region === "MO" ? "zh-Hant" : "zh-Hans";
    }
    return "";
  }
  function HelpExampleCard(props) {
    const intl = PluginApi12.libraries.Intl.useIntl();
    const Solid = PluginApi12.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi12.components.Icon;
    const locale = intl.locale;
    const code = sampleLanguageCode(locale);
    const sample = (code ? NS.describe(code, locale) : null) || NS.describe("en", locale) || void 0;
    const lit = (which) => props.highlight === which ? " manga-tools-help-lit" : "";
    const count = (cls, icon, n) => /* @__PURE__ */ React10.createElement("span", { className: cls }, /* @__PURE__ */ React10.createElement("button", { type: "button", tabIndex: -1, className: "minimal btn btn-primary" }, icon ? /* @__PURE__ */ React10.createElement(Icon, { icon }) : null, /* @__PURE__ */ React10.createElement("span", null, n)));
    return /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-help-card", "aria-hidden": "true" }, /* @__PURE__ */ React10.createElement(
      "div",
      {
        className: "gallery-card card grid-card zoom-1",
        style: { width: 240 }
      },
      /* @__PURE__ */ React10.createElement("div", { className: "thumbnail-section" }, /* @__PURE__ */ React10.createElement("span", { className: "gallery-card-header" }, /* @__PURE__ */ React10.createElement("div", { className: "gallery-card-cover" }, /* @__PURE__ */ React10.createElement("div", { className: "gallery-card-image manga-tools-help-cover" }, t(intl, "mangaTools.settings.help.cover")))), sample ? languageChip(sample, lit("badge").trim()) : null),
      /* @__PURE__ */ React10.createElement("div", { className: "card-section" }, /* @__PURE__ */ React10.createElement("h5", { className: "card-section-title flex-aligned" }, /* @__PURE__ */ React10.createElement("div", { className: "TruncatedText", style: { WebkitLineClamp: 2 } }, t(intl, "mangaTools.settings.help.card.title"))), /* @__PURE__ */ React10.createElement("div", { className: "gallery-card__details" }, /* @__PURE__ */ React10.createElement("span", { className: "gallery-card__date" }, t(intl, "mangaTools.settings.help.card.date")))),
      /* @__PURE__ */ React10.createElement("hr", null),
      /* @__PURE__ */ React10.createElement("div", { role: "group", className: "card-popovers btn-group" }, count("image-count", Solid.faImage || null, 32), count("tag-count", Solid.faTag || null, 11), /* @__PURE__ */ React10.createElement("span", { className: "manga-tools-popover-slot" + lit("mark") }, /* @__PURE__ */ React10.createElement(
        "button",
        {
          type: "button",
          tabIndex: -1,
          className: "minimal btn btn-primary manga-tools-mark"
        },
        /* @__PURE__ */ React10.createElement(MangaIcon, null)
      )))
    ));
  }
  function HelpIcon(props) {
    const Solid = PluginApi12.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi12.components.Icon;
    const icon = Solid.faQuestionCircle || null;
    return /* @__PURE__ */ React10.createElement("span", { className: "manga-tools-help" }, /* @__PURE__ */ React10.createElement(
      "button",
      {
        type: "button",
        className: "manga-tools-help-button",
        "aria-label": props.text
      },
      icon ? /* @__PURE__ */ React10.createElement(Icon, { icon }) : "?"
    ), /* @__PURE__ */ React10.createElement("span", { className: "manga-tools-help-panel" }, /* @__PURE__ */ React10.createElement(HelpExampleCard, { highlight: props.example })));
  }
  function BooleanSetting(props) {
    const Bootstrap = PluginApi12.libraries.Bootstrap;
    if (!Bootstrap) {
      console.error(
        "[mangaTools] react-bootstrap not available, cannot render the settings switches"
      );
      return null;
    }
    const heading = props.help ? /* @__PURE__ */ React10.createElement(React10.Fragment, null, props.heading, /* @__PURE__ */ React10.createElement(HelpIcon, { text: props.help.text, example: props.help.example })) : props.heading;
    return (
      // `manga-tools-setting` is what the stylesheet needs to undo Stash's
      // `flex-wrap: wrap` on a plugin's rows, which puts a switch with a long
      // sub-heading on a line of its own — see the rule in mangaTools.css.
      /* @__PURE__ */ React10.createElement(
        "div",
        {
          className: "setting manga-tools-setting" + (props.head ? " manga-tools-setting-head" : "")
        },
        /* @__PURE__ */ React10.createElement(
          "div",
          {
            className: props.fold ? "manga-tools-foldable" : void 0,
            onClick: props.fold ? props.fold.onToggle : void 0
          },
          props.fold ? /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-heading-line" }, /* @__PURE__ */ React10.createElement(
            FoldIcon,
            {
              folded: props.fold.folded,
              onToggle: props.fold.onToggle
            }
          ), /* @__PURE__ */ React10.createElement("h3", null, heading)) : /* @__PURE__ */ React10.createElement("h3", null, heading),
          props.subHeading ? /* @__PURE__ */ React10.createElement("div", { className: "sub-heading" }, props.subHeading) : null
        ),
        /* @__PURE__ */ React10.createElement("div", null, /* @__PURE__ */ React10.createElement(
          Bootstrap.Form.Switch,
          {
            id: props.id,
            checked: props.checked,
            onChange: () => {
              props.onChange(!props.checked);
            }
          }
        ))
      )
    );
  }
  var foldedGroups = /* @__PURE__ */ new Set();
  function setGroupFolded(id, folded) {
    if (folded) foldedGroups.add(id);
    else foldedGroups.delete(id);
    emit();
  }
  function FoldIcon(props) {
    return /* @__PURE__ */ React10.createElement(
      "button",
      {
        type: "button",
        className: "manga-tools-fold" + (props.folded ? " is-folded" : ""),
        "aria-expanded": !props.folded,
        onClick: (event) => {
          event.stopPropagation();
          props.onToggle();
        }
      },
      /* @__PURE__ */ React10.createElement("span", { className: "fa-icon" })
    );
  }
  function SettingSwitch(props) {
    const rows = props.checked && props.children ? props.children : null;
    const folded = foldedGroups.has(props.id);
    const fold = rows ? { folded, onToggle: () => setGroupFolded(props.id, !folded) } : void 0;
    return /* @__PURE__ */ React10.createElement(React10.Fragment, null, /* @__PURE__ */ React10.createElement(
      BooleanSetting,
      {
        id: props.id,
        heading: props.heading,
        subHeading: props.subHeading,
        help: props.help,
        checked: props.checked,
        onChange: props.onChange,
        head: true,
        fold
      }
    ), rows && !folded ? /* @__PURE__ */ React10.createElement("div", { className: "setting-group manga-tools-settings-group" }, rows) : null);
  }
  function SettingsGroup(props) {
    const folded = foldedGroups.has(props.id);
    return /* @__PURE__ */ React10.createElement(React10.Fragment, null, /* @__PURE__ */ React10.createElement(
      SettingsHeading,
      {
        heading: props.heading,
        subHeading: props.subHeading,
        fold: {
          folded,
          onToggle: () => setGroupFolded(props.id, !folded)
        }
      }
    ), folded ? null : /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-settings-body" }, props.children));
  }
  function SettingsHeading(props) {
    return /* @__PURE__ */ React10.createElement(
      "div",
      {
        className: "manga-tools-settings-heading" + (props.fold ? " manga-tools-foldable" : ""),
        onClick: props.fold ? props.fold.onToggle : void 0
      },
      props.fold ? /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-heading-line" }, /* @__PURE__ */ React10.createElement(FoldIcon, { folded: props.fold.folded, onToggle: props.fold.onToggle }), /* @__PURE__ */ React10.createElement("h3", null, props.heading)) : /* @__PURE__ */ React10.createElement("h3", null, props.heading),
      props.subHeading ? /* @__PURE__ */ React10.createElement("div", { className: "sub-heading" }, props.subHeading) : null
    );
  }
  var MARK_GROUP_ID = "mangaTools-markGroup";
  var DISPLAY_GROUP_ID = "mangaTools-displayGroup";
  function MangaToolsSettings() {
    useGlobalVersion();
    const intl = PluginApi12.libraries.Intl.useIntl();
    const Select = resolveSelect();
    function persist() {
      saveSettings();
    }
    function writeFlag(into) {
      return (next) => {
        into(next);
        emit();
        persist();
      };
    }
    const options = NS.languageOptions(intl.locale);
    const enabled = NS.enabledLanguages;
    const value = enabled ? options.filter((o) => enabled == null ? void 0 : enabled.has(o.value)) : [];
    if (!Select) return null;
    const field2 = (id, heading, showing, set) => /* @__PURE__ */ React10.createElement(
      BooleanSetting,
      {
        id,
        heading,
        checked: showing(),
        onChange: writeFlag(set)
      }
    );
    return /* @__PURE__ */ React10.createElement(React10.Fragment, null, /* @__PURE__ */ React10.createElement(
      SettingSwitch,
      {
        id: "mangaTools-readerTakeover",
        heading: t(intl, "mangaTools.settings.readerTakeover.heading"),
        subHeading: /* @__PURE__ */ React10.createElement(React10.Fragment, null, t(intl, "mangaTools.settings.readerTakeover.description"), /* @__PURE__ */ React10.createElement(SettingsNote, null, t(intl, "mangaTools.settings.readerTakeover.note"))),
        checked: NS.readerTakeover,
        onChange: writeFlag((next) => {
          NS.readerTakeover = next;
        })
      }
    ), /* @__PURE__ */ React10.createElement(
      SettingSwitch,
      {
        id: "mangaTools-manageChapters",
        heading: t(intl, "mangaTools.settings.manageChapters.heading"),
        subHeading: /* @__PURE__ */ React10.createElement(React10.Fragment, null, t(intl, "mangaTools.settings.manageChapters.description"), /* @__PURE__ */ React10.createElement(SettingsNote, null, t(intl, "mangaTools.settings.manageChapters.note"))),
        checked: NS.manageChapters,
        onChange: writeFlag((next) => {
          NS.manageChapters = next;
        })
      }
    ), /* @__PURE__ */ React10.createElement(
      SettingSwitch,
      {
        id: "mangaTools-fields",
        heading: t(intl, "mangaTools.settings.fields.heading"),
        subHeading: t(intl, "mangaTools.settings.fields.description"),
        checked: NS.fields,
        onChange: writeFlag((next) => {
          NS.fields = next;
        })
      },
      /* @__PURE__ */ React10.createElement(
        SettingSwitch,
        {
          id: "mangaTools-fieldLanguage",
          heading: fieldLabel(intl),
          checked: NS.fieldLanguage,
          onChange: writeFlag((next) => {
            NS.fieldLanguage = next;
          })
        },
        /* @__PURE__ */ React10.createElement("div", { className: "setting manga-tools-settings" }, /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-settings-block" }, /* @__PURE__ */ React10.createElement("h3", null, t(intl, "mangaTools.settings.enabledLanguages.heading")), /* @__PURE__ */ React10.createElement("div", { className: "sub-heading" }, t(intl, "mangaTools.settings.enabledLanguages.description")), /* @__PURE__ */ React10.createElement("div", { className: "manga-tools-settings-control" }, /* @__PURE__ */ React10.createElement(
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
        )))),
        /* @__PURE__ */ React10.createElement(
          BooleanSetting,
          {
            id: "mangaTools-showFlags",
            heading: t(intl, "mangaTools.settings.showFlags.heading"),
            subHeading: t(intl, "mangaTools.settings.showFlags.description"),
            checked: NS.showFlags,
            onChange: writeFlag((next) => {
              NS.showFlags = next;
            })
          }
        ),
        /* @__PURE__ */ React10.createElement(
          BooleanSetting,
          {
            id: "mangaTools-showCoverBadge",
            heading: t(intl, "mangaTools.settings.showCoverBadge.heading"),
            subHeading: t(
              intl,
              "mangaTools.settings.showCoverBadge.description"
            ),
            help: {
              text: t(intl, "mangaTools.settings.showCoverBadge.help"),
              example: "badge"
            },
            checked: NS.showCoverBadge,
            onChange: writeFlag((next) => {
              NS.showCoverBadge = next;
            })
          }
        )
      ),
      field2(
        "mangaTools-fieldCensorship",
        t(intl, "mangaTools.censorship.heading"),
        () => NS.fieldCensorship,
        (next) => {
          NS.fieldCensorship = next;
        }
      ),
      field2(
        "mangaTools-fieldTranslationGroup",
        t(intl, "mangaTools.translationGroup.heading"),
        () => NS.fieldTranslationGroup,
        (next) => {
          NS.fieldTranslationGroup = next;
        }
      ),
      field2(
        "mangaTools-fieldOriginal",
        t(intl, "mangaTools.translationGroup.original"),
        () => NS.fieldOriginal,
        (next) => {
          NS.fieldOriginal = next;
        }
      ),
      /* @__PURE__ */ React10.createElement(
        SettingsGroup,
        {
          id: DISPLAY_GROUP_ID,
          heading: t(intl, "mangaTools.settings.display.heading")
        },
        /* @__PURE__ */ React10.createElement(
          BooleanSetting,
          {
            id: "mangaTools-openDetailsBlock",
            heading: t(intl, "mangaTools.settings.openDetailsBlock.heading"),
            checked: NS.openDetailsBlock,
            onChange: writeFlag((next) => {
              NS.openDetailsBlock = next;
            })
          }
        ),
        /* @__PURE__ */ React10.createElement(
          BooleanSetting,
          {
            id: "mangaTools-openEditBlock",
            heading: t(intl, "mangaTools.settings.openEditBlock.heading"),
            checked: NS.openEditBlock,
            onChange: writeFlag((next) => {
              NS.openEditBlock = next;
            })
          }
        ),
        /* @__PURE__ */ React10.createElement(
          BooleanSetting,
          {
            id: "mangaTools-hidePerformers",
            heading: t(intl, "mangaTools.settings.hidePerformers.heading"),
            subHeading: t(
              intl,
              "mangaTools.settings.hidePerformers.description"
            ),
            checked: NS.hidePerformers,
            onChange: writeFlag((next) => {
              NS.hidePerformers = next;
            })
          }
        ),
        /* @__PURE__ */ React10.createElement(
          BooleanSetting,
          {
            id: "mangaTools-showDisabledFields",
            heading: t(intl, "mangaTools.settings.showDisabledFields.heading"),
            subHeading: /* @__PURE__ */ React10.createElement(React10.Fragment, null, t(intl, "mangaTools.settings.showDisabledFields.description"), /* @__PURE__ */ React10.createElement(SettingsNote, null, t(intl, "mangaTools.settings.showDisabledFields.note"))),
            checked: NS.showDisabledFields,
            onChange: writeFlag((next) => {
              NS.showDisabledFields = next;
            })
          }
        ),
        /* @__PURE__ */ React10.createElement(SidebarFiltersSetting, { persist })
      )
    ), /* @__PURE__ */ React10.createElement(
      SettingsGroup,
      {
        id: MARK_GROUP_ID,
        heading: t(intl, "mangaTools.settings.mark.heading")
      },
      /* @__PURE__ */ React10.createElement(
        BooleanSetting,
        {
          id: "mangaTools-confirmUnmark",
          heading: t(intl, "mangaTools.settings.confirmUnmark.heading"),
          checked: NS.confirmUnmark,
          onChange: writeFlag((next) => {
            NS.confirmUnmark = next;
          })
        }
      ),
      /* @__PURE__ */ React10.createElement(
        BooleanSetting,
        {
          id: "mangaTools-deleteOnUnmark",
          heading: t(intl, "mangaTools.settings.deleteOnUnmark.heading"),
          subHeading: t(intl, "mangaTools.settings.deleteOnUnmark.description"),
          checked: NS.deleteOnUnmark,
          onChange: writeFlag((next) => {
            NS.deleteOnUnmark = next;
          })
        }
      ),
      /* @__PURE__ */ React10.createElement(
        BooleanSetting,
        {
          id: "mangaTools-coverIcon",
          heading: t(intl, "mangaTools.settings.coverIcon.heading"),
          help: {
            text: t(intl, "mangaTools.settings.coverIcon.help"),
            example: "mark"
          },
          checked: NS.coverIcon,
          onChange: writeFlag((next) => {
            NS.coverIcon = next;
          })
        }
      )
    ));
  }

  // src/tools/edit-page.tsx
  var PluginApi13 = requirePluginApi();
  var React11 = PluginApi13.React;
  var originalGroupTaken = null;
  function MangaFieldBlock(props) {
    var _a3;
    useGlobalVersion();
    const intl = PluginApi13.libraries.Intl.useIntl();
    const Select = resolveSelect();
    const state = React11.useState(NS.openEditBlock);
    const open = state[0];
    const setOpen = state[1];
    const Solid = PluginApi13.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi13.components.Icon;
    const Button = (_a3 = PluginApi13.libraries.Bootstrap) == null ? void 0 : _a3.Button;
    const host = isGalleryContext() ? ensureFieldHost() : null;
    if (host) {
      host.classList.toggle(
        "hide-performers",
        NS.hidePerformers && NS.anyFieldShowing()
      );
    }
    const bump = React11.useState(0)[1];
    React11.useLayoutEffect(() => {
      if (isGalleryContext() && ensureFieldHost() !== host) {
        bump((v) => v + 1);
      }
    });
    if (!isGalleryContext() || !Select || !host || !NS.anyFieldShowing()) {
      return null;
    }
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
    const noLanguage = NS.isNoLanguage(pickLanguage(props.values));
    const isOriginal = NS.isRaw(props.values);
    const toggleOriginal = () => {
      if (noLanguage) return;
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
    const writeLanguage = (value) => {
      let next = NS.setField(props.values, FIELD_NAME, value);
      if (NS.isNoLanguage(value)) {
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
    const languageChip2 = offered && offeredInfo ? /* @__PURE__ */ React11.createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary manga-tools-chip",
        "aria-label": chipTitle,
        title: chipTitle,
        onClick: () => write2(FIELD_NAME, offered.code)
      },
      NS.showFlags && offeredInfo.flag ? /* @__PURE__ */ React11.createElement(Flag, { flag: offeredInfo.flag, className: "manga-tools-flag" }) : chipIcon ? /* @__PURE__ */ React11.createElement(Icon, { icon: chipIcon }) : /* @__PURE__ */ React11.createElement("span", null, offeredInfo.name)
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
      /* @__PURE__ */ React11.createElement("div", { className: cls.group, "data-field": "manga_tools_language" }, /* @__PURE__ */ React11.createElement("label", { className: cls.label, htmlFor: "manga_tools_language" }, fieldLabel(intl)), /* @__PURE__ */ React11.createElement(
        "div",
        {
          className: cls.control + (languageChip2 ? " manga-tools-chip-row" : "")
        },
        /* @__PURE__ */ React11.createElement(
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
              writeLanguage(opt ? opt.value : "");
            }
          }
        ),
        languageChip2
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
    const markField = /* @__PURE__ */ React11.createElement("div", { className: cls.group, "data-field": "manga_tools_censorship" }, /* @__PURE__ */ React11.createElement("label", { className: cls.label, htmlFor: "manga_tools_censorship" }, t(intl, "mangaTools.censorship.heading")), /* @__PURE__ */ React11.createElement("div", { className: cls.control }, /* @__PURE__ */ React11.createElement(
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
    const showGroup = NS.fieldShowing("translationGroup");
    const showOriginal = NS.fieldShowing("original");
    const rawShown = showOriginal && isOriginal;
    const originalLabel = t(intl, "mangaTools.translationGroup.original");
    const originalChip = /* @__PURE__ */ React11.createElement(
      "button",
      {
        type: "button",
        className: "btn btn-secondary manga-tools-chip manga-tools-original" + (isOriginal ? " active" : ""),
        "aria-pressed": isOriginal,
        "aria-label": originalLabel,
        title: t(
          intl,
          noLanguage ? "mangaTools.translationGroup.originalNoLanguage" : isOriginal ? restoresGroup ? "mangaTools.translationGroup.originalOffRestore" : "mangaTools.translationGroup.originalOff" : "mangaTools.translationGroup.originalOn"
        ),
        disabled: noLanguage,
        onClick: toggleOriginal
      },
      /* @__PURE__ */ React11.createElement(SteakIcon, { raw: isOriginal })
    );
    const originalRow = /* @__PURE__ */ React11.createElement("div", { className: cls.group, "data-field": "manga_tools_original" }, /* @__PURE__ */ React11.createElement("label", { className: cls.label, htmlFor: "manga_tools_original" }, originalLabel), /* @__PURE__ */ React11.createElement("div", { className: cls.control }, /* @__PURE__ */ React11.createElement("div", { className: "form-check form-switch" }, /* @__PURE__ */ React11.createElement(
      "input",
      {
        className: "form-check-input",
        type: "checkbox",
        role: "switch",
        id: "manga_tools_original",
        checked: isOriginal,
        disabled: noLanguage,
        title: t(intl, "mangaTools.translationGroup.originalNoLanguage"),
        onChange: toggleOriginal
      }
    ))));
    const groupField = /* @__PURE__ */ React11.createElement("div", { className: cls.group, "data-field": "manga_tools_translation_group" }, /* @__PURE__ */ React11.createElement("label", { className: cls.label, htmlFor: "manga_tools_translation_group" }, t(intl, "mangaTools.translationGroup.heading")), /* @__PURE__ */ React11.createElement(
      "div",
      {
        className: cls.control + (showOriginal ? " manga-tools-chip-row" : "")
      },
      /* @__PURE__ */ React11.createElement(
        Select,
        {
          className: "manga-tools-select manga-tools-group-select",
          classNamePrefix: "react-select",
          inputId: "manga_tools_translation_group",
          isClearable: true,
          isDisabled: rawShown || noLanguage,
          placeholder: t(
            intl,
            noLanguage ? "mangaTools.translationGroup.noLanguageDetail" : rawShown ? "mangaTools.translationGroup.originalDetail" : "mangaTools.translationGroup.placeholder"
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
      ),
      showOriginal ? originalChip : null
    ));
    return PluginApi13.ReactDOM.createPortal(
      /* @__PURE__ */ React11.createElement("div", { className: "manga-tools-panel" }, /* @__PURE__ */ React11.createElement("div", { className: cls.group }, /* @__PURE__ */ React11.createElement("div", { className: "col-12" }, /* @__PURE__ */ React11.createElement("div", { className: "collapse-header" }, Button ? /* @__PURE__ */ React11.createElement(
        Button,
        {
          className: "minimal collapse-button",
          "aria-expanded": open,
          onClick: () => setOpen(!open)
        },
        /* @__PURE__ */ React11.createElement(
          Icon,
          {
            icon: open ? Solid.faChevronDown : Solid.faChevronRight,
            fixedWidth: true
          }
        ),
        /* @__PURE__ */ React11.createElement("span", null, t(intl, "mangaTools.panel.heading"))
      ) : null))), open && NS.fieldShowing("censorship") ? markField : null, open && NS.fieldShowing("language") ? languageField : null, open && showGroup ? groupField : null, open && showOriginal && !showGroup ? originalRow : null),
      host
    );
  }

  // src/tools/details.tsx
  var PluginApi14 = requirePluginApi();
  var React12 = PluginApi14.React;
  var guardedBlockClass = null;
  function guardedBlock() {
    if (guardedBlockClass) return guardedBlockClass;
    guardedBlockClass = class extends React12.Component {
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
  function MangaDetailsPanel(props) {
    var _a3, _b3;
    useGlobalVersion();
    const intl = PluginApi14.libraries.Intl.useIntl();
    const state = React12.useState(NS.openDetailsBlock);
    const open = state[0];
    const setOpen = state[1];
    const language2 = NS.fieldShowing("language") ? NS.describe(pickLanguage(props.values), intl.locale) : null;
    const mark = NS.fieldShowing("censorship") ? censorshipOf(props.values) : "";
    const group = NS.fieldShowing("translationGroup") ? NS.translationGroupOf(props.values) : "";
    const original = NS.fieldShowing("original") && NS.isRaw(props.values);
    const Solid = PluginApi14.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi14.components.Icon;
    const Button = (_a3 = PluginApi14.libraries.Bootstrap) == null ? void 0 : _a3.Button;
    const Collapse = (_b3 = PluginApi14.libraries.Bootstrap) == null ? void 0 : _b3.Collapse;
    if (!language2 && !mark && !group && !original) return null;
    const host = ensureDetailHost();
    if (!host) return null;
    const showFlag = NS.showFlags && !!language2 && (!!language2.flag || NS.isNoLanguage(language2.code));
    const body = /* @__PURE__ */ React12.createElement("div", { className: "manga-tools-panel-body" }, mark ? /* @__PURE__ */ React12.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.censorship.heading") + ": ", /* @__PURE__ */ React12.createElement(CensorshipIcon, { value: mark }), mark ? " " : null, NS.censorshipLabel(intl, mark)) : null, language2 ? /* @__PURE__ */ React12.createElement("h6", { className: "manga-tools-detail" }, fieldLabel(intl) + ": ", showFlag && language2.flag ? /* @__PURE__ */ React12.createElement(Flag, { flag: language2.flag, className: "manga-tools-flag" }) : showFlag ? noLanguageMark(language2.code, "manga-tools-flag") : null, showFlag ? " " : null, language2.name, original ? t(intl, "mangaTools.translationGroup.originalInline") : null) : null, group ? (
      // No icon and no flag: a group's name is its own, and there is nothing
      // here to draw beside it. Drawn last, because it is the one row that is
      // the same shape on every gallery rather than picked from a list.
      /* @__PURE__ */ React12.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.translationGroup.heading") + ": ", group)
    ) : null, original && !language2 ? (
      // Raw with no language row to carry the mark, so it stands on its own —
      // and without the group's label, for the reason above. The wording carries
      // the rest: a bare "original" under that label would read like a group called
      // that, which is why the string says what it does.
      //
      // "No language row" rather than "no language set": with the language field
      // turned off there is no row to ride on whatever the gallery holds, and a
      // raw mark with no way of being shown is worse than one shown plainly.
      /* @__PURE__ */ React12.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.translationGroup.originalDetail"))
    ) : null);
    return PluginApi14.ReactDOM.createPortal(
      /* @__PURE__ */ React12.createElement("div", { className: "manga-tools-panel" }, /* @__PURE__ */ React12.createElement("div", { className: "collapse-header" }, Button ? /* @__PURE__ */ React12.createElement(
        Button,
        {
          className: "minimal collapse-button",
          "aria-expanded": open,
          onClick: () => setOpen(!open)
        },
        /* @__PURE__ */ React12.createElement(
          Icon,
          {
            icon: open ? Solid.faChevronDown : Solid.faChevronRight,
            fixedWidth: true
          }
        ),
        /* @__PURE__ */ React12.createElement("span", null, t(intl, "mangaTools.panel.heading"))
      ) : null), Collapse ? /* @__PURE__ */ React12.createElement(Collapse, { in: open }, body) : body),
      host
    );
  }

  // src/tools/cards.tsx
  var PluginApi15 = requirePluginApi();
  var React13 = PluginApi15.React;
  function useLocale() {
    return PluginApi15.libraries.Intl.useIntl().locale;
  }
  function LanguageBadge(props) {
    var _a3;
    useGlobalVersion();
    const locale = useLocale();
    const info = NS.describe(
      pickLanguage((_a3 = store) == null ? void 0 : _a3.get(String(props.galleryId))),
      locale
    );
    if (!info) return null;
    return languageChip(info);
  }
  var POPOVER_ANCHOR_CLASS = "manga-tools-popover-anchor";
  var POPOVER_SLOT_CLASS = "manga-tools-popover-slot";
  var POPOVER_ROW_CLASS = "manga-tools-popovers";
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
    const intl = PluginApi15.libraries.Intl.useIntl();
    const manga = storedIsManga(props.galleryId);
    const slot = manga ? ensurePopoverSlot(props.galleryId) : null;
    if (!manga || !NS.coverIcon) return null;
    return /* @__PURE__ */ React13.createElement(React13.Fragment, null, /* @__PURE__ */ React13.createElement("span", { className: POPOVER_ANCHOR_CLASS, "data-gallery": props.galleryId }), slot ? PluginApi15.ReactDOM.createPortal(
      /* @__PURE__ */ React13.createElement(
        "button",
        {
          type: "button",
          className: "minimal btn btn-primary manga-tools-mark",
          title: t(intl, "mangaTools.manga.marked")
        },
        /* @__PURE__ */ React13.createElement(MangaIcon, null)
      ),
      slot
    ) : null);
  }

  // src/tools/mark.ts
  var _PluginApi = requirePluginApi();
  var editForm = null;
  function editFormFor(galleryId2) {
    return editForm && editForm.galleryId === galleryId2 ? editForm : null;
  }
  function isMarkedNow(galleryId2, values) {
    if (store === null || !galleryId2) return NS.isManga(values);
    return storedIsManga(galleryId2);
  }
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
    var _a3, _b3;
    const current2 = (_a3 = store) == null ? void 0 : _a3.get(galleryId2);
    if (current2) {
      (_b3 = store) == null ? void 0 : _b3.set(galleryId2, NS.setField(current2, CHAPTER_FIELD_NAME, json));
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
  function setEditForm(form2) {
    editForm = form2;
  }

  // src/tools/toolbar.tsx
  var PluginApi16 = requirePluginApi();
  var React14 = PluginApi16.React;
  var _a2, _b2;
  var CAN_WRITE2 = typeof ((_b2 = (_a2 = PluginApi16.utils) == null ? void 0 : _a2.StashService) == null ? void 0 : _b2.getClient) === "function";
  if (!CAN_WRITE2) {
    console.error(
      "[mangaTools] this Stash has no Apollo client, so the toolbar switch cannot be shown. The rest of the plugin is unaffected."
    );
  }
  function ConfirmDialog(props) {
    const Bootstrap = PluginApi16.libraries.Bootstrap;
    const Modal = Bootstrap == null ? void 0 : Bootstrap.Modal;
    const Button = Bootstrap == null ? void 0 : Bootstrap.Button;
    if (!Modal || !Button || !Modal.Body || !Modal.Footer) return null;
    return /* @__PURE__ */ React14.createElement(Modal, { show: true, size: "sm", onHide: props.onCancel }, /* @__PURE__ */ React14.createElement(Modal.Body, null, props.children), /* @__PURE__ */ React14.createElement(Modal.Footer, null, /* @__PURE__ */ React14.createElement(Button, { variant: "secondary", onClick: props.onCancel }, props.cancelLabel), /* @__PURE__ */ React14.createElement(Button, { variant: props.variant, onClick: props.onConfirm }, props.confirmLabel)));
  }
  function ConfirmUnmark(props) {
    const intl = PluginApi16.libraries.Intl.useIntl();
    return /* @__PURE__ */ React14.createElement(
      ConfirmDialog,
      {
        variant: "danger",
        confirmLabel: t(intl, "mangaTools.manga.confirmOk"),
        cancelLabel: t(intl, "mangaTools.manga.confirmCancel"),
        onCancel: props.onCancel,
        onConfirm: props.onConfirm
      },
      /* @__PURE__ */ React14.createElement("div", null, t(intl, "mangaTools.manga.confirm")),
      props.resetsForm ? /* @__PURE__ */ React14.createElement("div", null, t(intl, "mangaTools.manga.confirmResetsForm")) : null
    );
  }
  function GalleryToolbar(props) {
    useGlobalVersion();
    useAfterMount();
    const intl = PluginApi16.libraries.Intl.useIntl();
    const busyState = React14.useState(false);
    const busy2 = busyState[0];
    const setBusy = busyState[1];
    const confirmState = React14.useState(false);
    const confirming2 = confirmState[0];
    const setConfirming = confirmState[1];
    const host = ensureToolbarHost();
    if (!host) return null;
    const marked = isMarkedNow(props.galleryId, props.values);
    const write2 = (fields) => {
      var _a3;
      (_a3 = store) == null ? void 0 : _a3.delete(props.galleryId);
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
      if (!NS.confirmUnmark) {
        onConfirmUnmark();
        return;
      }
      setConfirming(true);
    };
    const mark = () => {
      var _a3, _b3, _c;
      const form2 = editFormFor(props.galleryId);
      if (form2) {
        form2.onChange(NS.setField(form2.values, MANGA_FIELD_NAME, NS.MANGA_VALUE));
      }
      (_c = store) == null ? void 0 : _c.set(
        props.galleryId,
        NS.setField(
          (_b3 = (_a3 = store) == null ? void 0 : _a3.get(props.galleryId)) != null ? _b3 : props.values,
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
    return PluginApi16.ReactDOM.createPortal(
      /* @__PURE__ */ React14.createElement(React14.Fragment, null, /* @__PURE__ */ React14.createElement(
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
        /* @__PURE__ */ React14.createElement(MangaIcon, null)
      ), confirming2 ? /* @__PURE__ */ React14.createElement(
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

  // src/tools/index.tsx
  var PluginApi17 = requirePluginApi();
  var React15 = PluginApi17.React;
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
    const components = PluginApi17.components;
    return !!components && !!components["FilteredGalleryList.SidebarSections"];
  }
  var warnedMissingSidebarContainer = false;
  registerPatch("after", "GalleryCard.Overlays", (...args) => {
    var _a3, _b3;
    const props = args[0];
    const result = resultFrom(args);
    noteFired("GalleryCard.Overlays");
    const id = (_a3 = props.gallery) == null ? void 0 : _a3.id;
    const value = id ? pickLanguage((_b3 = store) == null ? void 0 : _b3.get(String(id))) : "";
    if (!value || !NS.showCoverBadge || !NS.fieldShowing("language"))
      return result;
    return /* @__PURE__ */ React15.createElement(React15.Fragment, null, result, /* @__PURE__ */ React15.createElement(LanguageBadge, { galleryId: id }));
  });
  registerPatch("after", "GalleryCard.Popovers", (...args) => {
    var _a3;
    const props = args[0];
    const result = resultFrom(args);
    noteFired("GalleryCard.Popovers");
    const id = (_a3 = props.gallery) == null ? void 0 : _a3.id;
    if (!id || !storedIsManga(String(id))) return result;
    return /* @__PURE__ */ React15.createElement(React15.Fragment, null, result, /* @__PURE__ */ React15.createElement(MangaPopoverMark, { galleryId: String(id) }));
  });
  registerPatch("instead", "CustomFieldsInput", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("CustomFieldsInput");
    useGlobalVersion();
    React15.useEffect(() => {
      var _a3;
      const galleryId2 = currentGalleryId();
      if (props.onChange && galleryId2) {
        setEditForm({
          galleryId: galleryId2,
          values: (_a3 = props.values) != null ? _a3 : {},
          onChange: props.onChange
        });
      }
      return () => {
        setEditForm(null);
      };
    });
    return /* @__PURE__ */ React15.createElement(React15.Fragment, null, isMarkedNow(currentGalleryId(), props.values) ? /* @__PURE__ */ React15.createElement(MangaFieldBlock, { values: props.values, onChange: props.onChange }) : null, /* @__PURE__ */ React15.createElement(Original, { ...props }));
  });
  function takesOverFieldRow(key) {
    if (!NS.ownField(key)) return false;
    const name = NS.fieldNameOf(key);
    if (!name) return true;
    return !NS.showDisabledFields || NS.fieldShowing(name);
  }
  registerPatch("instead", "CustomFieldInput", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("CustomFieldInput");
    if (!props.isNew && takesOverFieldRow(props.field)) {
      return null;
    }
    return /* @__PURE__ */ React15.createElement(Original, { ...props });
  });
  registerPatch("instead", "CustomFields", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("CustomFields");
    useGlobalVersion();
    const values = props.values;
    if (!values || typeof values !== "object") return /* @__PURE__ */ React15.createElement(Original, { ...props });
    const rest = Object.assign({}, values);
    let lifted = false;
    Object.keys(values).forEach((k) => {
      if (!takesOverFieldRow(k)) return;
      lifted = true;
      delete rest[k];
    });
    const galleryId2 = currentGalleryId();
    const Guard = guardedBlock();
    if (!lifted && !galleryId2) return /* @__PURE__ */ React15.createElement(Original, { ...props });
    return /* @__PURE__ */ React15.createElement(React15.Fragment, null, /* @__PURE__ */ React15.createElement(
      Original,
      {
        ...lifted ? Object.assign({}, props, { values: rest }) : props
      }
    ), galleryId2 && isMarkedNow(galleryId2, values) ? /* @__PURE__ */ React15.createElement(Guard, { name: "manga panel" }, /* @__PURE__ */ React15.createElement(MangaDetailsPanel, { values })) : null, galleryId2 && CAN_WRITE2 ? /* @__PURE__ */ React15.createElement(GalleryToolbar, { galleryId: galleryId2, values }) : null);
  });
  registerPatch("instead", "PluginSettings", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("PluginSettings");
    if (props.pluginID === PLUGIN_ID) {
      return /* @__PURE__ */ React15.createElement(MangaToolsSettings, null);
    }
    return /* @__PURE__ */ React15.createElement(Original, { ...props });
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
    return /* @__PURE__ */ React15.createElement(React15.Fragment, null, /* @__PURE__ */ React15.createElement(SidebarMangaFilter, { filter }), NS.filterShowing("language") ? /* @__PURE__ */ React15.createElement(SidebarLanguageFilter, { filter }) : null, NS.filterShowing("censorship") ? /* @__PURE__ */ React15.createElement(SidebarCensorshipFilter, { filter }) : null, NS.filterShowing("translationGroup") ? /* @__PURE__ */ React15.createElement(SidebarTranslationGroupFilter, { filter }) : null, NS.filterShowing("original") ? /* @__PURE__ */ React15.createElement(SidebarOriginalFilter, { filter }) : null, result);
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
    if (props.filter && NS.fieldShowing("language")) {
      registerLanguageCriterionOption(props.filter);
    }
    return /* @__PURE__ */ React15.createElement(React15.Fragment, null, NS.fieldShowing("language") ? /* @__PURE__ */ React15.createElement(DialogLanguageFilter, { filter: props.filter }) : null, /* @__PURE__ */ React15.createElement(Original, { ...props }));
  });
  registerPatch("after", "RatingSystem", (...args) => {
    noteFired("RatingSystem");
    const props = args[0];
    if (props.clickToRate || props.withoutContext) return resultFrom(args);
    return /* @__PURE__ */ React15.createElement(React15.Fragment, null, resultFrom(args), /* @__PURE__ */ React15.createElement(BulkFieldsRow, null));
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
