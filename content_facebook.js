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

  function extractDescription() {
    const priceRe = /^(PHP|₱)\s*[\d,]+/i;
    const conditionRe = /^(new|used\s*-|for\s*parts)/i;

    // Strategy 1: og:description — format varies: price·condition·location·desc OR price·desc
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      const content = ogDesc.getAttribute("content") || "";
      const parts = content.split("·").map(p => p.trim()).filter(Boolean);

      if (parts.length >= 2) {
        // Remove parts that look like price or known condition labels
        const descParts = parts.filter(p => !priceRe.test(p) && !conditionRe.test(p));
        if (descParts.length > 0) {
          const desc = cleanText(descParts.join(" "));
          if (desc && desc.length > 5) {
            return { value: desc.slice(0, 3000), confidence: "medium" };
          }
        }
      } else if (parts.length === 1 && !priceRe.test(parts[0]) && parts[0].length > 5) {
        return { value: parts[0].slice(0, 3000), confidence: "low" };
      }
    }

    // Strategy 2: look for a "Description" heading in visible page text
    const bodyText = document.body.innerText;
    const idx = bodyText.search(/\bDescription\b/i);
    if (idx !== -1) {
      const section = bodyText.slice(idx + "Description".length, idx + 1200).trim();
      const stopIdx = section.search(
        /\n(Seller|Condition|Location|Listed|Similar|You May|Message|Marketplace|Comments?)/i
      );
      const desc = (stopIdx !== -1 ? section.slice(0, stopIdx) : section).trim();
      if (desc.length > 5) {
        return { value: desc.slice(0, 3000), confidence: "medium" };
      }
    }

    // Strategy 3: DOM containers with description-related attributes
    const descSelectors = [
      '[data-testid*="description"]',
      '[aria-label*="description" i]',
      '[class*="description"]'
    ];
    for (const sel of descSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = cleanText(el.textContent);
        if (text && text.length > 10 && !priceRe.test(text) && !conditionRe.test(text)) {
          return { value: text.slice(0, 3000), confidence: "medium" };
        }
      }
    }

    return { value: null, confidence: "low" };
  }

  // ===============================
  // Comments Extractor (Facebook Marketplace)
  // ===============================
  function extractFacebookComments(maxComments = 10) {
    const comments = [];

    // Strategy 1: DOM — find comment articles inside a comments section
    const commentWrappers = [...document.querySelectorAll(
      '[aria-label*="comment" i], [aria-label*="Comment" i]'
    )].filter(el => el.tagName !== 'BUTTON' && el.querySelectorAll('[role="article"]').length > 0);

    if (commentWrappers.length > 0) {
      const articles = [...commentWrappers[0].querySelectorAll('[role="article"]')].slice(0, maxComments * 2);
      for (const article of articles) {
        // Skip seller/seller-response articles
        const ariaLabel = (article.getAttribute('aria-label') || "").toLowerCase();
        if (/seller|response from seller/i.test(ariaLabel)) continue;

        // Username: first link or strong inside the comment
        const nameEl = article.querySelector(
          'a[href*="/user/"] strong, a[href*="profile.php"] strong, a[href*="/user/"], strong'
        );
        const username = nameEl ? cleanText(nameEl.textContent) : null;

        // Skip if the comment text starts with seller-response indicators
        const allLeafTexts = [...article.querySelectorAll('*')]
          .filter(el => el.childElementCount === 0)
          .map(el => cleanText(el.textContent))
          .filter(Boolean);

        const isSellerReply = allLeafTexts.some(t =>
          /^(Seller['']?s?\s*(Reply|Response)|Response\s+from\s+Seller)/i.test(t)
        );
        if (isSellerReply) continue;

        // Comment text: longest meaningful leaf
        const text = allLeafTexts
          .filter(t =>
            t && t !== username && t.length > 3 &&
            !/^(\d+|just now|\d+\s*(min|hr|h|hour|day|week|month|year)s?\s*(ago)?|Like|Reply|See more)$/i.test(t)
          )
          .sort((a, b) => b.length - a.length)[0] || null;

        if (text && comments.length < maxComments) {
          comments.push({ username: username || "Anonymous", rating_stars: null, text, date: null, variant: null });
        }
      }
      if (comments.length > 0) return { value: comments, confidence: "high" };
    }

    // Strategy 2: innerText parsing — find "Comments" section and parse lines
    const bodyText = document.body.innerText;
    const idx = bodyText.search(/\bComments?\b/);
    if (idx !== -1) {
      const section = bodyText.slice(idx, idx + 6000);
      const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      let i = 1; // skip "Comments" header line
      let inSellerResponse = false;
      while (i < lines.length && comments.length < maxComments) {
        const line = lines[i];

        // Detect and skip seller response blocks
        if (/^(Seller['']?s?\s*(Reply|Response)|Response\s+from\s+Seller)/i.test(line)) {
          inSellerResponse = true; i++; continue;
        }
        // End of seller response block when we hit a new short username-like line
        if (inSellerResponse && line.length <= 60 &&
            !/^(just now|\d+\s*(min|hr|h|hour|day|week|month|year)s?|Like|Reply)/i.test(line)) {
          inSellerResponse = false;
        }
        if (inSellerResponse) { i++; continue; }

        // Skip known meta/UI lines
        if (/^(\d+\s+Comment|See\s+all|Most\s+Relevant|Load\s+more|Like|Reply|Write\s+a|Add\s+a)/i.test(line)) { i++; continue; }
        if (/^\d+$/.test(line) || line.length < 3) { i++; continue; }
        if (/^(just now|\d+\s*(min|hr|h|hour|day|week|month|year)s?\s*(ago)?|[A-Z][a-z]+ \d+)$/i.test(line)) { i++; continue; }

        // Short line (<= 60 chars) followed by a longer comment line
        if (line.length <= 60 && i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (
            nextLine && nextLine.length > 5 &&
            !/^(\d+\s+Comment|Like|Reply|Write|Add|just now|\d+\s*(min|hr|h|hour|day|week|month)s?)/i.test(nextLine)
          ) {
            comments.push({ username: line, rating_stars: null, text: nextLine, date: null, variant: null });
            i += 2;
            continue;
          }
        }
        i++;
      }
    }

    return { value: comments, confidence: comments.length > 0 ? "medium" : "low" };
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
    const description = extractDescription();

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
      description: description.value,
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

    if (message.type === "EXTRACT_REVIEWS") {
      console.log("Facebook: handling EXTRACT_REVIEWS");
      const comments = extractFacebookComments(10);
      console.log("Facebook extracted comments:", comments);
      sendResponse({ reviews: comments.value });
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
