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
const activationSection = document.getElementById("activationSection");
const scanSection = document.getElementById("scanSection");
const activateBtn = document.getElementById("activateBtn");
const activationKeyInput = document.getElementById("activationKeyInput");
const activationMessage = document.getElementById("activationMessage");

// Progressive collection state
let lastShopeeProductData = null;
let lastLazadaProductData = null;
let lastFacebookProductData = null;
let lastDeepScanInitialResult = null; // initial /analyze/listing result; shown on Stop if progressive scan has no score
let progressiveState     = "idle"; // controls commentsBtn (Deep Scan)
let commentOnlyState     = "idle"; // controls commentOnlyBtn (Scan Comments)

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
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => checkAuthStatus());
} else {
  // Document already parsed — schedule on next microtask so const declarations
  // appearing later in this script have all evaluated first.
  Promise.resolve().then(() => checkAuthStatus());
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
      return;
    }

    if (platform.fullScan) {
      if (platform.isProduct) {
        banner.className = "page-status page-status--supported";
        banner.innerHTML = `<i class="fas fa-check-circle"></i><span><strong>${platform.label}</strong> product detected — ready to scan</span>`;
        scanBtn && (scanBtn.disabled = false);
        commentsBtn && (commentsBtn.disabled = false);
        commentOnlyBtn && (commentOnlyBtn.disabled = false);
      } else {
        banner.className = "page-status page-status--neutral";
        banner.innerHTML = `<i class="fas fa-search"></i><span>${platform.label} detected — open a product page to scan</span>`;
        scanBtn && (scanBtn.disabled = true);
        commentsBtn && (commentsBtn.disabled = true);
        commentOnlyBtn && (commentOnlyBtn.disabled = true);
      }
    } else {
      banner.className = "page-status page-status--supported";
      banner.innerHTML = `<i class="fas fa-globe"></i><span>${platform.label} — URL safety check active</span>`;
      scanBtn && (scanBtn.disabled = true);
      commentsBtn && (commentsBtn.disabled = true);
      commentOnlyBtn && (commentOnlyBtn.disabled = true);
    }
  });
}

function checkForAutoScanResults() {
  // Check if there are recent auto-scan results to display - ONLY PRODUCT SCANS
  chrome.storage.local.get("lastAutoScanResult", ({ lastAutoScanResult }) => {
    if (lastAutoScanResult && isRecentResult(lastAutoScanResult.timestamp)) {
      dbg("=== SCAN DATA SNAPSHOT: lastAutoScanResult from storage ===");
      dbg(JSON.stringify(lastAutoScanResult, null, 2));
      
      // ONLY show PRODUCT scan results in the extension popup
      if (lastAutoScanResult.type === "product") {
        dbg("Displaying product scan result");
        showRiskAssessment(
          lastAutoScanResult.risk_score, 
          lastAutoScanResult.risk_level,
          lastAutoScanResult.description || null
        );
      } else {
        dbg("Ignoring non-product scan result in extension popup:", lastAutoScanResult.type);
        // Don't show URL scan results in the extension popup
        // URL scan results are shown in the universal popup on the webpage
      }
    } else {
      dbg("No recent product scan results found");
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

  try {
    const res = await fetch(`${SURESHOP_API_BASE}/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activation_key: key })
    });
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
    showActivationMessage("Cannot reach the SureShop server. Check your connection and try again.");
  } finally {
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
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Use backend risk message if available; fall back to hardcoded strings
  const riskMessage = scanResult?.risk_message
    || (riskLevel === 'High'
        ? 'This product appears risky. Exercise extreme caution and consider avoiding this purchase.'
        : riskLevel === 'Medium'
        ? 'This product has some risk factors. Please review carefully before purchasing.'
        : 'This product appears to be relatively safe based on current analysis.');

  // Prefer backend confidence (handles Facebook 3-field recalibration correctly).
  // Fall back to client-side computation when no backend result is available.
  const rawConf = scanResult?.confidence;
  const conf = rawConf
    ? {
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
  if (conf) {
    const lvlClass = `confidence-${conf.confidenceLevel.toLowerCase()}`;
    const missingNote = conf.fieldsMissing.length > 0
      ? `<div class="confidence-missing">${conf.fieldsMissing.join(', ')} could not be retrieved.</div>`
      : '';
    confidenceHTML = `
      <div class="confidence-block ${lvlClass}">
        <div class="confidence-row">
          <span class="confidence-label"><i class="fas fa-database"></i> Confidence</span>
          <span class="confidence-badge ${lvlClass}">
            ${conf.confidenceLevel}
            <span class="confidence-tooltip" title="Confidence measures how much data was available for analysis — not how accurate the risk score is. A lower confidence means fewer data points were retrieved.">
              <i class="fas fa-circle-info"></i>
            </span>
          </span>
        </div>
        <div class="confidence-detail">${conf.fieldsPresent} of ${conf.total} data points retrieved</div>
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
      .map(f => `<div class="flag-item"><i class="fas fa-exclamation-triangle"></i>${f}</div>`)
      .join('');
  }
  const scanSummarySection = scanSummaryHTML
    ? `<div class="scan-summary-section" id="scanSummary">
        <div class="scan-summary-header"><i class="fas fa-clipboard-list"></i> Scan Summary</div>
        <div class="scan-summary-body">${scanSummaryHTML}</div>
      </div>`
    : '';

  // Product Notice — authenticity / edition indicators (separate from risk score)
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

  // Bot / Fake Review Analysis — only shown when reviews were actually analyzed
  let botAnalysisHTML = '';
  // Backend /analyze/deep returns `comments` with `comments_analyzed`.
  // Older code paths used `comment_analysis` with `reviews_analyzed`. Support both.
  const ca = scanResult?.comment_analysis
    ?? (scanResult?.comments ? {
          reviews_analyzed: scanResult.comments.comments_analyzed,
          bot_likelihood_pct: scanResult.comments.bot_likelihood_pct,
          fake_review_pct: scanResult.comments.fake_review_pct,
        } : null);
  if (ca?.reviews_analyzed > 0) {
    const botClass  = ca.bot_likelihood_pct  >= 50 ? 'analysis-high' : ca.bot_likelihood_pct  >= 25 ? 'analysis-medium' : 'analysis-low';
    const fakeClass = ca.fake_review_pct >= 50 ? 'analysis-high' : ca.fake_review_pct >= 25 ? 'analysis-medium' : 'analysis-low';
    const commentFlags = scanResult?.comments?.flags || [];
    const commentFlagsHTML = commentFlags.length
      ? `<div class="bot-analysis-flags">${commentFlags.map(f =>
          `<div class="flag-item"><i class="fas fa-exclamation-triangle"></i>${String(f).replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`
        ).join('')}</div>`
      : '';
    botAnalysisHTML = `
      <div class="bot-analysis-block">
        <div class="bot-analysis-header"><i class="fas fa-robot"></i> Comment Analysis <span class="analysis-count">${ca.reviews_analyzed} reviewed</span></div>
        <div class="bot-analysis-rows">
          <div class="analysis-row">
            <span class="analysis-label">Bot Likelihood</span>
            <span class="analysis-badge ${botClass}">${ca.bot_likelihood_pct}%</span>
          </div>
          <div class="analysis-row">
            <span class="analysis-label">Fake Review Signals</span>
            <span class="analysis-badge ${fakeClass}">${ca.fake_review_pct}%</span>
          </div>
        </div>
        ${commentFlagsHTML}
      </div>`;
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
    const priceDisplay = productData.price !== null && productData.price !== undefined
      ? `₱${Number(productData.price).toLocaleString()}`
      : productData.price_is_variant
      ? 'Select a variant on the listing to determine price'
      : null;
    const ratingDisplay = productData.rating !== null && productData.rating !== undefined
      ? `${productData.rating} / 5 (${productData.rating_count !== null && productData.rating_count !== undefined ? productData.rating_count : 0} reviews)`
      : null;
    dataRowsHTML = [
      row(platformIcon,          'Platform',      productData.platform),
      row('fa-link',             'URL',           productData.url),
      row('fa-box-open',         'Product',       productData.product_name,    true),
      row('fa-tag',              'Price',         priceDisplay,                true),
      row('fa-fire',             'Sold',          productData.sold_count !== null && productData.sold_count !== undefined ? String(productData.sold_count) : null, isSh || isLa),
      row('fa-user-tie',         'Seller',        productData.seller_name,     true),
      row('fa-certificate',      'Badges',        Array.isArray(productData.seller_badges) && productData.seller_badges.length > 0 ? productData.seller_badges.join(' · ') : null),
      row('fa-store',            'Mall',          productData.is_shopee_mall ? 'Shopee Mall' : productData.is_lazmall ? 'LazMall' : null),
      row('fa-star',             'Rating',        ratingDisplay,               isSh || isLa),
      row('fa-comments',         'Response Rate', productData.response_rate !== null && productData.response_rate !== undefined ? `${productData.response_rate}%` : null, isSh),
      row('fa-calendar-alt',     'Shop Age',      productData.shop_age,        isSh),
      row('fa-medal',            'Seller Rating', productData.seller_rating !== null && productData.seller_rating !== undefined ? String(productData.seller_rating) : null, isLa),
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
  const commentsPlaceholderHTML = `<div class="cdata-comments-placeholder" id="cdata-comments-slot">
    <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
    <div class="cdata-comments-hint">Run <strong>Deep Scan</strong> to collect comments.</div>
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

  // Preserve live-reviews section across risk-card re-renders
  const existingReviews = document.getElementById("sureshop-reviews-output");
  output.innerHTML = '';
  output.style.padding = '10px 12px';
  output.style.textAlign = 'center';
  output.style.fontFamily = 'Poppins, sans-serif';
  
  const container = document.createElement('div');
  container.innerHTML = `
    <div class="result-card">
      <div class="scan-status-badge">
        <i class="fas fa-shield-alt"></i> PRODUCT SCANNED
      </div>

      <div class="risk-badge risk-${riskLevel.toLowerCase()}"></div>

      <div class="risk-level-text risk-${riskLevel.toLowerCase()}">
        PRODUCT RISK: ${riskLevel.toUpperCase()}
      </div>

      <div class="risk-score-text">
        Risk Score: ${riskScore} / 100
      </div>

      ${confidenceHTML}

      <div class="risk-message">
        ${riskMessage}
      </div>

      ${scanSummarySection}

      ${productNoticeHTML}

      ${botAnalysisHTML}

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
            <option value="scam">Scam / Fraud</option>
            <option value="fake_product">Fake or Counterfeit Product</option>
            <option value="misleading">Misleading Description</option>
            <option value="wrong_price">Wrong / Hidden Pricing</option>
            <option value="other">Other</option>
          </select>
          <textarea class="report-textarea" id="reportDetails" placeholder="Additional details (optional)" rows="3" maxlength="500"></textarea>
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
      reportForm.style.display = reportForm.style.display === 'none' ? 'flex' : 'none';
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
          } catch (_) {
            // Server unreachable — still thank the user; report stored client-side
          }

          reportFeedback.textContent = 'Thank you! Your report has been submitted.';
          reportFeedback.className = 'report-feedback report-feedback--success';
          reportSubmitBtn.disabled = true;
          reportSubmitBtn.innerHTML = '<i class="fas fa-check"></i> Reported';
          reportListingBtn.disabled = true;
          reportListingBtn.innerHTML = '<i class="fas fa-flag"></i> Reported';
          reportListingBtn.classList.add('report-btn--done');
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

    scanBtn.innerHTML = isAutomatic ? '<i class="fas fa-sync spinning"></i> Auto-scanning...' : '<i class="fas fa-sync spinning"></i> Normal scanning...';
    if (withReviews) {
      commentsBtn.innerHTML = '<i class="fas fa-sync spinning"></i> Deep scanning...';
      commentsBtn.disabled = true;
    }
    scanBtn.disabled = true;
    output.textContent = "🔍 Collecting product information...";

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
      const contentScript = isShopee ? "content.js"
                          : isLazada ? "content_lazada.js"
                          : "content_facebook.js";

      // Helper: send EXTRACT_DATA message, injecting the content script first if needed
      async function sendExtractData() {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTab.id, { type: "EXTRACT_DATA" }, (response) => {
            if (chrome.runtime.lastError) {
              // Content script not running — inject it then retry once
              chrome.scripting.executeScript(
                { target: { tabId: currentTab.id }, files: ["config.js", contentScript] },
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
      output.textContent = "📡 Analyzing product data...";

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

          if (!withReviews) {
            // Normal scan: show result immediately
            showRiskAssessment(result.risk_score, result.risk_level, response.description || null, productData, result);
          } else {
            // Deep Scan: store initial result and only show it when collection stops
            lastDeepScanInitialResult = { risk_score: result.risk_score, risk_level: result.risk_level, description: response.description || null, productData, result };

            const isShopee = currentTab.url.includes("shopee.ph");
            const isLazada = currentTab.url.includes("lazada.com.ph");
            const isFacebook = currentTab.url.includes("facebook.com") &&
                               /\/marketplace\/item\/\d+/.test(currentTab.url);

            if (isShopee) {
              chrome.tabs.sendMessage(
                currentTab.id,
                { type: "START_PROGRESSIVE_COLLECTION", scanData: productData },
                () => { setCommentsButtonState("scanning"); }
              );
            } else if (isLazada) {
              chrome.tabs.sendMessage(
                currentTab.id,
                { type: "START_PROGRESSIVE_COLLECTION", scanData: productData },
                () => { setCommentsButtonState("scanning"); }
              );
            } else if (isFacebook) {
              chrome.tabs.sendMessage(
                currentTab.id,
                { type: "START_PROGRESSIVE_COLLECTION", scanData: productData },
                () => { setCommentsButtonState("scanning"); }
              );
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
// Re-scan with collected reviews to update risk score and activate
// comment analysis (bot likelihood, fake review signals).
// Deduplicated: only re-submits when review count increases.
// -----------------------------------------------------------------------
let lastRescanReviewCount = { lazada: 0, facebook: 0 };

async function rescanWithReviews(productData, reviews, platformKey) {
  if (!productData || !reviews.length) return;
  if (reviews.length <= (lastRescanReviewCount[platformKey] || 0)) return;
  lastRescanReviewCount[platformKey] = reviews.length;

  const { accessToken } = await chrome.storage.local.get('accessToken');
  if (!accessToken) return;

  try {
    const payload = {
      listing: productData,
      comments: {
        platform: productData.platform || platformKey,
        comments: (reviews || []).map(r => ({
          text: r.text || r.comment || '',
          date: r.date || null,
          rating_stars: r.rating_stars ?? r.rating ?? null
        })),
        page_number: 1,
        total_pages: 1
      }
    };
    const resp = await fetch(`${SURESHOP_API_BASE}/analyze/deep`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
      body: JSON.stringify(payload)
    });
    if (!resp.ok) return;
    const result = await resp.json();
    const riskScore = result.combined_risk_score ?? result.risk_score;
    const riskLevel = result.combined_risk_level ?? result.risk_level;
    if (riskScore !== undefined && riskLevel !== undefined) {
      const cachedData = platformKey === 'lazada' ? lastLazadaProductData : lastFacebookProductData;
      showRiskAssessment(riskScore, riskLevel, cachedData?.description || null, cachedData, result);
    }
  } catch (_) {}
}

// -----------------------------------------------------------------------
// Progressive update listener — fires while the side panel is open whenever
// the Shopee content script finishes re-analyzing a new review page.
// -----------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message) => {
  // Helper: update whichever button(s) are currently in scanning/stopped state
  function setActiveCollectionState(state) {
    if (progressiveState  !== "idle") setCommentsButtonState(state);
    if (commentOnlyState  !== "idle") setCommentOnlyButtonState(state);
    // If neither was active (e.g. restarted from page overlay), default to Deep Scan
    if (progressiveState === "idle" && commentOnlyState === "idle") setCommentsButtonState(state);
  }

  if (message.type === "SHOPEE_SCAN_UPDATED") {
    dbg("[Popup] Progressive update (collecting):", message.risk_score, message.risk_level);
    // Results are shown only when collection stops — don't update the card mid-scan.
  }

  if (message.type === "SHOPEE_PROGRESSIVE_STOPPED") {
    setActiveCollectionState("stopped");
    const sr = message.risk_score !== undefined && message.risk_level
      ? { risk_score: message.risk_score, risk_level: message.risk_level, description: lastShopeeProductData?.description || null, productData: lastShopeeProductData, result: message.result || null }
      : lastDeepScanInitialResult;
    if (sr) showRiskAssessment(sr.risk_score, sr.risk_level, sr.description, sr.productData, sr.result);
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, false);
    }
  }

  if (message.type === "SHOPEE_PROGRESSIVE_RESTARTED") {
    setActiveCollectionState("scanning");
  }

  // Direct reviews from content script — results are shown only when
  // collection stops, so we silently ignore mid-scan DIRECT messages.
  // (The full deep result is forwarded via LAZADA_PROGRESSIVE_STOPPED.)
  if (message.type === "LAZADA_REVIEWS_DIRECT") {
    dbg("[Popup] Lazada DIRECT reviews received (collecting, suppressed):", (message.reviews || []).length);
    return;
  }

  if (message.type === "FACEBOOK_REVIEWS_DIRECT") {
    appendReviewsToOutput(message.reviews || [], false);
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      rescanWithReviews(lastFacebookProductData, message.reviews, 'facebook');
    }
    return;
  }

  if (message.type === "FACEBOOK_PROGRESSIVE_STOPPED") {
    setActiveCollectionState("stopped");
    const fr = message.risk_score !== undefined && message.risk_score !== null && message.risk_level
      ? { risk_score: message.risk_score, risk_level: message.risk_level, description: lastFacebookProductData?.description || null, productData: lastFacebookProductData, result: message.result || null }
      : lastDeepScanInitialResult;
    if (fr) showRiskAssessment(fr.risk_score, fr.risk_level, fr.description, fr.productData, fr.result);
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, false);
    }
  }

  if (message.type === "LAZADA_SCAN_UPDATED") {
    dbg("[Popup] Lazada progressive update (collecting):", message.risk_score, message.risk_level);
    // Results are shown only when collection stops — don't update the card mid-scan.
  }

  if (message.type === "LAZADA_PROGRESSIVE_STOPPED") {
    setActiveCollectionState("stopped");
    const lr = message.risk_score !== undefined && message.risk_level
      ? { risk_score: message.risk_score, risk_level: message.risk_level, description: lastLazadaProductData?.description || null, productData: lastLazadaProductData, result: message.result || null }
      : lastDeepScanInitialResult;
    if (lr) showRiskAssessment(lr.risk_score, lr.risk_level, lr.description, lr.productData, lr.result);
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, true);
    }
  }

  if (message.type === "LAZADA_PROGRESSIVE_RESTARTED") {
    setActiveCollectionState("scanning");
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
    const isShopee   = url.includes("shopee.ph");
    const isLazada   = url.includes("lazada.com.ph");
    const isFacebook = url.includes("facebook.com") && /\/marketplace\/item\/\d+/.test(url);

    if (!isShopee && !isLazada && !isFacebook) {
      showToast("Open a Shopee, Lazada, or FB Marketplace product page to scan comments.", "warning", 4500);
      return;
    }

    const contentScript = isShopee ? "content.js"
                        : isLazada ? "content_lazada.js"
                        : "content_facebook.js";

    // Use cached product data if available so the risk score also updates;
    // passing null is fine — collection still works, API re-scan is simply skipped.
    const scanData = isShopee   ? lastShopeeProductData
                   : isLazada   ? lastLazadaProductData
                   : isFacebook ? lastFacebookProductData
                   : null;

    commentOnlyBtn.innerHTML = '<i class="fas fa-sync spinning"></i> Starting...';
    commentOnlyBtn.disabled = true;

    function doStart() {
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
          setTimeout(() => {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { type: "GET_PROGRESSIVE_REVIEWS" },
              (r) => appendReviewsToOutput(r?.reviews || [], isLazada)
            );
          }, isLazada ? 600 : 400);
        }
      );
    }

    // Try sending directly; if the content script isn't running, inject it first
    chrome.tabs.sendMessage(tabs[0].id, { type: "PING" }, () => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript(
          { target: { tabId: tabs[0].id }, files: [contentScript] },
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_PROGRESSIVE_COLLECTION" });
    });
    return;
  }
  if (commentOnlyState === "stopped") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const restartType = tabs[0].url.includes("lazada.com.ph")
          ? "LAZADA_RESTART_COLLECTION"
          : tabs[0].url.includes("facebook.com")
          ? "FACEBOOK_RESTART_COLLECTION"
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
  } else if (state === "stopped") {
    commentsBtn.innerHTML = '<i class="fas fa-redo"></i> Restart Collection';
    commentsBtn.style.background = '#1b9c85';
    commentsBtn.style.color = '#fff';
    commentsBtn.style.borderColor = '#1b9c85';
    commentsBtn.disabled = false;
  } else {
    commentsBtn.innerHTML = '<i class="fas fa-layer-group"></i> Deep Scan';
    commentsBtn.style.background = '';
    commentsBtn.style.color = '';
    commentsBtn.style.borderColor = '';
    commentsBtn.disabled = false;
    progressiveState = "idle";
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
  } else if (state === "stopped") {
    commentOnlyBtn.innerHTML = '<i class="fas fa-redo"></i> Restart Collection';
    commentOnlyBtn.style.background = '#1b9c85';
    commentOnlyBtn.style.color = '#fff';
    commentOnlyBtn.style.borderColor = '#1b9c85';
    commentOnlyBtn.disabled = false;
  } else {
    commentOnlyBtn.innerHTML = '<i class="fas fa-comments"></i> Scan Comments';
    commentOnlyBtn.style.background = '';
    commentOnlyBtn.style.color = '';
    commentOnlyBtn.style.borderColor = '';
    commentOnlyBtn.disabled = false;
    commentOnlyState = "idle";
  }
}

commentsBtn.addEventListener("click", () => {
  if (progressiveState === "scanning") {
    // User stops collection
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "STOP_PROGRESSIVE_COLLECTION" });
      }
    });
    return;
  }

  if (progressiveState === "stopped") {
    // User restarts collection with the same product data
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        const restartType = tabs[0].url.includes("lazada.com.ph")
          ? "LAZADA_RESTART_COLLECTION"
          : tabs[0].url.includes("facebook.com")
          ? "FACEBOOK_RESTART_COLLECTION"
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

function appendReviewsToOutput(reviews, isLazada = false) {
  const stars = (n) => {
    if (!n || n < 1) return "";
    const filled = Math.min(n, 5);
    return "★".repeat(filled) + "☆".repeat(5 - filled);
  };

  const divider = document.createElement("div");
  divider.id = "sureshop-reviews-output";
  divider.className = "cdata-comments-slot-filled";

  if (reviews.length === 0) {
    if (isLazada && progressiveState === "scanning") {
      divider.innerHTML = `
        <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
        <div class="cdata-comments-hint"><i class="fas fa-spinner fa-spin" style="margin-right:6px;"></i>Scanning for comments&hellip;<br><small style="opacity:.7;">Scroll down to Ratings &amp; Reviews if it hasn't loaded yet.</small></div>`;
    } else {
      const hint = isLazada
        ? "Scroll down to the <strong>Ratings &amp; Reviews</strong> section first so it loads, then Deep Scan again."
        : "Scroll down to the reviews section first, then scan again.";
      divider.innerHTML = `
        <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
        <div class="cdata-comments-hint">No comments found.<br>${hint}</div>`;
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

  // Try to place reviews inside the panel's comments slot first
  const slot = document.getElementById("cdata-comments-slot");
  if (slot) {
    slot.replaceWith(divider);
    return;
  }

  // Fallback: replace existing or append to output
  const existing = document.getElementById("sureshop-reviews-output");
  if (existing) {
    existing.replaceWith(divider);
  } else {
    output.appendChild(divider);
  }
}

function resetCommentsButton() {
  setCommentsButtonState("idle");
}

function resetCommentOnlyButton() {
  setCommentOnlyButtonState("idle");
}

function resetButton() {
  scanBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Normal Scan';
  scanBtn.disabled = false;
  // Only reset commentsBtn if progressive collection hasn't started
  if (progressiveState === "idle") {
    resetCommentsButton();
  }
}