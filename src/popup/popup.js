// -----------------------------------------------------------------------
// Debug mode — set to true only during local development.
// All console output is suppressed when false.
// -----------------------------------------------------------------------
const DEBUG = false;
const dbg = (...args) => { if (DEBUG) console.log(...args); };
const dbgErr = (...args) => { if (DEBUG) console.error(...args); };

// -----------------------------------------------------------------------
// API base URL is defined in config.js (loaded by popup.html before popup.js).
// -----------------------------------------------------------------------
// SURESHOP_API_BASE comes from config.js

// -----------------------------------------------------------------------
// Supported shopping platforms (keep in sync with manifest.json)
// fullScan = product extraction + risk score + reviews
// urlOnly  = URL safety check only
// -----------------------------------------------------------------------
const PLATFORMS = {
  shopee:      { domain: "shopee.ph",       label: "Shopee",          fullScan: true,  productPath: /-i\.\d+\.\d+/ },
  lazada:      { domain: "lazada.com.ph",   label: "Lazada",          fullScan: true,  productPath: /\/products\/.*-i\d+-s\d+\.html/ },
  facebook:    { domain: "facebook.com",    label: "FB Marketplace",  fullScan: true,  productPath: /\/marketplace\/item\/\d+/ },
  tiktok:      { domain: "tiktok.com",      label: "TikTok",          fullScan: false },
  zalora:      { domain: "zalora.com.ph",   label: "Zalora",          fullScan: false },
  carousell:   { domain: "carousell.ph",    label: "Carousell",       fullScan: false },
  shein:       { domain: "shein.com",       label: "Shein",           fullScan: false },
  temu:        { domain: "temu.com",        label: "Temu",            fullScan: false },
  amazon:      { domain: "amazon.com",      label: "Amazon",          fullScan: false },
  ebay:        { domain: "ebay.ph",         label: "eBay PH",         fullScan: false },
  aliexpress:  { domain: "aliexpress.com",  label: "AliExpress",      fullScan: false },
  beautymnl:   { domain: "beautymnl.com",   label: "BeautyMNL",       fullScan: false },
  kimstore:    { domain: "kimstore.com",    label: "Kimstore",        fullScan: false },
  galleon:     { domain: "galleon.ph",      label: "Galleon",         fullScan: false }
};

function detectPlatform(url) {
  if (!url) return null;
  let host;
  try { host = new URL(url).hostname.toLowerCase(); } catch (_) { return null; }
  for (const [key, p] of Object.entries(PLATFORMS)) {
    if (host === p.domain || host.endsWith("." + p.domain)) {
      const isProduct = p.fullScan && p.productPath ? p.productPath.test(url) : false;
      return { key, ...p, isProduct };
    }
  }
  return null;
}

// -----------------------------------------------------------------------
// Toast notifications
// -----------------------------------------------------------------------
function showToast(message, type = "info", durationMs = 3500) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const icons = { info: "fa-info-circle", success: "fa-check-circle", warning: "fa-exclamation-triangle", error: "fa-times-circle" };
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("dismissing");
    setTimeout(() => toast.remove(), 250);
  }, durationMs);
}

const output = document.getElementById("output");
const scanBtn = document.getElementById("scanBtn");
const commentOnlyBtn = document.getElementById("commentOnlyBtn");
const clearResultsBtn = document.getElementById("clearResultsBtn");
const clearResultsRow = document.getElementById("clearResultsRow");

// Show/hide the Clear Results button whenever #output content changes
new MutationObserver(() => {
  const hasContent = output.innerHTML.trim() !== '';
  if (clearResultsRow) clearResultsRow.style.display = hasContent ? '' : 'none';
}).observe(output, { childList: true, subtree: true, characterData: true });
if (clearResultsBtn) {
  clearResultsBtn.addEventListener('click', () => {
    output.innerHTML = '';
    if (clearResultsRow) clearResultsRow.style.display = 'none';
  });
}
const activationSection = document.getElementById("activationSection");
const scanSection = document.getElementById("scanSection");
const activateBtn = document.getElementById("activateBtn");
const activationKeyInput = document.getElementById("activationKeyInput");
const activationMessage = document.getElementById("activationMessage");

// -----------------------------------------------------------------------
// Zoom controls
// -----------------------------------------------------------------------
(function initZoom() {
  const ZOOM_KEY   = "sureshop_zoom";
  const ZOOM_STEP  = 0.1;
  const ZOOM_MIN   = 1.0;   // 100% = default (max zoom-out)
  const ZOOM_MAX   = 2.0;   // 200%
  const root       = document.getElementById("popup-root");
  const zoomInBtn  = document.getElementById("zoomInBtn");
  const zoomOutBtn = document.getElementById("zoomOutBtn");
  const zoomLabel  = document.getElementById("zoomLabel");

  let zoom = parseFloat(localStorage.getItem(ZOOM_KEY)) || 1.0;
  zoom = Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX);

  function applyZoom() {
    if (!root) return;
    // CSS `zoom` affects layout (unlike transform), so the popup body
    // expands naturally to fit the scaled content.
    root.style.zoom = zoom;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    if (zoomOutBtn) zoomOutBtn.disabled = zoom <= ZOOM_MIN;
    if (zoomInBtn)  zoomInBtn.disabled  = zoom >= ZOOM_MAX;
    localStorage.setItem(ZOOM_KEY, zoom);
  }

  if (zoomInBtn)  zoomInBtn.addEventListener("click",  () => { zoom = Math.min(zoom + ZOOM_STEP, ZOOM_MAX); applyZoom(); });
  if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => { zoom = Math.max(zoom - ZOOM_STEP, ZOOM_MIN); applyZoom(); });

  applyZoom();
})();

// Progressive collection state
let lastShopeeProductData = null;
let lastLazadaProductData = null;
let lastFacebookProductData = null;
let lastDeepScanInitialResult = null; // initial /analyze/listing result; shown on Stop if progressive scan has no score
let lastShopeeReviews = [];
let lastLazadaReviews = [];
let progressiveState     = "idle"; // controls commentsBtn (Deep Scan)
let commentOnlyState     = "idle"; // controls commentOnlyBtn (Scan Comments)
let collectingPollInterval = null; // polls review count from content script while scanning
let pendingStopFallbackTimer = null;
let pendingStopPlatform = null;

// Guidance banner state
let scanTooltipCount = 0;
let scanStartTime = null;
let midBannerVisible = false;
let midBannerDismissedByUser = false;
let dominantRatingWhenBannerShown = null;
let midBannerReinforceTimer = null;
let preScanGuidanceDismissed = false;

function startCollectingPoll() {
  stopCollectingPoll();
  collectingPollInterval = setInterval(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PROGRESSIVE_REVIEWS" }, (r) => {
        if (chrome.runtime.lastError || !r) return;
        const count = (r.reviews || []).length;
        const panel = output.querySelector('.collecting-panel');
        if (panel) {
          const countEl = panel.querySelector('.collecting-count');
          if (countEl) countEl.textContent = `${count} review${count !== 1 ? 's' : ''} collected`;
        }
        if (progressiveState === "scanning") {
          commentsBtn.innerHTML = `<i class="fas fa-stop"></i> Stop Collecting (${count})`;
        }
        if (commentOnlyState === "scanning") {
          commentOnlyBtn.innerHTML = `<i class="fas fa-stop"></i> Stop Collecting (${count})`;
        }
        checkMidScanTriggers(r.reviews || []);
      });
    });
  }, 600);
}

function stopCollectingPoll() {
  if (collectingPollInterval) {
    clearInterval(collectingPollInterval);
    collectingPollInterval = null;
  }
}

function clearStopFallbackTimer() {
  if (pendingStopFallbackTimer) {
    clearTimeout(pendingStopFallbackTimer);
    pendingStopFallbackTimer = null;
  }
  pendingStopPlatform = null;
}

function setCollectingStoppingState() {
  const panel = output.querySelector('.collecting-panel');
  if (!panel) return;
  const iconEl = panel.querySelector('.collecting-icon i');
  const labelEl = panel.querySelector('.collecting-label');
  if (iconEl) iconEl.className = 'fas fa-hourglass-half';
  if (labelEl) labelEl.textContent = 'Stopping collection...';
}

function inferPlatformFromUrl(url) {
  if (!url) return null;
  if (url.includes('lazada.com.ph')) return 'lazada';
  if (url.includes('shopee.ph')) return 'shopee';
  return null;
}

function setActiveCollectionState(state) {
  if (progressiveState  !== "idle") setCommentsButtonState(state);
  if (commentOnlyState  !== "idle") setCommentOnlyButtonState(state);
  if (progressiveState === "idle" && commentOnlyState === "idle") setCommentsButtonState(state);
}

function runStopFallback(platform) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PROGRESSIVE_REVIEWS" }, (resp) => {
      if (chrome.runtime.lastError) {
        dbg("[Popup] Stop fallback GET_PROGRESSIVE_REVIEWS failed:", chrome.runtime.lastError.message);
        return;
      }
      const reviews = Array.isArray(resp?.reviews) ? resp.reviews : [];
      const isLazada = platform === 'lazada';
      const productData = isLazada ? lastLazadaProductData : lastShopeeProductData;
      const baseSr = lastDeepScanInitialResult || null;
      if (isLazada) {
        lastLazadaReviews = reviews;
      } else {
        lastShopeeReviews = reviews;
      }
      dbg("[Popup] Stop fallback triggered:", platform, "reviews=", reviews.length);
      if (reviews.length === 0 && !productData) {
        // Comment-only scan with 0 reviews — sending empty array to /analyze/comments
        // would return misleading 0% scores; show a message instead.
        const _pl = output.querySelector('.collecting-panel');
        if (_pl) {
          const _ic = _pl.querySelector('.collecting-icon i');
          const _lb = _pl.querySelector('.collecting-label');
          const _ct = _pl.querySelector('.collecting-count');
          if (_ic) _ic.className = 'fas fa-info-circle';
          if (_lb) _lb.textContent = 'No reviews were collected.';
          if (_ct) _ct.textContent = isLazada
            ? 'Scroll down to Ratings & Reviews and try again.'
            : 'Scroll down to the reviews section and try again.';
        }
        return;
      }
      // Deep scan with 0 reviews: productData is available so this routes to /analyze/deep,
      // which returns a valid combined_risk_score (listing score × 70% + 0 comment contribution).
      analyzeCommentsFromPopup(reviews, productData, baseSr, isLazada ? 'lazada' : 'shopee');
    });
  });
}

function scheduleStopFallback(platform) {
  clearStopFallbackTimer();
  pendingStopPlatform = platform;
  pendingStopFallbackTimer = setTimeout(() => {
    const fallbackPlatform = pendingStopPlatform;
    clearStopFallbackTimer();
    runStopFallback(fallbackPlatform || platform);
  }, 1500);
}

function showActivationMessage(text, isError = true) {
  activationMessage.textContent = text;
  activationMessage.className = isError ? "activation-msg activation-msg--error" : "activation-msg activation-msg--success";
}

// On popup open: validate stored token with server
async function checkAuthStatus() {
  // Always clear previous scan results so the panel starts fresh each open
  if (output) {
    output.innerHTML = '';
    output.style.padding = '';
    output.style.textAlign = '';
    output.style.fontFamily = '';
  }
  resetCommentsButton();
  resetCommentOnlyButton();
  progressiveState = "idle";
  commentOnlyState = "idle";
  await initPreScanGuidance();

  const { accessToken } = await chrome.storage.local.get("accessToken");

  if (!accessToken) {
    activationSection.style.display = "block";
    scanSection.style.display = "none";
    return;
  }

  try {
    const res = await fetch(`${SURESHOP_API_BASE}/auth/status`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (!res.ok) {
      // Endpoint unavailable (e.g. 404/500) — trust the stored token
    } else {
      const data = await res.json();
      if (data.valid === false) {
        await chrome.storage.local.remove(["accessToken", "activatedAt", "lastAutoScanResult"]);
        activationSection.style.display = "block";
        scanSection.style.display = "none";
        return;
      }
    }
  } catch (_) {
    // Server unreachable — trust the stored token rather than locking the user out
  }

  activationSection.style.display = "none";
  scanSection.style.display = "block";
  refreshPageStatus();
  checkForAutoScanResults();
}

// Defer until DOMContentLoaded so all const-declared button refs lower in the
// file have been initialized (avoids ReferenceError TDZ on commentsBtn etc.)
function initWebsiteLink() {
  document.getElementById('websiteLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'https://www.sureshopph.site' });
  });
  const versionEl = document.getElementById('extVersion');
  if (versionEl) {
    const { version } = chrome.runtime.getManifest();
    versionEl.textContent = `v${version}`;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => { checkAuthStatus(); initWebsiteLink(); });
} else {
  // Document already parsed — schedule on next microtask so const declarations
  // appearing later in this script have all evaluated first.
  Promise.resolve().then(() => { checkAuthStatus(); initWebsiteLink(); });
}

// -----------------------------------------------------------------------
// Rating guidance banners (entirely inside the side panel)
// -----------------------------------------------------------------------
async function initPreScanGuidance() {
  try {
    const r = await chrome.storage.local.get('sureshop_prescan_dismissed');
    preScanGuidanceDismissed = !!r.sureshop_prescan_dismissed;
  } catch (_) {}
  const btn = document.getElementById('preScanDismissBtn');
  if (btn && !btn._wired) {
    btn._wired = true;
    btn.addEventListener('click', dismissPreScanGuidance);
  }
}

function showPreScanGuidance() {
  if (preScanGuidanceDismissed) return;
  const el = document.getElementById('preScanGuidance');
  if (el) el.style.display = 'flex';
}

function hidePreScanGuidance() {
  const el = document.getElementById('preScanGuidance');
  if (el) el.style.display = 'none';
}

async function dismissPreScanGuidance() {
  const el = document.getElementById('preScanGuidance');
  if (el) {
    el.classList.add('guidance-banner--dismissing');
    setTimeout(() => {
      el.style.display = 'none';
      el.classList.remove('guidance-banner--dismissing');
    }, 200);
  }
  preScanGuidanceDismissed = true;
  try { await chrome.storage.local.set({ sureshop_prescan_dismissed: true }); } catch (_) {}
}

function getMidBannerEl() {
  return document.getElementById('sureshop-mid-banner');
}

function showMidScanBanner(starLabel) {
  if (scanTooltipCount >= 3) return;
  if (midBannerVisible) return;
  const panel = output.querySelector('.collecting-panel');
  if (!panel) return;
  const existing = getMidBannerEl();
  if (existing) existing.remove();
  scanTooltipCount++;
  midBannerVisible = true;
  midBannerDismissedByUser = false;
  const subHtml = starLabel
    ? `<div class="mid-banner-sub">Currently collecting: ${starLabel}-star reviews only</div>`
    : '';
  const el = document.createElement('div');
  el.id = 'sureshop-mid-banner';
  el.className = 'mid-scan-banner';
  el.innerHTML = `
    <span class="mid-banner-icon">&#x1F4A1;</span>
    <div class="mid-banner-body">
      <div class="mid-banner-msg">Looks like you may be viewing only one star rating tab. Switch between 1-star, 3-star, and 5-star reviews to improve your Confidence Rating.</div>
      ${subHtml}
    </div>
    <button class="mid-banner-close" title="Dismiss">&#215;</button>
  `;
  el.querySelector('.mid-banner-close').addEventListener('click', () => {
    midBannerDismissedByUser = true;
    clearMidScanBanner();
  });
  panel.appendChild(el);
}

function clearMidScanBanner() {
  midBannerVisible = false;
  clearTimeout(midBannerReinforceTimer);
  const el = getMidBannerEl();
  if (el) el.remove();
}

function showPositiveReinforcement() {
  const panel = output.querySelector('.collecting-panel');
  if (!panel) return;
  clearTimeout(midBannerReinforceTimer);
  midBannerVisible = false;
  dominantRatingWhenBannerShown = null;
  const existing = getMidBannerEl();
  const reinforce = document.createElement('div');
  reinforce.id = 'sureshop-mid-banner';
  reinforce.className = 'mid-scan-reinforce';
  reinforce.innerHTML = `&#10003; New rating tab detected. Collecting additional reviews. Confidence Rating updating.`;
  if (existing) { existing.replaceWith(reinforce); } else { panel.appendChild(reinforce); }
  midBannerReinforceTimer = setTimeout(() => {
    const r = getMidBannerEl();
    if (r) r.remove();
  }, 3000);
}

function resetGuidanceForNewScan() {
  scanTooltipCount = 0;
  scanStartTime = Date.now();
  midBannerVisible = false;
  midBannerDismissedByUser = false;
  dominantRatingWhenBannerShown = null;
  hidePreScanGuidance();
  clearMidScanBanner();
}

function getDominantRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  const counts = {};
  let rated = 0;
  for (const r of reviews) {
    const k = r.rating_stars != null ? String(r.rating_stars) : null;
    if (k) { counts[k] = (counts[k] || 0) + 1; rated++; }
  }
  if (rated === 0) return null;
  let maxK = null, maxV = 0;
  for (const [k, v] of Object.entries(counts)) { if (v > maxV) { maxV = v; maxK = k; } }
  return { star: maxK, pct: maxV / rated };
}

function checkMidScanTriggers(reviews) {
  if (progressiveState !== 'scanning' && commentOnlyState !== 'scanning') return;
  const dominant = getDominantRating(reviews);
  const elapsed = scanStartTime ? (Date.now() - scanStartTime) / 1000 : 0;
  // If banner is currently visible, check for tab switch → positive reinforcement
  if (midBannerVisible && !midBannerDismissedByUser) {
    if (dominant && dominantRatingWhenBannerShown && dominant.star !== dominantRatingWhenBannerShown) {
      showPositiveReinforcement(); return;
    }
    if (dominant && dominantRatingWhenBannerShown && dominant.pct < 0.75) {
      showPositiveReinforcement(); return;
    }
    return;
  }
  if (scanTooltipCount >= 3) return;
  if (midBannerDismissedByUser) return;
  let shouldShow = false;
  let starLabel = null;
  if (dominant && reviews.length >= 5 && dominant.pct >= 0.8) {
    shouldShow = true; starLabel = dominant.star;
  }
  if (elapsed >= 30 && reviews.length < 10) {
    shouldShow = true; starLabel = dominant?.star || null;
  }
  if (shouldShow) {
    dominantRatingWhenBannerShown = starLabel;
    showMidScanBanner(starLabel);
  }
}

// -----------------------------------------------------------------------
// Page status banner: tells the user whether the current tab is a
// supported shopping platform and whether full product scan is available.
// -----------------------------------------------------------------------
function refreshPageStatus() {
  const banner = document.getElementById("pageStatus");
  if (!banner) return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || "";
    const platform = detectPlatform(url);

    if (!platform) {
      banner.className = "page-status page-status--unsupported";
      banner.innerHTML = `<i class="fas fa-info-circle"></i><span>Not a supported shopping site. Visit one of the platforms below to scan.</span>`;
      scanBtn && (scanBtn.disabled = true);
      commentsBtn && (commentsBtn.disabled = true);
      commentOnlyBtn && (commentOnlyBtn.disabled = true);
      hidePreScanGuidance();
      return;
    }

    if (platform.fullScan) {
      if (platform.isProduct) {
        const isFbProduct = platform.key === 'facebook';
        banner.className = "page-status page-status--supported";
        banner.innerHTML = `<i class="fas fa-check-circle"></i><span><strong>${platform.label}</strong> product detected — ready to scan</span>`;
        scanBtn && (scanBtn.disabled = false);
        // Deep Scan and Scan Comments are Shopee/Lazada only
        commentsBtn && (commentsBtn.disabled = isFbProduct ? true : false);
        commentOnlyBtn && (commentOnlyBtn.disabled = isFbProduct ? true : false);
        if (isFbProduct && commentsBtn) commentsBtn.title = 'Comment scan not available on Facebook Marketplace';
        if (isFbProduct && commentOnlyBtn) commentOnlyBtn.title = 'Comment scan not available on Facebook Marketplace';
        // Show pre-scan guidance only on Shopee/Lazada when idle
        if (!isFbProduct && progressiveState === 'idle' && commentOnlyState === 'idle') {
          showPreScanGuidance();
        } else {
          hidePreScanGuidance();
        }
      } else {
        banner.className = "page-status page-status--neutral";
        banner.innerHTML = `<i class="fas fa-search"></i><span>${platform.label} detected — open a product page to scan</span>`;
        scanBtn && (scanBtn.disabled = true);
        commentsBtn && (commentsBtn.disabled = true);
        commentOnlyBtn && (commentOnlyBtn.disabled = true);
        hidePreScanGuidance();
      }
    } else {
      banner.className = "page-status page-status--supported";
      banner.innerHTML = `<i class="fas fa-globe"></i><span>${platform.label} — URL safety check active</span>`;
      scanBtn && (scanBtn.disabled = true);
      commentsBtn && (commentsBtn.disabled = true);
      commentOnlyBtn && (commentOnlyBtn.disabled = true);
      hidePreScanGuidance();
    }
  });
}

function checkForAutoScanResults() {
  // Check if there are recent auto-scan results to display (product or comments)
  chrome.storage.local.get("lastAutoScanResult", ({ lastAutoScanResult }) => {
    if (lastAutoScanResult && isRecentResult(lastAutoScanResult.timestamp)) {
      dbg("=== SCAN DATA SNAPSHOT: lastAutoScanResult from storage ===");
      dbg(JSON.stringify(lastAutoScanResult, null, 2));

      if (lastAutoScanResult.type === "product") {
        dbg("[Popup] cache restored:", lastAutoScanResult.type, lastAutoScanResult.risk_score);
        showRiskAssessment(
          lastAutoScanResult.risk_score, 
          lastAutoScanResult.risk_level,
          lastAutoScanResult.description || null,
          null,
          lastAutoScanResult.result || null
        );
      } else if (lastAutoScanResult.type === "comments") {
        const env = lastAutoScanResult.result || null;
        const derived = synthesizeCommentOnlyEnvelope(env?.comments || env?.comment_analysis || null);
        const score = Number.isFinite(Number(lastAutoScanResult.risk_score))
          ? Math.max(0, Math.min(100, Math.round(Number(lastAutoScanResult.risk_score))))
          : (derived?.risk_score ?? 0);
        const level = lastAutoScanResult.risk_level || derived?.risk_level || bandFromScore(score);
        dbg("[Popup] cache restored:", lastAutoScanResult.type, score);
        showRiskAssessment(
          score,
          level,
          lastAutoScanResult.description || null,
          null,
          env
        );
      } else {
        dbg("[Popup] Unsupported cache type:", lastAutoScanResult.type);
      }
    } else {
      dbg("No recent scan results found");
    }
  });
}

function isRecentResult(timestamp) {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return (now - timestamp) < fiveMinutes;
}

// Submit on Enter in the activation key field
if (activationKeyInput) {
  activationKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); activateBtn?.click(); }
  });
}

// Re-detect supported page when the active tab changes or its URL updates
chrome.tabs.onActivated.addListener(() => refreshPageStatus());
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") refreshPageStatus();
});


// Handle activation key submission
const ACTIVATION_KEY_RE = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

activateBtn.addEventListener("click", async () => {
  const rawKey = activationKeyInput?.value || "";
  const key = rawKey.trim().toUpperCase();
  if (!key) {
    showActivationMessage("Please enter your activation key.");
    activationKeyInput?.focus();
    return;
  }
  if (!ACTIVATION_KEY_RE.test(key)) {
    showActivationMessage("Activation key must be in the format XXXX-XXXX-XXXX-XXXX-XXXX (uppercase letters and digits).");
    activationKeyInput?.focus();
    return;
  }
  activationMessage.className = "";
  activateBtn.textContent = "Activating...";
  activateBtn.disabled = true;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(`${SURESHOP_API_BASE}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activation_key: key }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.status === 401 || res.status === 403) {
      showActivationMessage("Invalid activation key. Please try again.");
      return;
    }

    if (!res.ok) {
      // Surface the real backend error rather than silently storing a fake token.
      let detail = "";
      try { detail = (await res.json())?.detail || ""; } catch (_) {}
      showActivationMessage(`Activation failed (${res.status})${detail ? ": " + detail : "."}`);
      return;
    }

    const data = await res.json();
    if (!data?.access_token) {
      showActivationMessage("Activation succeeded but no token was returned. Please try again.");
      return;
    }
    await chrome.storage.local.set({ accessToken: data.access_token, activatedAt: Date.now() });

    activationSection.style.display = "none";
    scanSection.style.display = "block";
    refreshPageStatus();
  } catch (error) {
    // Network error — keep the user on the activation screen instead of storing
    // a non-JWT raw key, which would break every authenticated request later.
    dbgErr("Activation error:", error);
    if (error.name === "AbortError") {
      showActivationMessage("Connection timed out. Check that the SureShop server is running and try again.");
    } else {
      showActivationMessage("Cannot reach the SureShop server. Check your connection and try again.");
    }
  } finally {
    clearTimeout(timeout);
    activateBtn.textContent = "Activate";
    activateBtn.disabled = false;
  }
});

// -----------------------------------------------------------------------
// Confidence Score — measures data completeness, not risk accuracy.
// Six tracked fields: price, shop_age, rating, rating_count,
//                     description, response_rate / seller_rating
// -----------------------------------------------------------------------
function computeConfidence(productData) {
  if (!productData) return null;

  const has = v => v !== null && v !== undefined && v !== '' && v !== 0;

  const FIELDS = [
    { key: 'price',         label: 'Price',               present: has(productData.price) },
    { key: 'shop_age',      label: 'Seller join date',    present: has(productData.shop_age) },
    { key: 'rating',        label: 'Aggregate rating',    present: has(productData.rating) },
    { key: 'rating_count',  label: 'Rating count',        present: has(productData.rating_count) },
    { key: 'description',   label: 'Product description', present: has(productData.description) },
    {
      key: 'response_rate',
      label: 'Response rate',
      present: has(productData.response_rate) || has(productData.seller_rating)
    },
  ];

  const fieldsPresent = FIELDS.filter(f => f.present).length;
  const fieldsMissing = FIELDS.filter(f => !f.present).map(f => f.label);
  const confidencePercentage = Math.round((fieldsPresent / FIELDS.length) * 100);
  const confidenceLevel = fieldsPresent >= 5 ? 'High'
                        : fieldsPresent >= 3 ? 'Moderate'
                        : 'Low';

  return { confidenceLevel, confidencePercentage, fieldsPresent, fieldsMissing, total: FIELDS.length };
}

// Clean function to show only PRODUCT risk assessment
function showRiskAssessment(riskScore, riskLevel, description, productData = null, scanResult = null) {
  const commentsEnvelope = scanResult?.comments || scanResult?.comment_analysis || null;
  const commentsDerived = commentsEnvelope ? synthesizeCommentOnlyEnvelope(commentsEnvelope) : null;
  let safeRiskScore = Number.isFinite(Number(riskScore))
    ? Math.max(0, Math.min(100, Math.round(Number(riskScore))))
    : null;
  if (safeRiskScore === null && commentsDerived) safeRiskScore = commentsDerived.risk_score;
  if (safeRiskScore === null) safeRiskScore = 0;
  let safeRiskLevel = riskLevel || commentsDerived?.risk_level || bandFromScore(safeRiskScore);
  safeRiskLevel = ["High", "Medium", "Low"].includes(safeRiskLevel) ? safeRiskLevel : bandFromScore(safeRiskScore);

  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Use backend risk message if available; fall back to hardcoded strings
  const riskMessage = scanResult?.risk_message
    || (safeRiskLevel === 'High'
        ? 'This product appears risky. Exercise extreme caution and consider avoiding this purchase.'
      : safeRiskLevel === 'Medium'
        ? 'This product has some risk factors. Please review carefully before purchasing.'
        : 'This product appears to be relatively safe based on current analysis.');

  // Prefer backend confidence (handles Facebook 3-field recalibration correctly).
  // Fall back to client-side computation when no backend result is available.
  // NOTE: /analyze/comments returns confidence as a plain string ("High"/"Moderate"/"Low");
  //       /analyze/listing and /analyze/deep return it as an object with .level, .percentage, etc.
  const rawConf = scanResult?.confidence;
  const conf = rawConf
    ? typeof rawConf === 'string'
      ? {
          confidenceLevel:      rawConf,
          confidencePercentage: rawConf === 'High' ? 100 : rawConf === 'Moderate' ? 60 : 33,
          fieldsPresent:        null,
          fieldsMissing:        [],
          total:                null,
        }
      : {
          confidenceLevel:      rawConf.level,
          confidencePercentage: rawConf.percentage,
          fieldsPresent:        rawConf.fields_present,
          fieldsMissing:        (rawConf.missing_fields || []).map(k => ({
            price: 'Price', shop_age: 'Seller join date', rating: 'Aggregate rating',
            rating_count: 'Rating count', description: 'Product description',
            response_rate: 'Response rate',
          })[k] || k),
          total: rawConf.total_fields,
        }
    : computeConfidence(productData);
  let confidenceHTML = '';
  if (conf && conf.confidenceLevel) {
    const lvlClass = `confidence-${conf.confidenceLevel.toLowerCase()}`;
    const missingNote = conf.fieldsMissing.length > 0
      ? `<div class="confidence-missing">${conf.fieldsMissing.join(', ')} could not be retrieved.</div>`
      : '';
    const detailLine = conf.fieldsPresent != null
      ? `<div class="confidence-detail">${conf.fieldsPresent} of ${conf.total} data points retrieved</div>`
      : '';
    confidenceHTML = `
      <div class="confidence-block ${lvlClass}">
        <div class="confidence-row">
          <span class="confidence-label"><i class="fas fa-database"></i> Confidence</span>
          <span class="confidence-row-badges">
            <span class="confidence-badge ${lvlClass}">
              ${conf.confidenceLevel}
              <span class="confidence-tooltip" title="Confidence measures how much data was available for analysis — not how accurate the risk score is. A lower confidence means fewer data points were retrieved.">
                <i class="fas fa-circle-info"></i>
              </span>
            </span>
            <span class="confidence-badge ${lvlClass}" title="Data availability">${conf.confidencePercentage}%</span>
          </span>
        </div>
        ${detailLine}
        <div class="confidence-bar-wrap">
          <div class="confidence-bar ${lvlClass}" style="width:${conf.confidencePercentage}%"></div>
        </div>
        ${missingNote}
      </div>`;
  }
  // Flags — populate Scan Summary section.
  // /analyze/listing returns flat `flags`; /analyze/deep returns `listing.flags` and `comments.flags`.
  const summaryFlags = (scanResult?.flags && scanResult.flags.length)
    ? scanResult.flags
    : (scanResult?.listing?.flags && scanResult.listing.flags.length)
      ? scanResult.listing.flags
      : [];
  let scanSummaryHTML = '';
  if (summaryFlags.length) {
    scanSummaryHTML = summaryFlags
      .map(f => {
        const safe = String(f).replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const text = safe.length > 90 ? safe.slice(0, 90) + '…' : safe;
        return `<div class="flag-item"><i class="fas fa-exclamation-triangle"></i>${text}</div>`;
      })
      .join('');
  }

  // Product Notice — computed before scanSummarySection so it can be embedded inside it
  let productNoticeHTML = '';
  if (scanResult?.product_notice) {
    const pn = scanResult.product_notice;
    const inds = (pn.indicators || []).map(i =>
      `<div class="notice-indicator"><i class="fas fa-circle-dot"></i>${i}</div>`).join('');
    productNoticeHTML = `
      <div class="product-notice-block">
        <div class="product-notice-header"><i class="fas fa-info-circle"></i> ${pn.title}</div>
        <div class="product-notice-message">${pn.message}</div>
        ${inds}
        <div class="product-notice-disclaimer">${pn.disclaimer}</div>
      </div>`;
  }

  // scanSummaryHTML and productNoticeHTML are merged into the combined Risk Analysis
  // section built below — scanSummarySection is kept as empty for backward compat.
  const scanSummarySection = '';

  // Scan type — computed early so both botAnalysisHTML and the card template can use these.
  // Deep scan:     combined_risk_score + signals.weights (weighted listing + review blend).
  // Comments scan: scanResult.comments present, no combined_risk_score.
  // Normal scan:   listing only — no comments, no combined_risk_score.
  const signals = scanResult?.signals ?? null;
  const isDeepScan      = !!(signals?.weights && scanResult?.combined_risk_score != null);
  const isCommentsScan  = !isDeepScan && !!(scanResult?.comments);
  const isFacebookScan  = !isDeepScan && !isCommentsScan &&
    ((productData?.platform || scanResult?.platform || '').toLowerCase() === 'facebook');

  // Bot / Fake Review Analysis — unified single toggle (listing flags + comment analysis)
  let botAnalysisHTML = '';
  // Use the whole comments/comment_analysis object so no field names are accidentally dropped.
  const caRaw = scanResult?.comment_analysis ?? scanResult?.comments ?? null;
  const ca = caRaw ? {
    // Try every field name variant the backend might use for the analyzed count
    reviews_analyzed: caRaw.reviews_analyzed ?? caRaw.comments_analyzed ?? caRaw.total_comments ?? caRaw.analyzed_count ?? caRaw.num_analyzed ?? 0,
    bot_likelihood_pct: caRaw.bot_likelihood_pct ?? caRaw.bot_score ?? 0,
    fake_review_pct: caRaw.fake_review_pct ?? caRaw.fake_score ?? 0,
    flags: caRaw.flags || [],
  } : null;
  const hasBackendSummary = !!(caRaw && typeof caRaw.summary === 'string' && caRaw.summary.trim());
  const hasCommentAnalysis = !!(ca && (ca.reviews_analyzed > 0 || ca.bot_likelihood_pct > 0 || ca.fake_review_pct > 0 || hasBackendSummary));

  // Extract all comment-related variables so they're available for the unified block
  let sentimentHTML = '';
  let coverageHTML = '';
  let commentFlags = [];
  let commentFlagsHTML = '';
  let botFakeRowsHTML = '';
  let summaryHTML = '';

  if (ca) {
    commentFlags = ca.flags;
    if (commentFlags.length) {
      commentFlagsHTML = commentFlags.map(f =>
        `<div class="flag-item"><i class="fas fa-exclamation-triangle"></i>${String(f).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
      ).join('');
    }

    // Dominant sentiment badge
    const sentimentVal = caRaw.dominant_sentiment || null;
    const sentimentClass = sentimentVal === 'positive' ? 'sentiment-positive'
      : sentimentVal === 'suspicious' ? 'sentiment-suspicious'
      : sentimentVal === 'mixed' ? 'sentiment-mixed'
      : null;
    const sentimentLabel = { positive: 'Positive', suspicious: 'Caution', mixed: 'Mixed' }[sentimentVal] || sentimentVal;
    sentimentHTML = sentimentVal && sentimentClass
      ? `<span class="sentiment-badge ${sentimentClass}">${sentimentLabel}</span>`
      : '';

    // Review diversity score row
    const diversityScore = caRaw.review_diversity_score != null ? Number(caRaw.review_diversity_score) : null;
    const diversityClass = diversityScore == null ? '' : diversityScore >= 70 ? 'analysis-low' : diversityScore >= 40 ? 'analysis-medium' : 'analysis-high';
    const diversityHTML = diversityScore != null
      ? `<div class="analysis-row">
            <span class="analysis-label">Review Diversity</span>
            <span class="analysis-badge ${diversityClass}">${diversityScore} / 100</span>
          </div>`
      : '';

    // Pages coverage warning callout
    const coverageNote = caRaw.pages_coverage_note
      ? String(caRaw.pages_coverage_note).replace(/</g,'&lt;').replace(/>/g,'&gt;')
      : null;
    coverageHTML = coverageNote
      ? `<div class="coverage-callout"><i class="fas fa-exclamation-circle"></i> ${coverageNote}</div>`
      : '';

    if (hasCommentAnalysis) {
      const botClass  = ca.bot_likelihood_pct  >= 50 ? 'analysis-high' : ca.bot_likelihood_pct  >= 25 ? 'analysis-medium' : 'analysis-low';
      const fakeClass = ca.fake_review_pct >= 50 ? 'analysis-high' : ca.fake_review_pct >= 25 ? 'analysis-medium' : 'analysis-low';

      // Comment summary paragraph: always use backend-provided summary.
      // Keep comment_summary object for diagnostics only.
      const _commentSummaryDiagnostics = caRaw.comment_summary || null;
      dbg("[Popup] summary_source:", caRaw.summary_source, "summary:", caRaw.summary);
      const backendSummary = typeof caRaw.summary === 'string' ? caRaw.summary.trim() : '';
      const visibleSummary = backendSummary || 'Groq summary unavailable for this scan.';
      summaryHTML = `<div class="bot-analysis-summary">${String(visibleSummary).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;

      botFakeRowsHTML = `
          <div class="bot-analysis-rows">
            <div class="analysis-row">
              <span class="analysis-label">Bot Likelihood</span>
              <span class="analysis-badge ${botClass}">${ca.bot_likelihood_pct}%</span>
            </div>
            <div class="analysis-row">
              <span class="analysis-label">Fake Review Signals</span>
              <span class="analysis-badge ${fakeClass}">${ca.fake_review_pct}%</span>
            </div>
            ${diversityHTML}
          </div>`;
    }
  }

  const totalFlagCount = summaryFlags.length + commentFlags.length;
  const hasListingContent = !!(scanSummaryHTML || productNoticeHTML);

  if (hasListingContent || hasCommentAnalysis || commentFlagsHTML) {
    let bodyContent = '';

    // Listing Risks section
    if (scanSummaryHTML) {
      bodyContent += `<div class="flags-group-label">Listing Risks</div>${scanSummaryHTML}`;
    }
    if (productNoticeHTML) {
      bodyContent += productNoticeHTML;
    }

    // Comment flags section
    if (commentFlagsHTML) {
      if (hasListingContent) {
        bodyContent += `<hr class="analysis-inner-divider"><div class="flags-group-label">From Review Analysis</div>`;
      }
      bodyContent += commentFlagsHTML;
    }

    // Bot/fake/diversity rows and Groq summary — only when comment analysis data exists
    if (hasCommentAnalysis) {
      bodyContent += `<hr class="analysis-inner-divider">${botFakeRowsHTML}${summaryHTML}`;
    }

    const totalFlagCountBadge = totalFlagCount
      ? `<span class="section-flag-count">${totalFlagCount} flag${totalFlagCount !== 1 ? 's' : ''}</span>`
      : '';
    const reviewedCountHTML = ca ? `<span class="analysis-count">${ca.reviews_analyzed} reviewed</span>` : '';

    botAnalysisHTML = `
      <div class="bot-analysis-block">
        <button class="bot-analysis-header section-toggle" aria-expanded="${isCommentsScan ? 'true' : 'false'}">
          <span><i class="fas fa-shield-alt"></i> Key Issues Found</span>
          <span class="section-toggle-meta">
            ${totalFlagCountBadge}
            ${sentimentHTML}
            ${reviewedCountHTML}
            <i class="fas fa-chevron-down section-toggle-icon"></i>
          </span>
        </button>
        <div class="bot-analysis-collapsible section-collapsible" style="display:${isCommentsScan ? 'block' : 'none'};">
          ${bodyContent}
        </div>
      </div>
      ${coverageHTML}`;
  }

  // Scan type detection was moved above botAnalysisHTML — these vars are already in scope.

  // Score Breakdown — only rendered for Deep Scan.
  // Deep scan layout:
  //   LISTING SCORE — 70% weight  [category rows]  Sub-total: X pts × 70% = Y pts
  //   REVIEW ANALYSIS — 30% weight  +Z pts  [bar]
  //   ─────────  Y + Z = combined / 100 · Level
  let scoreBreakdownHTML = '';
  const sbd = (scanResult?.score_breakdown_details && Object.keys(scanResult.score_breakdown_details).length)
    ? scanResult.score_breakdown_details
    : (scanResult?.listing?.score_breakdown_details && Object.keys(scanResult.listing.score_breakdown_details).length)
      ? scanResult.listing.score_breakdown_details
      : null;
  if (false /* DISABLED: sbd && isDeepScan */) {

    const CAT_ICONS = { seller_attributes: 'fa-user-shield', listing_metadata: 'fa-tag', textual_nlp: 'fa-align-left', url_domain: 'fa-link' };
    const compoundBonus = summaryFlags.includes('Unverified listing: no recorded sales or buyer ratings') ? 18 : 0;

    // Always render url_domain when its score > 0 so category rows always sum to the listing total.
    const urlScore = sbd['url_domain']?.score ?? 0;
    const catKeys  = urlScore > 0
      ? ['seller_attributes', 'listing_metadata', 'textual_nlp', 'url_domain']
      : ['seller_attributes', 'listing_metadata', 'textual_nlp'];

    const catRowsHTML = catKeys.map(key => {
      const item = sbd[key];
      if (!item) return '';
      const score   = item.score ?? 0;
      const max     = item.max ?? 25;
      const label   = item.label || key;
      const summary = item.summary ? String(item.summary).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
      const pct     = Math.round((score / max) * 100);
      const barCls  = score >= 17 ? 'confidence-low' : score >= 9 ? 'confidence-moderate' : 'confidence-high';
      const valClr  = score >= 17 ? '#c0003c' : score >= 9 ? '#8a6a00' : '#0f766e';
      const icon    = CAT_ICONS[key] || 'fa-chart-bar';
      return `
        <div style="padding:5px 10px 6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
            <span style="font-size:11px;font-weight:600;color:var(--color-dark-variant);"><i class="fas ${icon}"></i> ${label}</span>
            <span style="font-size:11px;font-weight:700;color:${valClr};">${score} / ${max}</span>
          </div>
          <div class="confidence-bar-wrap"><div class="confidence-bar ${barCls}" style="width:${pct}%"></div></div>
          ${summary ? `<div style="font-size:10px;color:var(--color-dark-variant);margin-top:3px;font-style:italic;">${summary}</div>` : ''}
        </div>`;
    }).join('');

    const totCls = safeRiskLevel === 'High' ? 'analysis-high' : safeRiskLevel === 'Medium' ? 'analysis-medium' : 'analysis-low';

    if (isDeepScan) {
      // ── Deep scan: two weighted sections ──────────────────────────────────────
      const listingScore   = scanResult.listing?.risk_score ?? 0;
      const listingWeight  = signals.weights.listing  ?? 0.7;
      const commentWeight  = signals.weights.comments ?? 0.3;
      const combinedScore  = scanResult.combined_risk_score;
      const listingContrib = Math.round(listingScore * listingWeight);
      const commentContrib = combinedScore - listingContrib;

      const reviewBarPct = Math.min(Math.round((commentContrib / (commentWeight * 100)) * 100), 100);
      const reviewBarCls = commentContrib >= Math.round(commentWeight * 100 * 0.67) ? 'confidence-low'
        : commentContrib >= Math.round(commentWeight * 100 * 0.37) ? 'confidence-moderate'
        : 'confidence-high';
      const reviewValClr = commentContrib >= 10 ? '#c0003c' : commentContrib >= 5 ? '#8a6a00' : '#0f766e';
      const listingSubtotalClr = listingContrib >= 17 ? '#c0003c' : listingContrib >= 9 ? '#8a6a00' : '#0f766e';

      scoreBreakdownHTML = `
        <div class="bot-analysis-block">
          <button class="bot-analysis-header section-toggle" aria-expanded="false">
            <span><i class="fas fa-chart-bar"></i> Score Breakdown</span>
            <span class="section-toggle-meta"><i class="fas fa-chevron-down section-toggle-icon"></i></span>
          </button>
          <div class="bot-analysis-collapsible section-collapsible" style="display:none;">

            <!-- LISTING SCORE section -->
            <div style="padding:5px 10px 2px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--color-dark-variant);opacity:0.65;"><i class="fas fa-list-check"></i>&nbsp;Listing Score</span>
              <span style="font-size:10px;font-weight:600;color:var(--color-dark-variant);opacity:0.65;">${Math.round(listingWeight * 100)}% weight</span>
            </div>

            ${catRowsHTML}

            <!-- Sub-total: raw listing score → weighted contribution -->
            <div style="margin:2px 8px 6px;padding:5px 10px;background:var(--color-light,#f8f9fa);border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;color:var(--color-dark-variant);">Sub-total&nbsp;&nbsp;${listingScore}&nbsp;pts&nbsp;&times;&nbsp;${Math.round(listingWeight * 100)}%</span>
              <span style="font-size:11px;font-weight:700;color:${listingSubtotalClr};">=&nbsp;${listingContrib}&nbsp;pts</span>
            </div>

            <hr class="analysis-inner-divider">

            <!-- REVIEW ANALYSIS section -->
            <div style="padding:5px 10px 2px;display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--color-dark-variant);opacity:0.65;"><i class="fas fa-comments"></i>&nbsp;Review Analysis</span>
              <span style="font-size:10px;font-weight:600;color:var(--color-dark-variant);opacity:0.65;">${Math.round(commentWeight * 100)}% weight</span>
            </div>

            <div style="padding:5px 10px 6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
                <span style="font-size:11px;color:var(--color-dark-variant);">Bot &amp; fake-review signals</span>
                <span style="font-size:11px;font-weight:700;color:${reviewValClr};">+${commentContrib}&nbsp;pts</span>
              </div>
              <div class="confidence-bar-wrap"><div class="confidence-bar ${reviewBarCls}" style="width:${reviewBarPct}%"></div></div>
            </div>

            <hr class="analysis-inner-divider">

            <!-- Equation + total -->
            <div style="padding:2px 10px 3px;text-align:right;font-size:10px;color:var(--color-dark-variant);font-style:italic;">
              ${listingContrib}&nbsp;+&nbsp;${commentContrib}&nbsp;=&nbsp;${combinedScore}
            </div>
            <div class="analysis-row" style="margin:2px 10px 6px;">
              <span class="analysis-label"><strong>Total Risk Score</strong></span>
              <span class="analysis-badge ${totCls}">${combinedScore} / 100 &nbsp;&middot;&nbsp; ${safeRiskLevel}</span>
            </div>
            <div style="margin:0 8px 8px;padding:7px 10px;background:var(--color-light,#f8f9fa);border-radius:6px;font-size:10px;color:var(--color-dark-variant);line-height:1.5;">
              <strong>Why the percentages?</strong><br>
              This is a <em>Deep Scan</em> — it combines two sources of evidence.
              Listing details (seller info, price, description) make up <strong>${Math.round(listingWeight * 100)}%</strong> of the score
              because they are directly verifiable.
              Buyer reviews make up <strong>${Math.round(commentWeight * 100)}%</strong> because they can be
              faked or manipulated, so they carry less weight on their own.
              The final score reflects both sources together.
            </div>

          </div>
        </div>`;

    }
    // Normal scan (isDeepScan === false) — no Score Breakdown; score is not displayed.
  }

  let dataRowsHTML = '';
  if (productData) {
    const esc = v => String(v).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const row = (icon, label, value, required = false) => {
      if (value === null || value === undefined || value === '') {
        if (!required) return '';
        return `<div class="cdata-row cdata-row--missing">
          <span class="cdata-label"><i class="fas ${icon}"></i> ${label}</span>
          <span class="cdata-value cdata-value--missing"><i class="fas fa-exclamation-circle"></i> Not found</span>
        </div>`;
      }
      return `<div class="cdata-row">
        <span class="cdata-label"><i class="fas ${icon}"></i> ${label}</span>
        <span class="cdata-value">${esc(value)}</span>
      </div>`;
    };
    const platform = (productData.platform || '').toLowerCase();
    const isSh = platform === 'shopee';
    const isLa = platform === 'lazada';
    const isFb = platform === 'facebook';
    const platformIcons = { shopee: 'fa-store', lazada: 'fa-tag', facebook: 'fa-facebook' };
    const platformIcon = platformIcons[platform] || 'fa-store';
    const inferredZero = productData.data_quality?.inferred_zero || [];
    const priceDisplay = productData.price !== null && productData.price !== undefined
      ? `₱${Number(productData.price).toLocaleString()}`
      : productData.price_is_variant
      ? 'Select a variant on the listing to determine price'
      : null;
    // Use inferred_zero to keep UI showing "Not found" for fields that were
    // coerced to 0 for the backend but were never actually found on the page.
    const ratingKnown = productData.rating !== null && productData.rating !== undefined
      && !inferredZero.includes('rating');
    const ratingCountKnown = productData.rating_count !== null && productData.rating_count !== undefined
      && !inferredZero.includes('rating_count');
    const ratingDisplay = ratingKnown
      ? `${productData.rating} / 5 (${ratingCountKnown ? productData.rating_count : 0} reviews)`
      : null;
    const soldDisplay = productData.sold_count !== null && productData.sold_count !== undefined
      && !inferredZero.includes('sold_count')
      ? String(productData.sold_count)
      : null;
    dataRowsHTML = [
      row(platformIcon,          'Platform',      productData.platform),
      row('fa-link',             'URL',           productData.url),
      row('fa-box-open',         'Product',       productData.product_name,    true),
      row('fa-tag',              'Price',         priceDisplay,                true),
      row('fa-fire',             'Sold',          soldDisplay, isSh || isLa),
      row('fa-user-tie',         'Seller',        productData.seller_name,     true),
      row('fa-certificate',      'Badges',        Array.isArray(productData.seller_badges) && productData.seller_badges.length > 0 ? productData.seller_badges.join(' · ') : null),
      row('fa-store',            'Mall',          productData.is_shopee_mall ? 'Shopee Mall' : productData.is_lazmall ? 'LazMall' : null),
      row('fa-star',             'Rating',        ratingDisplay,               isSh || isLa),
      row('fa-comments',         'Response Rate', productData.response_rate !== null && productData.response_rate !== undefined ? `${productData.response_rate}%` : null, isSh),
      row('fa-calendar-alt',     'Shop Age',      productData.shop_age,        isSh),
      row('fa-medal',            'Seller Rating', productData.seller_rating !== null && productData.seller_rating !== undefined ? String(productData.seller_rating) : null, isLa || isFb),
      row('fa-images',           'Images',        productData.image_count !== null && productData.image_count !== undefined ? String(productData.image_count) : null, true),
      // Facebook-specific
      row('fa-info-circle',      'Condition',     productData.condition,       isFb),
      row('fa-map-marker-alt',   'Location',      productData.location,        isFb),
      row('fa-calendar',         'Listed',        productData.listing_date,    isFb),
      row('fa-clock',            'Extracted At',  productData.extracted_at),
    ].filter(Boolean).join('');
  }

  // Product description sub-block (inside the toggle panel)
  const descInPanelHTML = description
    ? `<div class="cdata-desc-block">
        <div class="cdata-desc-label"><i class="fas fa-align-left"></i> Product Description</div>
        <div class="cdata-desc-text">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>`
    : '';

  // Product specifications sub-block
  const specsData = productData?.specifications;
  const specsInPanelHTML = specsData && typeof specsData === 'object' && Object.keys(specsData).length > 0
    ? `<div class="cdata-desc-block">
        <div class="cdata-desc-label"><i class="fas fa-list-ul"></i> Product Specifications</div>
        <table class="cdata-specs-table">
          ${Object.entries(specsData).map(([k, v]) =>
            `<tr><td class="cdata-specs-key">${k.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td><td class="cdata-specs-val">${String(v).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</td></tr>`
          ).join('')}
        </table>
      </div>`
    : '';

  // Comments placeholder — actual reviews appended by appendReviewsToOutput
  const commentsHint = isCommentsScan
    ? 'Loading collected comments…'
    : 'Run <strong>Deep Scan</strong> to collect comments.';
  const commentsPlaceholderHTML = `<div class="cdata-comments-placeholder" id="cdata-comments-slot">
    <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
    <div class="cdata-comments-hint">${commentsHint}</div>
  </div>`;

  const panelBodyHTML = dataRowsHTML + specsInPanelHTML + descInPanelHTML + commentsPlaceholderHTML;

  const collectedDataHTML = `<div class="cdata-section">
      <div class="cdata-header">
        <span class="cdata-header-label"><i class="fas fa-database"></i> View Collected Data</span>
        <label class="cdata-toggle-switch">
          <input type="checkbox" class="cdata-toggle-input">
          <span class="cdata-toggle-track"><span class="cdata-toggle-thumb"></span></span>
        </label>
      </div>
      <div id="cdata-body-panel" class="cdata-body cdata-body--hidden">${panelBodyHTML}</div>
    </div>`;

  // Trust indicators — positive signals from the backend (Shopee Mall, LazMall, Top Seller, etc.)
  // Only rendered when the backend returns at least one positive signal.
  const _posSignals = Array.isArray(scanResult?.positive_signals) ? scanResult.positive_signals : [];
  const positiveSignalsHTML = _posSignals.length
    ? `<div class="trust-indicators">${_posSignals.map(s =>
        `<div class="trust-indicator-item"><i class="fas fa-circle-check"></i>${String(s.message || s).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
      ).join('')}</div>`
    : '';

  // Preserve live-reviews section and panel-open state across risk-card re-renders
  const existingReviews = document.getElementById("sureshop-reviews-output");
  const panelWasOpen = document.getElementById("cdata-body-panel")?.classList.contains("cdata-body--open");
  output.innerHTML = '';
  output.style.padding = '';
  output.style.textAlign = '';
  output.style.fontFamily = '';
  
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="result-card">
      ${(isDeepScan || isCommentsScan || isFacebookScan) ? `
      <div class="risk-badge risk-${safeRiskLevel.toLowerCase()}"></div>
      <div class="risk-level-text risk-${safeRiskLevel.toLowerCase()}">${safeRiskLevel.toUpperCase()} RISK</div>` : ''}
      ${(isDeepScan || isFacebookScan) ? `<div class="risk-score-text">Score: ${safeRiskScore} / 100</div>` : ''}

      ${confidenceHTML}

      <div class="risk-message-section">
        <div class="risk-message-label"><i class="fas fa-clipboard-check"></i> Scan Summary</div>
        <div class="risk-message">${riskMessage}</div>
        ${positiveSignalsHTML}
      </div>

      ${botAnalysisHTML}

      ${scoreBreakdownHTML}

      ${collectedDataHTML}

      <div class="scan-time">
        Scanned: ${timestamp}
      </div>

      <div class="report-section">
        <button class="report-btn" id="reportListingBtn">
          <i class="fas fa-flag"></i> Report This Listing
        </button>
        <div class="report-form" id="reportForm" style="display:none;">
          <div class="report-form-label">Why are you reporting this listing?</div>
          <select class="report-select" id="reportReason">
            <option value="">Select a reason...</option>
            <option value="scam">Suspicious listing activity</option>
            <option value="fake_product">Possibly inauthentic product</option>
            <option value="misleading">Inaccurate or incomplete description</option>
            <option value="wrong_price">Unusual or unclear pricing</option>
            <option value="false_positive">False positive</option>
            <option value="other">Other concern</option>
          </select>
          <textarea class="report-textarea" id="reportDetails" placeholder="Explanation" rows="3" maxlength="500" required></textarea>
          <div class="report-form-actions">
            <button class="report-submit-btn" id="reportSubmitBtn"><i class="fas fa-paper-plane"></i> Submit</button>
            <button class="report-cancel-btn" id="reportCancelBtn">Cancel</button>
          </div>
          <div class="report-feedback" id="reportFeedback"></div>
        </div>
      </div>
    </div>
  `;
  
  output.appendChild(container);

  // Wire up report button
  const reportListingBtn = container.querySelector('#reportListingBtn');
  const reportForm       = container.querySelector('#reportForm');
  const reportCancelBtn  = container.querySelector('#reportCancelBtn');
  const reportSubmitBtn  = container.querySelector('#reportSubmitBtn');
  const reportFeedback   = container.querySelector('#reportFeedback');

  if (reportListingBtn) {
    reportListingBtn.addEventListener('click', () => {
      reportForm.style.display = reportForm.style.display === 'none' ? '' : 'none';
    });
  }

  if (reportCancelBtn) {
    reportCancelBtn.addEventListener('click', () => {
      reportForm.style.display = 'none';
    });
  }

  if (reportSubmitBtn) {
    reportSubmitBtn.addEventListener('click', async () => {
      const reason = container.querySelector('#reportReason').value;
      if (!reason) {
        reportFeedback.textContent = 'Please select a reason.';
        reportFeedback.className = 'report-feedback report-feedback--error';
        return;
      }
      const details = container.querySelector('#reportDetails').value.trim();
      if (!details) {
        reportFeedback.textContent = 'Please provide an explanation.';
        reportFeedback.className = 'report-feedback report-feedback--error';
        return;
      }

      reportSubmitBtn.disabled = true;
      reportSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
      reportFeedback.textContent = '';

      try {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          const { accessToken } = await chrome.storage.local.get('accessToken');
          const payload = {
            listing_url: tabs[0]?.url || '',
            report_type: reason,
            description: details || null
          };

          try {
            const res = await fetch(`${SURESHOP_API_BASE}/reports`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
              },
              body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            reportFeedback.textContent = 'Thank you! Your report has been submitted.';
            reportFeedback.className = 'report-feedback report-feedback--success';
            reportSubmitBtn.disabled = true;
            reportSubmitBtn.innerHTML = '<i class="fas fa-check"></i> Reported';
            reportListingBtn.disabled = true;
            reportListingBtn.innerHTML = '<i class="fas fa-flag"></i> Reported';
            reportListingBtn.classList.add('report-btn--done');
          } catch (_) {
            reportFeedback.textContent = 'Unable to submit report. Please try again.';
            reportFeedback.className = 'report-feedback report-feedback--error';
            reportSubmitBtn.disabled = false;
            reportSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
          }
        });
      } catch (_) {
        reportFeedback.textContent = 'Something went wrong. Please try again.';
        reportFeedback.className = 'report-feedback report-feedback--error';
        reportSubmitBtn.disabled = false;
        reportSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit';
      }
    });
  }

  // Wire up the toggle AFTER it's in the DOM (MV3 CSP blocks inline handlers)
  const toggleInput = container.querySelector('.cdata-toggle-input');
  const cdataBody = container.querySelector('#cdata-body-panel');
  if (toggleInput && cdataBody) {
    toggleInput.addEventListener('change', () => {
      if (toggleInput.checked) {
        cdataBody.classList.remove('cdata-body--hidden');
        cdataBody.classList.add('cdata-body--open');
      } else {
        cdataBody.classList.remove('cdata-body--open');
        cdataBody.classList.add('cdata-body--hidden');
      }
    });
  }

  // Re-attach the live-reviews section so it survives risk-card re-renders
  if (existingReviews) {
    const slot = container.querySelector('#cdata-comments-slot');
    if (slot) slot.replaceWith(existingReviews);
    else output.appendChild(existingReviews);
  }

  // Re-open the panel if it was open before the re-render,
  // or auto-open for comments-only scan so reviews are immediately visible.
  if (panelWasOpen || (isCommentsScan && !productData)) {
    const panel = container.querySelector('#cdata-body-panel');
    const toggle = container.querySelector('.cdata-toggle-input');
    if (panel) {
      panel.classList.remove("cdata-body--hidden");
      panel.classList.add("cdata-body--open");
    }
    if (toggle) toggle.checked = true;
  }

  // Wire up section collapsible toggles (Scan Summary, Bot Analysis)
  container.querySelectorAll('.section-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      const body = btn.nextElementSibling;
      if (body) body.style.display = expanded ? 'none' : 'block';
    });
  });
}

// Enhanced manual scan function - PRODUCTS ONLY
function performScan(isAutomatic = false, withReviews = false) {
  chrome.storage.local.get("accessToken", ({ accessToken }) => {
    if (!accessToken) {
      showToast("Extension not activated. Enter your activation key first.", "error");
      return;
    }

    // Clear all previous results before starting a new scan
    output.innerHTML = '';

    scanBtn.innerHTML = isAutomatic ? '<i class="fas fa-sync spinning"></i> Auto-scanning...' : '<i class="fas fa-sync spinning"></i> Quick scanning...';
    if (withReviews) {
      commentsBtn.innerHTML = '<i class="fas fa-sync spinning"></i> Deep scanning...';
      commentsBtn.disabled = true;
      // Lock comment-only button during deep scan
      commentOnlyBtn.disabled = true;
      commentOnlyBtn.style.opacity = '0.5';
    }
    scanBtn.disabled = true;
    const _scanLabel = withReviews ? 'Deep Scanning&hellip;' : 'Quick Scanning&hellip;';
    output.innerHTML = `<div class="collecting-panel">
      <div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div>
      <div class="collecting-label">${_scanLabel}</div>
      <div class="scan-loading-steps">
        <div class="scan-step scan-step--active"><i class="fas fa-circle-notch fa-spin"></i>&ensp;Reading page data</div>
        <div class="scan-step"><i class="fas fa-circle-dot"></i>&ensp;AI risk analysis</div>
      </div>
    </div>`;
    output.style.padding = '10px 12px';

    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        showToast("Unable to access current tab.", "error");
        output.textContent = "";
        resetButton();
        return;
      }

      const currentTab = tabs[0];
      dbg("Current tab URL:", currentTab.url);

      // Detect platform via the central registry
      const platform = detectPlatform(currentTab.url);
      const isShopee = platform?.key === "shopee" && platform.isProduct;
      const isLazada = platform?.key === "lazada" && platform.isProduct;
      const isFacebook = platform?.key === "facebook" && platform.isProduct;

      if (!isShopee && !isLazada && !isFacebook) {
        showToast("Open a Shopee, Lazada, or FB Marketplace product page to scan.", "warning", 4500);
        output.textContent = "";
        resetButton();
        return;
      }

      // Determine which content script handles this platform
      const contentScript = isShopee ? "src/content/content_shopee.js"
                          : isLazada ? "src/content/content_lazada.js"
                          : "src/content/content_facebook.js";

      // Helper: send EXTRACT_DATA message, injecting the content script first if needed
      async function sendExtractData() {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTab.id, { type: "EXTRACT_DATA" }, (response) => {
            if (chrome.runtime.lastError) {
              // Content script not running — inject it then retry once
              chrome.scripting.executeScript(
                { target: { tabId: currentTab.id }, files: ["src/config.js", "src/shared/storage.js", contentScript] },
                () => {
                  if (chrome.runtime.lastError) {
                    resolve(null);
                    return;
                  }
                  // Short delay to let the script initialise
                  setTimeout(() => {
                    chrome.tabs.sendMessage(currentTab.id, { type: "EXTRACT_DATA" }, (retryResponse) => {
                      if (chrome.runtime.lastError) { resolve(null); return; }
                      resolve(retryResponse);
                    });
                  }, 300);
                }
              );
            } else {
              resolve(response);
            }
          });
        });
      }

      // Send message to content script to extract data
      const response = await sendExtractData();
      if (!response) {
        showToast("Unable to scan this page. Please refresh and try again.", "error");
        output.textContent = "";
        resetButton();
        return;
      }

      if (!response.success) {
        showToast("Failed to extract product data. Please try again.", "error");
        output.textContent = "";
        resetButton();
        return;
      }

      // Facebook variant listings: price range means the user hasn't selected a product type yet
      if (response.price_is_variant) {
        output.innerHTML = '';
        const variantWarning = document.createElement('div');
        variantWarning.className = 'variant-warning-card';
        variantWarning.innerHTML = `
          <div class="variant-warning-icon"><i class="fas fa-layer-group"></i></div>
          <div class="variant-warning-title">Select a Variant First</div>
          <div class="variant-warning-desc">This listing has multiple items at different prices. Please select a specific variant (size, color, type, etc.) on the Facebook page, then scan again.</div>
        `;
        output.appendChild(variantWarning);
        resetButton();
        return;
      }

      dbg("Extracted data:", response);
      dbg("Product name from extraction:", response.product_name);
      // Advance the step indicator: mark page-data done, activate AI analysis step
      const _stepsEl = output.querySelector('.scan-loading-steps');
      if (_stepsEl) {
        _stepsEl.innerHTML = `
          <div class="scan-step scan-step--done"><i class="fas fa-check"></i>&ensp;Page data collected</div>
          <div class="scan-step scan-step--active"><i class="fas fa-circle-notch fa-spin"></i>&ensp;AI risk analysis&hellip;</div>`;
      }

      try {
        // Format data for /analyze/listing
        // Normalize price: ensure it is always a number ("Free" → 0)
        const rawPrice = response.price;
        const normalizedPrice = (typeof rawPrice === 'string' && /free/i.test(rawPrice))
          ? 0
          : (rawPrice !== undefined && rawPrice !== null ? rawPrice : null);

        const productData = {
          url: currentTab.url,
          platform: response.platform || "shopee",
          product_name: response.product_name,
          price: normalizedPrice,
          sold_count: response.sold_count,
          rating: response.rating,
          rating_count: response.rating_count,
          // Shopee-specific
          response_rate: response.response_rate,
          shop_age: response.shop_age,
          // Lazada-specific
          seller_rating: response.seller_rating,
          seller_badges: response.seller_badges || null,
          is_lazmall: response.is_lazmall || false,
          // Shopee Mall
          is_shopee_mall: response.is_shopee_mall || false,
          // Product specifications (Shopee & Lazada)
          specifications: response.specifications || null,
          // Facebook-specific
          condition: response.condition,
          location: response.location,
          listing_date: response.listing_date,
          listing_url: response.listing_url || currentTab.url,
          // Common
          seller_name: response.seller_name,
          image_count: response.image_count,
          description: response.description || null,
          data_quality: response.data_quality || null,
        };

        // Cache for progressive restart
        if (currentTab.url.includes("shopee.ph")) lastShopeeProductData = productData;
        if (currentTab.url.includes("lazada.com.ph")) lastLazadaProductData = productData;
        if (currentTab.url.includes("facebook.com")) lastFacebookProductData = productData;

        dbg("=== SCAN DATA SNAPSHOT: productData sent to /analyze/listing ===");
        dbg(JSON.stringify(productData, null, 2));

        const scanResponse = await fetch(
          `${SURESHOP_API_BASE}/analyze/listing`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify(productData)
          }
        );

        if (!scanResponse.ok) {
          const errorText = await scanResponse.text();
          dbgErr("Server error:", scanResponse.status, errorText);
          throw new Error(`Server error: ${scanResponse.status}`);
        }

        const result = await scanResponse.json();
        dbg("=== SCAN DATA SNAPSHOT: API response from /analyze/listing ===");
        dbg(JSON.stringify(result, null, 2));

        if (result.risk_score !== undefined && result.risk_level !== undefined) {
          // Store result for later retrieval
          const storageData = {
            lastAutoScanResult: {
              type: "product",
              risk_score: result.risk_score,
              risk_level: result.risk_level,
              description: response.description || null,
              timestamp: Date.now(),
              url: currentTab.url,
              tabId: currentTab.id
            }
          };

          await chrome.storage.local.set(storageData);
          dbg("[Popup] cache written:", "product", result.risk_score);

          if (!withReviews) {
            // Normal scan: show result immediately
            showRiskAssessment(result.risk_score, result.risk_level, response.description || null, productData, result);
          } else {
            lastShopeeReviews = [];
            lastLazadaReviews = [];
            // Deep Scan: store initial result and only show it when collection stops
            lastDeepScanInitialResult = { risk_score: result.risk_score, risk_level: result.risk_level, description: response.description || null, productData, result };

            const isShopee = currentTab.url.includes("shopee.ph");
            const isLazada = currentTab.url.includes("lazada.com.ph");

            if (isShopee) {
              chrome.tabs.sendMessage(
                currentTab.id,
                { type: "START_PROGRESSIVE_COLLECTION", scanData: productData },
                () => {
                  resetGuidanceForNewScan();
                  setCommentsButtonState("scanning");
                  output.innerHTML = `<div class="collecting-panel"><div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div><div class="collecting-label">Scanning Comments&hellip;</div><div class="collecting-count">0 reviews collected</div></div>`;
                  output.style.padding = '10px 12px';
                }
              );
            } else if (isLazada) {
              chrome.tabs.sendMessage(
                currentTab.id,
                { type: "START_PROGRESSIVE_COLLECTION", scanData: productData },
                () => {
                  resetGuidanceForNewScan();
                  setCommentsButtonState("scanning");
                  output.innerHTML = `<div class="collecting-panel"><div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div><div class="collecting-label">Scanning Comments&hellip;</div><div class="collecting-count">0 reviews collected</div></div>`;
                  output.style.padding = '10px 12px';
                }
              );
            } else {
              // Platform doesn't support deep scan (e.g. Facebook) — show listing result directly
              showRiskAssessment(result.risk_score, result.risk_level, response.description || null, productData, result);
            }
          }
        } else {
          showToast("Invalid response from server. Please try again.", "error");
          output.textContent = "";
        }
      } catch (error) {
        const isOffline = error instanceof TypeError && error.message === "Failed to fetch";
        let errMsg, errDetail;
        if (isOffline) {
          errMsg = "Cannot reach the SureShop server.";
          errDetail = "Make sure the server is running and your internet connection is active, then try again.";
        } else if (error.message && error.message.startsWith("Server error:")) {
          errMsg = error.message;
          errDetail = "The server returned an error. Please try again later.";
        } else {
          errMsg = "Scan failed.";
          errDetail = error.message || "An unexpected error occurred.";
        }
        output.innerHTML = `
          <div class="error-recovery-card">
            <div class="error-recovery-icon"><i class="fas fa-exclamation-triangle"></i></div>
            <div class="error-recovery-msg"><strong>${errMsg}</strong></div>
            <div class="error-recovery-detail">${errDetail}</div>
            <button class="error-retry-btn" id="retryBtn">
              <i class="fas fa-redo"></i> Try Again
            </button>
          </div>`;
        const retryBtn = document.getElementById("retryBtn");
        if (retryBtn) {
          retryBtn.addEventListener("click", () => {
            output.innerHTML = "";
            performScan(false, withReviews);
          });
        }
      } finally {
        resetButton();
      }
    });
  });
}

// -----------------------------------------------------------------------
// Comment-only envelope synthesis — used when /analyze/deep wasn't called
// (no listing payload was available, e.g. user clicked Scan Comments
// without first running Normal Scan). The /analyze/comments endpoint returns
// only the bot/fake-review signals; we synthesize a deep-shaped envelope so
// the existing showRiskAssessment renderer can display the comment analysis
// block. Score is derived from avg(bot, fake)*100 and banded client-side.
// -----------------------------------------------------------------------
function bandFromScore(score) {
  if (score >= 76) return "High";
  if (score >= 51) return "Medium";
  if (score >= 26) return "Low";
  return "Low"; // collapse "Very Low" → "Low" (no .risk-very CSS class)
}

/**
 * Called when the content script's API call failed (message.result === null).
 * The popup re-runs the analysis itself using the collected reviews.
 * On success, re-renders the risk card with comment analysis included.
 */
async function analyzeCommentsFromPopup(reviews, productData, baseSr, platform) {
  function _failAnalyzing(msg) {
    showToast(msg, 'error', 5000);
    const _pl = output.querySelector('.collecting-panel');
    if (_pl) {
      const _ic = _pl.querySelector('.collecting-icon i');
      const _lb = _pl.querySelector('.collecting-label');
      if (_ic) _ic.className = 'fas fa-exclamation-circle';
      if (_lb) _lb.textContent = 'Analysis failed — please try again.';
    }
  }
  const { accessToken } = await chrome.storage.local.get('accessToken');
  if (!accessToken) { _failAnalyzing('Please log in to analyze comments.'); return; }
  const commentsPayload = {
    platform,
    comments: reviews.map(r => ({ text: r.text || r.comment || '', date: r.date || null, rating_stars: r.rating_stars ?? r.rating ?? null })),
    page_number: 1, total_pages: 1
  };
  const useDeep = !!productData;
  const url = useDeep ? `${SURESHOP_API_BASE}/analyze/deep` : `${SURESHOP_API_BASE}/analyze/comments`;
  const body = useDeep ? { listing: productData, comments: commentsPayload } : commentsPayload;
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` }, body: JSON.stringify(body) });
    if (!res.ok) { _failAnalyzing(`Comment analysis failed (HTTP ${res.status}). Please try again.`); return; }
    const result = await res.json();
    const riskScore = result.combined_risk_score ?? result.risk_score ?? baseSr?.risk_score;
    const riskLevel = result.combined_risk_level ?? result.risk_level ?? baseSr?.risk_level;
    // Merge: keep listing-only fields (product_notice, confidence, risk_message, flags)
    // from baseSr.result and overlay the deep-scan fields (comments, combined scores) on top.
    const mergedResult = { ...(baseSr?.result || {}), ...result };
    const sr = {
      risk_score: riskScore, risk_level: riskLevel,
      description: productData?.description || baseSr?.description || null,
      productData: productData || baseSr?.productData,
      result: mergedResult
    };
    const hasListing = !!(productData || baseSr?.productData);
    const cacheType = hasListing ? 'product' : 'comments';
    await chrome.storage.local.set({
      lastAutoScanResult: {
        type: cacheType,
        risk_score: Number.isFinite(Number(sr.risk_score)) ? Math.max(0, Math.min(100, Math.round(Number(sr.risk_score)))) : (synthesizeCommentOnlyEnvelope(sr.result?.comments || sr.result?.comment_analysis)?.risk_score || 0),
        risk_level: sr.risk_level || bandFromScore(Number.isFinite(Number(sr.risk_score)) ? Number(sr.risk_score) : 0),
        result: sr.result,
        description: sr.description || null,
        timestamp: Date.now(),
        url: (sr.productData && sr.productData.url) || null,
      }
    });
    dbg("[Popup] cache written:", cacheType, sr.risk_score);
    showRiskAssessment(sr.risk_score, sr.risk_level, sr.description, sr.productData, sr.result);
    // showRiskAssessment clears output — re-append collected reviews
    appendReviewsToOutput(reviews, platform === 'lazada', Number(productData?.rating_count) === 0);
  } catch (err) {
    dbg("[Popup] analyzeCommentsFromPopup error:", err);
    _failAnalyzing('Comment analysis failed. Please try again.');
  }
}

function synthesizeCommentOnlyEnvelope(commentsResult) {
  if (!commentsResult || typeof commentsResult !== 'object') return null;
  const bot  = Number(commentsResult.bot_likelihood_pct)  || 0;
  const fake = Number(commentsResult.fake_review_pct)     || 0;
  const score = Math.max(0, Math.min(100, Math.round((bot + fake) / 2)));
  const level = bandFromScore(score);
  return {
    risk_score: score,
    risk_level: level,
    result: {
      comments: commentsResult,
      flags: commentsResult.flags || [],
      // Keep listing-derived fields absent so the UI does not claim a listing
      // confidence value that wasn't computed.
    },
  };
}

// -----------------------------------------------------------------------
// Progressive update listener — fires while the side panel is open whenever
// the Shopee content script finishes re-analyzing a new review page.
// -----------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOPEE_SCAN_UPDATED") {
    if (Array.isArray(message.reviews)) lastShopeeReviews = message.reviews;
    checkMidScanTriggers(message.reviews || []);
    dbg("[Popup] Progressive update (collecting):", message.risk_score, message.risk_level, (message.reviews || []).length);
    const _spCount = (message.reviews || []).length;
    // Update the active button with a live count so the side panel shows progress
    if (progressiveState === "scanning") {
      commentsBtn.innerHTML = `<i class="fas fa-stop"></i> Stop Collecting (${_spCount})`;
    }
    if (commentOnlyState === "scanning") {
      commentOnlyBtn.innerHTML = `<i class="fas fa-stop"></i> Stop Collecting (${_spCount})`;
    }
    // Always show a collecting-progress card so the count is visible in the side panel
    const _scoreHtml = message.risk_score != null && message.risk_level
      ? `<div class="collecting-score-row"><span class="collecting-score-badge collecting-score-${message.risk_level.toLowerCase()}">${message.risk_level} Risk &middot; ${message.risk_score}/100</span></div>`
      : '';
    const _existing = output.querySelector('.collecting-panel');
    if (_existing) {
      _existing.querySelector('.collecting-count').textContent = `${_spCount} review${_spCount !== 1 ? 's' : ''} collected`;
      if (message.risk_score != null && message.risk_level) {
        let _sr = _existing.querySelector('.collecting-score-row');
        if (_sr) _sr.outerHTML = _scoreHtml; else _existing.insertAdjacentHTML('beforeend', _scoreHtml);
      }
    } else if (progressiveState === 'scanning' || commentOnlyState === 'scanning') {
      // Only restore collecting panel if still scanning — guards against a late-arriving
      // SHOPEE_SCAN_UPDATED (from an un-awaited fetch) overwriting the result card.
      output.innerHTML = `<div class="collecting-panel"><div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div><div class="collecting-label">Scanning Comments&hellip;</div><div class="collecting-count">${_spCount} review${_spCount !== 1 ? 's' : ''} collected</div>${_scoreHtml}</div>`;
      output.style.padding = '10px 12px';
    }
  }

  if (message.type === "SHOPEE_PROGRESSIVE_STOPPED") {
    dbg("[Popup] stopped message received:", message.type);
    clearStopFallbackTimer();
    clearMidScanBanner();
    scanStartTime = null;
    setActiveCollectionState("stopped");
    let sr = message.risk_score !== undefined && message.risk_score !== null && message.risk_level
      ? { risk_score: message.risk_score, risk_level: message.risk_level, description: lastShopeeProductData?.description || null, productData: lastShopeeProductData, result: message.result || null }
      : lastDeepScanInitialResult;
    // Comment-only fallback: render bot analysis even with no product score.
    if (!sr && message.result?.comments) {
      const env = synthesizeCommentOnlyEnvelope(message.result.comments);
      if (env) sr = { ...env, description: lastShopeeProductData?.description || null, productData: lastShopeeProductData };
    }
    // Always prefer the deep scan result for comment analysis display.
    // lastDeepScanInitialResult.result is from /analyze/listing (no comment data);
    // message.result is from /analyze/deep (has comments block) — always use it when available.
    if (sr && message.result) sr = { ...sr, result: message.result };
    if (sr) showRiskAssessment(sr.risk_score, sr.risk_level, sr.description, sr.productData, sr.result);
    const shopeeReviews = Array.isArray(message.reviews) && message.reviews.length > 0
      ? message.reviews
      : (Array.isArray(lastShopeeReviews) ? lastShopeeReviews : []);
    lastShopeeReviews = shopeeReviews;
    if (sr) {
      appendReviewsToOutput(shopeeReviews, false, Number(lastShopeeProductData?.rating_count) === 0);
    } else if (shopeeReviews.length > 0) {
      // No result card yet — update collecting panel to Analyzing state while API call is in progress.
      const _pl = output.querySelector('.collecting-panel');
      if (_pl) {
        const _ic = _pl.querySelector('.collecting-icon i');
        const _lb = _pl.querySelector('.collecting-label');
        if (_ic) _ic.className = 'fas fa-circle-notch fa-spin';
        if (_lb) _lb.textContent = 'Analyzing comments\u2026';
      }
    } else {
      // No result and zero reviews — panel would freeze on hourglass; show a clear message instead.
      const _pl = output.querySelector('.collecting-panel');
      if (_pl) {
        const _ic = _pl.querySelector('.collecting-icon i');
        const _lb = _pl.querySelector('.collecting-label');
        const _ct = _pl.querySelector('.collecting-count');
        if (_ic) _ic.className = 'fas fa-info-circle';
        if (_lb) _lb.textContent = 'No reviews were collected.';
        if (_ct) _ct.textContent = 'Scroll down to the reviews section and try again.';
      }
    }
    // Content script's API call failed — popup fetches comment analysis itself.
    if (!message.result && shopeeReviews.length > 0) {
      analyzeCommentsFromPopup(shopeeReviews, commentOnlyState === 'stopped' ? null : lastShopeeProductData, sr, 'shopee');
    } else if (!message.result && shopeeReviews.length === 0 && commentOnlyState !== 'stopped' && lastShopeeProductData) {
      // Deep scan context with 0 reviews — still call /analyze/deep with empty comments so
      // combined_risk_score is returned and the score badge renders correctly.
      analyzeCommentsFromPopup([], lastShopeeProductData, sr, 'shopee');
    }
  }

  if (message.type === "SHOPEE_PROGRESSIVE_RESTARTED") {
    resetGuidanceForNewScan();
    setActiveCollectionState("scanning");
    // Clear previous results so the side panel starts fresh
    lastShopeeReviews = [];
    output.innerHTML = `<div class="collecting-panel"><div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div><div class="collecting-label">Scanning Comments&hellip;</div><div class="collecting-count">0 reviews collected</div></div>`;
    output.style.padding = '10px 12px';
  }

  // Direct reviews from Lazada content script — collecting in progress.
  // Only update the count in the collecting panel; never render a result card mid-scan.
  if (message.type === "LAZADA_REVIEWS_DIRECT") {
    if (Array.isArray(message.reviews)) lastLazadaReviews = message.reviews;
    dbg("[Popup] Lazada DIRECT reviews received (collecting, count only):", (message.reviews || []).length);
    return;
  }

  // Surface API errors raised by content scripts (e.g. expired token, 5xx).
  if (message.type === "SCAN_API_ERROR") {
    const status = message.status ? ` (HTTP ${message.status})` : "";
    const scope = message.scope === "comments" ? "comment analysis" : "risk analysis";
    showToast(`Couldn't update ${scope}${status}. Please try again.`, "error", 5000);
    return;
  }

  if (message.type === "LAZADA_SCAN_UPDATED") {
    if (Array.isArray(message.reviews)) lastLazadaReviews = message.reviews;
    checkMidScanTriggers(message.reviews || []);
    dbg("[Popup] Lazada progressive update (collecting):", message.risk_score, message.risk_level, (message.reviews || []).length);
    const _lzCount = (message.reviews || []).length;
    if (progressiveState === "scanning") {
      commentsBtn.innerHTML = `<i class="fas fa-stop"></i> Stop Collecting (${_lzCount})`;
    }
    if (commentOnlyState === "scanning") {
      commentOnlyBtn.innerHTML = `<i class="fas fa-stop"></i> Stop Collecting (${_lzCount})`;
    }
    const _scoreHtml = message.risk_score != null && message.risk_level
      ? `<div class="collecting-score-row"><span class="collecting-score-badge collecting-score-${message.risk_level.toLowerCase()}">${message.risk_level} Risk &middot; ${message.risk_score}/100</span></div>`
      : '';
    const _lzExisting = output.querySelector('.collecting-panel');
    if (_lzExisting) {
      _lzExisting.querySelector('.collecting-count').textContent = `${_lzCount} review${_lzCount !== 1 ? 's' : ''} collected`;
      if (message.risk_score != null && message.risk_level) {
        let _sr = _lzExisting.querySelector('.collecting-score-row');  
        if (_sr) _sr.outerHTML = _scoreHtml; else _lzExisting.insertAdjacentHTML('beforeend', _scoreHtml);
      }
    } else if (progressiveState === 'scanning' || commentOnlyState === 'scanning') {
      // Only restore collecting panel if still scanning — guards against a late-arriving
      // LAZADA_SCAN_UPDATED (from an un-awaited fetch) overwriting the result card.
      output.innerHTML = `<div class="collecting-panel"><div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div><div class="collecting-label">Scanning Comments&hellip;</div><div class="collecting-count">${_lzCount} review${_lzCount !== 1 ? 's' : ''} collected</div>${_scoreHtml}</div>`;
      output.style.padding = '10px 12px';
    }
  }

  if (message.type === "LAZADA_PROGRESSIVE_STOPPED") {
    dbg("[Popup] stopped message received:", message.type);
    clearStopFallbackTimer();
    clearMidScanBanner();
    scanStartTime = null;
    setActiveCollectionState("stopped");
    let lr = message.risk_score !== undefined && message.risk_score !== null && message.risk_level
      ? { risk_score: message.risk_score, risk_level: message.risk_level, description: lastLazadaProductData?.description || null, productData: lastLazadaProductData, result: message.result || null }
      : lastDeepScanInitialResult;
    if (!lr && message.result?.comments) {
      const env = synthesizeCommentOnlyEnvelope(message.result.comments);
      if (env) lr = { ...env, description: lastLazadaProductData?.description || null, productData: lastLazadaProductData };
    }
    if (lr && message.result) lr = { ...lr, result: message.result };
    if (lr) showRiskAssessment(lr.risk_score, lr.risk_level, lr.description, lr.productData, lr.result);
    const lazadaReviews = Array.isArray(message.reviews) && message.reviews.length > 0
      ? message.reviews
      : (Array.isArray(lastLazadaReviews) ? lastLazadaReviews : []);
    lastLazadaReviews = lazadaReviews;
    if (lr) {
      appendReviewsToOutput(lazadaReviews, true, Number(lastLazadaProductData?.rating_count) === 0);
    } else if (lazadaReviews.length > 0) {
      // No result card yet — update collecting panel to Analyzing state while API call is in progress.
      const _pl = output.querySelector('.collecting-panel');
      if (_pl) {
        const _ic = _pl.querySelector('.collecting-icon i');
        const _lb = _pl.querySelector('.collecting-label');
        if (_ic) _ic.className = 'fas fa-circle-notch fa-spin';
        if (_lb) _lb.textContent = 'Analyzing comments\u2026';
      }
    } else {
      // No result and zero reviews — panel would freeze on hourglass; show a clear message instead.
      const _pl = output.querySelector('.collecting-panel');
      if (_pl) {
        const _ic = _pl.querySelector('.collecting-icon i');
        const _lb = _pl.querySelector('.collecting-label');
        const _ct = _pl.querySelector('.collecting-count');
        if (_ic) _ic.className = 'fas fa-info-circle';
        if (_lb) _lb.textContent = 'No reviews were collected.';
        if (_ct) _ct.textContent = 'Scroll down to Ratings & Reviews and try again.';
      }
    }
    if (!message.result && lazadaReviews.length > 0) {
      analyzeCommentsFromPopup(lazadaReviews, commentOnlyState === 'stopped' ? null : lastLazadaProductData, lr, 'lazada');
    } else if (!message.result && lazadaReviews.length === 0 && commentOnlyState !== 'stopped' && lastLazadaProductData) {
      // Deep scan context with 0 reviews — still call /analyze/deep with empty comments so
      // combined_risk_score is returned and the score badge renders correctly.
      analyzeCommentsFromPopup([], lastLazadaProductData, lr, 'lazada');
    }
  }

  if (message.type === "LAZADA_PROGRESSIVE_RESTARTED") {
    resetGuidanceForNewScan();
    setActiveCollectionState("scanning");
    // Clear previous results so the side panel starts fresh
    lastLazadaReviews = [];
    output.innerHTML = `<div class="collecting-panel"><div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div><div class="collecting-label">Scanning Comments&hellip;</div><div class="collecting-count">0 reviews collected</div></div>`;
    output.style.padding = '10px 12px';
  }
});

// Normal scan
scanBtn.addEventListener("click", () => {
  performScan(false, false);
});

// Comment-only scan — starts progressive collection without requiring a prior product scan.
// If product data was already cached from a Normal Scan it is reused (so risk score also updates);
// otherwise collection still runs — only the risk re-scan is skipped.
function performCommentOnlyScan() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const url = tabs[0].url;
    const isShopee = url.includes("shopee.ph");
    const isLazada = url.includes("lazada.com.ph");

    if (!isShopee && !isLazada) {
      showToast("Open a Shopee or Lazada product page to scan comments.", "warning", 4500);
      return;
    }

    const contentScript = isShopee ? "src/content/content_shopee.js" : "src/content/content_lazada.js";
    const scanData = null; // comment-only scan always uses /analyze/comments, never /analyze/deep

    commentOnlyBtn.innerHTML = '<i class="fas fa-sync spinning"></i> Starting...';
    commentOnlyBtn.disabled = true;
    // Lock deep scan button during comment-only scan
    commentsBtn.disabled = true;
    commentsBtn.style.opacity = '0.5';

    function doStart() {
      lastShopeeReviews = [];
      lastLazadaReviews = [];
      resetGuidanceForNewScan();
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: "START_PROGRESSIVE_COLLECTION", scanData },
        () => {
          if (chrome.runtime.lastError) {
            showToast("Unable to start comment scan. Please refresh and try again.", "error");
            setCommentOnlyButtonState("idle");
            return;
          }
          setCommentOnlyButtonState("scanning");
          output.innerHTML = `<div class="collecting-panel"><div class="collecting-icon"><i class="fas fa-circle-notch fa-spin"></i></div><div class="collecting-label">Scanning Comments&hellip;</div><div class="collecting-count">0 reviews collected</div></div>`;
          output.style.padding = '10px 12px';
        }
      );
    }

    // Try sending directly; if the content script isn't running, inject it first
    chrome.tabs.sendMessage(tabs[0].id, { type: "PING" }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId: tabs[0].id }, files: ["src/config.js", "src/shared/storage.js", contentScript] },
          () => {
            if (chrome.runtime.lastError) {
              showToast("Unable to access this page. Please refresh and try again.", "error");
              setCommentOnlyButtonState("idle");
              return;
            }
            setTimeout(doStart, 300);
          }
        );
      } else {
        doStart();
      }
    });
  });
}

commentOnlyBtn.addEventListener("click", () => {
  if (commentOnlyState === "scanning") {
    dbg("[Popup] stop clicked: comment-only");
    setCommentOnlyButtonState("stopped");
    setCollectingStoppingState();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const platform = inferPlatformFromUrl(tabs[0].url) || "shopee";
        scheduleStopFallback(platform);
        chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_PROGRESSIVE_COLLECTION" }, () => {
          if (chrome.runtime.lastError) {
            dbg("[Popup] Stop message failed:", chrome.runtime.lastError.message);
            clearStopFallbackTimer();
            runStopFallback(platform);
          }
        });
      }
    });
    return;
  }
  if (commentOnlyState === "stopped") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const currentUrl = tabs[0].url;
        const cachedUrl = lastShopeeProductData?.url || lastLazadaProductData?.url || lastFacebookProductData?.url || "";
        if (cachedUrl && currentUrl !== cachedUrl) {
          // User navigated to a different product — clear stale cache and start fresh
          lastShopeeProductData = null;
          lastLazadaProductData = null;
          lastFacebookProductData = null;
          setCommentOnlyButtonState("idle");
          performCommentOnlyScan();
          return;
        }
        const restartType = currentUrl.includes("lazada.com.ph")
          ? "LAZADA_RESTART_COLLECTION"
          : "SHOPEE_RESTART_COLLECTION";
        chrome.tabs.sendMessage(tabs[0].id, { type: restartType });
      }
    });
    return;
  }
  performCommentOnlyScan();
});

// Deep Scan / Stop / Restart — state machine on commentsBtn
const commentsBtn = document.getElementById("commentsBtn");

function setCommentsButtonState(state) {
  progressiveState = state;
  if (state === "scanning") {
    commentsBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Collecting';
    commentsBtn.style.background = '#e74c3c';
    commentsBtn.style.color = '#fff';
    commentsBtn.style.borderColor = '#e74c3c';
    commentsBtn.disabled = false;
    // Lock comment-only button while deep scan is running
    commentOnlyBtn.disabled = true;
    commentOnlyBtn.style.opacity = '0.5';
    startCollectingPoll();
  } else if (state === "stopped") {
    commentsBtn.innerHTML = '<i class="fas fa-redo"></i> Restart Deep Scan';
    commentsBtn.style.background = '#1b9c85';
    commentsBtn.style.color = '#fff';
    commentsBtn.style.borderColor = '#1b9c85';
    commentsBtn.disabled = false;
    // Re-enable comment-only button if not scanning
    if (commentOnlyState === "idle") {
      commentOnlyBtn.disabled = false;
      commentOnlyBtn.style.opacity = '';
    }
    stopCollectingPoll();
  } else {
    commentsBtn.innerHTML = '<i class="fas fa-layer-group"></i> Deep Scan';
    commentsBtn.style.background = '';
    commentsBtn.style.color = '';
    commentsBtn.style.borderColor = '';
    commentsBtn.disabled = false;
    progressiveState = "idle";
    // Re-enable comment-only button
    if (commentOnlyState === "idle") {
      commentOnlyBtn.disabled = false;
      commentOnlyBtn.style.opacity = '';
    }
    stopCollectingPoll();
    clearMidScanBanner();
  }
}

function setCommentOnlyButtonState(state) {
  commentOnlyState = state;
  if (state === "scanning") {
    commentOnlyBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Collecting';
    commentOnlyBtn.style.background = '#e74c3c';
    commentOnlyBtn.style.color = '#fff';
    commentOnlyBtn.style.borderColor = '#e74c3c';
    commentOnlyBtn.disabled = false;
    // Lock deep scan button while comment-only scan is running
    commentsBtn.disabled = true;
    commentsBtn.style.opacity = '0.5';
    startCollectingPoll();
  } else if (state === "stopped") {
    commentOnlyBtn.innerHTML = '<i class="fas fa-redo"></i> Restart Comments Scan';
    commentOnlyBtn.style.background = '#1b9c85';
    commentOnlyBtn.style.color = '#fff';
    commentOnlyBtn.style.borderColor = '#1b9c85';
    commentOnlyBtn.disabled = false;
    // Re-enable deep scan button if not scanning
    if (progressiveState === "idle") {
      commentsBtn.disabled = false;
      commentsBtn.style.opacity = '';
    }
    stopCollectingPoll();
  } else {
    commentOnlyBtn.innerHTML = '<i class="fas fa-comments"></i> Scan Comments';
    commentOnlyBtn.style.background = '';
    commentOnlyBtn.style.color = '';
    commentOnlyBtn.style.borderColor = '';
    commentOnlyBtn.disabled = false;
    commentOnlyState = "idle";
    // Re-enable deep scan button
    if (progressiveState === "idle") {
      commentsBtn.disabled = false;
      commentsBtn.style.opacity = '';
    }
    stopCollectingPoll();
    clearMidScanBanner();
  }
}

commentsBtn.addEventListener("click", () => {
  if (progressiveState === "scanning") {
    dbg("[Popup] stop clicked: deep-scan");
    setCommentsButtonState("stopped");
    setCollectingStoppingState();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const platform = inferPlatformFromUrl(tabs[0].url) || "shopee";
        scheduleStopFallback(platform);
        chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_PROGRESSIVE_COLLECTION" }, () => {
          if (chrome.runtime.lastError) {
            dbg("[Popup] Stop message failed:", chrome.runtime.lastError.message);
            clearStopFallbackTimer();
            runStopFallback(platform);
          }
        });
      }
    });
    return;
  }

  if (progressiveState === "stopped") {
    // User restarts collection with the same product data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const currentUrl = tabs[0].url;
        const cachedUrl = lastShopeeProductData?.url || lastLazadaProductData?.url || lastFacebookProductData?.url || "";
        if (cachedUrl && currentUrl !== cachedUrl) {
          // User navigated to a different product — clear stale cache and start fresh
          lastShopeeProductData = null;
          lastLazadaProductData = null;
          lastFacebookProductData = null;
          setCommentsButtonState("idle");
          performScan(false, true);
          return;
        }
        const restartType = currentUrl.includes("lazada.com.ph")
          ? "LAZADA_RESTART_COLLECTION"
          : "SHOPEE_RESTART_COLLECTION";
        chrome.tabs.sendMessage(tabs[0].id, { type: restartType });
      }
    });
    return;
  }

  // idle — normal deep scan
  performScan(false, true);
});

// Unbind activation key
const unbindBtn = document.getElementById("unbindBtn");
const unbindMessage = document.getElementById("unbindMessage");

function showUnbindMessage(text, isError = true) {
  unbindMessage.textContent = text;
  unbindMessage.className = "visible " + (isError ? "unbind-msg--error" : "unbind-msg--success");
}

function hideUnbindMessage() {
  unbindMessage.className = "";
  unbindMessage.textContent = "";
}

unbindBtn.addEventListener("click", async () => {
  if (!confirm("Remove your activation key from this device? You will need to re-enter it to use SureShop again.")) return;

  unbindBtn.disabled = true;
  unbindBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unbinding...';
  hideUnbindMessage();

  try {
    await chrome.storage.local.remove(["accessToken", "activatedAt", "lastAutoScanResult"]);
    showUnbindMessage("Activation key removed successfully.", false);
    setTimeout(() => {
      scanSection.style.display = "none";
      activationSection.style.display = "block";
      hideUnbindMessage();
      output.textContent = "";
    }, 1200);
  } catch (error) {
    dbgErr("Unbind error:", error);
    showUnbindMessage("Failed to unbind. Please try again.");
    unbindBtn.disabled = false;
    unbindBtn.innerHTML = '<i class="fas fa-unlink"></i> Unbind Activation Key';
  }
});

function appendReviewsToOutput(reviews, isLazada = false, listingHasNoReviews = false) {
  const stars = (n) => {
    if (!n || n < 1) return "";
    const filled = Math.min(n, 5);
    return "★".repeat(filled) + "☆".repeat(5 - filled);
  };

  const divider = document.createElement("div");
  divider.id = "sureshop-reviews-output";
  divider.className = "cdata-comments-slot-filled";

  if (reviews.length === 0) {
    if (listingHasNoReviews) {
      divider.innerHTML = `
        <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
        <div class="cdata-comments-hint">This listing has no reviews yet.</div>`;
    } else if (isLazada && progressiveState === "scanning") {
      divider.innerHTML = `
        <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
        <div class="cdata-comments-hint"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Scanning for comments&hellip;<br><small style="opacity:.7;">Scroll down to Ratings &amp; Reviews if it hasn't loaded yet.</small></div>`;
    } else {
      const _scanStopped = progressiveState === 'stopped' || commentOnlyState === 'stopped';
      const _label = _scanStopped ? 'No reviews were collected during this scan.' : 'No comments found.';
      const hint = isLazada
        ? "Scroll down to <strong>Ratings &amp; Reviews</strong> to load them, then scan again."
        : "Scroll down to the reviews section to load them, then scan again.";
      divider.innerHTML = `
        <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
        <div class="cdata-comments-hint">${_label}<br>${hint}</div>`;
    }
  } else {
    const cards = reviews.map(r => {
      const starsHtml = r.rating_stars
        ? `<span class="review-stars" title="${r.rating_stars}/5">${stars(r.rating_stars)}</span>`
        : "";
      return `
      <div class="review-card">
        <div class="review-card-top">
          <span class="review-username">${r.username || "Anonymous"}</span>
          ${starsHtml}
        </div>
        <div class="review-text">${r.text}</div>
        <div class="review-meta">
          ${r.date ? `<span>${r.date}</span>` : ""}
          ${r.variant ? `<span>${r.variant}</span>` : ""}
        </div>
      </div>`;
    }).join("");

    divider.innerHTML = `
      <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments (${reviews.length})</div>
      <div class="reviews-list">${cards}</div>`;
  }

  // Replace the placeholder slot inside the "View Collected Data" panel
  // while preserving the user's current panel toggle state.
  const existing = document.getElementById("sureshop-reviews-output");
  if (existing) {
    existing.replaceWith(divider);
    return;
  }

  const slot = document.getElementById("cdata-comments-slot");
  if (slot) {
    slot.replaceWith(divider);
    return;
  }

  // No slot or existing block yet — append directly to output as fallback
  output.appendChild(divider);
}

function resetCommentsButton() {
  setCommentsButtonState("idle");
}

function resetCommentOnlyButton() {
  setCommentOnlyButtonState("idle");
}

function resetButton() {
  scanBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Quick Scan';
  scanBtn.disabled = false;

  // Only reset buttons if progressive collection hasn't started
  if (progressiveState === "idle") {
    resetCommentsButton();
  }
  if (commentOnlyState === "idle") {
    resetCommentOnlyButton();
  }
}