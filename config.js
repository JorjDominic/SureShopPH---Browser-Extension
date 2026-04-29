// -----------------------------------------------------------------------
// Centralized config for the SureShopPH extension.
// Update SURESHOP_API_BASE to your production HTTPS endpoint before
// submitting to the Chrome Web Store. HTTP localhost is only for local dev.
//
// This file is loaded:
//   - by background.js via importScripts('config.js')
//   - by popup.html as a <script> before popup.js
//   - by all content scripts (listed first in manifest.json content_scripts)
// -----------------------------------------------------------------------
var SURESHOP_API_BASE = "http://localhost:8000";
