(() => {
  // ===============================
  // Hard Guard: Facebook Marketplace only
  // ===============================
  if (!location.hostname.includes("facebook.com")) return;

  // Only activate on Marketplace pages
  if (!location.pathname.startsWith("/marketplace")) return;

  console.log("ScamGuard content_facebook.js loaded (Facebook Marketplace)");

  // Facebook Marketplace listing page detection:
  // e.g. https://www.facebook.com/marketplace/item/1234567890/
  function isListingPage() {
    return /\/marketplace\/item\/\d+/.test(location.pathname);
  }

  // ===============================
  // Scan Card UI
  // ===============================
  function showScanCard() {
    if (!isListingPage()) return;
    if (document.getElementById("sureshopph-fb-scan-card")) return;

    const card = document.createElement("div");
    card.id = "sureshopph-fb-scan-card";

    card.innerHTML = `
      <div class="header">
        <div class="title-section">
          <i class="fas fa-shield-alt"></i>
          <strong>SureShop</strong>
        </div>
        <button class="close">×</button>
      </div>
      <div class="body">
        <p>Scan Is Ready</p>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
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
      }

      #sureshopph-fb-scan-card {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 240px;
        background: white;
        border: 2px solid transparent;
        border-radius: var(--dash-radius);
        padding: 0;
        font-family: 'Poppins', system-ui, sans-serif;
        box-shadow: var(--dash-shadow-lg);
        z-index: 999999;
        animation: slideInFbCard 0.3s ease;
        border-left: 4px solid #1877f2;
        overflow: hidden;
      }

      @keyframes slideInFbCard {
        from { opacity: 0; transform: translateY(-12px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      #sureshopph-fb-scan-card .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #1877f2 0%, #0d5db5 100%);
        color: white;
        border-radius: var(--dash-radius) var(--dash-radius) 0 0;
        margin: 0;
      }

      #sureshopph-fb-scan-card .title-section {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: white;
      }

      #sureshopph-fb-scan-card .title-section i {
        color: white;
        font-size: 16px;
        opacity: 0.9;
      }

      #sureshopph-fb-scan-card .body {
        padding: 16px;
        background: white;
      }

      #sureshopph-fb-scan-card .body p {
        font-size: 13px;
        color: var(--dash-gray);
        margin: 0;
        line-height: 1.4;
        font-weight: 500;
      }

      #sureshopph-fb-scan-card .close {
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

      #sureshopph-fb-scan-card .close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      #sureshopph-fb-scan-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      #sureshopph-fb-scan-card.dismissing {
        opacity: 0;
        transform: translateY(-12px) scale(0.95);
        transition: all 0.25s ease;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(card);

    card.querySelector(".close").onclick = () => {
      card.classList.add("dismissing");
      setTimeout(() => card.remove(), 250);
    };

    setTimeout(() => {
      if (document.getElementById("sureshopph-fb-scan-card")) {
        card.classList.add("dismissing");
        setTimeout(() => card.remove(), 250);
      }
    }, 7000);
  }

  // ===============================
  // Helpers
  // ===============================
  function cleanText(text) {
    return text ? text.replace(/\s+/g, " ").trim() : null;
  }

  // ===============================
  // Extractors (Facebook Marketplace)
  // ===============================

  function extractProductName() {
    // Blocklist of known Facebook UI/nav labels that appear in h1 or og:title
    const isNavLabel = text => /^(marketplace|facebook marketplace|chats?|notifications?|home|watch|groups?|gaming|menu|create|friends?|videos?|memories|saved|events?|pages?|ads manager|messenger|facebook)$/i.test(text);

    // Strip leading notification badge like "(3) " from any candidate text
    const stripBadge = text => text.replace(/^\(\d+\)\s*/, "").trim();

    // Strategy 1: og:title meta tag
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const raw = cleanText(ogTitle.getAttribute("content") || "");
      const text = stripBadge(raw);
      if (text && text.length > 2 && !isNavLabel(text)) {
        return { value: text, confidence: "high" };
      }
    }

    // Strategy 2: page title — "(6) 1998 Honda civic | Facebook Marketplace | Facebook"
    // Strip everything from | onward, then strip the notification badge.
    const titleText = cleanText(document.title);
    if (titleText) {
      const clean = stripBadge(titleText.replace(/\s*[\|\u2013-].*$/i, "").trim());
      if (clean.length > 2 && !isNavLabel(clean)) {
        return { value: clean, confidence: "high" };
      }
    }

    // Strategy 3: h1 scan — skip all nav labels.
    const h1s = [...document.querySelectorAll("h1")];
    for (const h1 of h1s) {
      const raw = cleanText(h1.textContent);
      const text = stripBadge(raw || "");
      if (text && text.length > 2 && text.length < 200 && !isNavLabel(text)) {
        return { value: text, confidence: "medium" };
      }
    }

    return { value: "Unknown Listing", confidence: "low" };
  }

  function extractPrice() {
    const priceRe = /(?:₱|PHP)\s*([\d,]+(?:\.\d{2})?)/i;

    // Strategy 1: og:description — set server-side before page renders.
    // Format on FB Marketplace PH: "PHP183,000 · Used - Good · Antipolo"
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      const content = ogDesc.getAttribute("content") || "";
      if (/\bfree\b/i.test(content.split("·")[0])) return { value: 0, confidence: "high" };
      const match = content.match(priceRe);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        if (price > 0 && price < 100000000) {
          return { value: price, confidence: "high" };
        }
      }
    }

    // Strategy 2: visible text walker.
    // Use getBoundingClientRect to detect truly rendered elements.
    // getComputedStyle misses off-screen / clipped containers; getBoundingClientRect
    // returns width=0, height=0 for those, which we skip.
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (!text) continue;
      if (/\bfree\b/i.test(text) && text.length < 20) {
        return { value: 0, confidence: "high" };
      }
      const match = text.match(priceRe);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        // Ignore tiny amounts (< 50) which are Facebook internal UI elements
        if (price >= 50 && price < 100000000) {
          return { value: price, confidence: "medium" };
        }
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractSellerName() {
    // Strategy 1: look for "Seller information" section specifically.
    // FB Marketplace renders this as a labeled section near the bottom.
    const bodyText = document.body.innerText;
    const sellerSectionMatch = bodyText.match(/Seller\s+information[\s\S]{0,500}?\n([^\n]{2,60})\n/);
    if (sellerSectionMatch) {
      const candidate = cleanText(sellerSectionMatch[1]);
      if (candidate && candidate.length > 1 && !candidate.includes("?") &&
          !/^(seller|information|details|facebook|marketplace|message|joined|active|member)$/i.test(candidate)) {
        return { value: candidate, confidence: "high" };
      }
    }

    // Strategy 2: seller profile links — FB Marketplace uses /marketplace/profile/
    const profileLinks = [...document.querySelectorAll(
      'a[href*="/marketplace/profile/"], a[href*="/user/"], a[href*="/profile.php"]'
    )];
    for (const link of profileLinks) {
      const text = cleanText(link.textContent);
      if (
        text &&
        text.length > 1 &&
        text.length < 60 &&
        !text.includes("?") &&
        !text.includes("!") &&
        !/^(marketplace|facebook|chats?|notifications?|home|messenger|see all|seller details?|seller)$/i.test(text)
      ) {
        return { value: text, confidence: "high" };
      }
    }

    // Strategy 3: aria-labels with seller info
    const sellerElements = [...document.querySelectorAll("[aria-label]")]
      .filter(el => /seller|listed by/i.test(el.getAttribute("aria-label") || ""));
    for (const el of sellerElements) {
      const text = cleanText(el.textContent);
      if (text && text.length > 1 && text.length < 60 && !text.includes("?")) {
        return { value: text, confidence: "high" };
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractSellerProfileUrl() {
    const profileLinks = [...document.querySelectorAll(
      'a[href*="/marketplace/profile/"], a[href*="/user/"], a[href*="/profile.php"]'
    )];
    for (const link of profileLinks) {
      const text = cleanText(link.textContent);
      const href = link.getAttribute("href");
      if (
        href &&
        text &&
        text.length < 60 &&
        !text.includes("?") &&
        !/^(marketplace|facebook|chats?|notifications?|home|messenger|see all|seller details?|seller)$/i.test(text)
      ) {
        try {
          const u = new URL(href.startsWith("http") ? href : `https://www.facebook.com${href}`);
          return { value: `${u.origin}${u.pathname}`, confidence: "high" };
        } catch (e) {
          return { value: href.startsWith("http") ? href : `https://www.facebook.com${href}`, confidence: "high" };
        }
      }
    }
    return { value: null, confidence: "low" };
  }

  function extractCondition() {
    const bodyText = document.body.innerText;
    // Possible condition values on FB Marketplace
    const conditions = ["New", "Used - Like New", "Used - Good", "Used - Fair", "For parts or not working"];
    for (const condition of conditions) {
      if (bodyText.includes(condition)) {
        return { value: condition, confidence: "high" };
      }
    }

    // Fallback pattern
    const match = bodyText.match(/Condition[:\s]+([^\n]{2,40})/i);
    if (match) {
      return { value: cleanText(match[1]), confidence: "medium" };
    }

    return { value: null, confidence: "low" };
  }

  function extractLocation() {
    const bodyText = document.body.innerText;
    const match = bodyText.match(/Location[:\s]+([^\n]{2,80})/i);
    if (match) {
      return { value: cleanText(match[1]), confidence: "medium" };
    }

    // Try aria-label for location
    const locationEls = [...document.querySelectorAll("[aria-label]")]
      .filter(el => /location|listed in/i.test(el.getAttribute("aria-label") || ""));
    for (const el of locationEls) {
      const text = cleanText(el.textContent);
      if (text && text.length > 1 && text.length < 100) {
        return { value: text, confidence: "medium" };
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractListingDate() {
    const bodyText = document.body.innerText;
    // "Listed X days ago" / "Listed about X hours ago" etc.
    const match = bodyText.match(/Listed\s+((?:about\s+)?[\d]+\s+(?:minute|hour|day|week|month|year)s?\s+ago)/i);
    return match
      ? { value: cleanText(match[1]), confidence: "high" }
      : { value: null, confidence: "low" };
  }

  // ===============================
  // Main Extraction
  // ===============================
  function extractFacebookData() {
    console.log("Extracting Facebook Marketplace data...");

    const productName = extractProductName();
    const price = extractPrice();
    const sellerName = extractSellerName();
    const profileUrl = extractSellerProfileUrl();
    const condition = extractCondition();
    const locationInfo = extractLocation();
    const listingDate = extractListingDate();

    return {
      success: true,
      platform: "facebook",
      product_name: productName.value,
      price: price.value,
      seller_name: sellerName.value,
      profile_url: profileUrl.value,
      condition: condition.value,
      location: locationInfo.value,
      listing_date: listingDate.value,
      listing_url: window.location.href,
      extracted_at: new Date().toISOString()
    };
  }

  // ===============================
  // Page Detection & Messaging
  // ===============================
  function checkAndShowCard() {
    if (isListingPage()) {
      console.log("Facebook Marketplace listing detected, showing scan card");
      showScanCard();
    }
  }

  checkAndShowCard();

  chrome.runtime.sendMessage({
    type: isListingPage() ? "FACEBOOK_MARKETPLACE_PAGE" : "FACEBOOK_NOT_MARKETPLACE_PAGE"
  });

  // ===============================
  // SPA Navigation Detection
  // ===============================
  let lastUrl = location.href;
  let latestData = null;
  let dataStale = true;

  setInterval(() => {
    if (location.href !== lastUrl) {
      console.log("Facebook URL changed (SPA):", lastUrl, "→", location.href);
      lastUrl = location.href;
      dataStale = true;

      // Only activate within marketplace section
      if (!location.pathname.startsWith("/marketplace")) return;

      checkAndShowCard();
      chrome.runtime.sendMessage({
        type: isListingPage() ? "FACEBOOK_MARKETPLACE_PAGE" : "FACEBOOK_NOT_MARKETPLACE_PAGE"
      });
    }
  }, 500);

  // ===============================
  // Message Handler
  // ===============================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Facebook content script received message:", message.type);

    if (message.type === "EXTRACT_DATA") {
      console.log("Facebook: handling EXTRACT_DATA");
      const data = extractFacebookData();
      console.log("Facebook extracted data:", data);
      sendResponse(data);
      return true;
    }

    if (message.type === "COLLECT_PAGE_DATA") {
      latestData = extractFacebookData();
      dataStale = false;
      sendResponse(latestData);
      return true;
    }

    if (message.type === "GET_CURRENT_DATA") {
      sendResponse({ stale: dataStale, data: latestData });
      return true;
    }

    return false;
  });
})();
