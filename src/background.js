// -----------------------------------------------------------------------
// API base URL is defined in config.js (loaded via importScripts).
// Update there before submitting to the Chrome Web Store.
// -----------------------------------------------------------------------
importScripts('config.js', 'shared/storage.js');

let isInitialized = false;
let debugMode = false;

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
  
  if (message.type === "OPEN_POPUP") {
    debugLog("🔓", "Open side panel (via OPEN_POPUP) message received");
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    }
    sendResponse({ received: true, action: "side_panel_opened" });
  }

  if (message.type === "OPEN_SIDE_PANEL") {
    if (sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id }).catch(() => {});
    }
    sendResponse({ received: true, action: "side_panel_opened" });
  }
  
  // Log if unknown message type
  if (!["SURESHOPPH_PRODUCT_PAGE", "SURESHOPPH_NOT_PRODUCT_PAGE", "LAZADA_PRODUCT_PAGE", "LAZADA_NOT_PRODUCT_PAGE", "FACEBOOK_MARKETPLACE_PAGE", "FACEBOOK_NOT_MARKETPLACE_PAGE", "OPEN_POPUP", "OPEN_SIDE_PANEL", "GET_TAB_ID"].includes(message.type)) {
    debugLog("❓", "UNKNOWN MESSAGE TYPE:", message.type);
    sendResponse({ received: true, action: "unknown_message" });
  }
  
  // Always return true to indicate we will send a response
  return true;
});

// Handle universal URL pages (any website) - ALWAYS SCAN
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
    title: "SureShop Scanner - visit a supported product page to scan",
    tabId: tab.id
  });
  
  debugLog("🏁", "=== NON-PRODUCT PAGE HANDLING COMPLETE ===");
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
      }
    }
  } catch (error) {
    debugLog("❌", "Error updating tabs:", error);
  }
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
    }
  }
  
  // Handle URL changes (SPA navigation)
  if (changeInfo.url) {
    debugLog("🔄", "URL changed detected:");
    debugLog("🔄", "Tab ID:", tabId);
    debugLog("🔄", "New URL:", changeInfo.url);
    
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
    }
  }
});

// Clean up tracked tabs when they're closed
chrome.tabs.onRemoved.addListener((tabId) => {
  debugLog("🗑️", "=== TAB CLOSED ===");
  debugLog("🗑️", "Cleaning up tab:", tabId);
});

// Log when script finishes loading
debugLog("🚀", "=== BACKGROUND SCRIPT FULLY LOADED ===");
debugLog("🚀", "All event listeners registered");

// Force initial setup after a short delay
setTimeout(async () => {
  debugLog("🔄", "=== INITIAL SETUP TIMEOUT TRIGGERED ===");
  debugLog("🔄", "Calling initializeExtension and updateAllTabs");
  await initializeExtension();
  updateAllTabs();
}, 1000);
// =====================================================================
// SureShop v0.3 additions: shortcuts, context menu, onboarding, history,
// settings broadcast, badge. Self-contained block to avoid touching
// the existing scan flow.
// =====================================================================
(function ssExtras() {
  const SCAN_PAGE_FLAG = "sureshop_pending_scan";

  // First-install onboarding tab + context-menu setup
  chrome.runtime.onInstalled.addListener(async (details) => {
    try {
      chrome.contextMenus.create({
        id: "sureshop-scan-link",
        title: "Scan link with SureShop",
        contexts: ["link"]
      }, () => void chrome.runtime.lastError);
      chrome.contextMenus.create({
        id: "sureshop-scan-page",
        title: "Scan this page with SureShop",
        contexts: ["page"],
        documentUrlPatterns: [
          "https://*.shopee.ph/*",
          "https://*.lazada.com.ph/*",
          "https://*.facebook.com/marketplace/*"
        ]
      }, () => void chrome.runtime.lastError);
    } catch (_) {}

    if (details && details.reason === "install") {
      try {
        const onboarded = self.SureShopStorage ? await SureShopStorage.isOnboarded() : false;
        if (!onboarded) {
          chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding/onboarding.html") });
        }
      } catch (_) {}
    }
  });

  // Keyboard shortcut: open side panel + queue a scan
  chrome.commands.onCommand.addListener(async (command) => {
    if (command !== "scan-page") return;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      await chrome.storage.local.set({ [SCAN_PAGE_FLAG]: { tabId: tab.id, ts: Date.now() } });
      if (chrome.sidePanel && chrome.sidePanel.open) {
        try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (_) {}
      }
    } catch (_) {}
  });

  // Context menu actions
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "sureshop-scan-link" && info.linkUrl) {
      await chrome.storage.local.set({
        [SCAN_PAGE_FLAG]: { url: info.linkUrl, ts: Date.now() }
      });
      if (tab && chrome.sidePanel && chrome.sidePanel.open) {
        try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (_) {}
      }
    } else if (info.menuItemId === "sureshop-scan-page" && tab) {
      await chrome.storage.local.set({
        [SCAN_PAGE_FLAG]: { tabId: tab.id, ts: Date.now() }
      });
      if (chrome.sidePanel && chrome.sidePanel.open) {
        try { await chrome.sidePanel.open({ tabId: tab.id }); } catch (_) {}
      }
    }
  });

  // History save + settings broadcast (popup-side messages)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return false;

    if (message.type === "SAVE_SCAN_RESULT") {
      (async () => {
        try {
          if (self.SureShopStorage) {
            await SureShopStorage.addHistoryEntry(message.entry);
          }
          if (sender.tab?.id != null && message.entry?.risk_level) {
            updateBadgeForRisk(sender.tab.id, message.entry.risk_level);
          }
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: String(e) });
        }
      })();
      return true;
    }

    if (message.type === "SURESHOP_SETTINGS_CHANGED") {
      // Broadcast to all content scripts so overlays react in real time
      chrome.tabs.query({}, (tabs) => {
        for (const t of tabs) {
          if (!t.id) continue;
          try { chrome.tabs.sendMessage(t.id, { type: "SURESHOP_SETTINGS_CHANGED" }, () => void chrome.runtime.lastError); } catch (_) {}
        }
      });
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  function updateBadgeForRisk(tabId, level) {
    try {
      const map = {
        High:   { text: "!", color: "#e74c3c" },
        Medium: { text: "�", color: "#e67e22" },
        Low:    { text: "?", color: "#1b9c85" }
      };
      const cfg = map[level];
      if (!cfg) return;
      chrome.action.setBadgeText({ tabId, text: cfg.text });
      chrome.action.setBadgeBackgroundColor({ tabId, color: cfg.color });
    } catch (_) {}
  }
})();
