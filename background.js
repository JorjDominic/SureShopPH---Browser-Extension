// -----------------------------------------------------------------------
// API base URL is defined in config.js (loaded via importScripts).
// Update there before submitting to the Chrome Web Store.
// -----------------------------------------------------------------------
importScripts('config.js');

// -----------------------------------------------------------------------
// Supported shopping platform domains. URL auto-scan is restricted to
// these domains. Keep in sync with manifest.json host_permissions.
// -----------------------------------------------------------------------
const SUPPORTED_DOMAINS = [
  "shopee.ph",
  "lazada.com.ph",
  "facebook.com",        // marketplace path-checked separately
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

function isSupportedDomain(url) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SUPPORTED_DOMAINS.some(d => host === d || host.endsWith("." + d));
  } catch (_) {
    return false;
  }
}

let currentAutoScanTab = null;
let isInitialized = false;
let trackedTabs = new Map(); // Track tab URL signatures (origin+pathname) for SPA detection
let autoScanTimeout;
let debugMode = false;

// Cache recent URL scan results by domain to avoid redundant API calls
const urlScanCache = new Map(); // key: hostname → { timestamp, result }
const URL_SCAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Returns only the hostname so that path/query/hash changes within the same
// domain do not trigger a new scan — one scan per domain per tab.
function getUrlSignature(url) {
  if (!url) return url;
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}

// Debug helper function with timestamp
function debugLog(emoji, message, ...args) {
  if (debugMode) {
    console.log(`[${new Date().toLocaleTimeString()}] ${emoji}`, message, ...args);
  }
}

// IMMEDIATE STARTUP LOGGING
debugLog("🚀", "=== BACKGROUND SCRIPT STARTING ===");
debugLog("🚀", "Script file loaded at:", new Date().toLocaleTimeString());

chrome.runtime.onInstalled.addListener(() => {
  debugLog("🟢", "=== CHROME.RUNTIME.ONINSTALLED TRIGGERED ===");
  debugLog("🟢", "SureShop Security Scanner installed");
  initializeExtension();
});

chrome.runtime.onStartup.addListener(() => {
  debugLog("🟢", "=== CHROME.RUNTIME.ONSTARTUP TRIGGERED ===");
  debugLog("🟢", "SureShop Security Scanner started");
  initializeExtension();
});

async function initializeExtension() {
  debugLog("🔧", "=== INITIALIZING EXTENSION ===");
  try {
    isInitialized = true;
    // Open the side panel when the toolbar icon is clicked
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
    debugLog("✅", "Extension initialized successfully");
    updateAllTabs();
  } catch (error) {
    debugLog("❌", "Initialization failed:", error);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog("📨", "=== MESSAGE RECEIVED ===");
  debugLog("📨", "Message type:", message.type);
  debugLog("📨", "From tab ID:", sender.tab?.id);
  debugLog("📨", "Tab URL:", sender.tab?.url);
  debugLog("📨", "Full message:", message);
  debugLog("📊", "Current state: isInitialized =", isInitialized);
  
  // Handle GET_TAB_ID message for universal content script
  if (message.type === "GET_TAB_ID") {
    debugLog("🆔", "GET_TAB_ID request from tab:", sender.tab?.id);
    sendResponse({ tabId: sender.tab?.id });
    return true;
  }
  
  // Handle each message type separately (not else if chain)
  if (message.type === "SURESHOPPH_PRODUCT_PAGE") {
    debugLog("📱", "=== PRODUCT PAGE MESSAGE RECEIVED ===");
    debugLog("📱", "Processing product page for tab:", sender.tab?.id);
    handleProductPageMessage(sender.tab);
    sendResponse({ received: true, action: "product_page_handled" });
  }
  
  if (message.type === "SURESHOPPH_NOT_PRODUCT_PAGE") {
    debugLog("🌐", "=== NON-PRODUCT PAGE MESSAGE RECEIVED ===");
    debugLog("🌐", "Processing non-product page for tab:", sender.tab?.id);
    handleNonProductPageMessage(sender.tab);
    sendResponse({ received: true, action: "non_product_page_handled" });
  }

  if (message.type === "LAZADA_PRODUCT_PAGE") {
    debugLog("🛒", "=== LAZADA PRODUCT PAGE MESSAGE RECEIVED ===");
    handleLazadaProductPageMessage(sender.tab);
    sendResponse({ received: true, action: "lazada_product_page_handled" });
  }

  if (message.type === "LAZADA_NOT_PRODUCT_PAGE") {
    debugLog("🌐", "=== LAZADA NON-PRODUCT PAGE MESSAGE RECEIVED ===");
    handleNonProductPageMessage(sender.tab);
    sendResponse({ received: true, action: "lazada_non_product_page_handled" });
  }

  if (message.type === "FACEBOOK_MARKETPLACE_PAGE") {
    debugLog("📘", "=== FACEBOOK MARKETPLACE PAGE MESSAGE RECEIVED ===");
    handleFacebookMarketplacePageMessage(sender.tab);
    sendResponse({ received: true, action: "facebook_marketplace_page_handled" });
  }

  if (message.type === "FACEBOOK_NOT_MARKETPLACE_PAGE") {
    debugLog("🌐", "=== FACEBOOK NON-MARKETPLACE PAGE MESSAGE RECEIVED ===");
    handleNonProductPageMessage(sender.tab);
    sendResponse({ received: true, action: "facebook_non_marketplace_page_handled" });
  }
  
  // Handle universal URL scanning - REMOVE ELSE IF
  if (message.type === "URL_SCAN_PAGE") {
    debugLog("🌍", "=== UNIVERSAL URL SCAN PAGE MESSAGE RECEIVED ===");
    debugLog("🌍", "Processing URL scan for tab:", sender.tab?.id);
    handleUniversalUrlPageMessage(sender.tab);
    sendResponse({ received: true, action: "url_scan_triggered" });
  }
  
  if (message.type === "OPEN_POPUP") {
    debugLog("🔓", "Open popup message received");
    chrome.action.openPopup();
    sendResponse({ received: true, action: "popup_opened" });
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    }
    sendResponse({ received: true, action: "side_panel_opened" });
  }
  
  // Log if unknown message type
  if (!["SURESHOPPH_PRODUCT_PAGE", "SURESHOPPH_NOT_PRODUCT_PAGE", "LAZADA_PRODUCT_PAGE", "LAZADA_NOT_PRODUCT_PAGE", "FACEBOOK_MARKETPLACE_PAGE", "FACEBOOK_NOT_MARKETPLACE_PAGE", "URL_SCAN_PAGE", "OPEN_POPUP", "OPEN_SIDE_PANEL", "GET_TAB_ID"].includes(message.type)) {
    debugLog("❓", "UNKNOWN MESSAGE TYPE:", message.type);
    sendResponse({ received: true, action: "unknown_message" });
  }
  
  // Always return true to indicate we will send a response
  return true;
});

// Handle universal URL pages (any website) - ALWAYS SCAN
async function handleUniversalUrlPageMessage(tab) {
  debugLog("🌍", "=== HANDLING UNIVERSAL URL PAGE ===");
  debugLog("🌍", "Tab ID:", tab.id, "URL:", tab.url);

  // Skip internal Chrome/extension pages
  if (tab.url && (tab.url.startsWith('chrome://') ||
                  tab.url.startsWith('chrome-extension://') ||
                  tab.url.startsWith('moz-extension://') ||
                  tab.url.startsWith('about:') ||
                  tab.url.startsWith('file:'))) {
    debugLog("🌍", "Skipping internal page:", tab.url);
    return;
  }

  // Restrict URL scanning to the supported shopping platform whitelist
  if (!isSupportedDomain(tab.url)) {
    debugLog("🌍", "Skipping non-shopping domain:", tab.url);
    chrome.action.setBadgeText({ text: "", tabId: tab.id });
    chrome.action.setTitle({
      title: "SureShop — visit a supported shopping site to scan",
      tabId: tab.id
    });
    return;
  }

  // Wait for initialization if not ready
  if (!isInitialized) {
    debugLog("⏳", "Not initialized, calling initializeExtension...");
    await initializeExtension();
  }
  
  debugLog("🔧", "URL scanning ALWAYS ON - processing URL");
  debugLog("🔧", "Is initialized:", isInitialized);
  
  // Update badge to show URL scanning is active
  chrome.action.setBadgeText({ 
    text: "URL",
    tabId: tab.id 
  });
  chrome.action.setBadgeBackgroundColor({ 
    color: "#1b9c85"
  });
  chrome.action.setTitle({
    title: "URL scanning active - URLs are scanned automatically",
    tabId: tab.id
  });
  debugLog("🎨", "Universal URL badge updated for tab:", tab.id);

  // ALWAYS trigger URL auto-scan (no toggle check needed)
  debugLog("✅", "URL scanning ALWAYS ENABLED, checking URL change...");
  
  // Check if the meaningful part of the URL changed (origin+pathname).
  // Ignores hash fragments and query-string changes so that things like
  // ?sort=price or #reviews don't trigger a new scan.
  const lastSig = trackedTabs.get(tab.id);
  const currentSig = getUrlSignature(tab.url);
  const hasUrlChanged = lastSig !== currentSig;

  debugLog("🔄", "Last URL signature for tab", tab.id + ":", lastSig);
  debugLog("🔄", "Current URL signature:", currentSig);
  debugLog("🔄", "Has URL (path) changed?", hasUrlChanged);

  // Update tracked domain signature
  trackedTabs.set(tab.id, currentSig);
  debugLog("💾", "Updated tracked domain for universal tab:", tab.id);

  // Trigger auto-scan only when the domain changes
  if (hasUrlChanged) {
    debugLog("🚀", "=== TRIGGERING UNIVERSAL URL AUTO-SCAN ===");
    debugLog("🚀", "Domain changed, calling handleUrlAutoScan");
    handleUrlAutoScan(tab.id, tab.url);
  } else {
    debugLog("⏭️", "Same domain, skipping universal auto-scan");
  }

  debugLog("🏁", "=== UNIVERSAL URL PAGE HANDLING COMPLETE ===");
}

async function handleProductPageMessage(tab) {
  debugLog("🔍", "=== HANDLING PRODUCT PAGE ===");
  debugLog("🔍", "Tab ID:", tab.id, "URL:", tab.url);
  
  const isProductPage = /-i\.\d+\.\d+/.test(tab.url);
  debugLog("🔍", "Is product page regex test:", isProductPage);
  debugLog("🔍", "URL pattern test result for", tab.url, ":", /-i\.\d+\.\d+/.test(tab.url));
  
  if (!isProductPage) {
    debugLog("❌", "Not a product page, skipping handling");
    return;
  }
  
  // Wait for initialization if not ready
  if (!isInitialized) {
    debugLog("⏳", "Not initialized, calling initializeExtension...");
    await initializeExtension();
  }
  
  debugLog("🔧", "Product page detected - MANUAL SCAN ONLY");
  
  // Update badge - ALWAYS show manual scan only (no auto-scan)
  debugLog("🎨", "Updating badge for manual scan only:", tab.id);
  chrome.action.setBadgeText({ 
    text: "SCAN",
    tabId: tab.id 
  });
  chrome.action.setBadgeBackgroundColor({ 
    color: "#1b9c85"
  });
  chrome.action.setTitle({
    title: "Click to manually scan this Shopee product for safety",
    tabId: tab.id
  });
  debugLog("🎨", "Badge updated for manual scan only:", tab.id);

  // NO AUTO-SCAN FOR PRODUCTS - Only manual scanning available
  debugLog("🔴", "Product auto-scan REMOVED: Only manual scanning available");
  
  debugLog("🏁", "=== PRODUCT PAGE HANDLING COMPLETE ===");
}

async function handleLazadaProductPageMessage(tab) {
  debugLog("🛒", "=== HANDLING LAZADA PRODUCT PAGE ===");
  debugLog("🛒", "Tab ID:", tab.id, "URL:", tab.url);

  const isProductPage = tab.url && tab.url.includes("/products/") && /-i\d+-s\d+\.html/.test(tab.url);
  if (!isProductPage) {
    debugLog("❌", "Not a Lazada product page, skipping");
    return;
  }

  if (!isInitialized) await initializeExtension();

  chrome.action.setBadgeText({ text: "SCAN", tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: "#1b9c85" });
  chrome.action.setTitle({
    title: "Click to manually scan this Lazada product for safety",
    tabId: tab.id
  });
  debugLog("🎨", "Lazada badge updated for tab:", tab.id);
  debugLog("🏁", "=== LAZADA PRODUCT PAGE HANDLING COMPLETE ===");
}

async function handleFacebookMarketplacePageMessage(tab) {
  debugLog("📘", "=== HANDLING FACEBOOK MARKETPLACE PAGE ===");
  debugLog("📘", "Tab ID:", tab.id, "URL:", tab.url);

  const isListingPage = tab.url && /\/marketplace\/item\/\d+/.test(tab.url);
  if (!isListingPage) {
    debugLog("❌", "Not a Facebook Marketplace listing, skipping");
    return;
  }

  if (!isInitialized) await initializeExtension();

  chrome.action.setBadgeText({ text: "SCAN", tabId: tab.id });
  chrome.action.setBadgeBackgroundColor({ color: "#1b9c85" });
  chrome.action.setTitle({
    title: "Click to manually scan this Facebook Marketplace listing for safety",
    tabId: tab.id
  });
  debugLog("🎨", "Facebook badge updated for tab:", tab.id);
  debugLog("🏁", "=== FACEBOOK MARKETPLACE PAGE HANDLING COMPLETE ===");
}

async function handleNonProductPageMessage(tab) {
  debugLog("🌐", "=== HANDLING NON-PRODUCT PAGE ===");
  debugLog("🌐", "Tab ID:", tab.id, "URL:", tab.url);
  
  // Handle non-product Shopee pages or other websites
  chrome.action.setBadgeText({ 
    text: "",
    tabId: tab.id 
  });
  debugLog("🎨", "Badge cleared for non-product page");
  
  chrome.action.setTitle({
    title: "SureShop Scanner - URL scanning active",
    tabId: tab.id
  });
  
  debugLog("🏁", "=== NON-PRODUCT PAGE HANDLING COMPLETE ===");
}

// URL auto-scanning function - ALWAYS ACTIVE
function handleUrlAutoScan(tabId, url) {
  debugLog("🌐", "=== STARTING URL AUTO-SCAN ===");
  debugLog("🌐", "Function called with tabId:", tabId, "url:", url);
  
  // Dedup by full URL key (same as before)
  const tabUrlKey = `url:${tabId}:${url}`;
  debugLog("🔑", "Generated URL key:", tabUrlKey);
  debugLog("🔑", "Current auto-scan tab:", currentAutoScanTab);

  if (currentAutoScanTab === tabUrlKey) {
    debugLog("⏭️", "URL auto-scan skipped: same URL already scanned");
    return;
  }

  // Check domain-level cache — skip API call if we scanned this domain recently
  try {
    const domain = new URL(url).hostname;
    const cached = urlScanCache.get(domain);
    if (cached && (Date.now() - cached.timestamp) < URL_SCAN_CACHE_TTL) {
      debugLog("💾", "URL scan cache HIT for domain:", domain, "— reusing result");
      currentAutoScanTab = tabUrlKey;
      // Re-store the cached result so the content script can pick it up
      chrome.storage.local.set({
        lastAutoScanResult: {
          ...cached.result,
          timestamp: Date.now(),
          url: url,
          tabId: tabId
        }
      });
      updateBadgeForUrlRisk(tabId, cached.result.risk_level);
      return;
    }
  } catch (e) {
    debugLog("⚠️", "Cache check failed:", e);
  }

  debugLog("📝", "Setting current auto-scan tab to:", tabUrlKey);
  currentAutoScanTab = tabUrlKey;
  
  debugLog("⏰", "Setting 1-second timeout for URL auto-scan");
  setTimeout(async () => {
    debugLog("🚀", "=== URL AUTO-SCAN TIMEOUT TRIGGERED ===");
    debugLog("🚀", "1 second has passed, executing URL scan");
    
    try {
      debugLog("🚀", "Actually starting URL scan for:", url);
      
      // Check if extension is activated
      const { accessToken } = await chrome.storage.local.get("accessToken");
      if (!accessToken) {
        debugLog("❌", "URL auto-scan ABORTED: no access token");
        return;
      }

      // Verify tab still exists
      debugLog("🔍", "Verifying tab", tabId, "still exists for URL scan...");
      let tab;
      try {
        tab = await chrome.tabs.get(tabId);
        debugLog("✅", "Tab still exists for URL scan:", tab.url);
      } catch (error) {
        debugLog("❌", "URL auto-scan ABORTED: tab no longer exists");
        return;
      }
      
      if (!tab || tab.url !== url) {
        debugLog("❌", "URL auto-scan ABORTED: tab URL changed");
        debugLog("❌", "Expected URL:", url);
        debugLog("❌", "Actual URL:", tab?.url);
        return;
      }
      
      // Send URL to server for analysis
      const urlData = {
        url: url,
        domain: new URL(url).hostname,
        timestamp: Date.now()
      };
      
      debugLog("🌐", "URL data prepared for server:", urlData);
      debugLog("🌐", "Sending to:", SURESHOP_API_BASE + "/analyze/url");

      // Send to server
      const res = await fetch(`${SURESHOP_API_BASE}/analyze/url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(urlData)
      });
      
      debugLog("📡", "URL scan server request sent, status:", res.status);
      debugLog("📡", "URL scan response ok:", res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        debugLog("❌", "URL scan server error:", res.status, errorText);
        throw new Error(`URL scan server error: ${res.status} ${res.statusText} - ${errorText}`);
      }
      
      const result = await res.json();
      debugLog("✅", "=== URL SCAN SERVER RESPONSE ===");
      debugLog("✅", "URL scan result:", result);
      
      if (result.risk_score !== undefined && result.risk_level !== undefined) {
        debugLog("💾", "Valid URL scan result, storing...");

        // Cache the result by domain so repeated visits within 5 minutes skip the API
        try {
          const domain = new URL(url).hostname;
          urlScanCache.set(domain, {
            timestamp: Date.now(),
            result: { risk_score: result.risk_score, risk_level: result.risk_level, domain }
          });
          debugLog("💾", "Cached URL scan result for domain:", domain);
        } catch (e) {
          debugLog("⚠️", "Failed to cache scan result:", e);
        }

        const storageData = {
          lastAutoScanResult: {
            type: "url",
            risk_score: result.risk_score,
            risk_level: result.risk_level,
            timestamp: Date.now(),
            url: url,
            tabId: tabId,
            domain: urlData.domain
          }
        };
        
        debugLog("💾", "URL storage data:", storageData);
        
        // Store result for popup to display
        await chrome.storage.local.set(storageData);
        debugLog("💾", "URL scan result stored successfully");
        
        // Update badge for URL scan
        debugLog("🎨", "Updating badge for URL risk level:", result.risk_level);
        updateBadgeForUrlRisk(tabId, result.risk_level);
        
        debugLog("🎉", "=== URL AUTO-SCAN COMPLETED SUCCESSFULLY ===");
        debugLog("🎉", "URL risk level:", result.risk_level, "for domain:", urlData.domain);
      } else {
        debugLog("❌", "Invalid URL scan result - missing risk data");
      }
      
    } catch (error) {
      debugLog("❌", "URL auto-scan failed:", error);
    }
  }, 1000); // Faster for URL scans
  
  debugLog("⏰", "URL auto-scan timeout set - will execute in 1 second");
}

// Updated function to handle all tabs
async function updateAllTabs() {
  debugLog("🔄", "=== UPDATING ALL TABS ===");
  try {
    const tabs = await chrome.tabs.query({});
    debugLog("📊", "Found", tabs.length, "open tabs");
    
    for (const tab of tabs) {
      debugLog("📋", "Processing tab:", tab.id, tab.url);
      
      if (tab.url?.includes("shopee.ph")) {
        const isProductPage = /-i\.\d+\.\d+/.test(tab.url);
        if (isProductPage) {
          debugLog("🛍️", "Product page found, updating badge");
          handleProductPageMessage(tab);
        } else {
          debugLog("🌐", "Non-product Shopee page");
          handleNonProductPageMessage(tab);
        }
      } else if (tab.url?.includes("lazada.com.ph")) {
        const isProductPage = tab.url.includes("/products/") && /-i\d+-s\d+\.html/.test(tab.url);
        if (isProductPage) {
          debugLog("🛒", "Lazada product page found, updating badge");
          handleLazadaProductPageMessage(tab);
        } else {
          debugLog("🌐", "Non-product Lazada page");
          handleNonProductPageMessage(tab);
        }
      } else if (tab.url?.includes("facebook.com/marketplace")) {
        const isListingPage = /\/marketplace\/item\/\d+/.test(tab.url);
        if (isListingPage) {
          debugLog("📘", "Facebook Marketplace listing found, updating badge");
          handleFacebookMarketplacePageMessage(tab);
        } else {
          debugLog("🌐", "Non-listing Facebook Marketplace page");
          handleNonProductPageMessage(tab);
        }
      } else {
        debugLog("🌍", "Universal URL page, setting up URL scanning");
        handleUniversalUrlPageMessage(tab);
      }
    }
  } catch (error) {
    debugLog("❌", "Error updating tabs:", error);
  }
}

function updateBadgeForUrlRisk(tabId, riskLevel) {
  debugLog("🎨", "=== UPDATING BADGE FOR URL RISK ===");
  debugLog("🎨", "Tab ID:", tabId, "Risk Level:", riskLevel);
  
  let badgeColor;
  let badgeText = "URL";
  
  switch(riskLevel) {
    case "High":
      badgeColor = "#ff0060"; // Danger red
      break;
    case "Medium":
      badgeColor = "#f7d060"; // Warning yellow
      break;
    case "Low":
      badgeColor = "#1b9c85"; // Teal success
      break;
    default:
      badgeColor = "#1b9c85"; // Teal
  }
  
  chrome.action.setBadgeText({ text: badgeText, tabId });
  chrome.action.setBadgeBackgroundColor({ color: badgeColor });
  chrome.action.setTitle({
    title: `URL auto-scan complete: ${riskLevel} risk detected. Click to view details.`,
    tabId
  });
  
  debugLog("🎨", "URL badge updated - Text:", badgeText, "Color:", badgeColor);
}

// Enhanced tab handling - detects both new pages AND SPA navigation
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  debugLog("📋", "=== TAB UPDATED EVENT ===");
  debugLog("📋", "Tab ID:", tabId);
  debugLog("📋", "Change info:", changeInfo);
  debugLog("📋", "Tab URL:", tab?.url);
  
  // Only process complete page loads and URL changes
  if (changeInfo.status === "complete" && tab?.url) {
    debugLog("✅", "Page load complete, processing tab:", tabId);
    
    // Determine page type and handle accordingly
    if (tab.url.includes("shopee.ph")) {
      const isProductPage = /-i\.\d+\.\d+/.test(tab.url);
      debugLog("🛍️", "Shopee page detected. Is product page:", isProductPage);
      
      if (isProductPage) {
        handleProductPageMessage(tab);
      } else {
        handleNonProductPageMessage(tab);
      }
    } else if (tab.url.includes("lazada.com.ph")) {
      const isProductPage = tab.url.includes("/products/") && /-i\d+-s\d+\.html/.test(tab.url);
      debugLog("🛒", "Lazada page detected. Is product page:", isProductPage);

      if (isProductPage) {
        handleLazadaProductPageMessage(tab);
      } else {
        handleNonProductPageMessage(tab);
      }
    } else if (tab.url.includes("facebook.com/marketplace")) {
      const isListingPage = /\/marketplace\/item\/\d+/.test(tab.url);
      debugLog("📘", "Facebook Marketplace detected. Is listing:", isListingPage);

      if (isListingPage) {
        handleFacebookMarketplacePageMessage(tab);
      } else {
        handleNonProductPageMessage(tab);
      }
    } else {
      debugLog("🌍", "Non-Shopee page, setting up URL scanning");
      handleUniversalUrlPageMessage(tab);
    }
  }
  
  // Handle URL changes (SPA navigation)
  if (changeInfo.url) {
    debugLog("🔄", "URL changed detected:");
    debugLog("🔄", "Tab ID:", tabId);
    debugLog("🔄", "New URL:", changeInfo.url);
    
    // Clear current auto-scan state for URL changes
    const oldTabUrlKey = `url:${tabId}:`;
    if (currentAutoScanTab?.startsWith(oldTabUrlKey)) {
      debugLog("🧹", "Clearing old auto-scan state for URL change");
      currentAutoScanTab = null;
    }
    
    // Process the new URL
    if (changeInfo.url.includes("shopee.ph")) {
      const isProductPage = /-i\.\d+\.\d+/.test(changeInfo.url);
      debugLog("🛍️", "Shopee URL change. Is product page:", isProductPage);
      
      if (isProductPage) {
        const fakeTab = { id: tabId, url: changeInfo.url };
        handleProductPageMessage(fakeTab);
      } else {
        const fakeTab = { id: tabId, url: changeInfo.url };
        handleNonProductPageMessage(fakeTab);
      }
    } else if (changeInfo.url.includes("lazada.com.ph")) {
      const isProductPage = changeInfo.url.includes("/products/") && /-i\d+-s\d+\.html/.test(changeInfo.url);
      debugLog("🛒", "Lazada URL change. Is product page:", isProductPage);
      const fakeTab = { id: tabId, url: changeInfo.url };
      if (isProductPage) {
        handleLazadaProductPageMessage(fakeTab);
      } else {
        handleNonProductPageMessage(fakeTab);
      }
    } else if (changeInfo.url.includes("facebook.com/marketplace")) {
      const isListingPage = /\/marketplace\/item\/\d+/.test(changeInfo.url);
      debugLog("📘", "Facebook Marketplace URL change. Is listing:", isListingPage);
      const fakeTab = { id: tabId, url: changeInfo.url };
      if (isListingPage) {
        handleFacebookMarketplacePageMessage(fakeTab);
      } else {
        handleNonProductPageMessage(fakeTab);
      }
    } else {
      debugLog("🌍", "Non-Shopee URL change, triggering URL scan");
      const fakeTab = { id: tabId, url: changeInfo.url };
      handleUniversalUrlPageMessage(fakeTab);
    }
  }
});

// Handle SPA navigation (as backup)
chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  debugLog("🧭", "=== HISTORY STATE UPDATED ===");
  debugLog("🧭", "Tab ID:", details.tabId);
  debugLog("🧭", "URL:", details.url);
  debugLog("🧭", "Frame ID:", details.frameId);
  
  // Only handle main frame navigation
  if (details.frameId !== 0) {
    debugLog("⏭️", "Ignoring sub-frame navigation");
    return;
  }
  
  // Clear any existing auto-scan for this tab
  const tabUrlKey = `url:${details.tabId}:`;
  if (currentAutoScanTab?.startsWith(tabUrlKey)) {
    debugLog("🧹", "Clearing auto-scan state for SPA navigation");
    currentAutoScanTab = null;
  }
  
  // Handle the navigation
  if (details.url.includes("shopee.ph")) {
    const isProductPage = /-i\.\d+\.\d+/.test(details.url);
    debugLog("🛍️", "Shopee SPA navigation. Is product page:", isProductPage);
    
    const fakeTab = { id: details.tabId, url: details.url };
    if (isProductPage) {
      handleProductPageMessage(fakeTab);
    } else {
      handleNonProductPageMessage(fakeTab);
    }
  } else if (details.url.includes("lazada.com.ph")) {
    const isProductPage = details.url.includes("/products/") && /-i\d+-s\d+\.html/.test(details.url);
    debugLog("🛒", "Lazada SPA navigation. Is product page:", isProductPage);
    const fakeTab = { id: details.tabId, url: details.url };
    if (isProductPage) {
      handleLazadaProductPageMessage(fakeTab);
    } else {
      handleNonProductPageMessage(fakeTab);
    }
  } else if (details.url.includes("facebook.com/marketplace")) {
    const isListingPage = /\/marketplace\/item\/\d+/.test(details.url);
    debugLog("📘", "Facebook Marketplace SPA navigation. Is listing:", isListingPage);
    const fakeTab = { id: details.tabId, url: details.url };
    if (isListingPage) {
      handleFacebookMarketplacePageMessage(fakeTab);
    } else {
      handleNonProductPageMessage(fakeTab);
    }
  } else {
    debugLog("🌍", "Non-Shopee SPA navigation, triggering URL scan");
    const fakeTab = { id: details.tabId, url: details.url };
    handleUniversalUrlPageMessage(fakeTab);
  }
});

// Clean up tracked tabs when they're closed
chrome.tabs.onRemoved.addListener((tabId) => {
  debugLog("🗑️", "=== TAB CLOSED ===");
  debugLog("🗑️", "Cleaning up tab:", tabId);
  
  trackedTabs.delete(tabId);
  debugLog("💾", "Removed tracked URL for tab:", tabId);
});

// Log when script finishes loading
debugLog("🚀", "=== BACKGROUND SCRIPT FULLY LOADED ===");
debugLog("🚀", "All event listeners registered");
debugLog("🚀", "URL scanning ALWAYS ON");

// Force initial setup after a short delay
setTimeout(async () => {
  debugLog("🔄", "=== INITIAL SETUP TIMEOUT TRIGGERED ===");
  debugLog("🔄", "Calling initializeExtension and updateAllTabs");
  await initializeExtension();
  updateAllTabs();
}, 1000);