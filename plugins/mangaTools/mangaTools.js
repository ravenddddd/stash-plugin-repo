"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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

  // src/fields.ts
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
  NS.ownField = (key) => {
    const k = String(key != null ? key : "").trim().toLowerCase();
    if (k === "") return "";
    const names = [
      NS.FIELD_NAME,
      NS.CENSORSHIP_FIELD_NAME,
      NS.MANGA_FIELD_NAME,
      NS.TRANSLATION_GROUP_FIELD_NAME,
      NS.ORIGINAL_FIELD_NAME
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

  // src/messages/en.json
  var en_default = {
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
    "mangaTools.translationGroup.suggestedLanguage": "This group's galleries usually carry this language",
    "mangaTools.bulk.remove": "Remove",
    "mangaTools.bulk.unmarkWarning": "Unmarking removes this plugin's manga, language, censorship and translation group fields from the selected galleries."
  };

  // src/messages/zh-Hans.json
  var zh_Hans_default = {
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
    "mangaTools.translationGroup.suggestedLanguage": "\u8BE5\u7FFB\u8BD1\u7EC4\u7684\u753B\u5ECA\u901A\u5E38\u662F\u8FD9\u79CD\u8BED\u8A00",
    "mangaTools.bulk.remove": "\u79FB\u9664",
    "mangaTools.bulk.unmarkWarning": "\u53D6\u6D88\u6807\u8BB0\u4F1A\u4ECE\u9009\u4E2D\u7684\u753B\u5ECA\u4E2D\u79FB\u9664\u672C\u63D2\u4EF6\u7684\u6F2B\u753B\u3001\u8BED\u8A00\u3001\u4FEE\u6B63\u548C\u7FFB\u8BD1\u7EC4\u5B57\u6BB5\u3002"
  };

  // src/messages/zh-Hant.json
  var zh_Hant_default = {
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
  var ALIASES = { zh: "zh-Hans" };
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
    var _a, _b;
    return (_b = (_a = catalogFor(intl.locale)[id]) != null ? _a : CATALOGS.en[id]) != null ? _b : id;
  }
  NS.t = t;
  NS.catalogFor = catalogFor;
  NS.catalogs = catalogs;

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

  // src/censorship.tsx
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

  // src/filter-model.ts
  var CUSTOM_FIELDS_TYPE = "custom_fields";
  var LANGUAGE_TYPE = "language";
  var EMPTY_SELECTION = {
    modifier: "",
    included: [],
    excluded: []
  };
  function registerLanguageCriterionOption(filter) {
    var _a;
    const options = (_a = filter == null ? void 0 : filter.options) == null ? void 0 : _a.criterionOptions;
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
    var _a;
    const criteria = (filter == null ? void 0 : filter.criteria) || [];
    for (let i = 0; i < criteria.length; i++) {
      const option = (_a = criteria[i]) == null ? void 0 : _a.criterionOption;
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
    var _a;
    const criterion = languageCriterionOf(filter);
    if (!criterion) return;
    if (criterion.criterionOption && criterion.criterionOption.type === LANGUAGE_TYPE) {
      return;
    }
    const options = ((_a = filter.options) == null ? void 0 : _a.criterionOptions) || [];
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
    const field = NS.ownField(condition.field);
    if (field === NS.FIELD_NAME) return languageConditionLabel(intl, condition);
    if (field === NS.CENSORSHIP_FIELD_NAME)
      return censorshipConditionLabel(intl, condition);
    if (field === NS.MANGA_FIELD_NAME)
      return mangaConditionLabel(intl, condition);
    return null;
  }
  function tagLabels(intl, criterion) {
    const conditions = criterion.value || [];
    const labels = [];
    for (let i = 0; i < conditions.length; i++) {
      const label = conditionLabel(intl, conditions[i]);
      if (label === null) return null;
      labels.push(label);
    }
    return labels.length ? labels : null;
  }
  function fieldTagLabels(intl, filter, fieldName) {
    const criterion = customFieldsCriterion(filter);
    const conditions = (criterion == null ? void 0 : criterion.value) || [];
    const labels = [];
    for (let i = 0; i < conditions.length; i++) {
      if (NS.ownField(conditions[i].field) !== fieldName) continue;
      const label = conditionLabel(intl, conditions[i]);
      if (label === null) return null;
      labels.push(label);
    }
    return labels.length ? labels : null;
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
    var _a;
    if (!filter || typeof filter.clone !== "function") return null;
    const options = ((_a = filter.options) == null ? void 0 : _a.criterionOptions) || [];
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
    var _a;
    if (!filter || typeof filter.clone !== "function") return null;
    const options = ((_a = filter.options) == null ? void 0 : _a.criterionOptions) || [];
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
    var _a;
    if (!filter || typeof filter.clone !== "function") return null;
    const options = ((_a = filter.options) == null ? void 0 : _a.criterionOptions) || [];
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

  // src/filter-ui.tsx
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
    const text = tag.firstChild;
    if ((text == null ? void 0 : text.nodeType) !== 3) return false;
    const value = String(text.nodeValue).trim();
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

  // src/dialog-filter.tsx
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
  function manageDialogTags(labels) {
    const tags = dialogLanguageTags();
    for (let i = 0; i < tags.length; i++) {
      const label = i < labels.length ? labels[i] : null;
      const text = tagText(tags[i]);
      if (label !== null && text.nodeValue !== label) {
        text.nodeValue = label;
        tags[i].setAttribute(TAG_MARK, label);
      }
      const display = label === null ? "none" : "";
      if (tags[i].style.display !== display) tags[i].style.display = display;
    }
  }
  function ownTagLabels(labels) {
    return labels.slice(dialogLanguageTags().length);
  }
  function clickedTagRemove(target) {
    if (!target || typeof target.closest !== "function") return false;
    if (!target.closest(".edit-filter-dialog")) return false;
    if (!target.closest(".filter-tags .tag-item button")) return false;
    const tag = target.closest(".tag-item");
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
      ownTags.map((label, index) => /* @__PURE__ */ React3.createElement(
        LanguageTag,
        {
          key: index,
          label,
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

  // src/sidebar-filter.tsx
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
  function writeTagLabels(tags, labels, mark) {
    for (let i = 0; i < tags.length && i < labels.length; i++) {
      tagText(tags[i]).nodeValue = labels[i];
      tags[i].setAttribute(mark, labels[i]);
    }
  }
  function relabelTags(labels) {
    writeTagLabels(listLanguageTags(), labels, TAG_MARK);
  }
  function relabelCensorshipTags(labels) {
    writeTagLabels(listCensorshipTags(), labels, CENSORSHIP_TAG_MARK);
  }
  function relabelMangaTags(labels) {
    writeTagLabels(listMangaTags(), labels, MANGA_TAG_MARK);
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
    function update(next) {
      applyLanguage(props.filter, history, next);
      if (!isTouchDevice() && searchRef.current) {
        searchRef.current.focus();
      }
    }
    function toggleInclude(code) {
      update(toggleIncluded(selection, code));
    }
    function toggleExclude(code) {
      update(toggleExcluded(selection, code));
    }
    function setModifier(modifier) {
      update(withModifier(selection, modifier));
    }
    function clearModifier() {
      update(withoutModifier(selection));
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
    function update(next) {
      applyCensorship(props.filter, history, next);
    }
    function toggleInclude(value) {
      update(toggleIncluded(selection, value));
    }
    function toggleExclude(value) {
      update(toggleExcluded(selection, value));
    }
    function setModifier(modifier) {
      update(withModifier(selection, modifier));
    }
    function clearModifier() {
      update(withoutModifier(selection));
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

  // src/mangaTools.tsx
  var PluginApi5 = requirePluginApi();
  var React5 = PluginApi5.React;
  var FIELD_NAME = NS.FIELD_NAME;
  var CENSORSHIP_FIELD_NAME = NS.CENSORSHIP_FIELD_NAME;
  var MANGA_FIELD_NAME = NS.MANGA_FIELD_NAME;
  var TRANSLATION_GROUP_FIELD_NAME = NS.TRANSLATION_GROUP_FIELD_NAME;
  var ORIGINAL_FIELD_NAME = NS.ORIGINAL_FIELD_NAME;
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
  function registerPatch(kind, target, fn) {
    try {
      PluginApi5.patch[kind](target, fn);
    } catch (e) {
      console.error(
        "[mangaTools] could not register the " + target + " patch:",
        e
      );
    }
  }
  var firedOnce = {};
  function noteFired(target) {
    if (firedOnce[target]) return;
    firedOnce[target] = true;
    console.info("[mangaTools] patch active: " + target);
  }
  var store = null;
  var listeners = /* @__PURE__ */ new Set();
  var inFlight = null;
  var started = false;
  var lastLoggedSize = -1;
  var currentPath = window.location.pathname || "";
  function emit() {
    listeners.forEach((fn) => {
      fn();
    });
  }
  function subscribe(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
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
  function gqlDoc(text, what) {
    var _a;
    const Apollo = PluginApi5.libraries.Apollo;
    const gql = (Apollo == null ? void 0 : Apollo.gql) || ((_a = PluginApi5.GQL) == null ? void 0 : _a.gql);
    if (!gql) {
      console.error("[mangaTools] gql not available, cannot " + what);
      return null;
    }
    return gql(text);
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
  function getQuery(field) {
    if (QUERIES[field]) return QUERIES[field];
    QUERIES[field] = gqlDoc(
      [
        "query MangaToolsMap {",
        "  findGalleries(",
        "    gallery_filter: {",
        '      custom_fields: [{ field: "' + field + '", modifier: NOT_NULL }]',
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
    return QUERIES[field];
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
      var _a;
      const data = res == null ? void 0 : res.data;
      const plugins = (_a = data == null ? void 0 : data.configuration) == null ? void 0 : _a.plugins;
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
    var _a;
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
    if ((_a = PluginApi5.Event) == null ? void 0 : _a.addEventListener) {
      PluginApi5.Event.addEventListener("stash:location", (e) => {
        var _a2, _b;
        const ev = e;
        const loc = (_b = (_a2 = ev == null ? void 0 : ev.detail) == null ? void 0 : _a2.data) == null ? void 0 : _b.location;
        currentPath = (loc == null ? void 0 : loc.pathname) || window.location.pathname || "";
        refresh();
        refreshSettings();
        emit();
      });
    }
  }
  function refreshAfterWrite() {
    const pending = inFlight;
    if (pending) {
      pending.then(() => {
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
  function ensurePopoverSlot(galleryId) {
    const anchor = document.querySelector(
      '[data-gallery="' + galleryId + '"]'
    );
    if (!(anchor == null ? void 0 : anchor.parentNode)) return null;
    const previous = anchor.previousElementSibling;
    let row;
    if (hasClass(previous, "card-popovers") || hasClass(previous, POPOVER_ROW_CLASS)) {
      row = previous;
    } else {
      row = document.createElement("div");
      row.className = "btn-group card-popovers " + POPOVER_ROW_CLASS;
      anchor.parentNode.insertBefore(row, anchor);
    }
    let slot = null;
    for (let i = 0; i < row.children.length; i++) {
      if (hasClass(row.children[i], POPOVER_SLOT_CLASS)) {
        slot = row.children[i];
        break;
      }
    }
    if (slot) {
      if (row.lastElementChild !== slot) row.appendChild(slot);
      return slot;
    }
    slot = document.createElement("span");
    slot.className = POPOVER_SLOT_CLASS;
    row.appendChild(slot);
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
  var CAN_WRITE = typeof PluginApi5.utils.StashService.getClient === "function";
  if (!CAN_WRITE) {
    console.error(
      "[mangaTools] this Stash has no Apollo client, so the toolbar switch cannot be shown. The rest of the plugin is unaffected."
    );
  }
  var toolbarHost = null;
  function ensureToolbarHost() {
    const button = document.querySelector(".gallery-toolbar .organized-button");
    if (!button) return toolbarHost;
    const anchor = (button == null ? void 0 : button.parentNode) || null;
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
  function storedIsManga(galleryId) {
    var _a;
    return (_a = store == null ? void 0 : store.has(String(galleryId))) != null ? _a : false;
  }
  function ConfirmUnmark(props) {
    const intl = PluginApi5.libraries.Intl.useIntl();
    const Bootstrap = PluginApi5.libraries.Bootstrap;
    const Modal = Bootstrap == null ? void 0 : Bootstrap.Modal;
    const Button = Bootstrap == null ? void 0 : Bootstrap.Button;
    if (!Modal || !Button || !Modal.Body || !Modal.Footer) return null;
    return /* @__PURE__ */ React5.createElement(Modal, { show: true, size: "sm", onHide: props.onCancel }, /* @__PURE__ */ React5.createElement(Modal.Body, null, /* @__PURE__ */ React5.createElement("div", null, t(intl, "mangaTools.manga.confirm")), props.resetsForm ? /* @__PURE__ */ React5.createElement("div", null, t(intl, "mangaTools.manga.confirmResetsForm")) : null), /* @__PURE__ */ React5.createElement(Modal.Footer, null, /* @__PURE__ */ React5.createElement(Button, { variant: "secondary", onClick: props.onCancel }, t(intl, "mangaTools.manga.confirmCancel")), /* @__PURE__ */ React5.createElement(Button, { variant: "danger", onClick: props.onConfirm }, t(intl, "mangaTools.manga.confirmOk"))));
  }
  var editForm = null;
  function editFormFor(galleryId) {
    return editForm && editForm.galleryId === galleryId ? editForm : null;
  }
  var originalGroupTaken = null;
  function isMarkedNow(galleryId, values) {
    if (store === null || !galleryId) return NS.isManga(values);
    return storedIsManga(galleryId);
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
  function writeQuietly(galleryId, fields) {
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
      variables: { input: { id: galleryId, custom_fields: fields } }
    });
  }
  function GalleryToolbar(props) {
    useGlobalVersion();
    useAfterMount();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const busyState = React5.useState(false);
    const busy = busyState[0];
    const setBusy = busyState[1];
    const confirmState = React5.useState(false);
    const confirming = confirmState[0];
    const setConfirming = confirmState[1];
    const host = ensureToolbarHost();
    if (!host) return null;
    const marked = isMarkedNow(props.galleryId, props.values);
    const write = (fields) => {
      store == null ? void 0 : store.delete(props.galleryId);
      const form = editFormFor(props.galleryId);
      if (form) {
        form.onChange(NS.clearFields(form.values));
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
      var _a;
      const form = editFormFor(props.galleryId);
      if (form) {
        form.onChange(NS.setField(form.values, MANGA_FIELD_NAME, NS.MANGA_VALUE));
      }
      store == null ? void 0 : store.set(
        props.galleryId,
        NS.setField(
          (_a = store == null ? void 0 : store.get(props.galleryId)) != null ? _a : props.values,
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
      write({ remove: NS.fieldsToClear(props.values) });
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
          disabled: busy,
          onClick: onToggle
        },
        /* @__PURE__ */ React5.createElement(MangaIcon, null)
      ), confirming ? /* @__PURE__ */ React5.createElement(
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
    const label = anchor.querySelector("label");
    const control = label == null ? void 0 : label.nextElementSibling;
    if (!label || !control) return null;
    return {
      group: anchor.className,
      label: label.className,
      control: control.className
    };
  }
  function MangaFieldBlock(props) {
    var _a;
    useGlobalVersion();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const Select = resolveSelect();
    const state = React5.useState(NS.openEditBlock);
    const open = state[0];
    const setOpen = state[1];
    const Solid = PluginApi5.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi5.components.Icon;
    const Button = (_a = PluginApi5.libraries.Bootstrap) == null ? void 0 : _a.Button;
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
    const write = (name, value) => {
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
      const galleryId = currentGalleryId();
      let next = props.values;
      if (isOriginal) {
        const taken = originalGroupTaken;
        originalGroupTaken = null;
        next = NS.setField(next, ORIGINAL_FIELD_NAME, "");
        if (taken && taken.galleryId === galleryId && taken.group) {
          next = NS.setField(next, TRANSLATION_GROUP_FIELD_NAME, taken.group);
        }
      } else {
        const group = NS.translationGroupOf(props.values);
        originalGroupTaken = group ? { galleryId, group } : null;
        next = NS.setField(next, ORIGINAL_FIELD_NAME, NS.ORIGINAL_VALUE);
        next = NS.setField(next, TRANSLATION_GROUP_FIELD_NAME, "");
      }
      if (props.onChange) props.onChange(next);
    };
    const restoresGroup = !!originalGroupTaken && originalGroupTaken.galleryId === currentGalleryId() && !!originalGroupTaken.group;
    const current = NS.describe(pickLanguage(props.values), intl.locale);
    let options = NS.languageOptions(intl.locale).filter(
      (o) => {
        return !NS.enabledLanguages || NS.enabledLanguages.has(o.value);
      }
    );
    if (current && !current.known) {
      options = [
        { value: current.code, label: current.name, flag: null },
        ...options
      ];
    }
    const selected = current ? { value: current.code, label: current.name, flag: current.flag } : null;
    const usualLanguages = NS.usualLanguagesOf(store);
    const usual = usualLanguages[NS.groupKey(NS.translationGroupOf(props.values))];
    const offered = usual && (!NS.enabledLanguages || NS.enabledLanguages.has(usual.code)) && (!current || current.code !== usual.code) ? usual : null;
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
        onClick: () => write(FIELD_NAME, offered.code)
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
              write(FIELD_NAME, opt ? opt.value : "");
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
          write(CENSORSHIP_FIELD_NAME, opt ? opt.value : "");
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
      return !!current && !!usualHere && usualHere.code === current.code;
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
        onInputChange: (text, meta) => {
          if ((meta == null ? void 0 : meta.action) !== "input-change") return;
          writeGroup(text.trim() ? text : "");
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
    ), /* @__PURE__ */ React5.createElement(
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
    var _a;
    const defs = query ? query.definitions : null;
    if (!(defs == null ? void 0 : defs.length)) return false;
    const op = defs[0];
    if ((op == null ? void 0 : op.kind) !== "OperationDefinition") return false;
    const selections = (_a = op.selectionSet) == null ? void 0 : _a.selections;
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
    const current = langShown && langShown !== BULK_REMOVE_VALUE ? NS.describe(langShown, intl.locale) : null;
    const currentCode = current ? current.code : "";
    if (current && !options.some((o) => o.value === currentCode)) {
      options = [
        { value: current.code, label: current.name, flag: current.flag },
        ...options
      ];
    }
    const selected = langShown === BULK_REMOVE_VALUE ? removeOption : current ? { value: current.code, label: current.name, flag: current.flag } : null;
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
  var GuardedBlock = class extends React5.Component {
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
  var DETAILS_OPEN_BY_DEFAULT = false;
  var EDIT_OPEN_BY_DEFAULT = true;
  var HIDE_PERFORMERS_BY_DEFAULT = true;
  NS.openDetailsBlock = DETAILS_OPEN_BY_DEFAULT;
  NS.openEditBlock = EDIT_OPEN_BY_DEFAULT;
  NS.hidePerformers = HIDE_PERFORMERS_BY_DEFAULT;
  function MangaDetailsPanel(props) {
    var _a, _b;
    useGlobalVersion();
    const intl = PluginApi5.libraries.Intl.useIntl();
    const state = React5.useState(NS.openDetailsBlock);
    const open = state[0];
    const setOpen = state[1];
    const language = NS.describe(pickLanguage(props.values), intl.locale);
    const mark = censorshipOf(props.values);
    const group = NS.translationGroupOf(props.values);
    const original = NS.isOriginal(props.values);
    const Solid = PluginApi5.libraries.FontAwesomeSolid || {};
    const Icon = PluginApi5.components.Icon;
    const Button = (_a = PluginApi5.libraries.Bootstrap) == null ? void 0 : _a.Button;
    const Collapse = (_b = PluginApi5.libraries.Bootstrap) == null ? void 0 : _b.Collapse;
    if (!language && !mark && !group && !original) return null;
    const host = ensureDetailHost();
    if (!host) return null;
    const showFlag = NS.showFlags && !!(language == null ? void 0 : language.flag);
    const body = /* @__PURE__ */ React5.createElement("div", { className: "manga-tools-panel-body" }, mark ? /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.censorship.heading") + ": ", /* @__PURE__ */ React5.createElement(CensorshipIcon, { value: mark }), mark ? " " : null, NS.censorshipLabel(intl, mark)) : null, language ? /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, fieldLabel2(intl) + ": ", showFlag ? /* @__PURE__ */ React5.createElement(Flag2, { flag: language.flag, className: "manga-tools-flag" }) : null, showFlag ? " " : null, language.name) : null, group ? (
      // No icon and no flag: a group's name is its own, and there is nothing
      // here to draw beside it. Drawn last, because it is the one row that is
      // the same shape on every gallery rather than picked from a list.
      /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.translationGroup.heading") + ": ", group)
    ) : null, original ? (
      // Under the same label as the group, because it answers the same question:
      // this gallery was not translated. The wording carries that — a bare "原文"
      // under "Translation group:" would read like a group called that, which is
      // the reading this field exists to avoid.
      /* @__PURE__ */ React5.createElement("h6", { className: "manga-tools-detail" }, t(intl, "mangaTools.translationGroup.heading") + ": ", t(intl, "mangaTools.translationGroup.originalDetail"))
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
    var _a;
    const props = args[0];
    const result = resultFrom(args);
    noteFired("GalleryCard.Overlays");
    const id = (_a = props.gallery) == null ? void 0 : _a.id;
    const value = id ? pickLanguage(store == null ? void 0 : store.get(String(id))) : "";
    if (!value || !NS.showCoverBadge) return result;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, result, /* @__PURE__ */ React5.createElement(LanguageBadge, { galleryId: id }));
  });
  registerPatch("after", "GalleryCard.Popovers", (...args) => {
    var _a;
    const props = args[0];
    const result = resultFrom(args);
    noteFired("GalleryCard.Popovers");
    const id = (_a = props.gallery) == null ? void 0 : _a.id;
    if (!id || !storedIsManga(String(id))) return result;
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, result, /* @__PURE__ */ React5.createElement(MangaPopoverMark, { galleryId: String(id) }));
  });
  registerPatch("instead", "CustomFieldsInput", (...args) => {
    const props = args[0];
    const Original = originalFrom(args);
    noteFired("CustomFieldsInput");
    useGlobalVersion();
    React5.useEffect(() => {
      var _a;
      const galleryId = currentGalleryId();
      if (props.onChange && galleryId) {
        editForm = {
          galleryId,
          values: (_a = props.values) != null ? _a : {},
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
    const panel = document.querySelector(".gallery-details");
    if (!panel) {
      detailHost = null;
      return null;
    }
    if (!detailHost) {
      detailHost = document.createElement("div");
      detailHost.className = DETAIL_HOST_CLASS;
    }
    if (detailHost.parentNode !== panel || panel.lastElementChild !== detailHost) {
      panel.appendChild(detailHost);
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
    const galleryId = currentGalleryId();
    if (!lifted && !galleryId) return /* @__PURE__ */ React5.createElement(Original, { ...props });
    return /* @__PURE__ */ React5.createElement(React5.Fragment, null, /* @__PURE__ */ React5.createElement(
      Original,
      {
        ...lifted ? Object.assign({}, props, { values: rest }) : props
      }
    ), galleryId && isMarkedNow(galleryId, values) ? /* @__PURE__ */ React5.createElement(GuardedBlock, { name: "manga panel" }, /* @__PURE__ */ React5.createElement(MangaDetailsPanel, { values })) : null, galleryId && CAN_WRITE ? /* @__PURE__ */ React5.createElement(GalleryToolbar, { galleryId, values }) : null);
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
  start();
})();
