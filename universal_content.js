(() => {
  console.log("Universal URL Scanner loaded for:", location.hostname);

  let currentScanId = null;
  let storageListener = null;
  let tabId = null;
  let isActiveTab = true;

  // Get current tab ID and track tab visibility
  chrome.runtime.sendMessage({type: "GET_TAB_ID"}, (response) => {
    if (response && response.tabId) {
      tabId = response.tabId;
      console.log("Universal: Tab ID received:", tabId);
    }
  });

  // Track if tab is visible/active
  document.addEventListener('visibilitychange', () => {
    isActiveTab = !document.hidden;
    console.log("Universal: Tab visibility changed. Active:", isActiveTab);
    
    // Clean up if tab becomes hidden
    if (!isActiveTab) {
      console.log("Universal: Tab hidden, cleaning up listeners");
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
      console.log("Universal: Skipping URL scan card for dedicated platform page:", hostname);
      return;
    }

    // Don't show if tab is not active
    if (!isActiveTab) {
      console.log("Universal: Tab not active, skipping scan card");
      return;
    }

    // Remove existing card if present
    const existingCard = document.getElementById("sureshop-url-scan-card");
    if (existingCard) {
      console.log("Universal: Removing existing URL scan card");
      existingCard.remove();
    }

    const card = document.createElement("div");
    card.id = "sureshop-url-scan-card";

    card.innerHTML = `
      <div class="header">
        <div class="title-section">
          <i class="fas fa-globe"></i>
          <strong>SureShop</strong>
        </div>
        <button class="close">×</button>
      </div>
      <div class="body">
        <div class="scan-status">
          <div class="loading-spinner"></div>
          <p>Scanning URL...</p>
        </div>
        <div class="scan-results" style="display: none;">
          <div class="risk-indicator">
            <div class="risk-badge"></div>
            <div class="risk-text"></div>
          </div>
          <div class="domain-info"></div>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      /* CSS Variables matching dashboard */
      :root {
        --dash-primary: #22c55e;
        --dash-primary-dark: #15803d;
        --dash-primary-light: #dcfce7;
        --dash-dark: #1f2937;
        --dash-light: #f9fafb;
        --dash-gray: #6b7280;
        --dash-gray-light: #f3f4f6;
        --dash-border: #e5e7eb;
        --dash-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        --dash-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        --dash-radius: 12px;
        --dash-secondary: #3b82f6;
        --dash-danger: #dc2626;
        --dash-warning: #f59e0b;
        --dash-success: #16a34a;
      }

      #sureshop-url-scan-card {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 280px;
        background: white;
        border: 2px solid transparent;
        border-radius: var(--dash-radius);
        padding: 0;
        font-family: 'Poppins', system-ui, sans-serif;
        box-shadow: var(--dash-shadow-lg);
        z-index: 999999;
        animation: slideInUrlCard 0.3s ease;
        border-left: 4px solid var(--dash-secondary);
        overflow: hidden;
      }

      @keyframes slideInUrlCard {
        from { 
          opacity: 0; 
          transform: translateY(-12px) scale(0.95); 
        }
        to { 
          opacity: 1; 
          transform: translateY(0) scale(1); 
        }
      }

      #sureshop-url-scan-card .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, var(--dash-secondary) 0%, #1d4ed8 100%);
        color: white;
        border-radius: var(--dash-radius) var(--dash-radius) 0 0;
        margin: 0;
      }

      #sureshop-url-scan-card .title-section {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: white;
      }

      #sureshop-url-scan-card .title-section i {
        color: white;
        font-size: 16px;
        opacity: 0.9;
        animation: urlGlobe 2s ease-in-out infinite;
      }

      @keyframes urlGlobe {
        0%, 100% { 
          transform: scale(1);
          opacity: 0.9;
        }
        50% { 
          transform: scale(1.1);
          opacity: 1;
        }
      }

      #sureshop-url-scan-card .body {
        padding: 16px;
        background: white;
      }

      .scan-status {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: center;
        text-align: center;
      }

      .loading-spinner {
        width: 18px;
        height: 18px;
        border: 2px solid var(--dash-border);
        border-top: 2px solid var(--dash-secondary);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        flex-shrink: 0;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .scan-status p {
        font-size: 13px;
        color: var(--dash-gray);
        margin: 0;
        line-height: 1.4;
        font-weight: 500;
      }

      .scan-results {
        text-align: center;
        animation: fadeInResults 0.4s ease;
      }

      @keyframes fadeInResults {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .risk-indicator {
        margin-bottom: 12px;
      }

      .risk-badge {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        margin: 0 auto 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        color: white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.15);
      }

      .risk-badge.low {
        background: linear-gradient(135deg, var(--dash-success) 0%, #059669 100%);
      }

      .risk-badge.medium {
        background: linear-gradient(135deg, var(--dash-warning) 0%, #d97706 100%);
      }

      .risk-badge.high {
        background: linear-gradient(135deg, var(--dash-danger) 0%, #b91c1c 100%);
      }

      .risk-text {
        font-size: 15px;
        font-weight: 700;
        margin-bottom: 8px;
        letter-spacing: 0.5px;
      }

      .risk-text.low {
        color: var(--dash-success);
      }

      .risk-text.medium {
        color: var(--dash-warning);
      }

      .risk-text.high {
        color: var(--dash-danger);
      }

      .domain-info {
        font-size: 11px;
        color: var(--dash-gray);
        word-break: break-all;
        line-height: 1.4;
        background: var(--dash-gray-light);
        padding: 8px 10px;
        border-radius: 6px;
        margin-top: 10px;
      }

      #sureshop-url-scan-card .close {
        border: none;
        background: rgba(255, 255, 255, 0.2);
        font-size: 16px;
        cursor: pointer;
        line-height: 1;
        padding: 6px;
        color: white;
        border-radius: 6px;
        transition: all 0.2s ease;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }

      #sureshop-url-scan-card .close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      /* Enhanced hover effect */
      #sureshop-url-scan-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      }

      /* Smooth dismiss animation */
      #sureshop-url-scan-card.dismissing {
        opacity: 0;
        transform: translateY(-12px) scale(0.95);
        transition: all 0.25s ease;
      }

      /* Update border color based on risk level */
      #sureshop-url-scan-card.risk-low {
        border-left-color: var(--dash-success);
      }

      #sureshop-url-scan-card.risk-medium {
        border-left-color: var(--dash-warning);
      }

      #sureshop-url-scan-card.risk-high {
        border-left-color: var(--dash-danger);
      }

      /* Success pulse animation for low risk */
      #sureshop-url-scan-card.risk-low .risk-badge {
        animation: successPulse 2s ease-in-out infinite;
      }

      @keyframes successPulse {
        0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 20px rgba(34, 197, 94, 0.4); }
      }

      /* Warning pulse for medium risk */
      #sureshop-url-scan-card.risk-medium .risk-badge {
        animation: warningPulse 2s ease-in-out infinite;
      }

      @keyframes warningPulse {
        0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 20px rgba(245, 158, 11, 0.4); }
      }

      /* Danger pulse for high risk */
      #sureshop-url-scan-card.risk-high .risk-badge {
        animation: dangerPulse 2s ease-in-out infinite;
      }

      @keyframes dangerPulse {
        0%, 100% { box-shadow: 0 4px 8px rgba(0,0,0,0.15); }
        50% { box-shadow: 0 4px 20px rgba(220, 38, 38, 0.4); }
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(card);

    card.querySelector(".close").onclick = () => {
      cleanupScanListeners();
      card.classList.add('dismissing');
      setTimeout(() => card.remove(), 250);
    };

    console.log("Universal: URL scan card displayed");

    // Generate unique scan ID for this scan (include tab ID)
    currentScanId = Date.now() + "_" + (tabId || 'unknown') + "_" + Math.random().toString(36).substr(2, 9);
    console.log("Universal: Generated scan ID:", currentScanId);

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
    const riskText = card.querySelector(".risk-text");
    const domainInfo = card.querySelector(".domain-info");

    // Hide loading, show results
    scanStatus.style.display = "none";
    scanResults.style.display = "block";

    // Update risk level styling
    const riskLevel = result.risk_level.toLowerCase();
    card.className = card.className.replace(/risk-\w+/g, '');
    card.classList.add(`risk-${riskLevel}`);

    // Update badge
    riskBadge.className = `risk-badge ${riskLevel}`;
    riskBadge.textContent = result.risk_score;

    // Update text
    riskText.className = `risk-text ${riskLevel}`;
    riskText.textContent = `${result.risk_level.toUpperCase()} RISK`;

    // Update domain info
    domainInfo.textContent = `${result.domain} • Risk Score: ${result.risk_score}/100`;

    // Auto-dismiss after showing results for 10 seconds
    setTimeout(() => {
      if (document.getElementById("sureshop-url-scan-card")) {
        cleanupScanListeners();
        card.classList.add('dismissing');
        setTimeout(() => card.remove(), 250);
      }
    }, 10000);

    console.log("Universal: URL scan card updated with results:", result);
  }

  // Cleanup function to remove listeners
  function cleanupScanListeners() {
    console.log("Universal: Cleaning up scan listeners for tab:", tabId);
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
      console.log("Universal: Tab not active, skipping result listener");
      return;
    }

    console.log("Universal: Starting to listen for scan results...");
    console.log("Universal: Current page URL:", location.href);
    console.log("Universal: Scan ID:", currentScanId);
    console.log("Universal: Tab ID:", tabId);
    
    let hasFoundResult = false;
    let fallbackChecker = null;
    
    // Method 1: Listen for Chrome storage changes (REAL-TIME) - TAB-SPECIFIC
    if (chrome.storage && chrome.storage.onChanged) {
      storageListener = (changes, namespace) => {
        // Only process if this tab is still active
        if (!isActiveTab || !currentScanId) {
          console.log("Universal: Tab inactive or no scan ID, ignoring storage change");
          return;
        }

        console.log("Universal: Storage changed for tab", tabId, ":", changes);
        
        if (changes.lastAutoScanResult && !hasFoundResult) {
          const newResult = changes.lastAutoScanResult.newValue;
          console.log("Universal: New scan result from storage change:", newResult);
          
          if (newResult && 
              newResult.type === "url" && 
              newResult.tabId === tabId && // ONLY process results for THIS tab
              isRecentResult(newResult.timestamp)) {
            
            console.log("Universal: Result matches this tab! Checking URL match...");
            console.log("Universal: Result URL:", newResult.url);
            console.log("Universal: Current URL:", location.href);
            
            // More flexible URL matching
            if (urlsMatch(newResult.url, location.href)) {
              console.log("Universal: URLs match! Displaying results...");
              hasFoundResult = true;
              updateCardWithResults(newResult);
              if (fallbackChecker) clearInterval(fallbackChecker);
              cleanupScanListeners();
            }
          } else if (newResult && newResult.tabId !== tabId) {
            console.log("Universal: Ignoring result from different tab:", newResult.tabId);
          }
        }
      };
      
      chrome.storage.onChanged.addListener(storageListener);
      console.log("Universal: Storage listener added for tab:", tabId);
    }
    
    // Method 2: Polling as fallback - TAB-SPECIFIC
    const checkForResults = () => {
      if (hasFoundResult || !currentScanId || !isActiveTab) return;
      
      console.log("Universal: Polling for results... Tab:", tabId);
      chrome.storage.local.get("lastAutoScanResult", ({ lastAutoScanResult }) => {
        if (lastAutoScanResult && 
            lastAutoScanResult.type === "url" &&
            lastAutoScanResult.tabId === tabId && // ONLY check results for THIS tab
            isRecentResult(lastAutoScanResult.timestamp)) {
          
          console.log("Universal: Found scan result via polling for this tab:", lastAutoScanResult);
          
          if (urlsMatch(lastAutoScanResult.url, location.href)) {
            console.log("Universal: URLs match via polling! Displaying results...");
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
        console.log("Universal: Timeout reached, no results found for tab:", tabId);
        const card = document.getElementById("sureshop-url-scan-card");
        if (card && card.querySelector(".scan-status").style.display !== "none") {
          const statusText = card.querySelector(".scan-status p");
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
      
      console.log("Universal: URL comparison for tab", tabId + ":");
      console.log("  URL1:", `${u1.hostname}${path1}`);
      console.log("  URL2:", `${u2.hostname}${path2}`);
      console.log("  Match:", match);
      
      return match;
    } catch (e) {
      console.log("Universal: URL parsing error:", e);
      // Fallback to simple string comparison
      return url1 === url2;
    }
  }

  // Helper function to check if result is recent
  function isRecentResult(timestamp) {
    const now = Date.now();
    const twoMinutes = 2 * 60 * 1000; // Reduced to 2 minutes for performance
    const isRecent = (now - timestamp) < twoMinutes;
    console.log("Universal: Result timestamp check for tab", tabId + ":", new Date(timestamp), "Recent:", isRecent);
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
      console.log("Universal: Skipping URL scan on dedicated platform page:", hostname);
      return;
    }

    // Only scan if tab is active
    if (!isActiveTab) {
      console.log("Universal: Tab not active, skipping scan");
      return;
    }

    // All other pages — URL scanning
    console.log("Universal: Sending URL_SCAN_PAGE message for:", location.href);
    showUrlScanCard();
    chrome.runtime.sendMessage({ type: "URL_SCAN_PAGE" });
  }

  // Send initial message immediately
  console.log("Universal: About to send initial message");
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

  // Monitor for URL changes (for SPAs) - ONLY if tab is active
  // Compare path signatures so that hash/query changes are ignored.
  let lastUrl = location.href;
  setInterval(() => {
    if (getPathSignature(location.href) !== getPathSignature(lastUrl) && isActiveTab) {
      console.log("Universal: URL path changed from", lastUrl, "to", location.href);
      lastUrl = location.href;
      
      // Clean up previous scan
      cleanupScanListeners();
      const existingCard = document.getElementById("sureshop-url-scan-card");
      if (existingCard) {
        existingCard.remove();
      }
      
      notifyBackgroundScript();
    }
  }, 2000); // Less frequent checking for performance

  // Clean up when page unloads
  window.addEventListener('beforeunload', () => {
    cleanupScanListeners();
  });

  // Clean up when tab becomes hidden
  window.addEventListener('blur', () => {
    console.log("Universal: Window blur event - cleaning up");
    cleanupScanListeners();
  });
})();