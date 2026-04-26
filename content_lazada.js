(() => {
  // ===============================
  // Hard Guard: Lazada only
  // ===============================
  if (!location.hostname.includes("lazada.")) return;

  // Detect iframe context — if we're inside a sub-frame, run only review extraction
  const IS_IFRAME = window !== window.top;

  console.log("ScamGuard content_lazada.js loaded (Lazada)", IS_IFRAME ? "[iframe]" : "[main]");

  // ===============================
  // API Base (mirrors popup.js)
  // ===============================
  const SURESHOP_API_BASE = "http://localhost/php/sureshopwebsite/app/controller";

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
      #sureshopph-lazada-scan-card {
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
        animation: slideInLazadaCard 0.3s ease;
        border-left: 4px solid #1b9c85;
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
        padding: 14px 16px;
        background: linear-gradient(135deg, #1b9c85 0%, #138a73 100%);
        color: #fff;
        border-radius: 2rem 2rem 0 0;
        margin: 0;
        position: relative;
        overflow: hidden;
      }

      #sureshopph-lazada-scan-card .header::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(45deg, rgba(255,255,255,0.12) 0%, transparent 60%);
        pointer-events: none;
      }

      #sureshopph-lazada-scan-card .title-section {
        display: flex;
        align-items: center;
        gap: 10px;
        position: relative;
        z-index: 1;
      }

      #sureshopph-lazada-scan-card .title-section i {
        color: #fff;
        font-size: 18px;
        opacity: 0.95;
      }

      #sureshopph-lazada-scan-card .title-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      #sureshopph-lazada-scan-card .title-text strong {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        line-height: 1.1;
      }

      #sureshopph-lazada-scan-card .card-subtitle {
        font-size: 10px;
        color: rgba(255,255,255,0.85);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 400;
        line-height: 1;
      }

      #sureshopph-lazada-scan-card .body {
        padding: 16px;
        background: #f6f6f9;
        text-align: center;
      }

      #sureshopph-lazada-scan-card .ready-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      #sureshopph-lazada-scan-card .ready-status-badge {
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

      #sureshopph-lazada-scan-card .ready-badge {
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

      #sureshopph-lazada-scan-card .ready-title {
        font-size: 13px;
        font-weight: 700;
        color: #363949;
      }

      #sureshopph-lazada-scan-card .ready-desc {
        font-size: 11px;
        color: #677483;
        line-height: 1.5;
      }

      #sureshopph-lazada-scan-card .close {
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

      #sureshopph-lazada-scan-card .close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      #sureshopph-lazada-scan-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 2.5rem 4rem rgba(27, 156, 133, 0.25);
      }

      #sureshopph-lazada-scan-card.dismissing {
        opacity: 0;
        transform: translateY(-12px) scale(0.95);
        transition: all 0.25s ease;
      }
    `;

    if (!document.getElementById('sureshop-fa-css')) {
      const faLink = document.createElement('link');
      faLink.id = 'sureshop-fa-css';
      faLink.rel = 'stylesheet';
      faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
      document.head.appendChild(faLink);
    }
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

    // Helper: expand "1K", "1.2K+", "10M" abbreviations to a plain number string
    const expandAbbrev = raw => {
      const m = raw.replace(/,/g, "").match(/^([\d.]+)([KkMm]?)\+?$/);
      if (!m) return raw;
      const n = parseFloat(m[1]);
      if (m[2].toUpperCase() === "K") return String(Math.round(n * 1000));
      if (m[2].toUpperCase() === "M") return String(Math.round(n * 1000000));
      return String(Math.round(n));
    };

    // Matches "34K+ Sold", "1.2K Sold", "1,234 Sold", "34K+ sold"
    const match = text.match(/([\d.,]+[KkMm]?\+?)\s+Sold/i);
    if (match) return { value: expandAbbrev(match[1]), confidence: "high" };

    // Also try: "X sold in last 30 days" style
    const altMatch = text.match(/([\d.,]+[KkMm]?\+?)\s+(?:items?\s+)?sold/i);
    return altMatch
      ? { value: expandAbbrev(altMatch[1]), confidence: "medium" }
      : { value: null, confidence: "low" };
  }

  function extractRatings() {
    const ratingSelectors = [
      ".score-average",
      '[class*="rating-average"]',
      '[class*="pdp-review-summary"]'
    ];

    let rating = null;
    let ratingEl = null;
    for (const sel of ratingSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const val = parseFloat(cleanText(el.textContent));
        if (!isNaN(val) && val >= 0 && val <= 5) {
          rating = { value: val, confidence: "high" };
          ratingEl = el;
          break;
        }
      }
    }

    const text = document.body.innerText;
    if (!rating) {
      const ratingMatch = text.match(/\b([0-5]\.\d)\b/);
      rating = ratingMatch
        ? { value: Number(ratingMatch[1]), confidence: "medium" }
        : { value: null, confidence: "low" };
    }

    // ---- Rating count ----
    // Strategy 1 (best): DOM proximity — walk up from the rating element.
    // The count (e.g. 24055) is always in the same container as the rating.
    let rating_count = { value: null, confidence: "low" };
    if (ratingEl) {
      let node = ratingEl;
      for (let up = 0; up < 6 && node; up++) {
        const ct = (node.textContent || "").replace(/\s/g, "");
        // "(24055)" or "(24,055)"
        const parenM = ct.match(/\(([0-9,]{3,})\)/);
        if (parenM) {
          const n = parseInt(parenM[1].replace(/,/g, ""), 10);
          if (n > 9) { rating_count = { value: n, confidence: "high" }; break; }
        }
        // Lazada sometimes renders "4.924055" (no separator in textContent)
        const smushedM = ct.match(/[0-5]\.\d([0-9]{4,})/);
        if (smushedM) {
          const n = parseInt(smushedM[1], 10);
          if (n > 9) { rating_count = { value: n, confidence: "medium" }; break; }
        }
        node = node.parentElement;
      }
    }

    // Strategy 2: any leaf element near a rating/review class whose text is
    // a large bare number (3-6 digits)
    if (!rating_count.value) {
      const candidates = [...document.querySelectorAll(
        '[class*="rating"] *, [class*="review"] *, [class*="score"] *'
      )];
      for (const el of candidates) {
        if (el.childElementCount > 0) continue;
        const t = (el.textContent || "").replace(/[,\s]/g, "");
        if (/^\d{3,6}$/.test(t)) {
          const n = parseInt(t, 10);
          if (n > 9) { rating_count = { value: n, confidence: "medium" }; break; }
        }
      }
    }

    // Strategy 3: innerText regex fallbacks
    if (!rating_count.value) {
      const inlineM = text.match(/[0-5]\.\d\s*\(([\d,]+)\s*(?:Ratings?)?\)/i);
      if (inlineM) rating_count = { value: parseInt(inlineM[1].replace(/,/g, ""), 10), confidence: "high" };
    }
    if (!rating_count.value) {
      const wordM = text.match(/\(?(\d[\d,]*)\s+Ratings?\)?/i);
      if (wordM) rating_count = { value: parseInt(wordM[1].replace(/,/g, ""), 10), confidence: "high" };
    }

    return { rating, rating_count };
  }

  function extractSellerName() {
    const isJunkName = t => !t || t.length < 2 || t.length > 100 ||
      /^(seller response|chat now|go to store|flagship store|official store|lazmall|view all|more info|seller|ratings?|\d+%)/i.test(t);

    // Strategy 1: shop link text — href contains "/shop/" and text is the store name
    const shopLinks = [...document.querySelectorAll('a[href*="/shop/"]')];
    for (const a of shopLinks) {
      const text = cleanText(a.textContent);
      if (!isJunkName(text)) return { value: text, confidence: "high" };
    }

    // Strategy 2: dedicated seller name selectors
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
        if (!isJunkName(text)) return { value: text, confidence: "high" };
      }
    }

    // Strategy 3: text patterns — only match lines that look like store names,
    // not review section noise like "Seller Response"
    const bodyText = document.body.innerText;
    const soldByMatch = bodyText.match(/Sold by[:\s]+([^\n]{2,60})/i);
    if (soldByMatch) {
      const candidate = cleanText(soldByMatch[1]);
      if (!isJunkName(candidate)) return { value: candidate, confidence: "medium" };
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
    // Matches both "Seller Ratings 97%" and "Positive Seller Ratings 97%"
    const match = text.match(/(?:Positive\s+)?Seller\s+Ratings?\s*(\d+(?:\.\d+)?%)/i);
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

  function extractProductDescription() {
    // Strategy 1: dedicated description containers
    const descSelectors = [
      '[class*="pdp-product-desc"]',
      '[class*="detail-content"]',
      "#html-desc",
      '[class*="description-content"]',
      '[class*="pdp-mod-product-description"]',
      '[class*="description"]',
      '[class*="product-detail"]',
      '[class*="pdp-block"]',
      '[data-spm*="description"]'
    ];

    for (const selector of descSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 30) {
          return { value: text.slice(0, 3000), confidence: "high" };
        }
      }
    }

    // Strategy 2: locate a description heading in page text
    const bodyText = document.body.innerText;
    const idx = bodyText.search(/Product\s+Details?|Description/i);
    if (idx !== -1) {
      const section = bodyText.slice(idx, idx + 1500);
      const lines = section.split("\n").slice(1).map(l => l.trim()).filter(Boolean);
      const stopIdx = lines.findIndex(l =>
        /^(Specifications?|Customer|Reviews?|Rating|You May|Seller|Highlights?)/i.test(l)
      );
      const descLines = stopIdx !== -1 ? lines.slice(0, stopIdx) : lines.slice(0, 20);
      const desc = descLines.join(" ").trim();
      if (desc.length > 10) {
        return { value: desc.slice(0, 3000), confidence: "medium" };
      }
    }

    return { value: null, confidence: "low" };
  }

  // ===============================
  // Reviews / Comments Extractor (Lazada)
  // ===============================
  function extractLazadaReviews(maxReviews = 10) {
    const reviews = [];

    // Helpers
    const isDateLine = l =>
      /^\d{1,2}\s+\w{3,9}\s+\d{4}$/.test(l) ||   // "06 Jan 2025" / "06 January 2025"
      /^\d{4}-\d{2}-\d{2}$/.test(l) ||              // "2025-01-06"
      /^\d+\s+(day|week|month|year)s?\s+ago$/i.test(l); // "3 days ago"

    const isSkipLine = l =>
      /^[★☆✩✭]+$/.test(l) ||                        // star glyphs only
      /^\d(\.\d)?\s*out\s*of\s*5/i.test(l) ||
      /^\d+\s*(star|stars|rating|ratings|sold|review)/i.test(l) ||
      /^(helpful|not helpful|report|reply|like|\d+\s+helpful)/i.test(l) ||
      /^Variation:/i.test(l) ||
      /^[₱$€£]/.test(l) ||
      /^[+-]?\d+$/.test(l) ||                       // plain numbers AND ±1 helpful votes
      /^\+\d/.test(l);                              // "+1", "+2" helpful button text

    // Count ★ glyphs in a line to get rating_stars (e.g. "★★★★☆" → 4)
    const parseStarGlyphs = l => {
      const filled = (l.match(/★/g) || []).length;
      return filled > 0 && filled <= 5 ? filled : null;
    };

    // Lazada variation labels — covers "Variation:", "Color family:", "Size:", etc.
    const isVariantLine = l =>
      /^(Variation|Color\s+(family|size)|Size|Material|Style|Brand|Pattern|Gender|Flavor|Scent|Type)\s*:/i.test(l);

    // Extract the variant value from a variant line
    const getVariantValue = l => l.replace(/^[^:]+:\s*/, "").trim();

    // Matches any line that STARTS a seller response block (English + Tagalog)
    const isSellerResponseHeading = l =>
      /^Seller['']?s?\s*(Response|Reply)/i.test(l) ||
      /^Response\s+from\s+(the\s+)?seller/i.test(l) ||
      /^(Store|Shop)\s+(Response|Reply)/i.test(l) ||
      /^Tugon\s+(ng\s+)?(Nagbebenta|Seller|Tindahan)/i.test(l) ||  // Tagalog
      /^Sagot\s+(ng\s+)?(Nagbebenta|Seller)/i.test(l);             // Tagalog alt

    // Matches the BODY of a seller response (greeting patterns sellers use)
    const isSellerResponseGreeting = l =>
      /^Dear\s+(customer|buyer|valued|po\b)/i.test(l) ||
      /^(Hi|Hello|Kamusta|Mabuhay)[,!]?\s*(po\b|customer|buyer|valued)/i.test(l) ||
      /^(Salamat|Nagpapasalamat|Nais\s+naming|Ikinalulugod)/i.test(l) ||
      /^(Thank\s+you|Thanks)\s+for\s+(your|the)\s+(review|feedback|purchase|order)/i.test(l) ||
      /^We\s+(are\s+)?(happy|glad|thrilled|sorry|apologize)\s+to\s+hear/i.test(l);

    const isMetaLine = l => isDateLine(l) || isSkipLine(l);

    // ---- Try to read page-level average rating once ----
    // Lazada shows something like "4.7" or "4.7 / 5" near the reviews header.
    // We use this ONLY as a last resort when per-review stars can't be detected.
    let pageAvgRating = null;
    try {
      // Look for a numeric rating element near the reviews section header
      const ratingCandidates = [
        ...document.querySelectorAll(
          '[class*="rating"] span, [class*="review-summary"] span, ' +
          '[class*="score"] span, [class*="average"] span, ' +
          '[class*="stars"] + span, [class*="stars"] ~ span'
        )
      ];
      for (const el of ratingCandidates) {
        const txt = (el.textContent || '').trim();
        const m = txt.match(/^([1-5](\.\d)?)(\s*\/\s*5)?$/);
        if (m) {
          pageAvgRating = Math.round(parseFloat(m[1]));
          break;
        }
      }
      // Fallback: scan innerText near the reviews heading for a standalone rating number
      if (!pageAvgRating) {
        const bodyT = document.body.innerText;
        const hIdx = bodyT.search(/Ratings?\s*&\s*Reviews?|Customer\s+Reviews?/i);
        if (hIdx !== -1) {
          const nearby = bodyT.slice(hIdx, hIdx + 400);
          // Try "4.7 / 5" or "4.7 out of 5" first
          const nmFull = nearby.match(/\b([1-5](\.[0-9]{1,2})?)\s*(?:\/\s*5|out\s+of\s+5)/i);
          if (nmFull) {
            pageAvgRating = Math.round(parseFloat(nmFull[1]));
          } else {
            // Fall back to any standalone decimal on its own line, e.g. "4.7\n"
            const nmStandalone = nearby.match(/(?:^|\n)\s*([1-5]\.[0-9])\s*(?:\n|$)/);
            if (nmStandalone) pageAvgRating = Math.round(parseFloat(nmStandalone[1]));
          }
        }
      }
    } catch (_) {}

    // ---- Strategy 1: DOM-based — works when reviews ARE rendered ----
    const allEls = [...document.querySelectorAll(
      '[class*="item-review"], [class*="review-item"], [class*="buyer-review"], [class*="comment-item"]'
    )];

    const reviewItems = allEls.filter(el => {
      const leaves = [...el.querySelectorAll('*')].filter(c => c.childElementCount === 0 && c.textContent.trim().length > 0);
      return leaves.length >= 2 && el.textContent.trim().length > 20;
    }).slice(0, maxReviews);

    for (const item of reviewItems) {
      // Stars: multiple detection strategies for Lazada's obfuscated classes
      let filledStars = null;

      // 1. aria-label: "4 out of 5 stars" or "4 stars"
      const starAriaEl = item.querySelector(
        '[aria-label*="out of 5"], [aria-label*="stars"], [aria-label*="star"]'
      );
      if (starAriaEl) {
        const ariaMatch = (starAriaEl.getAttribute('aria-label') || '').match(/(\d+(\.\d+)?)\s*(out\s*of|\/)/);
        if (ariaMatch) filledStars = Math.min(Math.round(parseFloat(ariaMatch[1])), 5);
        else {
          const leadMatch = (starAriaEl.getAttribute('aria-label') || '').match(/^(\d+(\.\d+)?)/);
          if (leadMatch) filledStars = Math.min(Math.round(parseFloat(leadMatch[1])), 5);
        }
      }

      // 2. data-score / data-rating / data-value attribute on any element inside
      if (!filledStars) {
        const dataEl = item.querySelector('[data-score], [data-rating], [data-value]');
        if (dataEl) {
          const raw = parseFloat(dataEl.dataset.score || dataEl.dataset.rating || dataEl.dataset.value);
          if (!isNaN(raw) && raw >= 1 && raw <= 5) filledStars = Math.round(raw);
        }
      }

      // 3. SVG stars: use getComputedStyle to detect golden/yellow filled stars
      // Lazada fills active stars with ~#FFB800 (rgb ~255,184,0)
      if (!filledStars) {
        const paths = [...item.querySelectorAll('svg path, svg polygon, svg rect, svg circle')];
        const filledSvgs = new Set();
        for (const p of paths) {
          try {
            const fill = window.getComputedStyle(p).fill || '';
            const m = fill.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
            if (m) {
              const [r, g, b] = [+m[1], +m[2], +m[3]];
              // Golden/yellow range: high red, moderate-high green, low blue
              if (r > 180 && g > 100 && g < 230 && b < 70 && r >= g) {
                const parentSvg = p.closest('svg');
                if (parentSvg) filledSvgs.add(parentSvg);
              }
            }
          } catch (_) {}
        }
        if (filledSvgs.size >= 1 && filledSvgs.size <= 5) filledStars = filledSvgs.size;
      }

      // 4. Class name keyword fallback (older Lazada builds)
      if (!filledStars) {
        const filled = item.querySelectorAll(
          '[class*="star--on"], [class*="star_on"], [class*="star-on"], ' +
          '[class*="rating-active"], [class*="star-active"], ' +
          '[class*="filled"], [class*="ic-star-fill"]'
        ).length;
        if (filled > 0) filledStars = Math.min(filled, 5);
      }

      // 5. Numeric text leaf inside a rating container (e.g. "4.0" displayed beside stars)
      if (!filledStars) {
        const ratingTextEl = [...item.querySelectorAll('*')].find(el =>
          el.childElementCount === 0 &&
          /^[1-5](\.\d)?$/.test((el.textContent || '').trim())
        );
        if (ratingTextEl) {
          const v = parseFloat(ratingTextEl.textContent.trim());
          if (v >= 1 && v <= 5) filledStars = Math.round(v);
        }
      }

      // Collect all leaf texts, then find which ones belong to seller response
      const allLeaves = [...item.querySelectorAll('*')]
        .filter(el => el.childElementCount === 0)
        .map(el => ({ el, text: cleanText(el.textContent) }))
        .filter(n => n.text);

      // Find any seller response container by walking up from a heading text node
      const sellerHeadingNode = allLeaves.find(n => isSellerResponseHeading(n.text));
      let sellerRespTexts = new Set();
      if (sellerHeadingNode) {
        // Collect all text inside the seller response's parent container
        let container = sellerHeadingNode.el.parentElement;
        // Walk up until we find a container that holds review text too (1-2 levels)
        for (let up = 0; up < 3; up++) {
          if (!container || container === item) break;
          const containerText = cleanText(container.textContent) || '';
          if (containerText.length > 10) {
            [...container.querySelectorAll('*')]
              .filter(e => e.childElementCount === 0)
              .forEach(e => { const t = cleanText(e.textContent); if (t) sellerRespTexts.add(t); });
            break;
          }
          container = container.parentElement;
        }
      }

      const leaves = allLeaves.map(n => n.text);
      const date = leaves.find(l => isDateLine(l)) || null;

      const username = leaves.find(l =>
        l.length >= 2 && l.length <= 60 &&
        !isMetaLine(l) &&
        !sellerRespTexts.has(l) &&
        l !== date
      ) || null;

      // If the item has NO seller-response heading but its longest text IS a greeting,
      // treat the whole item as a seller response and skip it.
      const longestLeaf = leaves
        .filter(l => !isMetaLine(l) && l.length > 5)
        .sort((a, b) => b.length - a.length)[0] || "";
      if (!sellerHeadingNode && isSellerResponseGreeting(longestLeaf)) continue;

      // Also skip items where any leaf is the seller response greeting
      // (covers cases where heading IS present but misidentified)
      if (leaves.some(l => isSellerResponseGreeting(l))) {
        // Re-check: only skip if a greeting is outside the username position
        const greetingLeaf = leaves.find(l => isSellerResponseGreeting(l));
        if (greetingLeaf && greetingLeaf !== username) continue;
      }

      // Variant: covers "Variation:", "Color family:", "Size:", etc.
      const variantLeaf = leaves.find(l => isVariantLine(l));
      const variant = variantLeaf ? getVariantValue(variantLeaf) : null;

      const text = leaves
        .filter(l =>
          !isMetaLine(l) &&
          l !== username &&
          l.length > 5 &&
          !sellerRespTexts.has(l) &&
          !isSellerResponseHeading(l) &&
          !isSellerResponseGreeting(l) &&
          !isVariantLine(l)
        )
        .sort((a, b) => b.length - a.length)[0] || null;

      if (text) {
        reviews.push({
          username: username || "Anonymous",
          rating_stars: filledStars || null,
          text,
          date: date || null,
          variant: variant || null
        });
      }
    }

    if (reviews.length > 0) return { value: reviews, confidence: "high" };

    // ---- Strategy 2: innerText parsing — primary fallback ----
    // Lazada review block structure in innerText:
    //   L***a               ← username (masked, may be 1-4 lines before date)
    //   ★★★★★             ← star glyphs (may or may not appear as text)
    //   06 Jan 2025         ← DATE anchor
    //   Great product!      ← review text lines
    //   Variation: Red      ← optional
    //   Seller's Response   ← seller block heading — everything after skipped
    //   Thank you!
    //   Helpful (2)         ← skip
    // Hard-stop line patterns — when hit inside a review block, we've left the reviews section.
    // NOTE: "Product Details", "Highlights" etc. are Lazada nav tab labels that appear at the
    // TOP of the reviews section — do NOT use them as outer-loop stops.
    const isSectionEndLine = l =>
      /^Page\s+\d+\s+(out\s+of|of)\s+\d+/i.test(l) ||       // "Page 2 out of 4783"
      /^What'?s\s+in\s+the\s+box/i.test(l) ||
      /^Seller\s+Information/i.test(l);

    // Patterns that only make sense as section-ends once INSIDE a review block
    const isInnerSectionEndLine = l =>
      isSectionEndLine(l) ||
      /^Specifications?\s*$/i.test(l) ||
      /^Key\s+Features?\s*$/i.test(l) ||
      /^Product\s+(Details|Description|Specifications?|Overview|Highlights?)\s*$/i.test(l);

    const bodyText = document.body.innerText;

    // Find the reviews section. "Ratings & Reviews" can appear in the nav too,
    // so find the FIRST occurrence that is actually followed by a date-like line
    // within the next 3000 chars — that is the real review block.
    let sectionStart = -1;
    const headingRe = /(\d+\s+Ratings?,?\s*\d+\s+Reviews?|Ratings?\s*&\s*Reviews?|Customer\s+Reviews?|Product\s+Reviews?)/gi;
    let hm;
    while ((hm = headingRe.exec(bodyText)) !== null) {
      const probe = bodyText.slice(hm.index, hm.index + 3000);
      // Check if at least one date pattern appears in the next 3000 chars
      if (/\d{1,2}\s+\w{3,9}\s+\d{4}|\d{4}-\d{2}-\d{2}|\d+\s+(day|week|month|year)s?\s+ago/i.test(probe)) {
        sectionStart = hm.index;
        break;
      }
    }
    if (sectionStart === -1) sectionStart = 0;

    const section = bodyText.slice(sectionStart, sectionStart + 18000);
    const lines = section.split("\n").map(l => l.trim()).filter(Boolean);

    for (let i = 0; i < lines.length && reviews.length < maxReviews; i++) {
      // Only break outer loop on unambiguous section-end (pagination)
      if (isSectionEndLine(lines[i])) break;
      if (!isDateLine(lines[i])) continue;

      const date = lines[i];

      // Look back up to 5 lines for username + star glyphs + numeric rating
      let username = null;
      let rating_stars = null;
      for (let back = 1; back <= 5; back++) {
        if (i - back < 0) break;
        const candidate = lines[i - back];
        // Star glyph line (★★★★☆)
        if (/★/.test(candidate) && /^[★☆✩✭\s]+$/.test(candidate)) {
          if (rating_stars === null) rating_stars = parseStarGlyphs(candidate);
          continue;
        }
        // Numeric rating line: "5", "4.0", "4.7", "3.5" etc.
        if (/^[1-5](\.[0-9])?$/.test(candidate) && rating_stars === null) {
          rating_stars = Math.round(parseFloat(candidate));
          continue;
        }
        if (isSkipLine(candidate)) continue;
        if (
          candidate.length >= 2 && candidate.length <= 80 &&
          !/^(Ratings?|Reviews?|Customer|Product|Description|Specification)/i.test(candidate) &&
          !isSellerResponseHeading(candidate)
        ) {
          username = candidate;
          break;
        }
      }

      // Collect review text lines; stop at seller response heading or next date
      const textLines = [];
      let variant = null;
      let inSellerResponse = false;
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        if (isDateLine(lines[j])) break;
        if (isInnerSectionEndLine(lines[j])) { i = lines.length; break; } // abort outer loop too
        // Detect seller response by heading OR by greeting content
        if (isSellerResponseHeading(lines[j]) || isSellerResponseGreeting(lines[j])) {
          inSellerResponse = true; continue;
        }
        if (inSellerResponse) continue;
        if (isVariantLine(lines[j])) {
          if (!variant) variant = getVariantValue(lines[j]);
          // If the variant line also contains review text after the label value,
          // strip the "Color family: X Y Z" prefix and keep the remainder.
          const remainder = lines[j].replace(/^[^:]+:\s*\S+(\s+\S+){0,3}\s*/, "").trim();
          if (remainder.length > 8 && !isSkipLine(remainder) && !isSellerResponseGreeting(remainder)) {
            textLines.push(remainder);
          }
          continue;
        }
        if (isSkipLine(lines[j])) continue;
        textLines.push(lines[j]);
      }

      // Cap text to 400 chars to prevent product spec bleed from long concatenated lines
      const text = textLines.join(" ").trim().slice(0, 400);
      if (text && text.length > 3) {
        reviews.push({
          username: username || "Anonymous",
          rating_stars: rating_stars || null,
          text,
          date,
          variant: variant || null
        });
      }
    }

    // Apply page-level average rating to any reviews that have no individual rating
    if (pageAvgRating) {
      for (const r of reviews) {
        if (!r.rating_stars) r.rating_stars = pageAvgRating;
      }
    }

    return { value: reviews, confidence: reviews.length > 0 ? "medium" : "low" };
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
    const description = extractProductDescription();

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
      description: description.value,
      extracted_at: new Date().toISOString()
    };
  }

  // ===============================
  // Iframe Mode — runs inside Lazada sub-frames (e.g. reviews section)
  // ===============================
  if (IS_IFRAME) {
    // Only run review extraction in iframes; skip all main-page logic
    const sendIframeReviews = () => {
      try {
        const r = extractLazadaReviews(50);
        if (r.value && r.value.length > 0) {
          chrome.runtime.sendMessage({
            type: "LAZADA_REVIEWS_DIRECT",
            reviews: r.value
          }).catch(() => {});
          console.log("[SureShop iframe] Sent", r.value.length, "reviews from iframe");
        }
      } catch (_) {}
    };
    setTimeout(sendIframeReviews, 800);
    let _iframeDebounce;
    new MutationObserver(() => {
      clearTimeout(_iframeDebounce);
      _iframeDebounce = setTimeout(sendIframeReviews, 800);
    }).observe(document.body, { childList: true, subtree: true });
    return; // Do not run main-frame logic in iframes
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

  // ===============================
  // Progressive Review Collection State
  // ===============================
  let progressiveReviews = [];      // all reviews harvested across pages
  let seenReviewKeys = new Set();   // dedup by username|date|text-prefix
  let reviewMutationObserver = null;
  let progressiveActive = false;
  let progressiveScanData = null;   // product data payload used for resends
  let progressiveDebounceTimer = null;
  let lastKnownReviewCount = 0;     // count of review containers seen in DOM
  let lastProgressiveScore = null;  // most recent score returned by backend
  let lastProgressiveLevel = null;  // most recent level returned by backend

  setInterval(() => {
    if (location.href !== lastUrl) {
      console.log("Lazada URL changed (SPA):", lastUrl, "→", location.href);
      lastUrl = location.href;
      dataStale = true;
      // Reset progressive collection — new product page, fresh slate (no stopped card)
      stopProgressiveCollection(false);
      progressiveReviews = [];
      seenReviewKeys = new Set();
      progressiveScanData = null;
      lastKnownReviewCount = 0;
      lastProgressiveScore = null;
      lastProgressiveLevel = null;
      checkAndShowCard();

      chrome.runtime.sendMessage({
        type: isProductPage() ? "LAZADA_PRODUCT_PAGE" : "LAZADA_NOT_PRODUCT_PAGE"
      });
    }
  }, 500);

  // ===============================
  // Progressive Review Collection
  // ===============================

  /** Stable key for deduplication */
  function makeReviewKey(r) {
    return `${r.username || ""}|${r.date || ""}|${(r.text || "").slice(0, 60)}`;
  }

  /**
   * Scan all currently visible review containers and return only the
   * ones not yet in seenReviewKeys (updates the set as a side-effect).
   */
  function harvestNewReviews() {
    // Reuse the full battle-tested extractor, then deduplicate against already-seen reviews
    const extracted = extractLazadaReviews(50);
    const allReviews = extracted.value || [];
    const newReviews = [];
    for (const review of allReviews) {
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
    if (!document.getElementById("sureshopph-lazada-scan-card")) showScanCard();
  }

  /** Notify the side panel that progressive collection stopped */
  function notifyPopupStopped() {
    chrome.runtime.sendMessage({
      type: "LAZADA_PROGRESSIVE_STOPPED",
      reviews: progressiveReviews,
      risk_score: lastProgressiveScore,
      risk_level: lastProgressiveLevel
    }).catch(() => {});
  }

  /** Notify the side panel that progressive collection (re)started */
  function notifyPopupRestarted() {
    chrome.runtime.sendMessage({ type: "LAZADA_PROGRESSIVE_RESTARTED" }).catch(() => {});
  }

  /**
   * Update the overlay to "actively scanning" state.
   * score/level may be null on the first call before any backend response.
   */
  function setCardScanningState(score, level, reviewCount) {
    ensureScanCard();
    const card = document.getElementById("sureshopph-lazada-scan-card");
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
    const card = document.getElementById("sureshopph-lazada-scan-card");
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
      const payload = { ...progressiveScanData, reviews: progressiveReviews };
      const res = await fetch(`${SURESHOP_API_BASE}/scan.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) return;

      const result = await res.json();
      if (result.risk_score === undefined) return;

      // Store latest score/level and update the on-page overlay
      lastProgressiveScore = result.risk_score;
      lastProgressiveLevel = result.risk_level;
      setCardScanningState(result.risk_score, result.risk_level, progressiveReviews.length);

      // Persist for popup
      await chrome.storage.local.set({
        lastAutoScanResult: {
          type: "product",
          risk_score: result.risk_score,
          risk_level: result.risk_level,
          description: progressiveScanData.description || null,
          timestamp: Date.now(),
          url: location.href
        }
      });

      // Notify popup if it is currently open
      chrome.runtime.sendMessage({
        type: "LAZADA_SCAN_UPDATED",
        risk_score: result.risk_score,
        risk_level: result.risk_level,
        reviews: progressiveReviews
      }).catch(() => { /* popup may not be open */ });

    } catch (e) {
      console.warn("[SureShop] Progressive scan update failed:", e.message);
    }
  }

  /** Debounced MutationObserver callback — fires on any DOM change while collecting */
  function onReviewDomChange() {
    if (!progressiveActive) return;
    clearTimeout(progressiveDebounceTimer);
    progressiveDebounceTimer = setTimeout(() => {
      const newOnes = harvestNewReviews();
      if (newOnes.length > 0) {
        progressiveReviews.push(...newOnes);
        console.log(
          `[SureShop] Progressive: +${newOnes.length} reviews (total: ${progressiveReviews.length})`
        );
        // Send reviews directly to popup immediately — no backend roundtrip needed
        chrome.runtime.sendMessage({
          type: "LAZADA_REVIEWS_DIRECT",
          reviews: progressiveReviews
        }).catch(() => {});
        // Also update backend for revised risk score
        sendProgressiveUpdate();
      }
    }, 800);
  }

  // ===============================
  // Lazada Review API Fetcher
  // ===============================

  /**
   * Try to read review data that Lazada has already injected into the page
   * as a JavaScript variable (avoids any extra network request).
   */
  function extractReviewsFromPageState() {
    const reviews = [];
    // Lazada injects different keys depending on build version
    const stateKeys = [
      "__lzd_global_data__", "__pdpInitData__", "__INITIAL_STATE__",
      "__LASG__", "__PAGE_DATA__", "pageData", "pdpInitialData"
    ];
    for (const key of stateKeys) {
      try {
        const state = window[key];
        if (!state) continue;
        // Recursively search for arrays that look like review lists
        const findReviews = (obj, depth) => {
          if (!obj || depth > 8 || reviews.length >= 50) return;
          if (Array.isArray(obj)) {
            // Looks like a review list if items have reviewContent or content + rating
            if (obj.length > 0 && obj[0] && (
              obj[0].reviewContent || obj[0].content || obj[0].reviewerName
            )) {
              for (const r of obj) {
                const txt = r.reviewContent || r.content || r.body || "";
                if (!txt.trim()) continue;
                reviews.push({
                  username: String(r.reviewerName || r.userName || r.nickname || "Anonymous").trim(),
                  rating_stars: r.rating != null ? Math.min(5, Math.round(parseFloat(r.rating))) : null,
                  text: String(txt).trim().slice(0, 400),
                  date: r.boughtDate || r.createTime || r.date || null,
                  variant: r.skuInfo || r.sku || null
                });
              }
              return;
            }
            for (const item of obj) findReviews(item, depth + 1);
          } else if (typeof obj === "object") {
            for (const val of Object.values(obj)) findReviews(val, depth + 1);
          }
        };
        findReviews(state, 0);
        if (reviews.length > 0) {
          console.log(`[SureShop] Got ${reviews.length} reviews from window.${key}`);
          return reviews;
        }
      } catch (_) {}
    }

    // Also check for <script type="application/json"> or window.__lzd injected data
    try {
      const scripts = [...document.querySelectorAll('script:not([src])')];
      for (const s of scripts) {
        const t = s.textContent;
        if (!t || !t.includes("reviewContent") && !t.includes("reviewerName")) continue;
        // Pull out JSON object that contains reviews
        const jsonMatch = t.match(/window\.[\w]+\s*=\s*({.{50,}})/s) ||
                          t.match(/({\s*"reviews"\s*:\s*\[.{20,}\]})/s);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1]);
            const findReviews = (obj, depth) => {
              if (!obj || depth > 8 || reviews.length >= 50) return;
              if (Array.isArray(obj)) {
                if (obj.length > 0 && obj[0] && (obj[0].reviewContent || obj[0].reviewerName)) {
                  for (const r of obj) {
                    const txt = r.reviewContent || r.content || "";
                    if (!txt.trim()) continue;
                    reviews.push({
                      username: String(r.reviewerName || "Anonymous").trim(),
                      rating_stars: r.rating != null ? Math.min(5, Math.round(parseFloat(r.rating))) : null,
                      text: String(txt).trim().slice(0, 400),
                      date: r.boughtDate || r.createTime || null,
                      variant: r.skuInfo || null
                    });
                  }
                  return;
                }
                for (const item of obj) findReviews(item, depth + 1);
              } else if (typeof obj === "object") {
                for (const val of Object.values(obj)) findReviews(val, depth + 1);
              }
            };
            findReviews(parsed, 0);
            if (reviews.length > 0) {
              console.log(`[SureShop] Got ${reviews.length} reviews from inline script tag`);
              return reviews;
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    return reviews; // empty if nothing found
  }

  /**
   * Fetch reviews directly from Lazada's internal review API.
   * Extracts the itemId from the URL (-i123456-s...) and calls the
   * getReviewList endpoint which returns JSON — no DOM scraping needed.
   */
  async function fetchReviewsFromApi(maxPages = 5, pageSize = 20) {
    const itemIdMatch = location.href.match(/-i(\d+)-s\d+\.html/);
    if (!itemIdMatch) return [];
    const itemId = itemIdMatch[1];

    const reviews = [];
    // Lazada PH uses my.lazada.com.ph for the review API; fall back to www.
    const bases = [
      "https://my.lazada.com.ph/pdp/review/getReviewList",
      "https://www.lazada.com.ph/pdp/review/getReviewList"
    ];
    let workingBase = null;

    for (let page = 1; page <= maxPages; page++) {
      let gotData = false;
      for (const base of (workingBase ? [workingBase] : bases)) {
        try {
          const url = `${base}?itemId=${itemId}&pageSize=${pageSize}&pageNo=${page}&filter=0&sort=0`;
          const resp = await fetch(url, {
            credentials: "include",
            headers: { Accept: "application/json" }
          });
          if (!resp.ok) continue;
          const data = await resp.json();

          // Normalise response shape — different Lazada regions vary
          const reviewList =
            data?.result?.reviews ||
            data?.data?.reviews ||
            data?.reviews ||
            [];

          if (!Array.isArray(reviewList) || reviewList.length === 0) {
            gotData = true; // reached end of pages
            break;
          }

          workingBase = base;
          gotData = true;

          for (const r of reviewList) {
            const text = r.reviewContent || r.content || r.body || "";
            if (!text.trim()) continue;
            reviews.push({
              username: String(r.reviewerName || r.userName || r.nickname || "Anonymous").trim(),
              rating_stars: r.rating != null ? Math.min(5, Math.round(parseFloat(r.rating))) : null,
              text: String(text).trim().slice(0, 400),
              date: r.boughtDate || r.createTime || r.date || null,
              variant: r.skuInfo || r.sku || null
            });
          }

          // Stop if we've hit the last page
          const totalPages =
            data?.result?.pager?.pageCount ||
            data?.result?.totalPage ||
            0;
          if (totalPages && page >= totalPages) page = maxPages;
          break;
        } catch (_) {}
      }
      if (!gotData) break;
    }

    console.log(`[SureShop] fetchReviewsFromApi: ${reviews.length} reviews for itemId=${itemId}`);
    return reviews;
  }

  /** Start watching for new review pages the user navigates to */
  async function startProgressiveCollection(scanData) {
    stopProgressiveCollection(false); // silent cleanup of any previous session

    progressiveReviews = [];
    seenReviewKeys = new Set();
    lastKnownReviewCount = 0;
    lastProgressiveScore = null;
    lastProgressiveLevel = null;
    progressiveScanData = scanData;
    progressiveActive = true;

    setCardScanningState(null, null, 0);

    // ---------------------------------------------------------------
    // STEP 0: Page state — zero network cost; reads reviews Lazada has
    // already loaded into window variables or <script> tags on this page.
    // ---------------------------------------------------------------
    try {
      const stateReviews = extractReviewsFromPageState();
      if (stateReviews.length > 0 && progressiveActive) {
        for (const r of stateReviews) {
          const key = makeReviewKey(r);
          if (!seenReviewKeys.has(key)) {
            seenReviewKeys.add(key);
            progressiveReviews.push(r);
          }
        }
        console.log(`[SureShop] Page state: ${progressiveReviews.length} reviews`);
        chrome.runtime.sendMessage({
          type: "LAZADA_REVIEWS_DIRECT",
          reviews: progressiveReviews
        }).catch(() => {});
        setCardScanningState(null, null, progressiveReviews.length);
      }
    } catch (_) {}

    // ---------------------------------------------------------------
    // STEP 1: Lazada review API — most reliable; bypasses all class
    // obfuscation and tab-click timing issues entirely.
    // ---------------------------------------------------------------
    try {
      const apiReviews = await fetchReviewsFromApi(5, 20);
      if (apiReviews.length > 0 && progressiveActive) {
        for (const r of apiReviews) {
          const key = makeReviewKey(r);
          if (!seenReviewKeys.has(key)) {
            seenReviewKeys.add(key);
            progressiveReviews.push(r);
          }
        }
        console.log(`[SureShop] API got ${progressiveReviews.length} reviews — sending to popup`);
        chrome.runtime.sendMessage({
          type: "LAZADA_REVIEWS_DIRECT",
          reviews: progressiveReviews
        }).catch(() => {});
        sendProgressiveUpdate();
        setCardScanningState(null, null, progressiveReviews.length);
      } else {
        console.log("[SureShop] API returned 0 reviews — will fall back to DOM");
      }
    } catch (e) {
      console.warn("[SureShop] API fetch threw:", e.message);
    }

    if (!progressiveActive) return; // stopped while awaiting API

    // ---------------------------------------------------------------
    // STEP 2: Click the "Ratings & Reviews" tab so the DOM also loads
    // (feeds the MutationObserver below and covers API failures).
    // ---------------------------------------------------------------
    let reviewTabClicked = false;
    try {
      const allEls = [...document.querySelectorAll(
        "a, button, li, div, span, [role='tab'], [role='menuitem'], [class*='tab'], [class*='nav']"
      )];
      let reviewTab = allEls.find(el => {
        const t = ((el.innerText || el.textContent) || "").trim();
        return /Ratings?\s*[&+]?\s*Reviews?/i.test(t) && t.length < 80;
      });
      if (!reviewTab) {
        reviewTab = allEls.find(el => {
          const t = ((el.innerText || el.textContent) || "").trim();
          return /^Ratings?$|^Reviews?$|^Reviews?\s*\(\d/i.test(t) && t.length < 60;
        });
      }
      if (reviewTab) {
        reviewTab.scrollIntoView({ behavior: "smooth", block: "center" });
        reviewTab.click();
        reviewTabClicked = true;
        console.log("[SureShop] Clicked Reviews tab:", (reviewTab.innerText || reviewTab.textContent).trim().slice(0, 60));
      }
    } catch (_) {}

    // ---------------------------------------------------------------
    // STEP 3: DOM MutationObserver + timed DOM harvest retries.
    // Catches reviews that appear in the DOM after the tab click.
    // ---------------------------------------------------------------
    reviewMutationObserver = new MutationObserver(onReviewDomChange);
    reviewMutationObserver.observe(document.body, { childList: true, subtree: true });

    setTimeout(() => {
      if (!progressiveActive) return;
      const initial = harvestNewReviews();
      if (initial.length > 0) {
        progressiveReviews.push(...initial);
        chrome.runtime.sendMessage({
          type: "LAZADA_REVIEWS_DIRECT",
          reviews: progressiveReviews
        }).catch(() => {});
        sendProgressiveUpdate();
        setCardScanningState(null, null, progressiveReviews.length);
      }
    }, reviewTabClicked ? 1500 : 500);

    let retryCount = 0;
    const retryInterval = setInterval(() => {
      if (!progressiveActive || retryCount >= 10) {
        clearInterval(retryInterval);
        return;
      }
      retryCount++;
      const found = harvestNewReviews();
      if (found.length > 0) {
        progressiveReviews.push(...found);
        chrome.runtime.sendMessage({
          type: "LAZADA_REVIEWS_DIRECT",
          reviews: progressiveReviews
        }).catch(() => {});
        sendProgressiveUpdate();
        setCardScanningState(lastProgressiveScore, lastProgressiveLevel, progressiveReviews.length);
      }
    }, 3000);
  }

  /**
   * Stop the MutationObserver.
   * showCard=true (default): update overlay to final/stopped state and notify popup.
   * showCard=false: silent stop used for SPA navigation and internal resets.
   */
  function stopProgressiveCollection(showCard = true) {
    const wasActive = progressiveActive;
    progressiveActive = false;
    if (reviewMutationObserver) {
      reviewMutationObserver.disconnect();
      reviewMutationObserver = null;
    }
    clearTimeout(progressiveDebounceTimer);
    if (showCard && wasActive) {
      setCardStoppedState(lastProgressiveScore, lastProgressiveLevel, progressiveReviews.length);
      notifyPopupStopped();
    }
  }

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

    if (message.type === "EXTRACT_REVIEWS") {
      console.log("Lazada: handling EXTRACT_REVIEWS");
      const reviews = extractLazadaReviews(10);
      console.log("Lazada extracted reviews:", reviews);
      sendResponse({ reviews: reviews.value });
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

    if (message.type === "LAZADA_RESTART_COLLECTION") {
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

    console.log("Unknown message type:", message.type);
    return false;
  });
})();
