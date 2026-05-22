(() => {
  // ===============================
  // Hard Guard: Facebook Marketplace only
  // ===============================
  if (!location.hostname.includes("facebook.com")) return;

  // Only activate on Marketplace pages
  if (!location.pathname.startsWith("/marketplace")) return;

  const DEBUG = false;
  const dbg = (...a) => { if (DEBUG) console.log(...a); };
  const dbgErr = (...a) => { if (DEBUG) console.error(...a); };
  dbg("SureShop content_facebook.js loaded (Facebook Marketplace)");

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
          <div class="ready-desc">Click below or open the SureShop side panel to scan</div>
          <button class="scan-now-btn"><i class="fas fa-shield-alt"></i> Open SureShop</button>
        </div>
      </div>
    `;

    const style = document.createElement("style");
    style.textContent = `
      #sureshopph-fb-scan-card {
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
        animation: slideInFbCard 0.3s ease;
        border-left: 4px solid #1b9c85;
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
        padding: 14px 16px;
        background: linear-gradient(135deg, #1b9c85 0%, #138a73 100%);
        color: #fff;
        border-radius: 2rem 2rem 0 0;
        margin: 0;
        position: relative;
        overflow: hidden;
      }

      #sureshopph-fb-scan-card .header::before {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(45deg, rgba(255,255,255,0.12) 0%, transparent 60%);
        pointer-events: none;
      }

      #sureshopph-fb-scan-card .title-section {
        display: flex;
        align-items: center;
        gap: 10px;
        position: relative;
        z-index: 1;
      }

      #sureshopph-fb-scan-card .title-section i {
        color: #fff;
        font-size: 18px;
        opacity: 0.95;
      }

      #sureshopph-fb-scan-card .title-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      #sureshopph-fb-scan-card .title-text strong {
        font-size: 15px;
        font-weight: 700;
        color: #fff;
        line-height: 1.1;
      }

      #sureshopph-fb-scan-card .card-subtitle {
        font-size: 10px;
        color: rgba(255,255,255,0.85);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 400;
        line-height: 1;
      }

      #sureshopph-fb-scan-card .body {
        padding: 16px;
        background: #f6f6f9;
        text-align: center;
      }

      #sureshopph-fb-scan-card .ready-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      #sureshopph-fb-scan-card .ready-status-badge {
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

      #sureshopph-fb-scan-card .ready-badge {
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

      #sureshopph-fb-scan-card .ready-title {
        font-size: 13px;
        font-weight: 700;
        color: #363949;
      }

      #sureshopph-fb-scan-card .ready-desc {
        font-size: 11px;
        color: #677483;
        line-height: 1.5;
      }

      #sureshopph-fb-scan-card .close {
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

      #sureshopph-fb-scan-card .close:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.1);
      }

      #sureshopph-fb-scan-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 2.5rem 4rem rgba(27, 156, 133, 0.25);
      }

      #sureshopph-fb-scan-card.dismissing {
        opacity: 0;
        transform: translateY(-12px) scale(0.95);
        transition: all 0.25s ease;
      }

      #sureshopph-fb-scan-card .scan-now-btn {
        background: linear-gradient(135deg, #1b9c85, #138a73);
        color: #fff;
        border: none;
        border-radius: 1.2rem;
        padding: 7px 18px;
        font-size: 12px;
        font-weight: 600;
        font-family: 'Poppins', system-ui, sans-serif;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        box-shadow: 0 4px 12px rgba(27,156,133,0.35);
        transition: all 0.2s ease;
      }
      #sureshopph-fb-scan-card .scan-now-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(27,156,133,0.45);
      }
    `;

    if (!document.getElementById('sureshop-fa-css')) {
      const faLink = document.createElement('link');
      faLink.id = 'sureshop-fa-css';
      faLink.rel = 'stylesheet';
      faLink.href = chrome.runtime.getURL('assets/fonts/fa/fa-solid-combined.css');
      document.head.appendChild(faLink);
    }
    document.head.appendChild(style);
    document.body.appendChild(card);

    card.querySelector(".close").addEventListener("click", () => {
      card.classList.add("dismissing");
      setTimeout(() => card.remove(), 250);
    });

    card.querySelector(".scan-now-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" },
        () => { if (chrome.runtime.lastError) {} });
    });

    setTimeout(() => {
      const existing = document.getElementById("sureshopph-fb-scan-card");
      if (existing) {
        existing.classList.add("dismissing");
        setTimeout(() => existing.remove(), 250);
      }
    }, 8000);
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
    const priceRe = /(?:₱|PHP)\s*([\d,]+(?:\.\d{2})?)/gi;
    // Matches ranges with OR without currency symbol: ₱400–₱1,000 / PHP400-PHP1000 / 400 - 1,000
    const rangeRe = /(?:(?:₱|PHP)\s*)?([\d,]{1,10})\s*[-–—]\s*(?:₱|PHP)?\s*([\d,]{1,10})(?!\d)/;

    function isRange(text) {
      const m = text.match(rangeRe);
      if (!m) return false;
      const lo = parseFloat(m[1].replace(/,/g, ""));
      const hi = parseFloat(m[2].replace(/,/g, ""));
      // Only treat as a price range if both numbers look like money values
      return lo >= 1 && hi > lo && hi < 100_000_000;
    }

    // Strategy 1: og:description (server-side, most reliable)
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      const content = ogDesc.getAttribute("content") || "";
      const firstPart = content.split("·")[0];
      if (/\bfree\b/i.test(firstPart)) return { value: 0, confidence: "high" };
      if (isRange(firstPart)) return { value: null, confidence: "low", variant: true };
      const matches = [...content.matchAll(priceRe)];
      if (matches.length > 0) {
        const price = parseFloat(matches[0][1].replace(/,/g, ""));
        if (price >= 1 && price < 100_000_000) return { value: price, confidence: "high" };
      }
    }

    // Strategy 2: visible text walker
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const el = node.parentElement;
          if (!el) return NodeFilter.FILTER_REJECT;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim();
      if (!text) continue;
      if (/\bfree\b/i.test(text) && text.length < 20) return { value: 0, confidence: "high" };
      if (isRange(text)) return { value: null, confidence: "low", variant: true };
      const matches = [...text.matchAll(priceRe)];
      if (matches.length > 0) {
        const price = parseFloat(matches[0][1].replace(/,/g, ""));
        if (price >= 1 && price < 100_000_000) return { value: price, confidence: "medium" };
      }
    }

    return { value: null, confidence: "low" };
  }

  function extractSellerName() {
    const isNavLabel = t => /^(marketplace|facebook marketplace|chats?|notifications?|home|watch|groups?|gaming|menu|create|friends?|messenger|see all|seller details?|seller information|listed by|more)$/i.test(t);

    // Strategy 1: seller profile links — DOM-first, fastest and most reliable
    const profileLinks = [...document.querySelectorAll(
      'a[href*="/marketplace/profile/"], a[href*="/user/"], a[href*="/profile.php"]'
    )];
    for (const link of profileLinks) {
      const text = cleanText(link.textContent);
      if (text && text.length > 1 && text.length < 60 && !isNavLabel(text) && !/[?!]/.test(text)) {
        return { value: text, confidence: "high" };
      }
    }

    // Strategy 2: aria-label hints for "listed by" / "seller"
    const sellerEls = [...document.querySelectorAll("[aria-label]")]
      .filter(el => /seller|listed by/i.test(el.getAttribute("aria-label") || ""));
    for (const el of sellerEls) {
      const text = cleanText(el.textContent);
      if (text && text.length > 1 && text.length < 60 && !isNavLabel(text) && !/[?!]/.test(text)) {
        return { value: text, confidence: "high" };
      }
    }

    // Strategy 3: innerText scan — slower, last resort
    try {
      const bodyText = document.body.innerText;
      const match = bodyText.match(/Seller\s+information[\s\S]{0,300}?\n([^\n]{2,60})\n/);
      if (match) {
        const candidate = cleanText(match[1]);
        if (candidate && !isNavLabel(candidate) && !/[?!]/.test(candidate)) {
          return { value: candidate, confidence: "medium" };
        }
      }
    } catch (_) {}

    return { value: null, confidence: "low" };
  }

  function extractCondition() {
    const bodyText = document.body.innerText;
    // Normalize em/en dashes to hyphens before matching
    const normalized = bodyText.replace(/[\u2013\u2014]/g, "-");
    const conditions = ["New", "Used - Like New", "Used - Good", "Used - Fair", "For parts or not working"];
    for (const condition of conditions) {
      if (normalized.includes(condition)) return { value: condition, confidence: "high" };
    }
    const match = normalized.match(/Condition[:\s]+([^\n]{2,40})/i);
    if (match) return { value: cleanText(match[1]), confidence: "medium" };
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

  function extractImageCount() {
    // Count large Facebook CDN images as product photos
    const productImgs = [...document.querySelectorAll('img[src*="scontent"]')]
      .filter(img => {
        const rect = img.getBoundingClientRect();
        return rect.width >= 100 && rect.height >= 100;
      });
    if (productImgs.length > 0) return { value: productImgs.length, confidence: "medium" };
    // Fallback: at least 1 if og:image is set
    if (document.querySelector('meta[property="og:image"]')) return { value: 1, confidence: "low" };
    return { value: null, confidence: "low" };
  }

  // ===============================
  // Seller Rating Extractor (Facebook)
  // ===============================
  function extractSellerRating() {
    const RATING_WITH_COUNT = /([1-5](?:\.\d+)?)\s*[·•\u00b7]?\s*\(?(\d+)\s*ratings?\)?/i;
    const RATING_SLASH_5    = /([1-5](?:\.\d+)?)\s*\/\s*5/i;
    const RATING_OUT_OF_5   = /([1-5](?:\.\d+)?)\s+out\s+of\s+5/i;

    function parseRating(text) {
      let m;
      m = text.match(RATING_WITH_COUNT);
      if (m) {
        const v = parseFloat(m[1]);
        if (v >= 1 && v <= 5) return { value: `${v} / 5 (${m[2]} ratings)`, confidence: 'high' };
      }
      m = text.match(RATING_SLASH_5) || text.match(RATING_OUT_OF_5);
      if (m) {
        const v = parseFloat(m[1]);
        if (v >= 1 && v <= 5) return { value: `${v} / 5`, confidence: 'medium' };
      }
      return null;
    }

    function extractCount(text) {
      const m = text.match(/\((\d+)\)/);
      return m ? m[1] : null;
    }

    function countUnicodeStars(text) {
      const filled = (text.match(/[\u2605★⭐]/g) || []).length;
      const empty  = (text.match(/[\u2606☆]/g) || []).length;
      if (filled === 0 && empty === 0) return null;
      return { filled, total: filled + empty };
    }

    // Strategy 1: DOM — walk up from profile link, inspect each container level.
    // Facebook renders stars as SVGs, so we check:
    //   1a) numeric pattern in innerText (covers "4.9 · 73 ratings" etc.)
    //   1b) aria-label on any child element (covers "Rated 5 out of 5 stars" etc.)
    //   1c) counting unicode star chars if SVG renders them as text
    //   1d) just the count "(23)" when stars have no accessible label
    const profileLink = document.querySelector(
      'a[href*="/marketplace/profile/"], a[href*="/user/"], a[href*="/profile.php"]'
    );
    if (profileLink) {
      let el = profileLink.parentElement;
      for (let depth = 0; depth < 6 && el; depth++, el = el.parentElement) {
        const text = el.innerText || '';

        // 1a: numeric rating in text
        const numResult = parseRating(text);
        if (numResult) return numResult;

        // 1b: aria-label on any child (SVG star container usually carries this)
        for (const child of el.querySelectorAll('[aria-label]')) {
          const label = child.getAttribute('aria-label') || '';
          if (/out of 5|star|rated/i.test(label)) {
            const m = label.match(/([1-5](?:\.\d+)?)/); 
            if (m) {
              const v = parseFloat(m[1]);
              if (v >= 1 && v <= 5) {
                const count = extractCount(text);
                return { value: count ? `${v} / 5 (${count} ratings)` : `${v} / 5`, confidence: 'high' };
              }
            }
          }
        }

        // 1c: unicode star counting
        const stars = countUnicodeStars(text);
        if (stars && stars.total >= 3 && stars.total <= 5) {
          const count = extractCount(text);
          return {
            value: count ? `${stars.filled} / 5 (${count} ratings)` : `${stars.filled} / 5`,
            confidence: 'medium'
          };
        }

        // 1d: count-only fallback when "Highly rated" badge confirms seller has ratings
        if (/highly rated/i.test(text)) {
          const count = extractCount(text);
          if (count) return { value: `(${count} ratings)`, confidence: 'low' };
        }
      }
    }

    // Strategy 2: aria-label on rating elements anywhere on the page
    for (const el of document.querySelectorAll('[aria-label*="out of 5" i], [aria-label*="rated" i], [aria-label*="rating" i], [aria-label*="stars" i]')) {
      const label = el.getAttribute('aria-label') || '';
      const m = label.match(/([1-5](?:\.\d+)?)/); 
      if (m) {
        const v = parseFloat(m[1]);
        if (v >= 1 && v <= 5) return { value: `${v} / 5`, confidence: 'high' };
      }
    }

    // Strategy 3: narrow text window after "Seller information" heading
    const bodyText = document.body.innerText;
    const sellerIdx = bodyText.search(/\bSeller\s+information\b/i);
    if (sellerIdx !== -1) {
      const section = bodyText.slice(sellerIdx, sellerIdx + 400);
      const result = parseRating(section);
      if (result) return result;
      const stars = countUnicodeStars(section);
      if (stars && stars.total >= 3 && stars.total <= 5) {
        const count = extractCount(section);
        return { value: count ? `${stars.filled} / 5 (${count} ratings)` : `${stars.filled} / 5`, confidence: 'medium' };
      }
    }

    // Strategy 4: narrow window around "Joined" keyword
    const joinedIdx = bodyText.search(/\bJoined\s+\w+\b/i);
    if (joinedIdx !== -1) {
      const nearby = bodyText.slice(Math.max(0, joinedIdx - 200), joinedIdx + 200);
      const result = parseRating(nearby);
      if (result) return result;
    }

    // Strategy 5: full-body fallback
    const result = parseRating(bodyText);
    if (result) return result;

    return { value: null, confidence: 'low' };
  }

  // ===============================
  // Seller Join Date Extractor (Facebook)
  // ===============================
  function extractSellerJoinDate() {
    const bodyText = document.body.innerText;
    // "Joined Facebook in 2012", "Joined September 2018", "Joined in 2020"
    const m = bodyText.match(/Joined(?:\s+Facebook)?\s+(?:in\s+)?([A-Za-z]+\s+\d{4}|\d{4})/i);
    if (m) return { value: cleanText(m[1]), confidence: 'high' };
    return { value: null, confidence: 'low' };
  }

  // ===============================
  // Vehicle / Item Attributes Extractor
  // ===============================
  function extractVehicleAttributes() {
    const bodyText = document.body.innerText;

    // Matches "About this vehicle", "About this item", "About this listing"
    const headingMatch = bodyText.match(/\bAbout\s+this\s+(vehicle|item|listing|product)\b/i);
    if (!headingMatch) return null;

    const start = headingMatch.index + headingMatch[0].length;
    const section = bodyText.slice(start, start + 1500);

    // Stop when a new section heading appears
    const stopRe = /\n(Seller[\u2019']?s?\s+description|Seller\s+details|Seller\s+information|Comments?|Similar\s+listings?|Message|See\s+less)\b/i;
    const stopIdx = section.search(stopRe);
    const slice = (stopIdx !== -1 ? section.slice(0, stopIdx) : section).trim();

    const lines = slice
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 2 && !/^(See\s+(more|less)|Details?|\[Details\])$/i.test(l));

    return lines.length > 0 ? lines : null;
  }

  function extractDescription() {
    const priceRe = /^(PHP|₱)\s*[\d,]+/i;
    const conditionRe = /^(new|used\s*-|for\s*parts)/i;
    // Lines that look like FB Marketplace structured data, not free-form seller text
    const structuredLineRe = /^(\[Details\]|Details\s*$|Condition[:\s]|Location[:\s]|Listed\s|Sold\s|Used\s*-|New\s*$|For\s+parts)/i;
    // UI / chrome / nav lines that should never be treated as the description
    const uiLineRe = /^(Message|Save|Share|See\s+(translation|more|less|details)|Seller\s+information|Seller\s+details|Similar\s+listings?|Marketplace|Comments?|Buy\s+now|Make\s+offer|Send\s+message|Report|More\s+from|You\s+May)\b/i;

    const looksLikeDescription = (txt) => {
      if (!txt) return false;
      const t = txt.trim();
      return t.length > 15 &&
             !priceRe.test(t) &&
             !structuredLineRe.test(t) &&
             !uiLineRe.test(t);
    };

    // Strategy 1: og:description — usually price·condition·location·desc OR
    // a single newline-joined block. Both cases need structured-line filtering.
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      const content = ogDesc.getAttribute("content") || "";
      const parts = content.split("·").map(p => p.trim()).filter(Boolean);

      // Try the "·" split path first
      if (parts.length >= 2) {
        const descParts = parts.filter(p => looksLikeDescription(p));
        if (descParts.length > 0) {
          return { value: cleanText(descParts.join(" ")).slice(0, 3000), confidence: "medium" };
        }
      }

      // Fall through: try newline-splitting any single content blob
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      const descLines = lines.filter(looksLikeDescription);
      if (descLines.length > 0) {
        return { value: cleanText(descLines.join(' ')).slice(0, 3000), confidence: "medium" };
      }
      // Otherwise og:description had nothing useful — continue to body strategies
    }

    const bodyText = document.body.innerText;

    // Strategy 2: Facebook layout — seller's free-form text sits BETWEEN
    // "Condition" + value lines and the "See translation" / map / Location block.
    // We grab a window starting after "Condition" and pull the longest line block
    // that isn't structured/UI noise.
    const condIdx = bodyText.search(/\bCondition\b/i);
    if (condIdx !== -1) {
      const window = bodyText.slice(condIdx, condIdx + 3000);
      const stopMatch = window.search(
        /\n(See\s+translation|See\s+less|Seller\s+information|Seller\s+details|Location\s+is\s+approximate|Similar\s+listings?)\b/i
      );
      const slice = stopMatch !== -1 ? window.slice(0, stopMatch) : window;

      const candidateLines = slice
        .split('\n')
        .map(l => l.trim())
        .filter(looksLikeDescription);

      if (candidateLines.length > 0) {
        // Join consecutive description lines — preserves multi-line listings
        return { value: cleanText(candidateLines.join('\n')).slice(0, 3000), confidence: "high" };
      }
    }

    // Strategy 3: explicit "Description" heading anywhere on the page
    const descIdx = bodyText.search(/\bDescription\b/i);
    if (descIdx !== -1) {
      const section = bodyText.slice(descIdx + "Description".length, descIdx + 2000);
      const lines = section.split('\n').map(l => l.trim());
      const stopLine = lines.findIndex(l =>
        /^(Seller\s+information|Similar\s+listings?|You\s+May|Marketplace|Comments?)/i.test(l)
      );
      const trimmed = (stopLine !== -1 ? lines.slice(0, stopLine) : lines).filter(looksLikeDescription);
      if (trimmed.length > 0) {
        return { value: cleanText(trimmed.join('\n')).slice(0, 3000), confidence: "medium" };
      }
    }

    // Strategy 4: DOM containers with description-related attributes
    const descSelectors = [
      '[data-testid*="description"]',
      '[aria-label*="description" i]',
      '[class*="description"]'
    ];
    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = cleanText(el.textContent);
        if (looksLikeDescription(text)) {
          return { value: text.slice(0, 3000), confidence: "medium" };
        }
      }
    }

    return { value: null, confidence: "low" };
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
      facebook: ['price','seller_name','seller_rating','shop_age','condition','location','listing_date','description','image_count'],
    };
    const missing = (TRACKED[platform] || []).filter(f => {
      const v = d[f];
      return v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v));
    });
    // Zero-inference: count fields absent from new listings are sent as 0 to the
    // backend (a meaningful signal) instead of null. Recorded in inferred_zero so
    // the UI can still display "Not found" for these fields.
    const ZERO_INFER = {
      shopee:   ['sold_count', 'rating', 'rating_count'],
      lazada:   ['sold_count', 'rating', 'rating_count'],
      facebook: [],
    };
    const inferred_zero = [];
    for (const f of (ZERO_INFER[platform] || [])) {
      if (d[f] === null || d[f] === undefined) {
        d[f] = f === 'sold_count' ? '0' : 0;
        inferred_zero.push(f);
      }
    }
    d.data_quality = { missing, inferred_zero };
    return d;
  }

  // ===============================
  // Main Extraction
  // ===============================
  function extractFacebookData() {
    dbg("Extracting Facebook Marketplace data...");
    try {
      const productName = extractProductName();
      const price = extractPrice();
      const sellerName = extractSellerName();
      const sellerRating = extractSellerRating();
      const sellerJoinDate = extractSellerJoinDate();
      const condition = extractCondition();
      const locationInfo = extractLocation();
      const listingDate = extractListingDate();
      const description = extractDescription();
      const vehicleAttrs = extractVehicleAttributes();
      const imageCount = extractImageCount();

      // Build a details prefix from structured fields and prepend to description
      const detailLines = [];
      if (condition.value) detailLines.push(`Condition: ${condition.value}`);
      if (locationInfo.value) detailLines.push(`Location: ${locationInfo.value}`);
      if (listingDate.value) detailLines.push(`Listed: ${listingDate.value}`);
      let detailsPrefix = detailLines.length > 0
        ? `[Details]\n${detailLines.join("\n")}\n\n`
        : "";
      if (vehicleAttrs && vehicleAttrs.length > 0) {
        detailsPrefix += `[About this listing]\n${vehicleAttrs.join("\n")}\n\n`;
      }
      const fullDescription = detailsPrefix + (description.value || "");

      return sanitizeData({
        success: true,
        platform: "facebook",
        product_name: productName.value,
        price: price.value,
        price_is_variant: price.variant || false,
        seller_name: sellerName.value,
        seller_rating: sellerRating.value,
        shop_age: sellerJoinDate.value,
        condition: condition.value,
        location: locationInfo.value,
        listing_date: listingDate.value,
        description: fullDescription || null,
        image_count: imageCount.value,
        // Explicit nulls — backend skips scoring checks that don't apply to FB
        sold_count: null,
        rating: null,
        rating_count: null,
        response_rate: null,
        listing_url: window.location.href,
        extracted_at: new Date().toISOString()
      }, 'facebook');
    } catch (err) {
      dbgErr("extractFacebookData error:", err);
      return { success: false, error: err.message };
    }
  }

  // ===============================
  // Page Detection & Messaging
  // ===============================
  let latestData = null;
  let dataStale = true;

  function checkAndShowCard() {
    if (isListingPage()) {
      dbg("Facebook Marketplace listing detected, showing scan card");
      showScanCard();
    }
  }

  // Eagerly extract so GET_CURRENT_DATA works immediately on popup open
  if (isListingPage()) {
    try { latestData = extractFacebookData(); dataStale = false; } catch (_) {}
  }

  checkAndShowCard();

  chrome.runtime.sendMessage(
    { type: isListingPage() ? "FACEBOOK_MARKETPLACE_PAGE" : "FACEBOOK_NOT_MARKETPLACE_PAGE" },
    () => { if (chrome.runtime.lastError) {} }
  );

  // ===============================
  // SPA Navigation Detection
  // ===============================
  let lastUrl = location.href;

  setInterval(() => {
    if (location.href === lastUrl) return;
    dbg("Facebook URL changed (SPA):", lastUrl, "→", location.href);
    lastUrl = location.href;
    dataStale = true;

    // Remove scan card if we've left a listing page
    if (!isListingPage()) {
      const existing = document.getElementById("sureshopph-fb-scan-card");
      if (existing) { existing.classList.add("dismissing"); setTimeout(() => existing.remove(), 250); }
    }

    if (!location.pathname.startsWith("/marketplace")) return;

    // Re-extract data for the new listing
    if (isListingPage()) {
      try { latestData = extractFacebookData(); dataStale = false; } catch (_) {}
    }

    checkAndShowCard();
    chrome.runtime.sendMessage(
      { type: isListingPage() ? "FACEBOOK_MARKETPLACE_PAGE" : "FACEBOOK_NOT_MARKETPLACE_PAGE" },
      () => { if (chrome.runtime.lastError) {} }
    );
  }, 500);

  // ===============================
  // Message Handler
  // ===============================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    dbg("Facebook content script received message:", message.type);

    if (message.type === "EXTRACT_DATA") {
      try {
        const data = extractFacebookData();
        latestData = data; dataStale = false;
        sendResponse(data);
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (message.type === "EXTRACT_REVIEWS") {
      // Comment collection removed — Facebook Marketplace rarely has public comments
      sendResponse({ reviews: [] });
      return true;
    }

    if (message.type === "GET_PROGRESSIVE_REVIEWS") {
      sendResponse({ reviews: [] });
      return true;
    }

    if (message.type === "COLLECT_PAGE_DATA") {
      try {
        latestData = extractFacebookData();
        dataStale = false;
        sendResponse(latestData);
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    if (message.type === "GET_CURRENT_DATA") {
      sendResponse({ stale: dataStale, data: latestData });
      return true;
    }

    return false;
  });
})();
