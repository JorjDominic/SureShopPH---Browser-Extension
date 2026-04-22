(() => {
  // ===============================
  // Hard Guard: Lazada only
  // ===============================
  if (!location.hostname.includes("lazada.")) return;

  console.log("ScamGuard content_lazada.js loaded (Lazada)");

  // Lazada product page detection:
  // e.g. https://www.lazada.com.ph/products/name-i123456-s654321.html
  function isProductPage() {
    return location.pathname.includes("/products/") && /-i\d+-s\d+\.html/.test(location.href);
  }

  // ===============================
  // Scan Card UI
  // ===============================
  function showScanCard() {
    if (!isProductPage()) return;
    if (document.getElementById("sureshopph-lazada-scan-card")) return;

    const card = document.createElement("div");
    card.id = "sureshopph-lazada-scan-card";

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

      #sureshopph-lazada-scan-card {
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
        animation: slideInLazadaCard 0.3s ease;
        border-left: 4px solid #f97316;
        overflow: hidden;
      }

      @keyframes slideInLazadaCard {
        from { opacity: 0; transform: translateY(-12px) scale(0.95); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      #sureshopph-lazada-scan-card .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: linear-gradient(135deg, #f97316 0%, #c2410c 100%);
        color: white;
        border-radius: var(--dash-radius) var(--dash-radius) 0 0;
        margin: 0;
      }

      #sureshopph-lazada-scan-card .title-section {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 700;
        color: white;
      }

      #sureshopph-lazada-scan-card .title-section i {
        color: white;
        font-size: 16px;
        opacity: 0.9;
      }

      #sureshopph-lazada-scan-card .body {
        padding: 16px;
        background: white;
      }

      #sureshopph-lazada-scan-card .body p {
        font-size: 13px;
        color: var(--dash-gray);
        margin: 0;
        line-height: 1.4;
        font-weight: 500;
      }

      #sureshopph-lazada-scan-card .close {
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

      #sureshopph-lazada-scan-card .close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      #sureshopph-lazada-scan-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }

      #sureshopph-lazada-scan-card.dismissing {
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
      if (document.getElementById("sureshopph-lazada-scan-card")) {
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

  function normalizeNumber(text) {
    if (!text) return null;
    const match = text.replace(/,/g, "").match(/[\d.]+/);
    return match ? Number(match[0]) : null;
  }

  // ===============================
  // Extractors (Lazada)
  // ===============================

  function extractMainPrice() {
    // Lazada price selectors (multiple strategies)
    const priceSelectors = [
      '[class*="pdp-price_type_normal"]',
      '[class*="pdp-price_color_orange"]',
      '[class*="pdp-price"]',
      ".notranslate",
      '[data-spm*="price"]'
    ];

    for (const selector of priceSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        const match = text && text.match(/[\d,]+(\.\d{2})?/);
        if (match) {
          const price = parseFloat(match[0].replace(/,/g, ""));
          if (price > 0 && price < 10000000) {
            return { value: price, confidence: "high" };
          }
        }
      }
    }

    // Fallback: search page text for currency pattern
    const text = document.body.innerText;
    const match = text.match(/₱\s*([\d,]+(?:\.\d{2})?)/);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ""));
      if (price > 0 && price < 10000000) {
        return { value: price, confidence: "medium" };
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractSoldCount() {
    const text = document.body.innerText;
    // Lazada shows "X Sold" or "X+ Sold"
    const match = text.match(/([\d,]+\+?)\s+Sold/i);
    if (match) return { value: match[1], confidence: "high" };

    // Also try: "X sold in last 30 days" style
    const altMatch = text.match(/([\d,]+)\s+(?:items?\s+)?sold/i);
    return altMatch
      ? { value: altMatch[1], confidence: "medium" }
      : { value: null, confidence: "low" };
  }

  function extractRatings() {
    const text = document.body.innerText;

    // Rating value e.g. "4.7" within a known range
    const ratingSelectors = [
      ".score-average",
      '[class*="rating-average"]',
      '[class*="pdp-review-summary"]'
    ];

    let rating = null;
    for (const sel of ratingSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const val = parseFloat(cleanText(el.textContent));
        if (!isNaN(val) && val >= 0 && val <= 5) {
          rating = { value: val, confidence: "high" };
          break;
        }
      }
    }

    if (!rating) {
      const ratingMatch = text.match(/\b([0-5]\.\d)\b/);
      rating = ratingMatch
        ? { value: Number(ratingMatch[1]), confidence: "medium" }
        : { value: null, confidence: "low" };
    }

    // Review/rating count e.g. "(1,234 Ratings)"
    const countMatch = text.match(/\(?([\d,]+)\s+Ratings?\)?/i);
    const rating_count = countMatch
      ? { value: countMatch[1], confidence: "high" }
      : { value: null, confidence: "low" };

    return { rating, rating_count };
  }

  function extractSellerName() {
    const sellerSelectors = [
      ".seller-name a",
      ".seller-name",
      '[class*="seller-name"]',
      '[class*="pdp-seller"] a',
      '[data-spm*="seller"] span',
      ".pdp-mod-seller-info .info-name"
    ];

    for (const selector of sellerSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 1 && text.length < 100) {
          return { value: text, confidence: "high" };
        }
      }
    }

    // Fallback: text patterns
    const text = document.body.innerText;
    const patterns = [
      /Sold by[:\s]+([^\n]+)/i,
      /Shop[:\s]+([^\n]{2,60})/i,
      /Seller[:\s]+([^\n]{2,60})/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const candidate = cleanText(match[1]);
        if (candidate && candidate.length > 1) {
          return { value: candidate, confidence: "medium" };
        }
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractProfileUrl() {
    const shopLinkSelectors = [
      'a[href*="/shop/"]',
      'a[href*="lazada.com.ph/shop"]',
      '.seller-name a',
      '[class*="seller-info"] a'
    ];

    for (const selector of shopLinkSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const href = el.getAttribute("href");
        if (href) {
          const fullUrl = href.startsWith("http") ? href : `https://www.lazada.com.ph${href}`;
          return { value: fullUrl, confidence: "high" };
        }
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractSellerRating() {
    const text = document.body.innerText;
    // Lazada shows "Positive Seller Ratings X%"
    const match = text.match(/Positive\s+Seller\s+Ratings?\s*([\d.]+%)/i);
    return match
      ? { value: match[1], confidence: "high" }
      : { value: null, confidence: "low" };
  }

  function extractProductImageCount() {
    const images = document.querySelectorAll(
      'img[src*="lazada"], img[data-src*="lazada"], [class*="gallery"] img'
    );
    return { value: images.length, confidence: "medium" };
  }

  // ===============================
  // Main Extraction
  // ===============================
  function extractLazadaData() {
    console.log("Extracting Lazada data...");

    const price = extractMainPrice();
    const sold = extractSoldCount();
    const ratings = extractRatings();
    const sellerName = extractSellerName();
    const profileUrl = extractProfileUrl();
    const sellerRating = extractSellerRating();
    const imageCount = extractProductImageCount();

    return {
      success: true,
      platform: "lazada",
      product_name: cleanText(document.title)
        ? cleanText(document.title).replace(/ \| Lazada.*$/i, "").trim()
        : "Unknown Product",
      price: price.value,
      sold_count: sold.value,
      rating: ratings.rating.value,
      rating_count: ratings.rating_count.value,
      seller_name: sellerName.value,
      profile_url: profileUrl.value,
      seller_rating: sellerRating.value,
      image_count: imageCount.value,
      extracted_at: new Date().toISOString()
    };
  }

  // ===============================
  // Page Detection & Messaging
  // ===============================
  function checkAndShowCard() {
    if (isProductPage()) {
      console.log("Lazada product page detected, showing scan card");
      showScanCard();
    }
  }

  checkAndShowCard();

  chrome.runtime.sendMessage({
    type: isProductPage() ? "LAZADA_PRODUCT_PAGE" : "LAZADA_NOT_PRODUCT_PAGE"
  });

  // ===============================
  // SPA Navigation Detection
  // ===============================
  let lastUrl = location.href;
  let latestData = null;
  let dataStale = true;

  setInterval(() => {
    if (location.href !== lastUrl) {
      console.log("Lazada URL changed (SPA):", lastUrl, "→", location.href);
      lastUrl = location.href;
      dataStale = true;
      checkAndShowCard();

      chrome.runtime.sendMessage({
        type: isProductPage() ? "LAZADA_PRODUCT_PAGE" : "LAZADA_NOT_PRODUCT_PAGE"
      });
    }
  }, 500);

  // ===============================
  // Message Handler
  // ===============================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Lazada content script received message:", message.type);

    if (message.type === "EXTRACT_DATA") {
      console.log("Lazada: handling EXTRACT_DATA");
      const data = extractLazadaData();
      console.log("Lazada extracted data:", data);
      sendResponse(data);
      return true;
    }

    if (message.type === "COLLECT_PAGE_DATA") {
      latestData = extractLazadaData();
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
