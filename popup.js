// -----------------------------------------------------------------------
// API base URL — update this to your production HTTPS endpoint before
// submitting to the Chrome Web Store. HTTP localhost is only for local dev.
// -----------------------------------------------------------------------
const SURESHOP_API_BASE = "http://localhost/php/sureshopwebsite/app/controller";

const output = document.getElementById("output");
const scanBtn = document.getElementById("scanBtn");
const activationSection = document.getElementById("activationSection");
const scanSection = document.getElementById("scanSection");
const activateBtn = document.getElementById("activateBtn");
const activationKeyInput = document.getElementById("activationKey");
const activationMessage = document.getElementById("activationMessage");

function showActivationMessage(text, isError = true) {
  activationMessage.textContent = text;
  activationMessage.className = isError ? "activation-msg activation-msg--error" : "activation-msg activation-msg--success";
}

// On popup open: decide which UI to show
chrome.storage.local.get(["accessToken"], ({ accessToken }) => {
  if (accessToken) {
    activationSection.style.display = "none";
    scanSection.style.display = "block";
    
    // Check for automatic scan results on popup open - ONLY PRODUCT SCANS
    checkForAutoScanResults();
  } else {
    activationSection.style.display = "block";
    scanSection.style.display = "none";
  }
});

function checkForAutoScanResults() {
  // Check if there are recent auto-scan results to display - ONLY PRODUCT SCANS
  chrome.storage.local.get("lastAutoScanResult", ({ lastAutoScanResult }) => {
    if (lastAutoScanResult && isRecentResult(lastAutoScanResult.timestamp)) {
      console.log("Found recent auto-scan result:", lastAutoScanResult);
      
      // ONLY show PRODUCT scan results in the extension popup
      if (lastAutoScanResult.type === "product") {
        console.log("Displaying product scan result");
        showRiskAssessment(
          lastAutoScanResult.risk_score, 
          lastAutoScanResult.risk_level,
          lastAutoScanResult.description || null
        );
      } else {
        console.log("Ignoring non-product scan result in extension popup:", lastAutoScanResult.type);
        // Don't show URL scan results in the extension popup
        // URL scan results are shown in the universal popup on the webpage
      }
    } else {
      console.log("No recent product scan results found");
    }
  });
}

function isRecentResult(timestamp) {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  return (now - timestamp) < fiveMinutes;
}

// Handle activation (ONE TIME) - Updated with better error handling
activateBtn.addEventListener("click", async () => {
  console.log("Activate clicked");
  const key = activationKeyInput.value.trim();
  if (!key) {
    showActivationMessage("Please enter an activation key.");
    return;
  }
  activationMessage.className = "";

  activateBtn.textContent = "Activating...";
  activateBtn.disabled = true;

  try {
    console.log("Sending activation request...");
    
    const res = await fetch(
      `${SURESHOP_API_BASE}/activate_extension.php`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({ activation_key: key })
      }
    );

    console.log("Response status:", res.status);
    console.log("Response headers:", [...res.headers.entries()]);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const responseData = await res.json();
    console.log("Response data:", responseData);

    // Check for different possible field names
    let accessToken = null;
    
    if (responseData.access_token) {
      accessToken = responseData.access_token;
    } else if (responseData.accessToken) {
      accessToken = responseData.accessToken;
    } else if (responseData.token) {
      accessToken = responseData.token;
    }

    if (accessToken) {
      console.log("Access token found, storing...");
      await chrome.storage.local.set({ 
        accessToken: accessToken,
        activatedAt: Date.now()
      });
      
      activationSection.style.display = "none";
      scanSection.style.display = "block";
    } else {
      console.error("No access token in response:", responseData);
      showActivationMessage("Invalid activation key or server error.");
    }

  } catch (error) {
    console.error("Activation error:", error);
    showActivationMessage("Failed to connect. Please check your connection and try again.");
  } finally {
    activateBtn.textContent = "Activate";
    activateBtn.disabled = false;
  }
});

// Clean function to show only PRODUCT risk assessment
function showRiskAssessment(riskScore, riskLevel, description) {
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Determine risk message for PRODUCTS
  let riskMessage;
  
  if (riskLevel === 'High') {
    riskMessage = 'This product appears risky. Exercise extreme caution and consider avoiding this purchase.';
  } else if (riskLevel === 'Medium') {
    riskMessage = 'This product has some risk factors. Please review carefully before purchasing.';
  } else {
    riskMessage = 'This product appears to be relatively safe based on current analysis.';
  }

  const descriptionHTML = description
    ? `<div class="product-description-block">
        <div class="product-description-label"><i class="fas fa-align-left"></i> Product Description</div>
        <div class="product-description-text">${description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
      </div>`
    : '';

  // Clear the output completely and create clean HTML
  output.innerHTML = '';
  output.style.padding = '20px';
  output.style.textAlign = 'center';
  output.style.fontFamily = 'Poppins, sans-serif';
  
  const container = document.createElement('div');

  container.innerHTML = `
    <div class="result-card">
      <div class="scan-status-badge">
        <i class="fas fa-shield-alt"></i> PRODUCT SCANNED
      </div>

      <div class="risk-badge risk-${riskLevel.toLowerCase()}"></div>

      <div class="risk-level-text risk-${riskLevel.toLowerCase()}">
        PRODUCT RISK: ${riskLevel.toUpperCase()}
      </div>

      <div class="risk-score-text">
        Risk Score: ${riskScore} / 100
      </div>

      <div class="risk-message">
        ${riskMessage}
      </div>

      ${descriptionHTML}

      <div class="scan-time">
        Scanned: ${timestamp}
      </div>
    </div>
  `;
  
  output.appendChild(container);
}

// Enhanced manual scan function - PRODUCTS ONLY
function performScan(isAutomatic = false, withReviews = false) {
  chrome.storage.local.get("accessToken", ({ accessToken }) => {
    if (!accessToken) {
      output.textContent = "❌ Extension not activated. Please enter your activation key.";
      return;
    }

    scanBtn.innerHTML = isAutomatic ? '<i class="fas fa-sync spinning"></i> Auto-scanning...' : '<i class="fas fa-sync spinning"></i> Normal scanning...';
    if (withReviews) {
      commentsBtn.innerHTML = '<i class="fas fa-sync spinning"></i> Deep scanning...';
      commentsBtn.disabled = true;
    }
    scanBtn.disabled = true;
    output.textContent = "🔍 Collecting product information...";

    // Get current tab
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]) {
        output.textContent = "❌ Unable to access current tab.";
        resetButton();
        return;
      }

      const currentTab = tabs[0];
      console.log("Current tab URL:", currentTab.url);

      // Detect platform
      const isShopee = currentTab.url.includes("shopee.ph") && /-i\.\d+\.\d+/.test(currentTab.url);
      const isLazada = currentTab.url.includes("lazada.com.ph") &&
                       currentTab.url.includes("/products/") &&
                       /-i\d+-s\d+\.html/.test(currentTab.url);
      const isFacebook = currentTab.url.includes("facebook.com") &&
                         /\/marketplace\/item\/\d+/.test(currentTab.url);

      if (!isShopee && !isLazada && !isFacebook) {
        output.textContent = "❌ Navigate to a Shopee product page, Lazada product page, or Facebook Marketplace listing to scan.";
        resetButton();
        return;
      }

      // Determine which content script handles this platform
      const contentScript = isShopee ? "content.js"
                          : isLazada ? "content_lazada.js"
                          : "content_facebook.js";

      // Helper: send EXTRACT_DATA message, injecting the content script first if needed
      async function sendExtractData() {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(currentTab.id, { type: "EXTRACT_DATA" }, (response) => {
            if (chrome.runtime.lastError) {
              // Content script not running — inject it then retry once
              chrome.scripting.executeScript(
                { target: { tabId: currentTab.id }, files: [contentScript] },
                () => {
                  if (chrome.runtime.lastError) {
                    resolve(null);
                    return;
                  }
                  // Short delay to let the script initialise
                  setTimeout(() => {
                    chrome.tabs.sendMessage(currentTab.id, { type: "EXTRACT_DATA" }, (retryResponse) => {
                      if (chrome.runtime.lastError) { resolve(null); return; }
                      resolve(retryResponse);
                    });
                  }, 300);
                }
              );
            } else {
              resolve(response);
            }
          });
        });
      }

      // Send message to content script to extract data
      const response = await sendExtractData();
      if (!response) {
        output.textContent = "❌ Unable to scan this page. Please refresh the page and try again.";
        resetButton();
        return;
      }

      if (!response.success) {
        output.textContent = "❌ Failed to extract product data. Please try again.";
        resetButton();
        return;
      }

      console.log("Extracted data:", response);
      console.log("Product name from extraction:", response.product_name);
      output.textContent = "📡 Analyzing product data...";

      try {
        // Format data for scan.php
        // Normalize price: ensure it is always a number ("Free" → 0)
        const rawPrice = response.price;
        const normalizedPrice = (typeof rawPrice === 'string' && /free/i.test(rawPrice))
          ? 0
          : (rawPrice !== undefined && rawPrice !== null ? rawPrice : null);

        const productData = {
          url: currentTab.url,
          platform: response.platform || "shopee",
          product_name: response.product_name,
          price: normalizedPrice,
          sold_count: response.sold_count,
          rating: response.rating,
          rating_count: response.rating_count,
          // Shopee-specific
          response_rate: response.response_rate,
          shop_age: response.shop_age,
          // Lazada-specific
          seller_rating: response.seller_rating,
          // Facebook-specific
          condition: response.condition,
          location: response.location,
          listing_date: response.listing_date,
          listing_url: response.listing_url || currentTab.url,
          // Common
          seller_name: response.seller_name,
          profile_url: response.profile_url,
          image_count: response.image_count,
          description: response.description || null
        };

        console.log("Product data to send to scan.php:", productData);

        const scanResponse = await fetch(
          `${SURESHOP_API_BASE}/scan.php`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify(productData)
          }
        );

        if (!scanResponse.ok) {
          const errorText = await scanResponse.text();
          console.error("Server error:", scanResponse.status, errorText);
          throw new Error(`Server error: ${scanResponse.status}`);
        }

        const result = await scanResponse.json();
        console.log("Scan result:", result);

        if (result.risk_score !== undefined && result.risk_level !== undefined) {
          // Store result for later retrieval
          const storageData = {
            lastAutoScanResult: {
              type: "product",
              risk_score: result.risk_score,
              risk_level: result.risk_level,
              description: response.description || null,
              timestamp: Date.now(),
              url: currentTab.url,
              tabId: currentTab.id
            }
          };

          await chrome.storage.local.set(storageData);

          // Show results
          showRiskAssessment(result.risk_score, result.risk_level, response.description || null);

          // Deep Scan: append reviews after risk card
          if (withReviews) {
            const isShopee = currentTab.url.includes("shopee.ph");
            const isLazada = currentTab.url.includes("lazada.com.ph");
            const isFacebook = currentTab.url.includes("facebook.com") &&
                               /\/marketplace\/item\/\d+/.test(currentTab.url);
            if (isShopee || isLazada || isFacebook) {
              const delay = isLazada ? 600 : 0;
              setTimeout(() => {
                chrome.tabs.sendMessage(currentTab.id, { type: "EXTRACT_REVIEWS" }, (reviewResponse) => {
                  appendReviewsToOutput(reviewResponse?.reviews || [], isLazada);
                });
              }, delay);
            }
          }
        } else {
          output.textContent = "❌ Invalid response from server. Please try again.";
        }
      } catch (error) {
        console.error("Scan failed:", error);
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          output.textContent = "❌ Cannot reach the server. Please make sure the local server is running at " + SURESHOP_API_BASE + " and try again.";
        } else if (error.message && error.message.startsWith("Server error:")) {
          output.textContent = `❌ ${error.message}. Please try again later.`;
        } else {
          output.textContent = `❌ Scan failed: ${error.message}`;
        }
      } finally {
        resetButton();
      }
    });
  });
}

// Normal scan
scanBtn.addEventListener("click", () => {
  performScan(false, false);
});

// Deep Scan = normal scan + reviews
const commentsBtn = document.getElementById("commentsBtn");
commentsBtn.addEventListener("click", () => {
  performScan(false, true);
});

// Unbind activation key
const unbindBtn = document.getElementById("unbindBtn");
const unbindMessage = document.getElementById("unbindMessage");

function showUnbindMessage(text, isError = true) {
  unbindMessage.textContent = text;
  unbindMessage.className = "visible " + (isError ? "unbind-msg--error" : "unbind-msg--success");
}

function hideUnbindMessage() {
  unbindMessage.className = "";
  unbindMessage.textContent = "";
}

unbindBtn.addEventListener("click", async () => {
  if (!confirm("Remove your activation key from this device? You will need to re-enter it to use SureShop again.")) return;

  unbindBtn.disabled = true;
  unbindBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Unbinding...';
  hideUnbindMessage();

  try {
    const { accessToken } = await chrome.storage.local.get("accessToken");

    // Notify the server so the key can be freed/audited
    if (accessToken) {
      try {
        await fetch(`${SURESHOP_API_BASE}/deactivate_extension.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          },
          body: JSON.stringify({ access_token: accessToken })
        });
      } catch (_) {
        // Server unreachable — still remove locally
      }
    }

    // Always clear local storage regardless of server response
    await chrome.storage.local.remove(["accessToken", "activatedAt", "lastAutoScanResult"]);

    showUnbindMessage("Activation key removed successfully.", false);

    setTimeout(() => {
      scanSection.style.display = "none";
      activationSection.style.display = "flex";
      hideUnbindMessage();
      output.textContent = "";
    }, 1200);

  } catch (error) {
    console.error("Unbind error:", error);
    showUnbindMessage("Failed to unbind. Please try again.");
    unbindBtn.disabled = false;
    unbindBtn.innerHTML = '<i class="fas fa-unlink"></i> Unbind Activation Key';
  }
});

function appendReviewsToOutput(reviews, isLazada = false) {
  const stars = (n) => {
    if (!n || n < 1) return "";
    const filled = Math.min(n, 5);
    return "★".repeat(filled) + "☆".repeat(5 - filled);
  };

  const divider = document.createElement("div");
  divider.style.cssText = "margin-top:14px;";

  if (reviews.length === 0) {
    const hint = isLazada
      ? "Scroll down to the <strong>Ratings &amp; Reviews</strong> section first so it loads, then Deep Scan again."
      : "Scroll down to the reviews section first, then scan again.";
    divider.innerHTML = `
      <div class="reviews-container">
        <div class="reviews-header"><i class="fas fa-comments"></i> Comments</div>
        <div class="no-reviews-msg">No comments found.<br>${hint}</div>
      </div>`;
  } else {
    const cards = reviews.map(r => {
      const starsHtml = r.rating_stars
        ? `<span class="review-stars" title="${r.rating_stars}/5">${stars(r.rating_stars)}</span>`
        : "";
      return `
      <div class="review-card">
        <div class="review-card-top">
          <span class="review-username">${r.username || "Anonymous"}</span>
          ${starsHtml}
        </div>
        <div class="review-text">${r.text}</div>
        <div class="review-meta">
          ${r.date ? `<span>${r.date}</span>` : ""}
          ${r.variant ? `<span>${r.variant}</span>` : ""}
        </div>
      </div>`;
    }).join("");

    divider.innerHTML = `
      <div class="reviews-container">
        <div class="reviews-header"><i class="fas fa-comments"></i> ${reviews.length} Comment${reviews.length !== 1 ? "s" : ""} Found</div>
        ${cards}
      </div>`;
  }

  output.appendChild(divider);
}

function resetCommentsButton() {
  commentsBtn.innerHTML = '<i class="fas fa-layer-group"></i> Deep Scan';
  commentsBtn.disabled = false;
}

function resetButton() {
  scanBtn.innerHTML = '<i class="fas fa-shield-alt"></i> Normal Scan';
  scanBtn.disabled = false;
  resetCommentsButton();
}