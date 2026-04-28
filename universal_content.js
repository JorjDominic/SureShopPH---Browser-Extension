(() => {
  // -----------------------------------------------------------------------
  // Defense-in-depth: even if the manifest matches widen, this script will
  // only run on the supported Filipino shopping platforms.
  // Keep in sync with manifest.json content_scripts matches.
  // -----------------------------------------------------------------------
  const SUPPORTED_DOMAINS = [
    "tiktok.com",
    "zalora.com.ph",
    "carousell.ph",
    "shein.com",
    "temu.com",
    "amazon.com",
    "ebay.ph",
    "aliexpress.com",
    "beautymnl.com",
    "kimstore.com",
    "galleon.ph"
  ];
  const _host = location.hostname.toLowerCase();
  const _isSupported = SUPPORTED_DOMAINS.some(d => _host === d || _host.endsWith("." + d));
  if (!_isSupported) return;

  const DEBUG = false;
  const dbg = (...a) => { if (DEBUG) console.log(...a); };

  dbg("Universal URL Scanner loaded for:", location.hostname);

  let currentScanId = null;
  let storageListener = null;
  let tabId = null;
  let isActiveTab = true;

  // Get current tab ID and track tab visibility
  chrome.runtime.sendMessage({type: "GET_TAB_ID"}, (response) => {
    if (response && response.tabId) {
      tabId = response.tabId;
      dbg("Universal: Tab ID received:", tabId);
    }
  });

  // Track if tab is visible/active
  document.addEventListener('visibilitychange', () => {
    isActiveTab = !document.hidden;
    dbg("Universal: Tab visibility changed. Active:", isActiveTab);
    
    // Clean up if tab becomes hidden
    if (!isActiveTab) {
      dbg("Universal: Tab hidden, cleaning up listeners");
      cleanupScanListeners();
    }
  });

  // Function to show URL scanning card with results
  function showUrlScanCard() {
    const hostname = location.hostname;
    const pathname = location.pathname;

    // Skip pages that have dedicated content scripts — no duplicate card needed
    // and to avoid automatically transmitting URLs on trusted shopping/social platforms.
    const isShopeeProduct = hostname.includes("shopee.") && /-i\.\d+\.\d+/.test(location.href);
    const isLazada = hostname.includes("lazada.com");
    const isFacebookMarketplace = hostname.includes("facebook.com") && pathname.startsWith("/marketplace");

    if (isShopeeProduct || isLazada || isFacebookMarketplace) {
      dbg("Universal: Skipping URL scan card for dedicated platform page:", hostname);
      return;
    }

    // Don't show if tab is not active
    if (!isActiveTab) {
      dbg("Universal: Tab not active, skipping scan card");
      return;
    }

    // Remove existing card if present
    const existingCard = document.getElementById("sureshop-url-scan-card");
    if (existingCard) {
      dbg("Universal: Removing existing URL scan card");
      existingCard.remove();
    }

    const card = document.createElement("div");
    card.id = "sureshop-url-scan-card";

    card.innerHTML = `
      <div class="header">
        <div class="title-section">
          <i class="fas fa-shield-alt"></i>
          <div class="title-text">
            <strong>SureShop</strong>
            <span class="card-subtitle">Risk Scanner</span>
          </div>
        </div>
        <button class="close">×</button>
      </div>
      <div class="body">
        <div class="scan-status">
          <div class="scanning-badge">
            <div class="loading-spinner"></div>
            <span>Scanning URL...</span>
          </div>
        </div>
        <div class="scan-results" style="display: none;">
          <div class="url-status-badge">
            <i class="fas fa-globe"></i> URL Scanned
          </div>
          <div class="risk-badge"></div>
          <div class="risk-level-text"></div>
          <div class="risk-score-text"></div>
          <div class="domain-info"></div>
          <div class="scan-time"></div>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      /* Design tokens — matches popup.css */
      #sureshop-url-scan-card {
        --color-primary: #1b9c85;
        --color-primary-dark: #138a73;
        --color-danger: #ff0060;
        --color-success: #1b9c85;
        --color-warning: #f7d060;
        --color-white: #fff;
        --color-info-dark: #7d8da1;
        --color-dark: #363949;
        --color-light: rgba(27, 156, 133, 0.18);
        --color-dark-variant: #677483;
        --color-background: #f6f6f9;
        --card-border-radius: 2rem;
        --box-shadow: 0 2rem 3rem rgba(27, 156, 133, 0.18);

        position: fixed;
        top: 20px;
        right: 20px;
        width: 260px;
        background: var(--color-white);
        border-radius: var(--card-border-radius);
        padding: 0;
        font-family: 'Poppins', system-ui, sans-serif;
        box-shadow: var(--box-shadow);
        z-index: 999999;
        animation: slideInUrlCard 0.3s ease;
        border-left: 4px solid var(--color-primary);
        overflow: hidden;
      }

      @keyframes slideInUrlCard {
        from { opacity: 0; transform: translateY(-12px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      #sureshop-url-scan-card .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        background: linear-gradient(135deg, #1b9c85 0%, #138a73 100%);
        color: var(--color-white);
        border-radius: var(--card-border-radius) var(--card-border-radius) 0 0;
        margin: 0;
        position: relative;
        overflow: hidden;
      }

      #sureshop-url-scan-card .header::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(45deg, rgba(255,255,255,0.12) 0%, transparent 60%);
        pointer-events: none;
      }

      #sureshop-url-scan-card .title-section {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: var(--color-white);
      }

      #sureshop-url-scan-card .title-section i {
        color: var(--color-white);
        font-size: 16px;
        opacity: 0.9;
        animation: urlGlobe 2s ease-in-out infinite;
      }

      @keyframes urlGlobe {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50%       { transform: scale(1.1); opacity: 1; }
      }

      #sureshop-url-scan-card .body {
        padding: 16px;
        background: var(--color-background);
      }

      .scan-status {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 4px 0;
      }

      .scanning-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: rgba(27, 156, 133, 0.08);
        border: 1px solid rgba(27, 156, 133, 0.2);
        border-radius: 0.4rem;
        padding: 8px 14px;
        font-size: 11px;
        font-weight: 600;
        color: #138a73;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .loading-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(27, 156, 133, 0.2);
        border-top: 2px solid #1b9c85;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
      }

      @keyframes spin {
        0%   { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .scan-results {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        text-align: center;
        animation: fadeInResults 0.4s ease;
      }

      @keyframes fadeInResults {
        from { opacity: 0; transform: translateY(10px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      .url-status-badge {
        background: rgba(27, 156, 133, 0.12);
        border: 1px solid rgba(27, 156, 133, 0.25);
        border-radius: 0.4rem;
        padding: 5px 10px;
        font-size: 10px;
        font-weight: 600;
        color: #138a73;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        width: 100%;
      }

      .risk-badge {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        margin: 2px auto;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
      }

      .risk-badge.low    { background: rgba(27, 156, 133, 0.12); border: 3px solid #1b9c85; color: #1b9c85; }
      .risk-badge.medium { background: rgba(247, 208, 96, 0.18); border: 3px solid #f7d060; color: #c9a000; }
      .risk-badge.high   { background: rgba(255, 0, 96, 0.08);   border: 3px solid #ff0060; color: #ff0060; }

      .risk-level-text {
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .risk-level-text.low    { color: #1b9c85; }
      .risk-level-text.medium { color: #c9a000; }
      .risk-level-text.high   { color: #ff0060; }

      .risk-score-text {
        font-size: 12px;
        color: #677483;
        font-weight: 600;
      }

      .domain-info {
        font-size: 11px;
        color: #677483;
        word-break: break-all;
        line-height: 1.4;
        background: var(--color-background);
        padding: 7px 10px;
        border-radius: 0.6rem;
        width: 100%;
        text-align: left;
        border: 1px solid rgba(27, 156, 133, 0.15);
      }

      .scan-time {
        font-size: 10px;
        color: #7d8da1;
        border-top: 1px solid rgba(27, 156, 133, 0.18);
        padding-top: 6px;
        width: 100%;
        text-align: center;
      }

      #sureshop-url-scan-card .close {
        border: none;
        background: rgba(255, 255, 255, 0.2);
        font-size: 16px;
        cursor: pointer;
        line-height: 1;
        padding: 6px;
        color: #fff;
        border-radius: 6px;
        transition: all 0.2s ease;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        position: relative;
        z-index: 1;
      }

      #sureshop-url-scan-card .close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      #sureshop-url-scan-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 2.5rem 4rem rgba(27, 156, 133, 0.25);
      }

      #sureshop-url-scan-card.dismissing {
        opacity: 0;
        transform: translateY(-12px) scale(0.95);
        transition: all 0.25s ease;
      }

      #sureshop-url-scan-card.risk-low    { border-left-color: #1b9c85; }
      #sureshop-url-scan-card.risk-medium { border-left-color: #f7d060; }
      #sureshop-url-scan-card.risk-high   { border-left-color: #ff0060; }

      @keyframes successPulse {
        0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.12); }
        50%       { box-shadow: 0 4px 20px rgba(27, 156, 133, 0.45); }
      }
      @keyframes warningPulse {
        0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.12); }
        50%       { box-shadow: 0 4px 20px rgba(247, 208, 96, 0.5); }
      }
      @keyframes dangerPulse {
        0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.12); }
        50%       { box-shadow: 0 4px 20px rgba(255, 0, 96, 0.4); }
      }

      #sureshop-url-scan-card.risk-low    .risk-badge { animation: successPulse 2s ease-in-out infinite; }
      #sureshop-url-scan-card.risk-medium .risk-badge { animation: warningPulse 2s ease-in-out infinite; }
      #sureshop-url-scan-card.risk-high   .risk-badge { animation: dangerPulse  2s ease-in-out infinite; }
    `;

    if (!document.getElementById('sureshop-fa-css')) {
      const faLink = document.createElement('link');
      faLink.id = 'sureshop-fa-css';
      faLink.rel = 'stylesheet';
      faLink.href = chrome.runtime.getURL('fonts/fa/fa-solid-combined.css');
      document.head.appendChild(faLink);
    }
    document.head.appendChild(style);
    document.body.appendChild(card);

    card.querySelector(".close").onclick = () => {
      cleanupScanListeners();
      card.classList.add('dismissing');
      setTimeout(() => card.remove(), 250);
    };

    dbg("Universal: URL scan card displayed");

    // Generate unique scan ID for this scan (include tab ID)
    currentScanId = Date.now() + "_" + (tabId || 'unknown') + "_" + Math.random().toString(36).substr(2, 9);
    dbg("Universal: Generated scan ID:", currentScanId);

    // Listen for scan results from background script
    listenForScanResults();
  }

  // Function to update card with scan results
  function updateCardWithResults(result) {
    const card = document.getElementById("sureshop-url-scan-card");
    if (!card) return;

    const scanStatus = card.querySelector(".scan-status");
    const scanResults = card.querySelector(".scan-results");
    const riskBadge = card.querySelector(".risk-badge");
    const riskLevelText = card.querySelector(".risk-level-text");
    const riskScoreText = card.querySelector(".risk-score-text");
    const domainInfo = card.querySelector(".domain-info");
    const scanTime = card.querySelector(".scan-time");

    // Hide loading, show results
    scanStatus.style.display = "none";
    scanResults.style.display = "flex";

    // Update risk level styling
    const riskLevel = result.risk_level.toLowerCase();
    card.className = card.className.replace(/risk-\w+/g, '');
    card.classList.add(`risk-${riskLevel}`);

    // Update badge
    riskBadge.className = `risk-badge ${riskLevel}`;
    riskBadge.textContent = result.risk_score;

    // Update risk level text
    riskLevelText.className = `risk-level-text ${riskLevel}`;
    riskLevelText.textContent = `URL Risk: ${result.risk_level.toUpperCase()}`;

    // Update risk score text
    riskScoreText.textContent = `Risk Score: ${result.risk_score} / 100`;

    // Update domain info
    domainInfo.textContent = result.domain;

    // Update scan time
    const ts = new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    scanTime.textContent = `Scanned: ${ts}`;

    // Auto-dismiss after showing results for 10 seconds
    setTimeout(() => {
      if (document.getElementById("sureshop-url-scan-card")) {
        cleanupScanListeners();
        card.classList.add('dismissing');
        setTimeout(() => card.remove(), 250);
      }
    }, 10000);

    dbg("Universal: URL scan card updated with results:", result);
  }

  // Cleanup function to remove listeners
  function cleanupScanListeners() {
    dbg("Universal: Cleaning up scan listeners for tab:", tabId);
    if (storageListener && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.removeListener(storageListener);
      storageListener = null;
    }
    currentScanId = null;
  }

  // Function to listen for scan results - OPTIMIZED FOR MULTIPLE TABS
  function listenForScanResults() {
    // Don't start listening if tab is not active
    if (!isActiveTab) {
      dbg("Universal: Tab not active, skipping result listener");
      return;
    }

    dbg("Universal: Starting to listen for scan results...");
    dbg("Universal: Current page URL:", location.href);
    dbg("Universal: Scan ID:", currentScanId);
    dbg("Universal: Tab ID:", tabId);
    
    let hasFoundResult = false;
    let fallbackChecker = null;
    
    // Method 1: Listen for Chrome storage changes (REAL-TIME) - TAB-SPECIFIC
    if (chrome.storage && chrome.storage.onChanged) {
      storageListener = (changes, namespace) => {
        // Only process if this tab is still active
        if (!isActiveTab || !currentScanId) {
          dbg("Universal: Tab inactive or no scan ID, ignoring storage change");
          return;
        }

        dbg("Universal: Storage changed for tab", tabId, ":", changes);
        
        if (changes.lastAutoScanResult && !hasFoundResult) {
          const newResult = changes.lastAutoScanResult.newValue;
          dbg("Universal: New scan result from storage change:", newResult);
          
          if (newResult && 
              newResult.type === "url" && 
              newResult.tabId === tabId && // ONLY process results for THIS tab
              isRecentResult(newResult.timestamp)) {
            
            dbg("Universal: Result matches this tab! Checking URL match...");
            dbg("Universal: Result URL:", newResult.url);
            dbg("Universal: Current URL:", location.href);
            
            // More flexible URL matching
            if (urlsMatch(newResult.url, location.href)) {
              dbg("Universal: URLs match! Displaying results...");
              hasFoundResult = true;
              updateCardWithResults(newResult);
              if (fallbackChecker) clearInterval(fallbackChecker);
              cleanupScanListeners();
            }
          } else if (newResult && newResult.tabId !== tabId) {
            dbg("Universal: Ignoring result from different tab:", newResult.tabId);
          }
        }
      };
      
      chrome.storage.onChanged.addListener(storageListener);
      dbg("Universal: Storage listener added for tab:", tabId);
    }
    
    // Method 2: Polling as fallback - TAB-SPECIFIC
    const checkForResults = () => {
      if (hasFoundResult || !currentScanId || !isActiveTab) return;
      
      dbg("Universal: Polling for results... Tab:", tabId);
      chrome.storage.local.get("lastAutoScanResult", ({ lastAutoScanResult }) => {
        if (lastAutoScanResult && 
            lastAutoScanResult.type === "url" &&
            lastAutoScanResult.tabId === tabId && // ONLY check results for THIS tab
            isRecentResult(lastAutoScanResult.timestamp)) {
          
          dbg("Universal: Found scan result via polling for this tab:", lastAutoScanResult);
          
          if (urlsMatch(lastAutoScanResult.url, location.href)) {
            dbg("Universal: URLs match via polling! Displaying results...");
            hasFoundResult = true;
            updateCardWithResults(lastAutoScanResult);
            if (fallbackChecker) clearInterval(fallbackChecker);
            cleanupScanListeners();
          }
        }
      });
    };

    // Check immediately and every 2 seconds (less frequent for performance)
    checkForResults();
    fallbackChecker = setInterval(checkForResults, 2000);

    // Timeout after 12 seconds (shorter timeout for better performance)
    setTimeout(() => {
      if (fallbackChecker) clearInterval(fallbackChecker);
      
      if (!hasFoundResult && currentScanId && isActiveTab) {
        dbg("Universal: Timeout reached, no results found for tab:", tabId);
        const card = document.getElementById("sureshop-url-scan-card");
        if (card && card.querySelector(".scan-status").style.display !== "none") {
          const statusText = card.querySelector(".scanning-badge span");
          statusText.textContent = "Scan completed";
          
          setTimeout(() => {
            if (document.getElementById("sureshop-url-scan-card")) {
              cleanupScanListeners();
              card.classList.add('dismissing');
              setTimeout(() => card.remove(), 250);
            }
          }, 2000);
        }
      }
      
      cleanupScanListeners();
    }, 12000); // 12 seconds timeout
  }

  // More flexible URL matching function
  function urlsMatch(url1, url2) {
    if (!url1 || !url2) return false;
    
    try {
      const u1 = new URL(url1);
      const u2 = new URL(url2);
      
      // Compare hostname and pathname (ignore protocol differences, search params and hash)
      const path1 = u1.pathname.replace(/\/$/, '');
      const path2 = u2.pathname.replace(/\/$/, '');
      
      const match = u1.hostname === u2.hostname && path1 === path2;
      
      dbg("Universal: URL comparison for tab", tabId + ":");
      dbg("  URL1:", `${u1.hostname}${path1}`);
      dbg("  URL2:", `${u2.hostname}${path2}`);
      dbg("  Match:", match);
      
      return match;
    } catch (e) {
      dbg("Universal: URL parsing error:", e);
      // Fallback to simple string comparison
      return url1 === url2;
    }
  }

  // Helper function to check if result is recent
  function isRecentResult(timestamp) {
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000; // Reduced to 2 minutes for performance
    const isRecent = (now - timestamp) < twoMinutes;
    dbg("Universal: Result timestamp check for tab", tabId + ":", new Date(timestamp), "Recent:", isRecent);
    return isRecent;
  }

  // Send initial message to background script
  function notifyBackgroundScript() {
    const hostname = location.hostname;
    const pathname = location.pathname;

    // Skip known trusted shopping/social platforms that have dedicated content scripts.
    // Scanning their URLs on every page load would auto-transmit browsing URLs to our
    // server without direct user action, which conflicts with each platform's ToS and
    // Chrome Web Store data-use disclosure requirements.
    const isShopeeProduct = hostname.includes("shopee.") && /-i\.\d+\.\d+/.test(location.href);
    const isLazada = hostname.includes("lazada.com");
    const isFacebookMarketplace = hostname.includes("facebook.com") && pathname.startsWith("/marketplace");

    if (isShopeeProduct || isLazada || isFacebookMarketplace) {
      dbg("Universal: Skipping URL scan on dedicated platform page:", hostname);
      return;
    }

    // Only scan if tab is active
    if (!isActiveTab) {
      dbg("Universal: Tab not active, skipping scan");
      return;
    }

    // All other pages — trigger URL scan
    dbg("Universal: Sending URL_SCAN_PAGE message for:", location.href);
    showUrlScanCard();
    chrome.runtime.sendMessage({ type: "URL_SCAN_PAGE" });
  }

  // Send initial message immediately
  dbg("Universal: About to send initial message");
  notifyBackgroundScript();

  // Returns origin+pathname only, ignoring hash and query params.
  // Prevents ?sort=price or #reviews from triggering redundant scans.
  function getPathSignature(href) {
    try {
      const u = new URL(href);
      return u.origin + u.pathname.replace(/\/$/, '');
    } catch (e) {
      return href;
    }
  }

  // Monitor for domain changes during SPA navigation.
  // Only re-scans when the hostname changes, not on every path change.
  let lastHostname = location.hostname;
  setInterval(() => {
    if (location.hostname !== lastHostname && isActiveTab) {
      dbg("Universal: Domain changed from", lastHostname, "to", location.hostname);
      lastHostname = location.hostname;
      cleanupScanListeners();
      const existingCard = document.getElementById("sureshop-url-scan-card");
      if (existingCard) existingCard.remove();
      notifyBackgroundScript();
    }
  }, 2000);

  // Clean up when page unloads
  window.addEventListener('beforeunload', () => {
    cleanupScanListeners();
  });

  // Clean up when tab becomes hidden
  window.addEventListener('blur', () => {
    dbg("Universal: Window blur event - cleaning up");
    cleanupScanListeners();
  });
})();