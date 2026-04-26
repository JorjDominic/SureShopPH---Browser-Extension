// -----------------------------------------------------------------------
// API base URL — update this to your production HTTPS endpoint before
// submitting to the Chrome Web Store. HTTP localhost is only for local dev.
// -----------------------------------------------------------------------
const SURESHOP_API_BASE = "http://localhost/php/sureshopwebsite/app/controller";

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
const activationSection = document.getElementById("activationSection");
const scanSection = document.getElementById("scanSection");
const activateBtn = document.getElementById("activateBtn");
const activationKeyInput = document.getElementById("activationKey");
const activationMessage = document.getElementById("activationMessage");

// Progressive collection state
let lastShopeeProductData = null;
let lastLazadaProductData = null;
let progressiveState = "idle"; // "idle" | "scanning" | "stopped"

function showActivationMessage(text, isError = true) {
  activationMessage.textContent = text;
  activationMessage.className = isError ? "activation-msg activation-msg--error" : "activation-msg activation-msg--success";
}

// On popup open: decide which UI to show
chrome.storage.local.get(["accessToken"], ({ accessToken }) => {
  if (accessToken) {
    activationSection.style.display = "none";
    scanSection.style.display = "block";
    refreshPageStatus();
    checkForAutoScanResults();
  } else {
    activationSection.style.display = "block";
    scanSection.style.display = "none";
  }
});

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
      return;
    }

    if (platform.fullScan) {
      if (platform.isProduct) {
        banner.className = "page-status page-status--supported";
        banner.innerHTML = `<i class="fas fa-check-circle"></i><span><strong>${platform.label}</strong> product detected — ready to scan</span>`;
        scanBtn && (scanBtn.disabled = false);
        commentsBtn && (commentsBtn.disabled = false);
      } else {
        banner.className = "page-status page-status--neutral";
        banner.innerHTML = `<i class="fas fa-search"></i><span>${platform.label} detected — open a product page to scan</span>`;
        scanBtn && (scanBtn.disabled = true);
        commentsBtn && (commentsBtn.disabled = true);
      }
    } else {
      banner.className = "page-status page-status--supported";
      banner.innerHTML = `<i class="fas fa-globe"></i><span>${platform.label} — URL safety check active</span>`;
      scanBtn && (scanBtn.disabled = true);
      commentsBtn && (commentsBtn.disabled = true);
    }
  });
}

function checkForAutoScanResults() {
  // Check if there are recent auto-scan results to display - ONLY PRODUCT SCANS
  chrome.storage.local.get("lastAutoScanResult", ({ lastAutoScanResult }) => {
    if (lastAutoScanResult && isRecentResult(lastAutoScanResult.timestamp)) {
      console.log("Found recent auto-scan result:", lastAutoScanResult);
      
      // ONLY show PRODUCT scan results in the extension popup
      if (lastAutoScanResult.type === "product") {
        console.log("Displaying product scan result");
        showRiskAssessment(
          lastAutoScanResult.risk_score, 
          lastAutoScanResult.risk_level,
          lastAutoScanResult.description || null
        );
      } else {
        console.log("Ignoring non-product scan result in extension popup:", lastAutoScanResult.type);
        // Don't show URL scan results in the extension popup
        // URL scan results are shown in the universal popup on the webpage
      }
    } else {
      console.log("No recent product scan results found");
    }
  });
}

function isRecentResult(timestamp) {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return (now - timestamp) < fiveMinutes;
}

// Submit activation on Enter
const activationKeyInputEl = document.getElementById("activationKey");
if (activationKeyInputEl) {
  activationKeyInputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      document.getElementById("activateBtn")?.click();
    }
  });
}

// Re-detect supported page when the active tab changes or its URL updates
chrome.tabs.onActivated.addListener(() => refreshPageStatus());
chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.url || changeInfo.status === "complete") refreshPageStatus();
});

// Handle activation (ONE TIME) - Updated with better error handling
activateBtn.addEventListener("click", async () => {
  console.log("Activate clicked");
  const key = activationKeyInput.value.trim();
  if (!key) {
    showActivationMessage("Please enter an activation key.");
    activationKeyInput.focus();
    return;
  }
  if (key.length < 8) {
    showActivationMessage("Activation key looks too short. Please double-check.");
    activationKeyInput.focus();
    return;
  }
  if (!/^[A-Za-z0-9_\-]+$/.test(key)) {
    showActivationMessage("Activation key contains invalid characters.");
    activationKeyInput.focus();
    return;
  }
  activationMessage.className = "";

  activateBtn.textContent = "Activating...";
  activateBtn.disabled = true;

  try {
    console.log("Sending activation request...");
    
    const res = await fetch(
      `${SURESHOP_API_BASE}/activate_extension.php`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ activation_key: key })
      }
    );

    console.log("Response status:", res.status);
    console.log("Response headers:", [...res.headers.entries()]);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const responseData = await res.json();
    console.log("Response data:", responseData);

    // Check for different possible field names
    let accessToken = null;
    
    if (responseData.access_token) {
      accessToken = responseData.access_token;
    } else if (responseData.accessToken) {
      accessToken = responseData.accessToken;
    } else if (responseData.token) {
      accessToken = responseData.token;
    }

    if (accessToken) {
      console.log("Access token found, storing...");
      await chrome.storage.local.set({ 
        accessToken: accessToken,
        activatedAt: Date.now()
      });
      
      activationSection.style.display = "none";
      scanSection.style.display = "block";
    } else {
      console.error("No access token in response:", responseData);
      showActivationMessage("Invalid activation key or server error.");
    }

  } catch (error) {
    console.error("Activation error:", error);
    showActivationMessage("Failed to connect. Please check your connection and try again.");
  } finally {
    activateBtn.textContent = "Activate";
    activateBtn.disabled = false;
  }
});

// Clean function to show only PRODUCT risk assessment
function showRiskAssessment(riskScore, riskLevel, description, productData = null) {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  let riskMessage;
  if (riskLevel === 'High') {
    riskMessage = 'This product appears risky. Exercise extreme caution and consider avoiding this purchase.';
  } else if (riskLevel === 'Medium') {
    riskMessage = 'This product has some risk factors. Please review carefully before purchasing.';
  } else {
    riskMessage = 'This product appears to be relatively safe based on current analysis.';
  }

  // Build the 5 key data rows (Platform → Product → Price → Seller → Rating)
  let dataRowsHTML = '';
  if (productData) {
    const esc = v => String(v).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const row = (icon, label, value) => {
      if (value === null || value === undefined || value === '') return '';
      return `<div class="cdata-row">
        <span class="cdata-label"><i class="fas ${icon}"></i> ${label}</span>
        <span class="cdata-value">${esc(value)}</span>
      </div>`;
    };
    const platformIcons = { shopee: 'fa-store', lazada: 'fa-tag', facebook: 'fa-facebook' };
    const platformIcon = platformIcons[(productData.platform || '').toLowerCase()] || 'fa-store';
    dataRowsHTML = [
      row(platformIcon,       'Platform', productData.platform),
      row('fa-box-open',      'Product',  productData.product_name),
      row('fa-tag',           'Price',    productData.price !== null && productData.price !== undefined ? `₱${Number(productData.price).toLocaleString()}` : null),
      row('fa-user-tie',      'Seller',   productData.seller_name),
      row('fa-star',          'Rating',   productData.rating !== null && productData.rating !== undefined ? `${productData.rating} / 5 (${productData.rating_count || 0} reviews)` : null),
    ].filter(Boolean).join('');
  }

  // Product description sub-block (inside the toggle panel)
  const descInPanelHTML = description
    ? `<div class="cdata-desc-block">
        <div class="cdata-desc-label"><i class="fas fa-align-left"></i> Product Description</div>
        <div class="cdata-desc-text">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>`
    : '';

  // Comments placeholder — actual reviews appended by appendReviewsToOutput
  const commentsPlaceholderHTML = `<div class="cdata-comments-placeholder" id="cdata-comments-slot">
    <div class="cdata-desc-label"><i class="fas fa-comments"></i> Comments</div>
    <div class="cdata-comments-hint">Run <strong>Deep Scan</strong> to collect comments.</div>
  </div>`;

  const panelBodyHTML = dataRowsHTML + descInPanelHTML + commentsPlaceholderHTML;

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

      <div class="risk-message">
        ${riskMessage}
      </div>

      <div class="scan-summary-section" id="scanSummary">
        <div class="scan-summary-header"><i class="fas fa-clipboard-list"></i> Scan Summary</div>
        <div class="scan-summary-body"></div>
      </div>

      ${collectedDataHTML}

      <div class="scan-time">
        Scanned: ${timestamp}
      </div>
    </div>
  `;
  
  output.appendChild(container);

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
      console.log("Current tab URL:", currentTab.url);

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
                { target: { tabId: currentTab.id }, files: [contentScript] },
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

      console.log("Extracted data:", response);
      console.log("Product name from extraction:", response.product_name);
      output.textContent = "📡 Analyzing product data...";

      try {
        // Format data for scan.php
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
          // Facebook-specific
          condition: response.condition,
          location: response.location,
          listing_date: response.listing_date,
          listing_url: response.listing_url || currentTab.url,
          // Common
          seller_name: response.seller_name,
          profile_url: response.profile_url,
          image_count: response.image_count,
          description: response.description || null
        };

        // Cache for progressive restart
        if (currentTab.url.includes("shopee.ph")) lastShopeeProductData = productData;
        if (currentTab.url.includes("lazada.com.ph")) lastLazadaProductData = productData;

        console.log("Product data to send to scan.php:", productData);

        const scanResponse = await fetch(
          `${SURESHOP_API_BASE}/scan.php`,
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
          console.error("Server error:", scanResponse.status, errorText);
          throw new Error(`Server error: ${scanResponse.status}`);
        }

        const result = await scanResponse.json();
        console.log("Scan result:", result);

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

          // Show results
          showRiskAssessment(result.risk_score, result.risk_level, response.description || null, productData);

          // Deep Scan: append reviews after risk card
          if (withReviews) {
            const isShopee = currentTab.url.includes("shopee.ph");
            const isLazada = currentTab.url.includes("lazada.com.ph");
            const isFacebook = currentTab.url.includes("facebook.com") &&
                               /\/marketplace\/item\/\d+/.test(currentTab.url);

            if (isShopee) {
              // -------------------------------------------------------
              // Progressive collection: start the MutationObserver in
              // the content script and show whatever is visible now.
              // The observer fires automatically whenever the user
              // navigates to a new comment page.
              // -------------------------------------------------------
              chrome.tabs.sendMessage(
                currentTab.id,
                { type: "START_PROGRESSIVE_COLLECTION", scanData: productData },
                () => {
                  setCommentsButtonState("scanning");
                  // Small delay to let initial harvest complete, then show
                  setTimeout(() => {
                    chrome.tabs.sendMessage(
                      currentTab.id,
                      { type: "GET_PROGRESSIVE_REVIEWS" },
                      (r) => appendReviewsToOutput(r?.reviews || [], false)
                    );
                  }, 400);
                }
              );
            } else if (isLazada) {
              // Progressive collection for Lazada — same pattern as Shopee
              chrome.tabs.sendMessage(
                currentTab.id,
                { type: "START_PROGRESSIVE_COLLECTION", scanData: productData },
                () => {
                  setCommentsButtonState("scanning");
                  setTimeout(() => {
                    chrome.tabs.sendMessage(
                      currentTab.id,
                      { type: "GET_PROGRESSIVE_REVIEWS" },
                      (r) => appendReviewsToOutput(r?.reviews || [], true)
                    );
                  }, 600);
                }
              );
            } else if (isFacebook) {
              chrome.tabs.sendMessage(currentTab.id, { type: "EXTRACT_REVIEWS" }, (reviewResponse) => {
                appendReviewsToOutput(reviewResponse?.reviews || [], false);
              });
            }
          }
        } else {
          showToast("Invalid response from server. Please try again.", "error");
          output.textContent = "";
        }
      } catch (error) {
        console.error("Scan failed:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          showToast("Cannot reach the SureShop server. Check your connection.", "error", 5000);
        } else if (error.message && error.message.startsWith("Server error:")) {
          showToast(`${error.message}. Please try again later.`, "error", 5000);
        } else {
          showToast(`Scan failed: ${error.message}`, "error", 5000);
        }
        output.textContent = "";
      } finally {
        resetButton();
      }
    });
  });
}

// -----------------------------------------------------------------------
// Progressive update listener — fires while the side panel is open whenever
// the Shopee content script finishes re-analyzing a new review page.
// -----------------------------------------------------------------------
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOPEE_SCAN_UPDATED") {
    console.log("[Popup] Progressive update:", message.risk_score, message.risk_level);
    showRiskAssessment(message.risk_score, message.risk_level, lastShopeeProductData?.description || null, lastShopeeProductData);
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, false);
    }
  }

  if (message.type === "SHOPEE_PROGRESSIVE_STOPPED") {
    setCommentsButtonState("stopped");
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, false);
    }
    if (message.risk_score !== undefined && message.risk_level) {
      showRiskAssessment(message.risk_score, message.risk_level, lastShopeeProductData?.description || null, lastShopeeProductData);
    }
  }

  if (message.type === "SHOPEE_PROGRESSIVE_RESTARTED") {
    setCommentsButtonState("scanning");
  }

  // Direct reviews from content script — no backend roundtrip, shows them immediately
  if (message.type === "LAZADA_REVIEWS_DIRECT") {
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, true);
    }
    return;
  }

  if (message.type === "LAZADA_SCAN_UPDATED") {
    console.log("[Popup] Lazada progressive update:", message.risk_score, message.risk_level);
    showRiskAssessment(message.risk_score, message.risk_level, lastLazadaProductData?.description || null, lastLazadaProductData);
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, true);
    }
  }

  if (message.type === "LAZADA_PROGRESSIVE_STOPPED") {
    setCommentsButtonState("stopped");
    if (Array.isArray(message.reviews) && message.reviews.length > 0) {
      appendReviewsToOutput(message.reviews, true);
    }
    if (message.risk_score !== undefined && message.risk_level) {
      showRiskAssessment(message.risk_score, message.risk_level, lastLazadaProductData?.description || null, lastLazadaProductData);
    }
  }

  if (message.type === "LAZADA_PROGRESSIVE_RESTARTED") {
    setCommentsButtonState("scanning");
  }
});

// Normal scan
scanBtn.addEventListener("click", () => {
  performScan(false, false);
});

// Deep Scan / Stop / Restart — state machine on commentsBtn
const commentsBtn = document.getElementById("commentsBtn");

function setCommentsButtonState(state) {
  progressiveState = state;
  if (state === "scanning") {
    commentsBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Collecting';
    commentsBtn.style.background = '#e74c3c';
    commentsBtn.disabled = false;
  } else if (state === "stopped") {
    commentsBtn.innerHTML = '<i class="fas fa-redo"></i> Restart Collection';
    commentsBtn.style.background = '#1b9c85';
    commentsBtn.disabled = false;
  } else {
    commentsBtn.innerHTML = '<i class="fas fa-layer-group"></i> Deep Scan';
    commentsBtn.style.background = '';
    commentsBtn.disabled = false;
    progressiveState = "idle";
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
    const { accessToken } = await chrome.storage.local.get("accessToken");

    // Notify the server so the key can be freed/audited
    if (accessToken) {
      try {
        await fetch(`${SURESHOP_API_BASE}/deactivate_extension.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({ access_token: accessToken })
        });
      } catch (_) {
        // Server unreachable — still remove locally
      }
    }

    // Always clear local storage regardless of server response
    await chrome.storage.local.remove(["accessToken", "activatedAt", "lastAutoScanResult"]);

    showUnbindMessage("Activation key removed successfully.", false);

    setTimeout(() => {
      scanSection.style.display = "none";
      activationSection.style.display = "flex";
      hideUnbindMessage();
      output.textContent = "";
    }, 1200);

  } catch (error) {
    console.error("Unbind error:", error);
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

function resetButton() {
  scanBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Normal Scan';
  scanBtn.disabled = false;
  // Only reset commentsBtn if progressive collection hasn\'t started
  if (progressiveState === "idle") {
    resetCommentsButton();
  }
}