(() => {
  // ===============================
  // Hard Guard: Shopee only
  // ===============================
  if (!location.hostname.includes("shopee.")) return;

  const DEBUG = false;
  const dbg = (...a) => { if (DEBUG) console.log(...a); };
  const dbgErr = (...a) => { if (DEBUG) console.error(...a); };
  dbg("ScamGuard content.js loaded (Shopee)");

  // ===============================
  // API Base — SURESHOP_API_BASE is provided by config.js
  // (listed first in manifest.json content_scripts).
  // ===============================

function showScanCard() {
  if (!/-i\.\d+\.\d+/.test(location.href)) return;
  if (document.getElementById("sureshopph-scan-card")) return;

  const card = document.createElement("div");
  card.id = "sureshopph-scan-card";

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
      <div class="ready-state">
        <div class="ready-status-badge">
          <i class="fas fa-check-circle"></i> Ready to Scan
        </div>
        <div class="ready-badge">
          <i class="fas fa-shield-alt"></i>
        </div>
        <div class="ready-title">Product Detected</div>
        <div class="ready-desc">Open the SureShop extension to analyze this listing</div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    #sureshopph-scan-card {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 260px;
      background: #f6f6f9;
      border-radius: 2rem;
      padding: 0;
      font-family: 'Poppins', system-ui, sans-serif;
      box-shadow: 0 2rem 3rem rgba(27, 156, 133, 0.18);
      z-index: 999999;
      animation: slideInCard 0.3s ease;
      border-left: 4px solid #1b9c85;
      overflow: hidden;
    }

    @keyframes slideInCard {
      from { opacity: 0; transform: translateY(-12px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    #sureshopph-scan-card .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 16px;
      background: linear-gradient(135deg, #1b9c85 0%, #138a73 100%);
      color: #fff;
      border-radius: 2rem 2rem 0 0;
      margin: 0;
      position: relative;
      overflow: hidden;
    }

    #sureshopph-scan-card .header::before {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(45deg, rgba(255,255,255,0.12) 0%, transparent 60%);
      pointer-events: none;
    }

    #sureshopph-scan-card .title-section {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    #sureshopph-scan-card .title-section i {
      color: #fff;
      font-size: 18px;
      opacity: 0.95;
    }

    #sureshopph-scan-card .title-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    #sureshopph-scan-card .title-text strong {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      line-height: 1.1;
    }

    #sureshopph-scan-card .card-subtitle {
      font-size: 10px;
      color: rgba(255,255,255,0.85);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 400;
      line-height: 1;
    }

    #sureshopph-scan-card .body {
      padding: 16px;
      background: #f6f6f9;
      text-align: center;
    }

    #sureshopph-scan-card .ready-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    #sureshopph-scan-card .ready-status-badge {
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
      gap: 5px;
    }

    #sureshopph-scan-card .ready-badge {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(27, 156, 133, 0.12);
      border: 3px solid #1b9c85;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1b9c85;
      font-size: 20px;
      margin: 4px auto;
      animation: readyPulse 2.5s ease-in-out infinite;
    }

    @keyframes readyPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(27, 156, 133, 0.35); }
      50%       { box-shadow: 0 0 0 8px rgba(27, 156, 133, 0); }
    }

    #sureshopph-scan-card .ready-title {
      font-size: 13px;
      font-weight: 700;
      color: #363949;
    }

    #sureshopph-scan-card .ready-desc {
      font-size: 11px;
      color: #677483;
      line-height: 1.5;
    }

    #sureshopph-scan-card .close {
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

    #sureshopph-scan-card .close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    #sureshopph-scan-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 2.5rem 4rem rgba(27, 156, 133, 0.25);
    }

    #sureshopph-scan-card.dismissing {
      opacity: 0;
      transform: translateY(-12px) scale(0.95);
      transition: all 0.25s ease;
    }
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
    card.classList.add("dismissing");
    setTimeout(() => card.remove(), 250);
  };

  // Auto-dismiss after 7 seconds with smooth animation
  setTimeout(() => {
    if (document.getElementById("sureshopph-scan-card")) {
      card.classList.add("dismissing");
      setTimeout(() => card.remove(), 250);
    }
  }, 7000);
}

  // Function to check and show card when needed
  function checkAndShowCard() {
    const isProductPage = /-i\.\d+\.\d+/.test(location.href);
    if (isProductPage) {
      dbg("Product page detected, showing scan card");
      showScanCard();
    }
  }

  // Show card on initial page load
  checkAndShowCard();

  // Send initial message
  const isProductPage = /-i\.\d+\.\d+/.test(location.href);
  chrome.runtime.sendMessage({
    type: isProductPage ? "SURESHOPPH_PRODUCT_PAGE" : "SURESHOPPH_NOT_PRODUCT_PAGE"
  });

  // ===============================
  // SPA Navigation Detection
  // ===============================
  let lastUrl = location.href;
  let latestData = null;
  let dataStale = true;

  // ===============================
  // Progressive Review Collection State
  // ===============================
  let progressiveReviews = [];      // all reviews harvested across pages
  let seenReviewKeys = new Set();   // dedup by username|date|text-prefix
  let reviewMutationObserver = null;
  let progressiveActive = false;
  let progressiveScanData = null;   // product data payload used for resends
  let progressiveDebounceTimer = null;
  let lastKnownCmtidSet = new Set(); // actual cmtid attr values visible in DOM
  let lastProgressiveScore = null;   // most recent score returned by backend
  let lastProgressiveLevel = null;   // most recent level returned by backend
  let lastProgressiveResult = null;  // most recent full /analyze/deep result

  setInterval(() => {
    if (location.href !== lastUrl) {
      dbg("URL changed (SPA):", lastUrl, "→", location.href);
      lastUrl = location.href;
      dataStale = true;
      // Reset progressive collection — new product page, fresh slate (no stopped card)
      stopProgressiveCollection(false);
      progressiveReviews = [];
      seenReviewKeys = new Set();
      progressiveScanData = null;
      lastKnownCmtidSet = new Set();
      lastProgressiveScore = null;
      lastProgressiveLevel = null;
      lastProgressiveResult = null;
      checkAndShowCard();
      
      const isProductPage = /-i\.\d+\.\d+/.test(location.href);
      chrome.runtime.sendMessage({
        type: isProductPage ? "SURESHOPPH_PRODUCT_PAGE" : "SURESHOPPH_NOT_PRODUCT_PAGE"
      });
    }
  }, 500);

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
  // Extractors (Shopee-Correct)
  // ===============================

  function extractMainPrice() {
    const candidates = [...document.body.querySelectorAll("*")]
      .map(el => el.textContent)
      .filter(t => t && t.includes("₱"));

    for (const t of candidates) {
      const match = t.match(/₱([\d,.]+)/);
      if (match) {
        const price = parseFloat(match[1].replace(/,/g, ""));
        if (price > 10 && price < 1000000) {
          return { value: price, confidence: "high" };
        }
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractSoldCount() {
    const text = document.body.innerText;
    const match = text.match(/(\d+(\.\d+)?K?\+?)\s+Sold/i);
    if (match) return { value: match[1], confidence: "high" };
    // Explicit "0 Sold" that may render as a separate element
    if (/\b0\s+Sold\b/i.test(text)) return { value: "0", confidence: "high" };
    return { value: null, confidence: "low" };
  }

  // ⭐ Rating + number of ratings
  function extractRatings() {
    const text = document.body.innerText;

    // No ratings yet — treat as 0 / 0
    if (/no\s+ratings?\s+yet/i.test(text)) {
      return {
        rating:       { value: 0, confidence: "high" },
        rating_count: { value: 0, confidence: "high" }
      };
    }

    const ratingMatch = text.match(/\b([0-5]\.\d)\b/);
    const countMatch  = text.match(/\b([\d,.]+K?)\s+Ratings?\b/i);

    return {
      rating: ratingMatch
        ? { value: Number(ratingMatch[1]), confidence: "high" }
        : { value: null, confidence: "low" },
      rating_count: countMatch
        ? { value: countMatch[1], confidence: "high" }
        : { value: null, confidence: "low" }
    };
  }

  // 🟠 Response rate (e.g. 78%)
  function extractResponseRate() {
    const text = document.body.innerText;

    // Look for "Response Rate" first
    const index = text.toLowerCase().indexOf("response rate");
    if (index === -1) {
      return { value: null, confidence: "low" };
    }

    // Look at nearby text (next 50 chars)
    const nearby = text.slice(index, index + 50);

    const match = nearby.match(/(\d{1,3})%/);
    return match
      ? {
          value: Number(match[1]),
          confidence: "high"
        }
      : {
          value: null,
          confidence: "low"
        };
  }

  // 🕒 Shop age (e.g. 9 years ago, 3 months ago)
  function extractShopAge() {
    const match = document.body.innerText.match(
      /\b(\d+)\s+(year|years|month|months|day|days)\s+ago\b/i
    );

    return match
      ? {
          value: `${match[1]} ${match[2]} ago`,
          confidence: "high"
        }
      : {
          value: null,
          confidence: "low"
        };
  }

  function extractSellerName() {
    const bodyText = document.body.innerText;

    // Strategy 1: Find "Chat Now" in the page text; the shop name is the
    // last meaningful line immediately before it in the seller block.
    const chatIdx = bodyText.search(/\bChat\s+Now\b/i);
    if (chatIdx !== -1) {
      const zone = bodyText.slice(Math.max(0, chatIdx - 400), chatIdx);
      const skipLine = /^(shopee\s*mall|official\s*store badge|chat\s*now|more\s*sellers|follow|ratings?|reviews?|sold|vouchers?|free\s*shipping|active\s+\w|online|last\s+active|\d)/i;
      const lines = zone.split('\n')
        .map(l => l.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        const candidate = lines[i];
        if (!skipLine.test(candidate) && isValidShopName(candidate) &&
            candidate.length >= 3 && candidate.length <= 80) {
          return { value: candidate, confidence: 'high' };
        }
      }
    }

    // Strategy 2: direct shop link — text or title attribute
    for (const a of document.querySelectorAll('a[href*="/shop/"]')) {
      const href = a.getAttribute('href') || '';
      if (/\/(product|category|search|mall|login|cart|orders|promo|flash|voucher|discovery)/i.test(href)) continue;
      const text = cleanText(a.textContent);
      if (text && isValidShopName(text) && text.length > 3) return { value: text, confidence: 'high' };
      const title = cleanText(a.getAttribute('title') || '');
      if (title && isValidShopName(title) && title.length > 3) return { value: title, confidence: 'high' };
    }

    // Strategy 3: semantic CSS selectors (may work on older Shopee layouts)
    const sellerSelectors = [
      '.seller-info .seller-name', '.shop-info .shop-name',
      '.seller-name', '.shop-name',
      '[data-testid*="seller"] span', '[data-testid*="shop"] span'
    ];
    for (const selector of sellerSelectors) {
      for (const el of document.querySelectorAll(selector)) {
        const text = cleanText(el.textContent);
        if (text && isValidShopName(text)) return { value: text, confidence: 'high' };
      }
    }

    // Strategy 4: labelled text patterns (avoid "by Shopee" / "shipped by Shopee")
    for (const pattern of [/^Shop:\s*(.+)$/im, /^Seller:\s*(.+)$/im, /^Store:\s*(.+)$/im]) {
      const match = bodyText.match(pattern);
      if (match) {
        const candidate = cleanText(match[1]);
        if (candidate && isValidShopName(candidate)) return { value: candidate, confidence: 'medium' };
      }
    }

    return { value: null, confidence: 'low' };
  }

  function extractProfileUrl() {
    // Look for shop/seller profile URLs
    const profileSelectors = [
      'a[href*="/shop/"]',
      'a[href*="/seller/"]', 
      'a[href*="shopee.ph/shop"]',
      'a[title*="shop" i]',
      'a[title*="seller" i]'
    ];

    for (const selector of profileSelectors) {
      const links = document.querySelectorAll(selector);
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && (href.includes('/shop/') || href.includes('/seller/'))) {
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `https://shopee.ph${href}`;
          }
          return { value: fullUrl, confidence: "high" };
        }
      }
    }

    // Look for links with shop-related text
    const shopLinks = [...document.querySelectorAll('a')]
      .filter(link => {
        const text = link.textContent.toLowerCase();
        const title = (link.getAttribute('title') || '').toLowerCase();
        return text.includes('shop') || text.includes('seller') || 
               title.includes('shop') || title.includes('seller');
      });

    for (const link of shopLinks) {
      const href = link.getAttribute('href');
      if (href && href.includes('shopee.ph')) {
        return { value: href, confidence: "medium" };
      }
    }

    return { value: null, confidence: "low" };
  }

  function isValidShopName(name) {
    if (!name || name.length < 2) return false;
    const invalidNames = [
      'shop', 'seller', 'visit', 'profile', 'page', 'store',
      'home', 'back', 'next', 'prev', 'more', 'less', 'view',
      'click', 'here', 'link', 'button', 'menu', 'nav', 'footer',
      'shopee', 'lazada', 'facebook', 'marketplace'  // platform names are not seller names
    ];
    return !invalidNames.includes(name.toLowerCase()) &&
           !/^\d+$/.test(name) &&
           name.length <= 80;
  }

  function extractProductImageCount() {
    const images = document.querySelectorAll('img[src*="shopee"], img[data-src*="shopee"]');
    return { value: images.length, confidence: "medium" };
  }

  // ===============================
  // Reviews / Comments Extractor
  // ===============================
  function extractReviews(maxReviews = 10) {
    const reviews = [];

    // Strategy 1: Shopee's stable DOM structure.
    // Each review is a [data-cmtid] container with:
    //   - username: <a href="/shop/..."> inside .d72He7
    //   - stars: SVG elements with class "icon-rating-solid" (filled only)
    //   - date+variant: leaf text matching YYYY-MM-DD HH:MM pattern
    //   - review text: longest non-metadata text leaf
    const reviewContainers = [...document.querySelectorAll('[data-cmtid]')];

    if (reviewContainers.length > 0) {
      for (const container of reviewContainers.slice(0, maxReviews)) {
        // Username — try any anchor that looks like a profile link first,
        // then fall back to scanning all elements for short username-shaped text.
        const userLink = container.querySelector(
          'a[href*="/shop/"], a[href*="/user/"], a[href*="/profile/"], a[href*="/buyer/"]'
        );
        const username = (() => {
          if (userLink) {
            const t = cleanText(userLink.textContent);
            if (t && t.length >= 2) return t;
          }
          // Fall back: first element whose full textContent is short,
          // single-token (or short phrase), and not metadata.
          const allEls = [...container.querySelectorAll('*')];
          const candidate = allEls.find(el => {
            const t = cleanText(el.textContent);
            return t && t.length >= 2 && t.length <= 40 &&
              !t.includes('\n') &&
              !/\d{4}-\d{2}-\d{2}/.test(t) &&
              !/^[\u20b1$\u20ac\u00a3]/.test(t) &&
              !/^\d+\s*(sold|star|rating)/i.test(t) &&
              !/^(helpful|like|reply|report|see more|seller|variation|product)/i.test(t);
          });
          return candidate ? cleanText(candidate.textContent) : "Anonymous";
        })();

        // Stars — count filled star SVGs (stable class "icon-rating-solid")
        const filledStars = Math.min(
          container.querySelectorAll('[class*="icon-rating-solid"]').length,
          5
        );

        // Date + variant line
        const allLeaves = [...container.querySelectorAll('*')]
          .filter(el => el.childElementCount === 0);

        const dateLine = allLeaves.find(el =>
          /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(el.textContent.trim())
        );
        const dateText = dateLine ? cleanText(dateLine.textContent) : null;
        const datePart = dateText ? dateText.split("|")[0].trim() : null;
        const variantMatch = dateText ? dateText.match(/\|\s*Variation:\s*(.+)/i) : null;
        const variant = variantMatch ? cleanText(variantMatch[1]) : null;

        // Review text — longest leaf that isn't username, date, or metadata.
        // Truncate at the "Seller's Response" label so seller reply text is excluded.
        const sellerResponseIdx = allLeaves.findIndex(el =>
          /^seller'?s?\s+response/i.test(el.textContent.trim())
        );
        const buyerLeaves = sellerResponseIdx !== -1
          ? allLeaves.slice(0, sellerResponseIdx)
          : allLeaves;

        const text = buyerLeaves
          .map(el => cleanText(el.textContent))
          .filter(t =>
            t &&
            t.length > 5 &&
            t !== username &&
            !/^\d{4}-\d{2}-\d{2}/.test(t) &&
            !/^[₱$€£]/.test(t) &&
            !/^\d+\s*(sold|star|rating)/i.test(t) &&
            !/^(helpful|like|reply|report|see more)/i.test(t) &&
            // Skip bare username tokens — real review text has a space, punctuation, or is long
            (t.includes(' ') || /[^a-zA-Z0-9_*.]/.test(t) || t.length >= 20)
          )
          .sort((a, b) => b.length - a.length)[0] || null;

        const reviewText = text || "(No written review)";

        if (username || filledStars) {
          reviews.push({
            username: username || "Anonymous",
            rating_stars: filledStars || null,
            text: reviewText,
            date: datePart || null,
            variant
          });
        }
      }

      if (reviews.length > 0) return { value: reviews, confidence: "high" };
    }

    // Strategy 2: innerText parsing using date lines as anchors (fallback).
    const bodyText = document.body.innerText;
    const ratingsIdx = bodyText.search(/Product Ratings/i);
    if (ratingsIdx !== -1) {
      const section = bodyText.slice(ratingsIdx, ratingsIdx + 12000);
      const lines = section.split("\n").map(l => l.trim()).filter(Boolean);

      for (let i = 0; i < lines.length && reviews.length < maxReviews; i++) {
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(lines[i])) continue;

        const datePart = lines[i].split("|")[0].trim();
        const variantMatch = lines[i].match(/\|\s*Variation:\s*(.+)/i);
        const variant = variantMatch ? cleanText(variantMatch[1]) : null;

        const username = i > 0 ? cleanText(lines[i - 1]) : null;
        if (!username ||
            /^\d{4}-\d{2}-\d{2}/.test(username) ||
            /^[₱$€£]/.test(username) ||
            !/[a-zA-Z0-9*]/.test(username)) continue;

        const textLines = [];
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          if (/^\d{4}-\d{2}-\d{2}/.test(lines[j])) break;
          if (/^seller'?s?\s+response/i.test(lines[j])) break;
          if (/^[₱$€£]/.test(lines[j])) continue;
          if (/^\d+\s*(sold|star|rating)/i.test(lines[j])) continue;
          textLines.push(lines[j]);
        }

        const text = textLines.join(" ").trim();
        if (text && text.length > 3) {
          reviews.push({ username, rating_stars: null, text, date: datePart, variant });
        }
      }
    }

    return { value: reviews, confidence: reviews.length > 0 ? "medium" : "low" };
  }

  // ===============================
  // Progressive Review Collection
  // ===============================

  /** Stable key for deduplication */
  function makeReviewKey(r) {
    return `${r.username || ""}|${r.date || ""}|${(r.text || "").slice(0, 60)}`;
  }

  /**
   * Scan all currently visible [data-cmtid] containers and return only the
   * ones not yet in seenReviewKeys (updates the set as a side-effect).
   */
  function harvestNewReviews() {
    const newReviews = [];
    for (const container of document.querySelectorAll("[data-cmtid]")) {
      const allLeaves = [...container.querySelectorAll("*")]
        .filter(el => el.childElementCount === 0);

      // Username — try any anchor that looks like a profile link first,
      // then fall back to scanning all elements for short username-shaped text.
      const userLink = container.querySelector(
        'a[href*="/shop/"], a[href*="/user/"], a[href*="/profile/"], a[href*="/buyer/"]'
      );
      const username = (() => {
        if (userLink) {
          const t = cleanText(userLink.textContent);
          if (t && t.length >= 2) return t;
        }
        // Fall back: first element whose full textContent is short,
        // single-token (or short phrase), and not metadata.
        const allEls = [...container.querySelectorAll('*')];
        const candidate = allEls.find(el => {
          const t = cleanText(el.textContent);
          return t && t.length >= 2 && t.length <= 40 &&
            !t.includes('\n') &&
            !/\d{4}-\d{2}-\d{2}/.test(t) &&
            !/^[\u20b1$\u20ac\u00a3]/.test(t) &&
            !/^\d+\s*(sold|star|rating)/i.test(t) &&
            !/^(helpful|like|reply|report|see more|seller|variation|product)/i.test(t);
        });
        return candidate ? cleanText(candidate.textContent) : "Anonymous";
      })();

      const filledStars = Math.min(
        container.querySelectorAll('[class*="icon-rating-solid"]').length, 5
      );

      const dateLine = allLeaves.find(el =>
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(el.textContent.trim())
      );
      const dateText = dateLine ? cleanText(dateLine.textContent) : null;
      const datePart = dateText ? dateText.split("|")[0].trim() : null;
      const variantMatch = dateText ? dateText.match(/\|\s*Variation:\s*(.+)/i) : null;
      const variant = variantMatch ? cleanText(variantMatch[1]) : null;

      // Truncate leaves at the "Seller's Response" label so seller reply text is excluded.
      const sellerResponseIdx = allLeaves.findIndex(el =>
        /^seller'?s?\s+response/i.test(el.textContent.trim())
      );
      const buyerLeaves = sellerResponseIdx !== -1
        ? allLeaves.slice(0, sellerResponseIdx)
        : allLeaves;

      const text = buyerLeaves
        .map(el => cleanText(el.textContent))
        .filter(t =>
          t && t.length > 5 && t !== username &&
          !/^\d{4}-\d{2}-\d{2}/.test(t) &&
          !/^[₱$€£]/.test(t) &&
          !/^\d+\s*(sold|star|rating)/i.test(t) &&
          !/^(helpful|like|reply|report|see more)/i.test(t) &&
          // Skip bare username tokens — real review text has a space, punctuation, or is long
          (t.includes(' ') || /[^a-zA-Z0-9_*.]/.test(t) || t.length >= 20)
        )
        .sort((a, b) => b.length - a.length)[0] || null;

      const reviewText = text || "(No written review)";

      const review = { username, rating_stars: filledStars || null, text: reviewText, date: datePart, variant };
      const key = makeReviewKey(review);
      if (!seenReviewKeys.has(key)) {
        seenReviewKeys.add(key);
        newReviews.push(review);
      }
    }
    return newReviews;
  }

  /** Ensure the scan card is visible, recreating it if dismissed */
  function ensureScanCard() {
    if (!document.getElementById("sureshopph-scan-card")) showScanCard();
  }

  /** Notify the side panel that progressive collection stopped */
  function notifyPopupStopped() {
    chrome.runtime.sendMessage({
      type: "SHOPEE_PROGRESSIVE_STOPPED",
      reviews: progressiveReviews,
      risk_score: lastProgressiveScore,
      risk_level: lastProgressiveLevel,
      result: lastProgressiveResult
    }).catch(() => {});
  }

  /** Notify the side panel that progressive collection (re)started */
  function notifyPopupRestarted() {
    chrome.runtime.sendMessage({ type: "SHOPEE_PROGRESSIVE_RESTARTED" }).catch(() => {});
  }

  /**
   * Update the overlay to "actively scanning" state.
   * score/level may be null on the first call before any backend response.
   */
  function setCardScanningState(score, level, reviewCount) {
    ensureScanCard();
    const card = document.getElementById("sureshopph-scan-card");
    if (!card) return;

    // Cancel the auto-dismiss started by showScanCard
    card._noAutoDismiss = true;

    const colorMap = { Low: "#1b9c85", Medium: "#e67e22", High: "#e74c3c" };
    const color = (score !== null && level) ? (colorMap[level] || "#677483") : "#1b9c85";
    const scoreHtml = (score !== null && level)
      ? `<div style="font-size:11px;color:${color};font-weight:600;">${level} Risk · ${score}/100</div>`
      : "";

    card.querySelector(".body").innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:#1b9c85;text-transform:uppercase;
                    letter-spacing:.5px;background:rgba(27,156,133,.12);border:1px solid rgba(27,156,133,.25);
                    border-radius:.4rem;padding:5px 10px;display:inline-flex;align-items:center;gap:5px;">
          <i class="fas fa-circle-notch fa-spin"></i> Scanning Comments...
        </div>
        <div style="font-size:11px;color:#677483;">${reviewCount} review${reviewCount !== 1 ? "s" : ""} collected</div>
        ${scoreHtml}
        <button id="sureshop-stop-btn"
          style="margin-top:4px;padding:6px 16px;border:none;border-radius:.5rem;
                 background:#e74c3c;color:#fff;font-size:11px;font-weight:700;
                 cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit;">
          <i class="fas fa-stop"></i> Stop
        </button>
      </div>`;

    card.querySelector("#sureshop-stop-btn").onclick = () => {
      stopProgressiveCollection(true);
    };
  }

  /**
   * Update the overlay to "stopped / final score" state.
   */
  function setCardStoppedState(score, level, reviewCount) {
    ensureScanCard();
    const card = document.getElementById("sureshopph-scan-card");
    if (!card) return;

    const colorMap = { Low: "#1b9c85", Medium: "#e67e22", High: "#e74c3c" };
    const color = (level && colorMap[level]) || "#677483";
    const scoreLabel = (score !== null && level)
      ? `${level.toUpperCase()} RISK · ${score}/100`
      : "Score pending";

    card.querySelector(".body").innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;
                    letter-spacing:.5px;background:${color}1a;border:1px solid ${color}40;
                    border-radius:.4rem;padding:5px 10px;display:inline-flex;align-items:center;gap:5px;">
          <i class="fas fa-lock"></i> Final Score
        </div>
        <div style="font-size:13px;font-weight:700;color:${color};">${scoreLabel}</div>
        <div style="font-size:11px;color:#677483;">Based on ${reviewCount} review${reviewCount !== 1 ? "s" : ""}</div>
        <button id="sureshop-restart-btn"
          style="margin-top:4px;padding:6px 16px;border:none;border-radius:.5rem;
                 background:#1b9c85;color:#fff;font-size:11px;font-weight:700;
                 cursor:pointer;display:inline-flex;align-items:center;gap:5px;font-family:inherit;">
          <i class="fas fa-redo"></i> Restart Scan
        </button>
      </div>`;

    card.querySelector("#sureshop-restart-btn").onclick = () => {
      if (progressiveScanData) {
        startProgressiveCollection(progressiveScanData);
        notifyPopupRestarted();
      }
    };
  }

  /** Re-call backend with full accumulated review list and update UI */
  async function sendProgressiveUpdate() {
    if (!progressiveScanData) return;

    const { accessToken } = await chrome.storage.local.get("accessToken");
    if (!accessToken) return;

    try {
      const payload = {
        listing: progressiveScanData,
        comments: {
          platform: progressiveScanData.platform || "shopee",
          comments: (progressiveReviews || []).map(r => ({
            text: r.text || r.comment || "",
            date: r.date || null,
            rating_stars: r.rating_stars ?? r.rating ?? null
          })),
          page_number: 1,
          total_pages: 1
        }
      };
      const res = await fetch(`${SURESHOP_API_BASE}/analyze/deep`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return;

      const result = await res.json();
      // /analyze/deep returns combined_risk_score/level; fall back to flat keys
      const riskScore = result.combined_risk_score ?? result.risk_score;
      const riskLevel = result.combined_risk_level ?? result.risk_level;
      if (riskScore === undefined) return;

      // Store latest score/level and update the on-page overlay
      lastProgressiveScore = riskScore;
      lastProgressiveLevel = riskLevel;
      lastProgressiveResult = result;
      setCardScanningState(riskScore, riskLevel, progressiveReviews.length);

      // Persist for popup
      await chrome.storage.local.set({
        lastAutoScanResult: {
          type: "product",
          risk_score: riskScore,
          risk_level: riskLevel,
          description: progressiveScanData.description || null,
          timestamp: Date.now(),
          url: location.href
        }
      });

      // Notify popup if it is currently open
      chrome.runtime.sendMessage({
        type: "SHOPEE_SCAN_UPDATED",
        risk_score: riskScore,
        risk_level: riskLevel,
        reviews: progressiveReviews
      }).catch(() => { /* popup may not be open */ });

    } catch (e) {
      dbgErr("[SureShop] Progressive scan update failed:", e.message);
    }
  }

  /** Debounced MutationObserver callback — fires when the visible [data-cmtid] set changes */
  function onReviewDomChange() {
    if (!progressiveActive) return;
    // Quickly bail if nothing cmtid-related changed yet (avoids expensive work on every mutation)
    clearTimeout(progressiveDebounceTimer);
    progressiveDebounceTimer = setTimeout(() => {
      const currentCmtids = new Set(
        [...document.querySelectorAll("[data-cmtid]")]
          .map(el => el.getAttribute("data-cmtid"))
      );
      // Changed = different size OR any id that wasn't there before
      // This catches page-replacement (same count, different ids) as well as appends
      const hasChanged =
        currentCmtids.size !== lastKnownCmtidSet.size ||
        [...currentCmtids].some(id => !lastKnownCmtidSet.has(id));
      if (!hasChanged) return;
      lastKnownCmtidSet = currentCmtids;

      const newOnes = harvestNewReviews();
      if (newOnes.length > 0) {
        progressiveReviews.push(...newOnes);
        dbg(
          `[SureShop] Progressive: +${newOnes.length} reviews (total: ${progressiveReviews.length})`
        );
        sendProgressiveUpdate();
      }
    }, 800);
  }

  /** Start watching for new review pages the user navigates to */
  function startProgressiveCollection(scanData) {
    stopProgressiveCollection(false); // silent cleanup of any previous session

    progressiveReviews = [];
    seenReviewKeys = new Set();
    lastKnownCmtidSet = new Set();
    lastProgressiveScore = null;
    lastProgressiveLevel = null;
    lastProgressiveResult = null;
    progressiveScanData = scanData;
    progressiveActive = true;

    // Harvest reviews already visible on the current page
    const initial = harvestNewReviews();
    progressiveReviews.push(...initial);
    // Snapshot the cmtid attribute values currently in the DOM
    lastKnownCmtidSet = new Set(
      [...document.querySelectorAll("[data-cmtid]")]
        .map(el => el.getAttribute("data-cmtid"))
    );
    dbg(`[SureShop] Progressive collection started. Initial reviews: ${progressiveReviews.length}`);

    // Always observe body — pagination controls live outside the ratings section
    reviewMutationObserver = new MutationObserver(onReviewDomChange);
    reviewMutationObserver.observe(document.body, { childList: true, subtree: true });

    // Show "Scanning Comments..." state on the overlay immediately
    setCardScanningState(null, null, progressiveReviews.length);
  }

  /**
   * Stop the MutationObserver.
   * showCard=true (default): update overlay to final/stopped state and notify popup.
   * showCard=false: silent stop used for SPA navigation and internal resets.
   */
  async function stopProgressiveCollection(showCard = true) {
    const wasActive = progressiveActive;
    progressiveActive = false;
    if (reviewMutationObserver) {
      reviewMutationObserver.disconnect();
      reviewMutationObserver = null;
    }
    clearTimeout(progressiveDebounceTimer);
    if (showCard && wasActive) {
      if (!lastProgressiveResult) {
        await sendProgressiveUpdate();
      }
      setCardStoppedState(lastProgressiveScore, lastProgressiveLevel, progressiveReviews.length);
      notifyPopupStopped();
    }
  }

  function parseReviewContainer(container) {
    // Extract username
    const usernameEl = container.querySelector(
      '[class*="username"], [class*="user-name"], [class*="buyer"], [class*="author"]'
    );
    const username = usernameEl ? cleanText(usernameEl.textContent) : null;

    // Reject if username looks like a price (₱, PHP, $) — these are product cards, not reviews
    if (username && /^[₱$€£]|^PHP\s*[\d,]/i.test(username)) return null;

    // Count filled stars, capped at 5
    const filledStars = Math.min(
      container.querySelectorAll(
        '[class*="star--on"], [class*="star-fill"], [class*="star_on"], svg[class*="star"]'
      ).length,
      5
    );
    const starCount = filledStars > 0 ? filledStars : null;

    // Review text — longest text node that isn't metadata
    const textEl = container.querySelector(
      '[class*="description"], [class*="content"], [class*="comment-text"], [class*="review-text"]'
    );
    const text = textEl
      ? cleanText(textEl.textContent)
      : (() => {
          const candidates = [...container.querySelectorAll('*')]
            .filter(el => el.childElementCount === 0 && el.textContent.trim().length > 10)
            .map(el => cleanText(el.textContent));
          return candidates.sort((a, b) => b.length - a.length)[0] || null;
        })();

    // Reject sold-count lines and other non-review text
    if (!text || text.length < 3) return null;
    if (/^\d[\d.,K+]*\s*(sold|items?|ratings?|reviews?)\b/i.test(text)) return null;

    // Date
    const dateEl = container.querySelector('[class*="date"], [class*="time"], time');
    const date = dateEl ? cleanText(dateEl.textContent) : null;

    // Variant
    const variantEl = container.querySelector('[class*="variant"], [class*="variation"], [class*="sku"]');
    const variant = variantEl ? cleanText(variantEl.textContent) : null;

    return { username, rating_stars: starCount, text, date, variant };
  }

  // ===============================
  // Product Specifications
  // ===============================
  function extractProductSpecifications() {
    const norm = l => l.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
    const specs = {};

    // Strategy 1: DOM – locate the "Product Specifications" text node,
    // then look for sibling containers holding label+value row pairs.
    let heading = null;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (/^\s*Product\s+Specifications?\s*$/i.test(node.textContent)) {
        heading = node.parentElement;
        break;
      }
    }

    if (heading) {
      let container = heading;
      for (let depth = 0; depth < 5; depth++) {
        const parent = container.parentElement;
        if (!parent) break;
        for (const child of parent.children) {
          if (child.contains(heading)) continue;
          let found = 0;
          for (const row of child.querySelectorAll('*')) {
            if (row.children.length >= 2) {
              const label = norm(row.children[0].textContent);
              const value = norm(row.children[1].textContent);
              if (label && value && label.length < 80 && !specs[label]) {
                specs[label] = value;
                found++;
              }
            }
          }
          if (found >= 2) return Object.keys(specs).length > 0 ? specs : null;
        }
        container = parent;
      }
    }

    // Strategy 2: innerText parse between headings
    const lines = document.body.innerText.split('\n').map(norm).filter(Boolean);
    const startIdx = lines.findIndex(l => /^Product\s+Specifications?$/i.test(l));
    if (startIdx === -1) return null;

    const endPatterns = [
      /^Product\s+Description$/i,
      /^Ratings?\s*(&|and)?\s*Reviews?$/i,
      /^Customer\s+Reviews?$/i,
      /^You\s+May\s+Also\s+Like$/i,
    ];

    const specLines = [];
    for (let i = startIdx + 1; i < lines.length; i++) {
      if (endPatterns.some(p => p.test(lines[i]))) break;
      specLines.push(lines[i]);
    }

    const tabCount = specLines.filter(l => l.includes('\t')).length;
    if (tabCount > specLines.length / 2) {
      // Table layout: "Label\tValue"
      for (const line of specLines) {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const label = parts[0].trim();
          const value = parts.slice(1).join('\t').trim();
          if (label && value && label.length < 80) specs[label] = value;
        }
      }
    } else {
      // Grid layout: alternating label / value lines
      for (let i = 0; i < specLines.length - 1; i += 2) {
        const label = specLines[i];
        const value = specLines[i + 1];
        if (label && value && label.length < 80 &&
            !endPatterns.some(p => p.test(label)) &&
            !endPatterns.some(p => p.test(value))) {
          specs[label] = value;
        }
      }
    }

    return Object.keys(specs).length > 0 ? specs : null;
  }

  // ===============================
  // Shopee Mall Detection
  // ===============================
  function extractIsShopeeMall() {
    // Strategy 1: walk up 8 levels from the "Chat Now" button to find the
    // seller card container, then scan ALL descendant elements of that container
    // for a short text/alt/aria-label exactly matching "Shopee Mall".
    const chatBtn = [...document.querySelectorAll('button, a')].find(
      el => /^\s*chat\s+now\s*$/i.test(el.textContent)
    );
    if (chatBtn) {
      let sellerSection = chatBtn;
      for (let i = 0; i < 8 && sellerSection.parentElement && sellerSection.parentElement !== document.body; i++) {
        sellerSection = sellerSection.parentElement;
      }
      for (const el of sellerSection.querySelectorAll('*')) {
        // Text node content (leaf elements only to avoid false positives from large containers)
        if (el.childElementCount === 0 && /^\s*shopee\s*mall\s*$/i.test(el.textContent)) return true;
        // img alt
        if (el.tagName === 'IMG' && /shopee\s*mall/i.test(el.getAttribute('alt') || '')) return true;
        // aria-label
        if (/shopee\s*mall/i.test(el.getAttribute('aria-label') || '')) return true;
        // data attributes (Shopee sometimes uses data-* for badge labels)
        if (/shopee\s*mall/i.test(el.getAttribute('data-label') || '')) return true;
      }
    }

    // Strategy 2: any img on the page whose alt is exactly "Shopee Mall"
    for (const img of document.querySelectorAll('img[alt]')) {
      if (/^shopee\s*mall$/i.test(img.alt.trim())) return true;
    }

    // Strategy 3: any element whose aria-label contains "Shopee Mall"
    for (const el of document.querySelectorAll('[aria-label*="all" i]')) {
      if (/shopee\s*mall/i.test(el.getAttribute('aria-label'))) return true;
    }

    // Strategy 4: URL path
    if (/\/mall\//i.test(location.href)) return true;

    return false;
  }

  // ===============================
  // Product Description
  // ===============================
  function extractProductDescription() {
    const norm = l => l.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    const isReviewsSectionLine = rawL => {
      const l = norm(rawL);
      return (
        /^Product\s+Ratings?/i.test(l) ||
        /\d+(\.\d+)?\s+out\s+of\s+5/i.test(l) ||
        /^All\s*\d+\s*Star/i.test(l) ||
        /With\s+(Comments?|Media)/i.test(l) ||
        /^\d{4}-\d{2}-\d{2}[\s|]/.test(l) ||
        /^\d{1,2}\s+\w{3,9}\s+\d{4}$/.test(l) ||
        /\|\s*Variation:/i.test(l) ||
        /^[a-z0-9]\*{3,}[a-z0-9]+$/i.test(l)       // masked username "r*****l"
      );
    };

    // Strategy 1: dedicated description containers
    const descSelectors = [
      '[class*="product-detail"] [class*="description"]',
      '[class*="item-description"]',
      '[class*="shopee-product-description"]',
      '[class*="product-description"]'
    ];

    for (const selector of descSelectors) {
      const el = document.querySelector(selector);
      if (!el) continue;

      const descImgCount = el.querySelectorAll('img').length;
      const rawLines = (el.innerText || el.textContent || "")
        .split("\n").map(l => l.trim()).filter(Boolean);
      const stopIdx = rawLines.findIndex(l => isReviewsSectionLine(l));

      // stopIdx === 0 means reviews start immediately — no real description here
      if (stopIdx === 0) continue;

      const safeLines = stopIdx !== -1 ? rawLines.slice(0, stopIdx) : rawLines;
      const text = safeLines.join(" ").trim();

      if (text.length > 10) {
        const prefix = descImgCount > 0 ? `[Images: ${descImgCount}]\n` : "";
        return { value: (prefix + text).slice(0, 3000), confidence: "high" };
      }
      if (descImgCount > 0) {
        return { value: `[Images: ${descImgCount}]`, confidence: "medium" };
      }
    }

    // Strategy 2: locate the "Product Description" section in body innerText
    const bodyLines = (document.body.innerText || "").split("\n").map(l => l.trim());
    const headingIdx = bodyLines.findIndex(l =>
      /^Product\s+Description$/i.test(norm(l))
    );
    if (headingIdx !== -1) {
      const after = bodyLines.slice(headingIdx + 1).filter(l => l.length > 0);

      // If the first real line is already a review line, no description exists
      if (after.length === 0 || isReviewsSectionLine(after[0])) {
        // fall through to image-count fallback below
      } else {
        const stopIdx = after.findIndex(l =>
          isReviewsSectionLine(l) ||
          /^(Product\s+Rating|Reviews?|Shop|Seller|Add\s+to\s+Cart)\s*$/i.test(norm(l))
        );
        const desc = after.slice(0, stopIdx !== -1 ? stopIdx : 20).join(" ").trim();
        if (desc.length > 10) {
          return { value: desc.slice(0, 3000), confidence: "medium" };
        }
      }
    }

    // No text description found — count product images as a last resort
    const allDescImgs = descSelectors.reduce((acc, sel) => {
      const el = document.querySelector(sel);
      return el ? acc + el.querySelectorAll('img').length : acc;
    }, 0);
    const galleryImgs = document.querySelectorAll(
      'img[src*="shopee"], [class*="gallery"] img, [class*="product-image"] img'
    ).length;
    const totalImgs = allDescImgs || galleryImgs;
    const fallback = totalImgs > 0
      ? `No text description found. ${totalImgs} product image${totalImgs !== 1 ? 's' : ''} detected.`
      : 'No product description found.';
    return { value: fallback, confidence: "low" };
  }

  // ===============================
  // Data Validation & Quality Report
  // ===============================
  function sanitizeData(raw, platform) {
    const d = { ...raw };
    if (typeof d.product_name !== 'string' || !d.product_name.trim())
      d.product_name = 'Unknown Product';
    if (d.price !== null && d.price !== undefined &&
        (typeof d.price !== 'number' || !isFinite(d.price) || d.price < 0))
      d.price = null;
    if (d.sold_count !== null && d.sold_count !== undefined)
      d.sold_count = String(d.sold_count);
    if (d.rating !== null && d.rating !== undefined &&
        (typeof d.rating !== 'number' || d.rating < 0 || d.rating > 5))
      d.rating = null;
    d.image_count = (typeof d.image_count === 'number' && d.image_count >= 0)
      ? Math.floor(d.image_count) : 0;
    if ('is_shopee_mall' in d) d.is_shopee_mall = Boolean(d.is_shopee_mall);
    if ('is_lazmall'     in d) d.is_lazmall     = Boolean(d.is_lazmall);
    if ('reviews' in d && !Array.isArray(d.reviews)) d.reviews = [];
    if (d.specifications !== null && d.specifications !== undefined) {
      if (typeof d.specifications !== 'object' || Array.isArray(d.specifications) ||
          Object.keys(d.specifications).length === 0) d.specifications = null;
    }
    if (d.seller_badges !== null && d.seller_badges !== undefined) {
      if (!Array.isArray(d.seller_badges) || d.seller_badges.length === 0)
        d.seller_badges = null;
    }
    const TRACKED = {
      shopee:   ['price','sold_count','rating','rating_count','response_rate','shop_age','seller_name','description','image_count'],
      lazada:   ['price','sold_count','rating','rating_count','seller_name','seller_rating','description','image_count'],
      facebook: ['price','seller_name','condition','location','listing_date','description','image_count'],
    };
    const missing = (TRACKED[platform] || []).filter(f => {
      const v = d[f];
      return v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v));
    });
    d.data_quality = { missing };
    return d;
  }

  // ===============================
  // Main Extraction (FIXED - No Comments)
  // ===============================
  function extractShopeeData() {
    dbg("Extracting Shopee data...");
    
    const price = extractMainPrice();
    const sold = extractSoldCount();
    const ratings = extractRatings();
    const responseRate = extractResponseRate();
    const shopAge = extractShopAge();
    const sellerName = extractSellerName();
    const imageCount = extractProductImageCount();
    const reviews = extractReviews(10);
    const description = extractProductDescription();
    const specifications = extractProductSpecifications();
    const is_shopee_mall = extractIsShopeeMall();

    return sanitizeData({
      success: true,
      platform: 'shopee',
      product_name: cleanText(document.title) || "Unknown Product",
      price: price.value,
      sold_count: sold.value,
      rating: ratings.rating.value,
      rating_count: ratings.rating_count.value,
      response_rate: responseRate.value,
      shop_age: shopAge.value,
      seller_name: sellerName.value,
      image_count: imageCount.value,
      description: description.value,
      specifications: specifications,
      is_shopee_mall: is_shopee_mall,
      reviews: reviews.value,
      extracted_at: new Date().toISOString()
    }, 'shopee');
  }

  // ===============================
  // Messaging - FIXED TO HANDLE EXTRACT_DATA
  // ===============================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    dbg("Content script received message:", message.type);
    
    if (message.type === "EXTRACT_DATA") {
      dbg("Handling EXTRACT_DATA message");
      const data = extractShopeeData();
      dbg("Extracted data:", data);
      sendResponse(data);
      return true;
    }

    if (message.type === "EXTRACT_REVIEWS") {
      dbg("Handling EXTRACT_REVIEWS message");
      const reviews = extractReviews(10);
      dbg("Extracted reviews:", reviews);
      sendResponse({ reviews: reviews.value });
      return true;
    }

    if (message.type === "COLLECT_PAGE_DATA") {
      latestData = extractShopeeData();
      dataStale = false;
      sendResponse(latestData);
      return true;
    }

    if (message.type === "GET_CURRENT_DATA") {
      sendResponse({ stale: dataStale, data: latestData });
      return true;
    }

    // ------------------------------------------------------------------
    // Progressive review collection handlers
    // ------------------------------------------------------------------
    if (message.type === "START_PROGRESSIVE_COLLECTION") {
      startProgressiveCollection(message.scanData || null);
      sendResponse({ ok: true, initialCount: progressiveReviews.length });
      return true;
    }

    if (message.type === "STOP_PROGRESSIVE_COLLECTION") {
      stopProgressiveCollection(true); // user-initiated: show stopped card
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "SHOPEE_RESTART_COLLECTION") {
      if (progressiveScanData) {
        startProgressiveCollection(progressiveScanData);
        notifyPopupRestarted();
      }
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "GET_PROGRESSIVE_REVIEWS") {
      sendResponse({ reviews: progressiveReviews, count: progressiveReviews.length });
      return true;
    }

    dbg("Unknown message type:", message.type);
    return false;
  });
})();