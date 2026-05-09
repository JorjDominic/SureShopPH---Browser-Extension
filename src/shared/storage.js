// -----------------------------------------------------------------------
// SureShop shared storage helpers — settings, scan history, per-product
// overlay dismissals, and feedback. Used by background script, popup,
// and content scripts. Safe to load multiple times (guarded).
// -----------------------------------------------------------------------
(function () {
  if (globalThis.SureShopStorage) return;

  const KEYS = {
    SETTINGS:    "sureshop_settings_v1",
    HISTORY:     "sureshop_history_v1",
    DISMISSALS:  "sureshop_dismissals_v1",
    FEEDBACK:    "sureshop_feedback_v1",
    ONBOARDED:   "sureshop_onboarded_v1",
    OVERLAY_POS: "sureshop_overlay_pos_v1"
  };

  const DEFAULTS = {
    settings: {
      overlayEnabled:     true,
      overlayMinimized:   false,
      overlayAutoDismiss: true,
      autoPaginate:       false,
      soundOnHighRisk:    false,
      prePurchaseWarning: true,
      paymentLinkScan:    true,
      theme:              "auto",   // "auto" | "light" | "dark"
      reducedMotion:      "auto",   // "auto" | "on" | "off"
      reviewTarget:       100,
      debug:              false
    },
    overlayPos: { top: 20, right: 20 } // right-anchored by default
  };

  const HISTORY_LIMIT = 50;

  function get(key, fallback) {
    return new Promise(res => {
      try {
        chrome.storage.local.get(key, obj => res(obj?.[key] ?? fallback));
      } catch (_) { res(fallback); }
    });
  }
  function set(key, value) {
    return new Promise(res => {
      try { chrome.storage.local.set({ [key]: value }, () => res(true)); }
      catch (_) { res(false); }
    });
  }

  // ---------------- settings ----------------
  async function getSettings() {
    const stored = await get(KEYS.SETTINGS, {});
    return { ...DEFAULTS.settings, ...stored };
  }
  async function setSettings(patch) {
    const cur = await getSettings();
    const next = { ...cur, ...patch };
    await set(KEYS.SETTINGS, next);
    return next;
  }

  // ---------------- history ----------------
  function makeHistoryId(entry) {
    // Stable ID so re-scans of the same listing replace previous record
    const key = `${entry.platform || "?"}|${entry.url || entry.product_name || Math.random()}`;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
    return "h_" + Math.abs(h).toString(36);
  }
  async function addHistoryEntry(entry) {
    const list = await get(KEYS.HISTORY, []);
    const e = {
      id:           makeHistoryId(entry),
      platform:     entry.platform || null,
      product_name: entry.product_name || "Unknown product",
      url:          entry.url || null,
      price:        entry.price ?? null,
      seller_name:  entry.seller_name || null,
      risk_score:   entry.risk_score ?? null,
      risk_level:   entry.risk_level || null,
      type:         entry.type || "product",
      timestamp:    Date.now()
    };
    const filtered = list.filter(x => x.id !== e.id);
    filtered.unshift(e);
    if (filtered.length > HISTORY_LIMIT) filtered.length = HISTORY_LIMIT;
    await set(KEYS.HISTORY, filtered);
    return e;
  }
  async function getHistory()       { return get(KEYS.HISTORY, []); }
  async function clearHistory()     { return set(KEYS.HISTORY, []); }
  async function removeHistory(id)  {
    const list = await get(KEYS.HISTORY, []);
    return set(KEYS.HISTORY, list.filter(x => x.id !== id));
  }

  // ---------------- per-product overlay dismissals ----------------
  function listingKey(url) {
    if (!url) return null;
    // Shopee:  ...-i.{shopId}.{itemId}
    const sh = url.match(/-i\.(\d+)\.(\d+)/);
    if (sh) return `shopee:${sh[1]}.${sh[2]}`;
    // Lazada:  -i{id}-s{sku}.html
    const lz = url.match(/-i(\d+)-s(\d+)\.html/);
    if (lz) return `lazada:${lz[1]}.${lz[2]}`;
    // FB:      /marketplace/item/{id}
    const fb = url.match(/\/marketplace\/item\/(\d+)/);
    if (fb) return `fb:${fb[1]}`;
    return `url:${url}`;
  }
  async function isDismissed(url) {
    const key = listingKey(url);
    if (!key) return false;
    const map = await get(KEYS.DISMISSALS, {});
    const ts  = map[key];
    // Dismissals expire after 7 days so cards aren't suppressed forever
    return ts && (Date.now() - ts) < 7 * 24 * 60 * 60 * 1000;
  }
  async function markDismissed(url) {
    const key = listingKey(url);
    if (!key) return;
    const map = await get(KEYS.DISMISSALS, {});
    map[key] = Date.now();
    return set(KEYS.DISMISSALS, map);
  }
  async function clearDismissal(url) {
    const key = listingKey(url);
    if (!key) return;
    const map = await get(KEYS.DISMISSALS, {});
    delete map[key];
    return set(KEYS.DISMISSALS, map);
  }

  // ---------------- overlay position ----------------
  async function getOverlayPos() {
    const stored = await get(KEYS.OVERLAY_POS, {});
    return { ...DEFAULTS.overlayPos, ...stored };
  }
  async function setOverlayPos(pos) { return set(KEYS.OVERLAY_POS, pos); }

  // ---------------- onboarding ----------------
  async function isOnboarded()      { return get(KEYS.ONBOARDED, false); }
  async function markOnboarded()    { return set(KEYS.ONBOARDED, true); }

  // ---------------- feedback (👍 / 👎 on results) ----------------
  async function recordFeedback(entry) {
    const list = await get(KEYS.FEEDBACK, []);
    list.unshift({ ...entry, timestamp: Date.now() });
    if (list.length > 200) list.length = 200;
    return set(KEYS.FEEDBACK, list);
  }

  globalThis.SureShopStorage = {
    KEYS, DEFAULTS, HISTORY_LIMIT,
    getSettings, setSettings,
    addHistoryEntry, getHistory, clearHistory, removeHistory,
    isDismissed, markDismissed, clearDismissal, listingKey,
    getOverlayPos, setOverlayPos,
    isOnboarded, markOnboarded,
    recordFeedback
  };
})();
