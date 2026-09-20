"use strict";

// src/settings.ts
var BUILT_IN_DEFAULTS = {
  excludedPlayerIds: [],
  // The first player in the plugin's own list. Anything else is corrected when the
  // settings are resolved against the list of buttons that still exist.
  singlePlayerId: "iina",
  singlePlayerMode: false,
  showSceneCardButtons: true,
  showSceneDetailButtons: true,
  showSceneToolbarButtons: true
};
var PLATFORM_KEYS = [
  "windows",
  "macos",
  "ios",
  "android",
  "linux",
  "other"
];
var PLATFORM_CHOICES = [
  "windows",
  "macos",
  "ios",
  "android",
  "linux"
];
function platformKey(userAgent, maxTouchPoints = 0) {
  const ua = String(userAgent || "");
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "ios";
  if (/Macintosh|MacIntel/i.test(ua)) {
    return maxTouchPoints > 1 ? "ios" : "macos";
  }
  if (/Windows|compatible/i.test(ua)) return "windows";
  if (/Ubuntu|Linux/i.test(ua)) return "linux";
  return "other";
}
var bool = (value) => typeof value === "boolean" ? value : void 0;
var text = (value) => typeof value === "string" && value ? value : void 0;
function readSettingsValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value;
  return {
    excludedPlayerIds: Array.isArray(raw.excludedPlayerIds) ? raw.excludedPlayerIds.filter((id) => typeof id === "string") : void 0,
    singlePlayerId: text(raw.singlePlayerId),
    singlePlayerMode: bool(raw.singlePlayerMode),
    showSceneCardButtons: bool(raw.showSceneCardButtons),
    showSceneDetailButtons: bool(raw.showSceneDetailButtons),
    showSceneToolbarButtons: bool(raw.showSceneToolbarButtons)
  };
}
function parseSettings(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value;
  if (record.version !== 2) return null;
  const platforms = {};
  const stored2 = record.platforms;
  if (stored2 && typeof stored2 === "object" && !Array.isArray(stored2)) {
    for (const key of PLATFORM_KEYS) {
      const entry = stored2[key];
      if (entry === void 0) continue;
      const settings = dropUndefined(readSettingsValue(entry));
      if (Object.keys(settings).length > 0) platforms[key] = settings;
    }
  }
  return {
    version: 2,
    default: dropUndefined(readSettingsValue(record.default)),
    platforms
  };
}
function resolveDefault(stored2) {
  return { ...BUILT_IN_DEFAULTS, ...dropUndefined(stored2?.default) };
}
function resolveSettings(stored2, platform2) {
  return {
    ...resolveDefault(stored2),
    ...dropUndefined(stored2?.platforms?.[platform2])
  };
}
function hasOverride(stored2, platform2) {
  return stored2?.platforms?.[platform2] !== void 0;
}
function withDefaultSettings(stored2, settings) {
  return { ...fromStored(stored2), default: settings };
}
function withPlatformSettings(stored2, platform2, settings) {
  const next = fromStored(stored2);
  const platforms = { ...next.platforms };
  if (settings === null) delete platforms[platform2];
  else platforms[platform2] = settings;
  return { ...next, platforms };
}
function fromStored(stored2) {
  return stored2 ? { version: 2, default: { ...stored2.default }, platforms: { ...stored2.platforms } } : { version: 2, default: {}, platforms: {} };
}
function dropUndefined(value) {
  if (!value) return {};
  const next = {};
  for (const [key, field] of Object.entries(value)) {
    if (field !== void 0) next[key] = field;
  }
  return next;
}

// src/store.ts
var PLUGIN_ID = "external-player-launcher";
var SETTINGS_QUERY = [
  "query ExternalPlayerSettings {",
  "  configuration {",
  "    plugins",
  "  }",
  "}"
].join("\n");
var SAVE_MUTATION = [
  "mutation ExternalPlayerSettingsSave($id: ID!, $input: Map!) {",
  "  configurePlugin(plugin_id: $id, input: $input)",
  "}"
].join("\n");
function pluginApi() {
  return window.PluginApi;
}
var cache = null;
var loading = null;
var listeners = /* @__PURE__ */ new Set();
var documents = {};
function buildDocument(text2) {
  const api = pluginApi();
  const gql = api.libraries?.Apollo?.gql || api.GQL?.gql;
  if (!gql) {
    console.error(
      "[external-player-launcher] gql is not available, so the settings cannot be read from or written to Stash"
    );
    return null;
  }
  return gql(text2);
}
function queryDocument() {
  if (!documents.query) documents.query = buildDocument(SETTINGS_QUERY);
  return documents.query;
}
function mutationDocument() {
  if (!documents.mutation) documents.mutation = buildDocument(SAVE_MUTATION);
  return documents.mutation;
}
function notify() {
  for (const listener of listeners) listener();
}
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
var platform = null;
function currentPlatform() {
  if (platform === null) {
    platform = platformKey(navigator.userAgent, navigator.maxTouchPoints);
  }
  return platform;
}
function read(target = currentPlatform()) {
  return resolveSettings(cache, target);
}
function readDefault() {
  return resolveDefault(cache);
}
function stored() {
  return cache;
}
function load() {
  if (loading) return loading;
  const document2 = queryDocument();
  const client = document2 ? pluginApi().utils.StashService.getClient() : null;
  if (!document2 || !client) return Promise.resolve();
  loading = client.query({ query: document2, fetchPolicy: "no-cache" }).then((result) => {
    const plugins = result?.data?.configuration?.plugins;
    const next = parseSettings(plugins?.[PLUGIN_ID]);
    if (next) cache = next;
    notify();
  }).catch((e) => {
    console.error(
      "[external-player-launcher] could not read the settings from Stash, so this session is using the defaults:",
      e
    );
  }).then(() => {
    loading = null;
  });
  return loading;
}
function save(settings, target = currentPlatform()) {
  return write((stored2) => withPlatformSettings(stored2, target, settings));
}
function saveDefault(settings) {
  return write((stored2) => withDefaultSettings(stored2, settings));
}
function write(next) {
  const document2 = mutationDocument();
  const client = document2 ? pluginApi().utils.StashService.getClient() : null;
  if (!document2 || !client) {
    return Promise.reject(new Error("the settings cannot be saved without gql"));
  }
  const settings = next(cache);
  return client.mutate({
    mutation: document2,
    variables: { id: PLUGIN_ID, input: settings }
  }).then((result) => {
    cache = parseSettings(result?.data?.configurePlugin) ?? settings;
    notify();
  }).catch((e) => {
    console.error(
      "[external-player-launcher] Stash would not take the settings, so they have not changed:",
      e
    );
    throw e;
  });
}

// src/main.tsx
(function() {
  const { PluginApi } = window;
  const { React, ReactDOM } = PluginApi;
  const { Bootstrap, FontAwesomeSolid, FontAwesomeBrands, Intl, ReactSelect } = PluginApi.libraries;
  const {
    Nav,
    Tab,
    Button,
    ButtonGroup,
    Dropdown,
    Modal,
    Form,
    OverlayTrigger,
    Tooltip
  } = Bootstrap;
  const { Icon } = PluginApi.components;
  const { faGear } = FontAwesomeSolid;
  const { useConfiguration } = PluginApi.utils.StashService;
  const { IntlProvider, FormattedMessage } = Intl;
  const Select = ReactSelect.default;
  const PLUGIN_VERSION = "1.4.4";
  const pluginID = PLUGIN_ID;
  const iconsPath = "./plugin/external-player-launcher/assets/icons";
  const localesBase = `./plugin/external-player-launcher/assets/locales`;
  void load();
  const playerButtons = [
    { id: "iina", name: "IINA", onClick: openIINA },
    { id: "infuse", name: "Infuse", onClick: openInfuse },
    { id: "mpchc", name: "MPC-HC", onClick: openMPCHC },
    { id: "mpv", name: "MPV", onClick: openMPV },
    { id: "mxplayer", name: "MX Player", onClick: openMXPlayer },
    { id: "mxplayerpro", name: "MX Player Pro", onClick: openMXPlayerPro },
    { id: "nplayer", name: "nPlayer", onClick: openNPlayer },
    { id: "potplayer", name: "PotPlayer", onClick: openPotplayer },
    { id: "vlc", name: "VLC", onClick: openVlc }
  ];
  const messagesCache = {};
  const defaultLocale = "en-US";
  function loadMessages(locale) {
    if (messagesCache[locale]) return messagesCache[locale];
    const promise = (async () => {
      const tryLoad = async (l) => {
        const res = await fetch(`${localesBase}/${l}.json?v=${PLUGIN_VERSION}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      };
      try {
        return await tryLoad(locale);
      } catch {
        if (locale !== defaultLocale) return loadMessages(defaultLocale);
        return {};
      }
    })();
    messagesCache[locale] = promise;
    return promise;
  }
  function PluginIntlProvider({ children }) {
    const config = useConfiguration();
    const language = config.data?.configuration?.interface?.language;
    const locale = language || defaultLocale;
    const [messages, setMessages] = React.useState({});
    React.useEffect(() => {
      let cancelled = false;
      loadMessages(locale).then((msgs) => {
        if (!cancelled) setMessages(msgs);
      });
      return () => {
        cancelled = true;
      };
    }, [locale]);
    return React.createElement(
      IntlProvider,
      { locale, messages, defaultLocale },
      children
    );
  }
  const defaultSettings = {
    excludedPlayerIds: [],
    singlePlayerId: playerButtons[0].id,
    singlePlayerMode: false,
    showSceneCardButtons: true,
    showSceneDetailButtons: true,
    showSceneToolbarButtons: true
  };
  function cloneSettings(settings) {
    return { ...settings };
  }
  function readSettingsFor(target) {
    const stored2 = target === "default" ? readDefault() : read(target);
    const validIds = playerButtons.map((button) => button.id);
    const settings = { ...stored2 };
    if (!validIds.includes(settings.singlePlayerId)) {
      settings.singlePlayerId = defaultSettings.singlePlayerId;
    }
    settings.excludedPlayerIds = settings.excludedPlayerIds.filter(
      (id) => validIds.includes(id)
    );
    if (settings.excludedPlayerIds.length >= validIds.length) {
      settings.excludedPlayerIds = [];
    }
    return settings;
  }
  function readSettings() {
    return readSettingsFor(currentPlatform());
  }
  function useSettingsState() {
    const [settings, setSettings] = React.useState(() => readSettings());
    React.useEffect(() => subscribe(() => setSettings(readSettings())), []);
    return { settings };
  }
  function filterPlayerButtons(settings) {
    if (settings.singlePlayerMode) {
      const player = playerButtons.find((button) => button.id === settings.singlePlayerId);
      return player ? [player] : [];
    }
    return playerButtons.filter((button) => !settings.excludedPlayerIds.includes(button.id));
  }
  function getSinglePlayerButton(settings) {
    return filterPlayerButtons(settings)[0] || playerButtons[0];
  }
  const OS = {
    isAndroid: () => /android/i.test(navigator.userAgent),
    isIOS: () => /iPad|iPhone|iPod/i.test(navigator.userAgent),
    isMacOS: () => /Macintosh|MacIntel/i.test(navigator.userAgent),
    isApple: () => OS.isMacOS() || OS.isIOS(),
    isWindows: () => /compatible|Windows/i.test(navigator.userAgent),
    isMobile: () => OS.isAndroid() || OS.isIOS(),
    isUbuntu: () => /Ubuntu/i.test(navigator.userAgent),
    isLinux: () => /Linux/i.test(navigator.userAgent),
    isOthers: () => Object.entries(OS).filter(([key, val]) => key !== "isOthers").every(([key, val]) => !val())
  };
  async function writeClipboard(text2) {
    let flag = false;
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text2);
        flag = true;
        console.log("Successfully used navigator.clipboard modern clipboard implementation");
      } catch (error) {
        console.error("Error occurred when copying to clipboard using navigator.clipboard:", error);
      }
    } else {
      flag = writeClipboardLegacy(text2);
      console.log("navigator.clipboard modern clipboard implementation not available, using legacy implementation");
    }
    return flag;
  }
  function writeClipboardLegacy(text2) {
    let textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.style.position = "absolute";
    textarea.style.clip = "rect(0 0 0 0)";
    textarea.value = text2;
    textarea.select();
    if (document.execCommand("copy", true)) {
      return true;
    }
    return false;
  }
  function getSceneInfo(props) {
    let title = props.scene.title;
    const streamUrl = props.scene.paths.stream;
    const captionUrl = props.scene.paths.caption;
    const position = parseInt(props.scene.resume_time) || 0;
    if (!title) {
      const path = props.scene.files?.[0]?.path;
      if (path) {
        title = path.split(/[\\/]/).pop();
      }
    }
    return { title, streamUrl, captionUrl, position, props };
  }
  function getSeek(seconds) {
    const totalMs = Math.round(seconds * 1e3);
    const hours = Math.floor(totalMs / 36e5);
    const minutes = Math.floor(totalMs % 36e5 / 6e4);
    const secs = Math.floor(totalMs % 6e4 / 1e3);
    const ms = totalMs % 1e3;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
  }
  function urlSafeBase64Encode(input) {
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(new TextEncoder().encode(input))])).replace(/\//g, "_").replace(/\+/g, "-").replace(/\=/g, "");
  }
  function openIINA(info) {
    let iinaUrl = `iina://weblink?url=${encodeURIComponent(info.streamUrl)}&new_window=1`;
    console.log(`iinaUrl= ${iinaUrl}`);
    window.open(iinaUrl, "_self");
  }
  function openInfuse(info) {
    let infuseUrl = `infuse://x-callback-url/play?url=${encodeURIComponent(info.streamUrl)}&sub=${encodeURIComponent(info.captionUrl)}`;
    console.log(`infuseUrl= ${infuseUrl}`);
    window.open(infuseUrl, "_self");
  }
  function openMPCHC(info) {
    let mpchcUrl = `mpc-hc://${info.streamUrl}`;
    console.log(`mpchcUrl= ${mpchcUrl}`);
    window.open(mpchcUrl, "_self");
  }
  function openMPV(info) {
    const streamUrl64 = urlSafeBase64Encode(info.streamUrl);
    const subUrl64 = urlSafeBase64Encode(info.captionUrl);
    const title64 = urlSafeBase64Encode(info.title);
    let MPVUrl = `mpv-handler://play/${streamUrl64}/?subfile=${subUrl64}&v_title=${title64}&startat=${info.position}`;
    if (OS.isIOS()) {
      MPVUrl = `mpv://${encodeURI(info.streamUrl)}`;
    }
    if (OS.isMacOS()) {
      MPVUrl = `mpvplay://${encodeURI(info.streamUrl)}`;
    }
    if (OS.isAndroid()) {
      const [scheme, streamBody] = info.streamUrl.split(/:\/\//, 2);
      const positionMs = info.position * 1e3;
      MPVUrl = `intent://${encodeURI(streamBody)}#Intent;scheme=${scheme};package=is.xyz.mpv;action=android.intent.action.VIEW;type=video/any;S.title=${encodeURI(info.title)};S.subs=${encodeURI(info.captionUrl)};i.position=${positionMs};end`;
    }
    console.log("MPVUrl=", MPVUrl);
    window.open(MPVUrl, "_self");
  }
  function openMXPlayer(info) {
    handleMXPlayer(info, false);
  }
  function openMXPlayerPro(info) {
    handleMXPlayer(info, true);
  }
  function handleMXPlayer(info, isPro) {
    const packageName = isPro ? "com.mxtech.videoplayer.pro" : "com.mxtech.videoplayer.ad";
    const [scheme, streamBody] = info.streamUrl.split(/:\/\//, 2);
    const positionMs = info.position * 1e3;
    const url = `intent://${encodeURI(streamBody)}#Intent;scheme=${scheme};package=${packageName};action=android.intent.action.VIEW;type=video/*;S.title=${encodeURI(info.title)};i.position=${positionMs};end`;
    console.log(`mxPlayer url= ${url}`);
    window.open(url, "_self");
  }
  function openNPlayer(info) {
    let nUrl = OS.isMacOS() ? `nplayer-mac://weblink?url=${encodeURIComponent(info.streamUrl)}&new_window=1` : `nplayer-${encodeURI(info.streamUrl)}`;
    console.log(`nPlayer url= ${nUrl}`);
    window.open(nUrl, "_self");
  }
  async function openPotplayer(info) {
    if (!OS.isWindows()) return;
    let potUrl = `potplayer://${encodeURI(info.streamUrl)} /sub=${encodeURI(info.captionUrl)} /seek=${getSeek(info.position)} /title="${info.title}"`;
    await writeClipboard(potUrl);
    console.log("Successfully wrote real deep link to clipboard: ", potUrl);
    potUrl = `potplayer:///current/clipboard`;
    window.open(potUrl, "_self");
  }
  async function openVlc(info) {
    let vlcUrl = `vlc://${info.streamUrl}`;
    if (OS.isAndroid()) {
      const [scheme, streamBody] = info.streamUrl.split(/:\/\//, 2);
      const positionMs = info.position * 1e3;
      vlcUrl = `intent://${encodeURI(streamBody)}#Intent;scheme=${scheme};package=org.videolan.vlc;action=android.intent.action.VIEW;type=video/*;S.subtitles_location=${encodeURI(info.captionUrl)};S.title=${encodeURI(info.title)};i.position=${positionMs};end`;
    }
    if (OS.isIOS()) {
      vlcUrl = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(info.streamUrl)}&sub=${encodeURIComponent(info.captionUrl)}`;
    }
    console.log(`vlcUrl= ${vlcUrl}`);
    window.open(vlcUrl, "_self");
  }
  function injectIntoReactTree(node, predicate, position, newElement) {
    if (!node || !node.props) return false;
    if (predicate(node) && (position === "appendChild" || position === "prependChild")) {
      const c = node.props.children;
      const arr = !c ? [] : Array.isArray(c) ? c : [c];
      position === "appendChild" ? arr.push(newElement) : arr.unshift(newElement);
      node.props.children = arr;
      return true;
    }
    let children = node.props.children;
    if (!children) return false;
    if (!Array.isArray(children) && predicate(children)) {
      children = node.props.children = [children];
    }
    if (Array.isArray(children)) {
      for (let i = 0; i < children.length; i++) {
        if (!children[i]) continue;
        if (predicate(children[i])) {
          if (position === "before") {
            children.splice(i, 0, newElement);
            return true;
          }
          if (position === "after") {
            children.splice(i + 1, 0, newElement);
            return true;
          }
          return injectIntoReactTree(children[i], () => true, position, newElement);
        }
        if (injectIntoReactTree(children[i], predicate, position, newElement)) return true;
      }
    } else {
      return injectIntoReactTree(children, predicate, position, newElement);
    }
    return false;
  }
  const PortalMenu = React.forwardRef(function PortalMenu2(props, ref) {
    return ReactDOM.createPortal(
      /* @__PURE__ */ React.createElement("div", { ref, ...props }),
      document.body
    );
  });
  function createButtonGroup() {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("hr", null), /* @__PURE__ */ React.createElement(ButtonGroup, { className: "card-popovers" }));
  }
  function createPlayIcon(props = {}) {
    return /* @__PURE__ */ React.createElement(
      "svg",
      {
        fill: "currentColor",
        className: "bi bi-play-btn-fill",
        viewBox: "0 0 16 16",
        ...props
      },
      /* @__PURE__ */ React.createElement("path", { d: "M0 12V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm6.79-6.907A.5.5 0 0 0 6 5.5v5a.5.5 0 0 0 .79.407l3.5-2.5a.5.5 0 0 0 0-.814l-3.5-2.5z" })
    );
  }
  function platformName(key) {
    return {
      windows: "Windows",
      macos: "macOS",
      ios: "iOS",
      android: "Android",
      linux: "Linux",
      other: "Other"
    }[key];
  }
  function platformIcon(key) {
    const Brands = PluginApi.libraries.FontAwesomeBrands || {};
    const Solid = PluginApi.libraries.FontAwesomeSolid || {};
    switch (key) {
      case "windows":
        return Brands.faWindows;
      case "macos":
      case "ios":
        return Brands.faApple;
      case "android":
        return Brands.faAndroid;
      case "linux":
        return Brands.faLinux;
      default:
        return Solid.faGlobe;
    }
  }
  function platformOptions(intl) {
    const current = currentPlatform();
    const entries = [
      {
        value: "default",
        label: intl.formatMessage({ id: "settings.platform.default" }),
        icon: platformIcon("default")
      }
    ];
    return entries.concat(
      PLATFORM_CHOICES.map(
        (key) => ({
          value: key,
          label: platformName(key) + (key === current ? ` (${intl.formatMessage({ id: "settings.platform.current" })})` : ""),
          icon: platformIcon(key)
        })
      )
    );
  }
  function formatPlatformOption(option) {
    return /* @__PURE__ */ React.createElement("span", { className: "ep-platform-option" }, option.icon ? /* @__PURE__ */ React.createElement(Icon, { icon: option.icon, fixedWidth: true }) : null, /* @__PURE__ */ React.createElement("span", null, option.label));
  }
  function SettingsModal({ refreshOnSave }) {
    return /* @__PURE__ */ React.createElement(PluginIntlProvider, null, /* @__PURE__ */ React.createElement(SettingsModalInner, { refreshOnSave }));
  }
  function SettingsModalInner({ refreshOnSave }) {
    const intl = Intl.useIntl();
    const [show, setShow] = React.useState(false);
    const { settings } = useSettingsState();
    const [target, setTarget] = React.useState("default");
    const [own, setOwn] = React.useState(false);
    const [draftSettings, setDraftSettings] = React.useState(() => cloneSettings(settings));
    const editable = target === "default" || own;
    const inheriting = !editable;
    const platformOptionsForPanel = platformOptions(intl);
    const platformChoice = platformOptionsForPanel.find(
      (option) => option.value === target
    );
    const selectTarget = (next) => {
      setTarget(next);
      setOwn(next !== "default" && hasOverride(stored(), next));
      setDraftSettings(cloneSettings(readSettingsFor(next)));
    };
    React.useEffect(() => {
      if (!show) {
        setTarget("default");
        setOwn(false);
        setDraftSettings(cloneSettings(readSettingsFor("default")));
      }
    }, [settings, show]);
    const openModal = () => {
      selectTarget("default");
      setShow(true);
    };
    const closeModal = () => {
      selectTarget("default");
      setShow(false);
    };
    const togglePlayer = (playerId) => {
      setDraftSettings((current) => {
        if (current.singlePlayerMode) {
          return { ...current, singlePlayerId: playerId };
        }
        const deselected = current.excludedPlayerIds.includes(playerId) ? current.excludedPlayerIds.filter((id) => id !== playerId) : [...current.excludedPlayerIds, playerId];
        if (deselected.length >= playerButtons.length) {
          return current;
        }
        return {
          ...current,
          excludedPlayerIds: deselected
        };
      });
    };
    const confirmSettings = () => {
      const writing = target === "default" ? saveDefault(draftSettings) : own ? save(draftSettings, target) : save(null, target);
      writing.then(
        () => {
          setShow(false);
          if (refreshOnSave) {
            window.location.reload();
          }
        },
        () => {
        }
      );
    };
    const resetDraftSettings = () => {
      setDraftSettings(cloneSettings(defaultSettings));
    };
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(
      Button,
      {
        variant: "primary",
        className: "external-player-settings-trigger",
        onClick: openModal
      },
      /* @__PURE__ */ React.createElement(Icon, { icon: faGear }),
      /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.openButton" })
    ), /* @__PURE__ */ React.createElement(
      Modal,
      {
        show,
        onHide: closeModal,
        centered: true,
        dialogClassName: "external-player-settings-modal",
        contentClassName: "external-player-settings-modal-content"
      },
      /* @__PURE__ */ React.createElement(Modal.Header, { closeButton: true }, /* @__PURE__ */ React.createElement(Modal.Title, null, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.modal.title" }))),
      /* @__PURE__ */ React.createElement(Modal.Body, null, /* @__PURE__ */ React.createElement("div", { className: "ep-note-block" }, /* @__PURE__ */ React.createElement("strong", null, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.noteBold" })), /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.noteText" })), /* @__PURE__ */ React.createElement("div", { className: "ep-section" }, /* @__PURE__ */ React.createElement("div", { className: "ep-heading" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.platform.title" })), /* @__PURE__ */ React.createElement("div", { className: "ep-options" }, /* @__PURE__ */ React.createElement(
        Select,
        {
          className: "ep-platform-select",
          classNamePrefix: "react-select",
          inputId: "external-player-platform",
          isSearchable: false,
          isClearable: false,
          components: { IndicatorSeparator: () => null },
          menuPortalTarget: document.body,
          value: platformChoice,
          options: platformOptionsForPanel,
          formatOptionLabel: formatPlatformOption,
          onChange: (option) => selectTarget(option?.value || "default")
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "ep-hint" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.platform.hint" }))), target !== "default" ? /* @__PURE__ */ React.createElement("div", { className: "ep-options" }, /* @__PURE__ */ React.createElement(
        Form.Check,
        {
          type: "switch",
          id: "external-player-platform-own",
          label: intl.formatMessage({ id: "settings.platform.own" }),
          checked: own,
          onChange: (event) => {
            const next = event.target.checked;
            setOwn(next);
            if (!next) setDraftSettings(cloneSettings(readSettingsFor("default")));
          }
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "ep-hint" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.platform.ownHint" }))) : null, inheriting ? /* @__PURE__ */ React.createElement("div", { className: "ep-hint" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.platform.inherited" })) : null), /* @__PURE__ */ React.createElement("div", { className: "ep-section" }, /* @__PURE__ */ React.createElement("div", { className: "ep-heading" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.entryGroupTitle" })), /* @__PURE__ */ React.createElement("div", { className: "ep-options" }, /* @__PURE__ */ React.createElement(
        Form.Check,
        {
          type: "switch",
          id: "external-player-show-card-buttons",
          label: intl.formatMessage({ id: "settings.showSceneCardButtons" }),
          disabled: inheriting,
          checked: draftSettings.showSceneCardButtons,
          onChange: (event) => setDraftSettings((current) => ({
            ...current,
            showSceneCardButtons: event.target.checked
          }))
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "ep-hint" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.showSceneCardButtonsHint" }))), /* @__PURE__ */ React.createElement("div", { className: "ep-options" }, /* @__PURE__ */ React.createElement(
        Form.Check,
        {
          type: "switch",
          id: "external-player-show-detail-buttons",
          label: intl.formatMessage({ id: "settings.showSceneDetailButtons" }),
          disabled: inheriting,
          checked: draftSettings.showSceneDetailButtons,
          onChange: (event) => setDraftSettings((current) => ({
            ...current,
            showSceneDetailButtons: event.target.checked
          }))
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "ep-hint" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.showSceneDetailButtonsHint" }))), /* @__PURE__ */ React.createElement("div", { className: "ep-options" }, /* @__PURE__ */ React.createElement(
        Form.Check,
        {
          type: "switch",
          id: "external-player-show-toolbar-buttons",
          label: intl.formatMessage({ id: "settings.showSceneToolbarButtons" }),
          disabled: inheriting,
          checked: draftSettings.showSceneToolbarButtons,
          onChange: (event) => setDraftSettings((current) => ({
            ...current,
            showSceneToolbarButtons: event.target.checked
          }))
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "ep-hint" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.showSceneToolbarButtonsHint" })))), /* @__PURE__ */ React.createElement("div", { className: "ep-section" }, /* @__PURE__ */ React.createElement("div", { className: "ep-heading" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.playerGroupTitle" })), /* @__PURE__ */ React.createElement("div", { className: "ep-options" }, /* @__PURE__ */ React.createElement(
        Form.Check,
        {
          type: "switch",
          id: "external-player-single-mode",
          label: intl.formatMessage({ id: "settings.singlePlayerMode" }),
          disabled: inheriting,
          checked: draftSettings.singlePlayerMode,
          onChange: (event) => setDraftSettings((current) => ({
            ...current,
            singlePlayerMode: event.target.checked,
            singlePlayerId: current.singlePlayerId || playerButtons[0].id,
            excludedPlayerIds: current.excludedPlayerIds.length ? current.excludedPlayerIds : [...defaultSettings.excludedPlayerIds]
          }))
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "ep-hint" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.singlePlayerModeHint" }))), /* @__PURE__ */ React.createElement("div", { className: "ep-options" }, /* @__PURE__ */ React.createElement("div", { className: "ep-subheading" }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.playerDisplay" })), /* @__PURE__ */ React.createElement("div", { className: "ep-list" }, playerButtons.map((button) => {
        const checked = draftSettings.singlePlayerMode ? draftSettings.singlePlayerId === button.id : !draftSettings.excludedPlayerIds.includes(button.id);
        return /* @__PURE__ */ React.createElement(
          Form.Check,
          {
            key: button.id,
            type: draftSettings.singlePlayerMode ? "radio" : "checkbox",
            id: `external-player-${button.id}`,
            name: "external-player-selection",
            className: "ep-item",
            disabled: inheriting,
            checked,
            onChange: () => togglePlayer(button.id),
            label: /* @__PURE__ */ React.createElement("span", { className: "ep-label" }, /* @__PURE__ */ React.createElement(
              "img",
              {
                src: `${iconsPath}/${button.id}.webp`,
                alt: button.name,
                style: { height: "1.4em", width: "1.4em" }
              }
            ), /* @__PURE__ */ React.createElement("span", null, button.name))
          }
        );
      })))), /* @__PURE__ */ React.createElement("div", { className: "ep-section" }, /* @__PURE__ */ React.createElement(
        Button,
        {
          variant: "danger",
          disabled: inheriting,
          onClick: resetDraftSettings
        },
        /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.reset" })
      ))),
      /* @__PURE__ */ React.createElement(Modal.Footer, null, /* @__PURE__ */ React.createElement(Button, { variant: "secondary", onClick: closeModal }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.cancel" })), /* @__PURE__ */ React.createElement(Button, { variant: "primary", onClick: confirmSettings }, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "settings.confirm" })))
    ));
  }
  function ExternalPlayerButtonList({ sceneProps }) {
    const { settings } = useSettingsState();
    const visiblePlayerButtons = filterPlayerButtons(settings);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "0.5rem", flexWrap: "wrap" } }, visiblePlayerButtons.map(
      (btn) => /* @__PURE__ */ React.createElement(
        Button,
        {
          key: btn.id,
          variant: "secondary",
          style: { display: "flex", alignItems: "center", gap: "0.5rem" },
          onClick: () => btn.onClick(getSceneInfo(sceneProps))
        },
        /* @__PURE__ */ React.createElement(
          "img",
          {
            src: `${iconsPath}/${btn.id}.webp`,
            alt: btn.name,
            style: { height: "1.4em", width: "1.4em" }
          }
        ),
        btn.name
      )
    ));
  }
  function SceneCardExternalPlayerControls({ sceneProps }) {
    const { settings } = useSettingsState();
    const [isOpen, setIsOpen] = React.useState(false);
    if (settings.singlePlayerMode) {
      const player = getSinglePlayerButton(settings);
      return /* @__PURE__ */ React.createElement(
        OverlayTrigger,
        {
          placement: "bottom",
          overlay: /* @__PURE__ */ React.createElement(Tooltip, { id: `external-player-tooltip-${player.id}` }, player.name)
        },
        /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
          Button,
          {
            className: "minimal",
            variant: "link",
            onClick: () => player.onClick(getSceneInfo(sceneProps))
          },
          /* @__PURE__ */ React.createElement(
            "img",
            {
              src: `${iconsPath}/${player.id}.webp`,
              alt: player.name,
              style: { height: "1.4em", width: "1.4em", verticalAlign: "-0.3em" }
            }
          )
        ))
      );
    }
    const visiblePlayerButtons = filterPlayerButtons(settings);
    return /* @__PURE__ */ React.createElement(
      Dropdown,
      {
        className: "d-inline-block",
        show: isOpen,
        onToggle: (nextShow) => setIsOpen(nextShow)
      },
      /* @__PURE__ */ React.createElement(
        Dropdown.Toggle,
        {
          className: "minimal"
        },
        createPlayIcon({ style: { height: "1.25em", width: "1.25em", verticalAlign: "-0.3em" } })
      ),
      isOpen && /* @__PURE__ */ React.createElement(Dropdown.Menu, { as: PortalMenu }, visiblePlayerButtons.map(
        (btn) => /* @__PURE__ */ React.createElement(
          Dropdown.Item,
          {
            key: btn.id,
            onClick: () => btn.onClick(getSceneInfo(sceneProps)),
            style: { display: "flex", alignItems: "center", gap: "0.5rem" }
          },
          /* @__PURE__ */ React.createElement(
            "img",
            {
              src: `${iconsPath}/${btn.id}.webp`,
              alt: btn.name,
              style: { height: "1.4em", width: "1.4em" }
            }
          ),
          btn.name
        )
      ))
    );
  }
  function ExternalPlayerTabLabel() {
    return /* @__PURE__ */ React.createElement(Nav.Item, { key: "external-player-tab-nav" }, /* @__PURE__ */ React.createElement(Nav.Link, { eventKey: "external-player-tab" }, /* @__PURE__ */ React.createElement(PluginIntlProvider, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "0.5rem" } }, createPlayIcon({ style: { height: "1.25em", width: "1.25em" } }), /* @__PURE__ */ React.createElement(FormattedMessage, { id: "tab.label" })))));
  }
  function ExternalPlayerTabContent({ sceneProps }) {
    return /* @__PURE__ */ React.createElement(
      Tab.Pane,
      {
        key: "external-player-tab-content",
        eventKey: "external-player-tab"
      },
      /* @__PURE__ */ React.createElement("div", { className: "external-player-tab-header" }, /* @__PURE__ */ React.createElement(PluginIntlProvider, null, /* @__PURE__ */ React.createElement("h5", null, /* @__PURE__ */ React.createElement(FormattedMessage, { id: "tab.header" }))), /* @__PURE__ */ React.createElement(SettingsModal, { refreshOnSave: true })),
      /* @__PURE__ */ React.createElement(ExternalPlayerButtonList, { sceneProps })
    );
  }
  PluginApi.patch.after(
    "ScenePage.Tabs",
    function(props, _, original) {
      const settings = readSettings();
      if (!settings.showSceneDetailButtons) return original;
      original.props.children.push(
        /* @__PURE__ */ React.createElement(ExternalPlayerTabLabel, null)
      );
      return original;
    }
  );
  PluginApi.patch.after(
    "ScenePage.TabContent",
    function(props, _, original) {
      const settings = readSettings();
      if (!settings.showSceneDetailButtons) return original;
      original.props.children.push(
        /* @__PURE__ */ React.createElement(ExternalPlayerTabContent, { sceneProps: props })
      );
      return original;
    }
  );
  PluginApi.patch.after(
    "ScenePage",
    function(props, _, original) {
      const settings = readSettings();
      if (!settings.showSceneToolbarButtons) return original;
      const predicate = (node) => {
        if (!(node?.type === "span" && node.props?.className === "scene-toolbar-group")) return false;
        let children = node.props?.children;
        if (!children) return false;
        if (!Array.isArray(children)) {
          children = [children];
        }
        return children.some(
          (item) => item?.type === "span" && item.props?.children?.type?.displayName === "Dropdown"
        );
      };
      injectIntoReactTree(
        original,
        predicate,
        "prependChild",
        /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement(SceneCardExternalPlayerControls, { sceneProps: props }))
      );
      return original;
    }
  );
  PluginApi.patch.after(
    "SceneCard.Popovers",
    function(props, _, original) {
      const settings = readSettings();
      if (!settings.showSceneCardButtons) return original;
      if (!original.props.children) {
        original.props.children = createButtonGroup();
      }
      injectIntoReactTree(
        original,
        (node) => node?.type instanceof Object && node.type?.displayName === "ButtonGroup",
        "appendChild",
        /* @__PURE__ */ React.createElement(SceneCardExternalPlayerControls, { sceneProps: props })
      );
      return original;
    }
  );
  PluginApi.patch.after(
    "SettingGroup",
    function(props, _, original) {
      if (Array.isArray(props?.children)) {
        if (props.children?.[1]?.props?.pluginID === pluginID) {
          injectIntoReactTree(
            props.topLevel,
            (node) => node?.type instanceof Object && node.type?.displayName === "Button",
            "before",
            /* @__PURE__ */ React.createElement(SettingsModal, null)
          );
        }
      }
      return original;
    }
  );
  (async () => {
    const res = await loadMessages(defaultLocale);
    if (!res) return;
    console.debug(`[${pluginID}] Preloaded locale messages: ${defaultLocale}`);
  })();
  console.debug(`[${pluginID}] Loaded plugin successfully`);
})();
