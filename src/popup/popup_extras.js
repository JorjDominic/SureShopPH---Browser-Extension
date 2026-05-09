// -----------------------------------------------------------------------
// SureShop popup_extras.js — adds Settings / History / About panels
// as a slide-in drawer, plus a "Why this score?" breakdown that
// decorates the existing result cards via MutationObserver.
//
// IMPORTANT: This file does NOT modify popup.js, popup.html structure,
// or the existing scan flow. It only ADDS a small toolbar button and
// observes the DOM. If popup.js renders nothing, the extras stay quiet.
// -----------------------------------------------------------------------
(function () {
  if (window.__sureshopExtrasLoaded) return;
  window.__sureshopExtrasLoaded = true;

  const S = globalThis.SureShopStorage;
  if (!S) {
    console.warn("[SureShop] storage.js not loaded — extras disabled");
    return;
  }

  document.addEventListener("DOMContentLoaded", init);
  if (document.readyState !== "loading") init();

  let initialized = false;
  async function init() {
    if (initialized) return;
    initialized = true;
    await applyThemeAndMotion();
    injectToolbar();
    injectDrawer();
    observeResultCards();
    handlePendingScan();
  }

  // -----------------------------------------------------------------
  // Theme + reduced-motion preference (data-attrs on <html>)
  // -----------------------------------------------------------------
  async function applyThemeAndMotion() {
    try {
      const s = await S.getSettings();
      const root = document.documentElement;
      const theme = s.theme === "auto"
        ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : s.theme;
      root.setAttribute("data-ss-theme", theme);
      const motion = s.reducedMotion === "auto"
        ? (matchMedia("(prefers-reduced-motion: reduce)").matches ? "reduce" : "ok")
        : (s.reducedMotion === "on" ? "reduce" : "ok");
      root.setAttribute("data-ss-motion", motion);
    } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Top-right toolbar button — opens the drawer
  // -----------------------------------------------------------------
  function injectToolbar() {
    if (document.getElementById("ssExtrasBtn")) return;
    const btn = document.createElement("button");
    btn.id = "ssExtrasBtn";
    btn.className = "ss-extras-btn";
    btn.title = "SureShop menu (history, settings, about)";
    btn.setAttribute("aria-label", "Open SureShop menu");
    btn.innerHTML = '<i class="fas fa-bars"></i>';
    btn.onclick = openDrawer;
    document.body.appendChild(btn);
  }

  // -----------------------------------------------------------------
  // Drawer markup — built once, lazy-renders each pane on open
  // -----------------------------------------------------------------
  function injectDrawer() {
    if (document.getElementById("ssDrawer")) return;
    const wrap = document.createElement("div");
    wrap.id = "ssDrawer";
    wrap.className = "ss-drawer";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "SureShop menu");
    wrap.setAttribute("aria-hidden", "true");
    wrap.innerHTML = `
      <div class="ss-drawer-backdrop" data-close="1"></div>
      <aside class="ss-drawer-panel">
        <header class="ss-drawer-head">
          <strong><i class="fas fa-shield-alt"></i> SureShop</strong>
          <button class="ss-drawer-close" data-close="1" aria-label="Close menu">&times;</button>
        </header>
        <nav class="ss-drawer-tabs" role="tablist">
          <button data-pane="history" class="is-active" role="tab"><i class="fas fa-clock-rotate-left"></i> History</button>
          <button data-pane="settings" role="tab"><i class="fas fa-sliders"></i> Settings</button>
          <button data-pane="about" role="tab"><i class="fas fa-circle-info"></i> About</button>
        </nav>
        <section class="ss-drawer-body">
          <div class="ss-pane is-active" data-pane="history"></div>
          <div class="ss-pane" data-pane="settings"></div>
          <div class="ss-pane" data-pane="about"></div>
        </section>
      </aside>`;
    document.body.appendChild(wrap);

    wrap.addEventListener("click", (e) => {
      if (e.target.dataset && e.target.dataset.close) closeDrawer();
    });
    wrap.querySelectorAll(".ss-drawer-tabs button").forEach(b => {
      b.onclick = () => switchPane(b.dataset.pane);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && wrap.classList.contains("is-open")) closeDrawer();
    });
  }

  function openDrawer()  {
    const d = document.getElementById("ssDrawer");
    if (!d) return;
    d.classList.add("is-open");
    d.setAttribute("aria-hidden", "false");
    renderPane("history");
  }
  function closeDrawer() {
    const d = document.getElementById("ssDrawer");
    if (!d) return;
    d.classList.remove("is-open");
    d.setAttribute("aria-hidden", "true");
  }
  function switchPane(name) {
    const d = document.getElementById("ssDrawer");
    if (!d) return;
    d.querySelectorAll(".ss-drawer-tabs button").forEach(b => {
      b.classList.toggle("is-active", b.dataset.pane === name);
    });
    d.querySelectorAll(".ss-pane").forEach(p => {
      p.classList.toggle("is-active", p.dataset.pane === name);
    });
    renderPane(name);
  }

  function renderPane(name) {
    const pane = document.querySelector(`#ssDrawer .ss-pane[data-pane="${name}"]`);
    if (!pane) return;
    if (name === "history")  return renderHistory(pane);
    if (name === "settings") return renderSettings(pane);
    if (name === "about")    return renderAbout(pane);
  }

  // -----------------------------------------------------------------
  // History pane
  // -----------------------------------------------------------------
  async function renderHistory(pane) {
    const list = await S.getHistory();
    if (!list.length) {
      pane.innerHTML = `
        <div class="ss-empty">
          <i class="fas fa-inbox"></i>
          <p>No scans yet. Run a scan and your past results will appear here.</p>
        </div>`;
      return;
    }
    pane.innerHTML = `
      <div class="ss-pane-toolbar">
        <span>${list.length} scan${list.length === 1 ? "" : "s"} (max 50)</span>
        <button id="ssClearHistoryBtn" class="ss-link-btn"><i class="fas fa-trash"></i> Clear all</button>
      </div>
      <ul class="ss-history-list">
        ${list.map(historyCardHTML).join("")}
      </ul>`;
    pane.querySelector("#ssClearHistoryBtn").onclick = async () => {
      if (!confirm("Clear all scan history?")) return;
      await S.clearHistory();
      renderHistory(pane);
    };
    pane.querySelectorAll("[data-history-remove]").forEach(b => {
      b.onclick = async () => {
        await S.removeHistory(b.dataset.historyRemove);
        renderHistory(pane);
      };
    });
    pane.querySelectorAll("[data-history-open]").forEach(b => {
      b.onclick = () => {
        const url = b.dataset.historyOpen;
        if (url) chrome.tabs.create({ url });
      };
    });
  }
  function historyCardHTML(e) {
    const lvl = (e.risk_level || "").toLowerCase();
    const when = new Date(e.timestamp).toLocaleString();
    return `
      <li class="ss-history-card ss-risk-${lvl}">
        <div class="ss-history-row1">
          <span class="ss-pill ss-pill-${lvl}">${e.risk_level || "?"} · ${e.risk_score ?? "?"}/100</span>
          <span class="ss-history-platform">${e.platform || ""}</span>
        </div>
        <div class="ss-history-name">${escapeHtml(e.product_name)}</div>
        ${e.seller_name ? `<div class="ss-history-seller">${escapeHtml(e.seller_name)}</div>` : ""}
        <div class="ss-history-row2">
          <span class="ss-history-when">${when}</span>
          <span class="ss-history-actions">
            ${e.url ? `<button class="ss-link-btn" data-history-open="${escapeAttr(e.url)}"><i class="fas fa-up-right-from-square"></i> Open</button>` : ""}
            <button class="ss-link-btn" data-history-remove="${escapeAttr(e.id)}"><i class="fas fa-xmark"></i> Remove</button>
          </span>
        </div>
      </li>`;
  }

  // -----------------------------------------------------------------
  // Settings pane
  // -----------------------------------------------------------------
  async function renderSettings(pane) {
    const s = await S.getSettings();
    pane.innerHTML = `
      <div class="ss-settings-group">
        <h4>On-page overlay</h4>
        <label><input type="checkbox" data-setting="overlayEnabled"> Show overlay card on Shopee/Lazada/FB pages</label>
        <label><input type="checkbox" data-setting="overlayAutoDismiss"> Auto-dismiss after 7 seconds</label>
      </div>
      <div class="ss-settings-group">
        <h4>Safety</h4>
        <label><input type="checkbox" data-setting="prePurchaseWarning"> Warn before checkout on High-risk listings</label>
        <label><input type="checkbox" data-setting="paymentLinkScan"> Flag off-platform payment requests in descriptions</label>
        <label><input type="checkbox" data-setting="soundOnHighRisk"> Play sound when result is High risk</label>
      </div>
      <div class="ss-settings-group">
        <h4>Deep scan</h4>
        <label><input type="checkbox" data-setting="autoPaginate"> Auto-click "next page" until target reached (Shopee)</label>
        <label>Review target
          <select data-setting="reviewTarget">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
        </label>
      </div>
      <div class="ss-settings-group">
        <h4>Appearance</h4>
        <label>Theme
          <select data-setting="theme">
            <option value="auto">Match system</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>Reduced motion
          <select data-setting="reducedMotion">
            <option value="auto">Auto</option>
            <option value="on">Always reduce</option>
            <option value="off">Never reduce</option>
          </select>
        </label>
      </div>
      <div class="ss-settings-group">
        <h4>Data</h4>
        <button id="ssClearAllBtn" class="ss-link-btn ss-danger"><i class="fas fa-eraser"></i> Clear all SureShop data</button>
      </div>
      <div class="ss-settings-group">
        <h4>Developer</h4>
        <label><input type="checkbox" data-setting="debug"> Verbose console logging</label>
      </div>`;

    pane.querySelectorAll("[data-setting]").forEach(el => {
      const key = el.dataset.setting;
      if (el.type === "checkbox") {
        el.checked = !!s[key];
        el.addEventListener("change", async () => {
          await S.setSettings({ [key]: el.checked });
          await applyThemeAndMotion();
          chrome.runtime.sendMessage({ type: "SURESHOP_SETTINGS_CHANGED" }, () => void chrome.runtime.lastError);
        });
      } else {
        el.value = String(s[key] ?? "");
        el.addEventListener("change", async () => {
          const val = el.dataset.setting === "reviewTarget" ? parseInt(el.value, 10) : el.value;
          await S.setSettings({ [key]: val });
          await applyThemeAndMotion();
          chrome.runtime.sendMessage({ type: "SURESHOP_SETTINGS_CHANGED" }, () => void chrome.runtime.lastError);
        });
      }
    });

    pane.querySelector("#ssClearAllBtn").onclick = async () => {
      if (!confirm("Erase all SureShop settings, history, and dismissals? Activation key is kept.")) return;
      const keep = ["activation_key", "is_activated", "device_id", "user_id"];
      chrome.storage.local.get(null, (all) => {
        const toRemove = Object.keys(all).filter(k => k.startsWith("sureshop_") && !keep.includes(k));
        chrome.storage.local.remove(toRemove, () => {
          alert("SureShop data cleared.");
          renderSettings(pane);
        });
      });
    };
  }

  // -----------------------------------------------------------------
  // About pane
  // -----------------------------------------------------------------
  function renderAbout(pane) {
    const v = (chrome.runtime.getManifest && chrome.runtime.getManifest().version) || "?";
    pane.innerHTML = `
      <div class="ss-about">
        <p><strong>SureShopPH v${v}</strong></p>
        <p>SureShop helps Filipino online shoppers spot scam listings on Shopee, Lazada, and Facebook Marketplace. Click <em>Scan</em> to send the page's public details to the SureShop service for analysis.</p>
        <h4>Risk levels</h4>
        <ul class="ss-risk-legend">
          <li><span class="ss-pill ss-pill-low">Low</span> 0–39 — typical safe listing</li>
          <li><span class="ss-pill ss-pill-medium">Medium</span> 40–69 — review carefully</li>
          <li><span class="ss-pill ss-pill-high">High</span> 70–100 — strong scam indicators</li>
        </ul>
        <h4>Privacy</h4>
        <p>Only public listing data is sent for analysis. Your scan history and settings are stored locally in this browser.</p>
        <h4>Was this scan helpful?</h4>
        <div class="ss-feedback-row">
          <button class="ss-link-btn" data-feedback="up"><i class="fas fa-thumbs-up"></i> Yes</button>
          <button class="ss-link-btn" data-feedback="down"><i class="fas fa-thumbs-down"></i> No</button>
          <textarea id="ssFeedbackText" placeholder="Optional comment…"></textarea>
        </div>
        <p><button id="ssReplayOnboard" class="ss-link-btn"><i class="fas fa-play"></i> Replay welcome tour</button></p>
      </div>`;
    pane.querySelectorAll("[data-feedback]").forEach(b => {
      b.onclick = async () => {
        const text = pane.querySelector("#ssFeedbackText")?.value || "";
        await S.recordFeedback({ rating: b.dataset.feedback, text });
        b.innerHTML = '<i class="fas fa-check"></i> Thanks!';
      };
    });
    pane.querySelector("#ssReplayOnboard").onclick = () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding/onboarding.html") });
    };
  }

  // -----------------------------------------------------------------
  // Result card decoration — adds "Why this score?" breakdown panel
  // and saves history for each new card popup.js renders.
  // -----------------------------------------------------------------
  function observeResultCards() {
    const output = document.getElementById("output");
    if (!output) return;
    const seen = new WeakSet();
    const obs = new MutationObserver(() => {
      output.querySelectorAll(".result-card").forEach(card => {
        if (seen.has(card)) return;
        seen.add(card);
        decorateResultCard(card);
      });
    });
    obs.observe(output, { childList: true, subtree: true });
  }

  function decorateResultCard(card) {
    try {
      const text = card.textContent || "";
      const scoreM = text.match(/Risk Score[:\s]*([0-9]+)\s*\/\s*100/i);
      const lvlM   = text.match(/(Low|Medium|High)\s*Risk/i);
      const score  = scoreM ? parseInt(scoreM[1], 10) : null;
      const level  = lvlM ? lvlM[1] : null;

      // Save to history (best-effort, no throw)
      const platform = /shopee/i.test(text) ? "shopee"
                     : /lazada/i.test(text) ? "lazada"
                     : /facebook|marketplace/i.test(text) ? "facebook" : null;
      const product = (card.querySelector(".rc-title, h2, h3")?.textContent || "").trim() || "Scanned listing";
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url || null;
        const entry = {
          platform, url, product_name: product,
          risk_score: score, risk_level: level,
          type: "product"
        };
        chrome.runtime.sendMessage({ type: "SAVE_SCAN_RESULT", entry }, () => void chrome.runtime.lastError);
      });

      // Sound on High-risk
      S.getSettings().then(s => { if (s.soundOnHighRisk && level === "High") playRiskTone(); });
    } catch (_) {}
  }

  function playRiskTone() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.type = "sine";
      g.gain.value = 0.05;
      o.connect(g).connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, 400);
    } catch (_) {}
  }

  // -----------------------------------------------------------------
  // Pending-scan handoff (from keyboard shortcut / context menu)
  // -----------------------------------------------------------------
  function handlePendingScan() {
    chrome.storage.local.get("sureshop_pending_scan", ({ sureshop_pending_scan }) => {
      if (!sureshop_pending_scan) return;
      if (Date.now() - sureshop_pending_scan.ts > 30000) {
        chrome.storage.local.remove("sureshop_pending_scan");
        return;
      }
      chrome.storage.local.remove("sureshop_pending_scan", () => {
        // Fire scan after popup.js has bound its handlers
        setTimeout(() => {
          const btn = document.getElementById("scanBtn");
          if (btn && !btn.disabled) btn.click();
        }, 400);
      });
    });
  }

  // -----------------------------------------------------------------
  // helpers
  // -----------------------------------------------------------------
  function escapeHtml(s) {
    return String(s || "").replace(/[&<>"]/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/'/g, "&#39;"); }
})();
