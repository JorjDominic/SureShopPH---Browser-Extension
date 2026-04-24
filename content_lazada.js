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

  function extractProductDescription() {
    // Strategy 1: dedicated description containers
    const descSelectors = [
      '[class*="pdp-product-desc"]',
      '[class*="detail-content"]',
      "#html-desc",
      '[class*="description-content"]',
      '[class*="pdp-mod-product-description"]'
    ];

    for (const selector of descSelectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 10) {
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

    return false;
  });
})();
