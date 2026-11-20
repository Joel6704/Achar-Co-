/**
 * Achar & Co. — Complete Frontend Ordering System with Automatic Order ID Generation
 * Pure frontend-only implementation: No backend, No APIs, No database, No external calls.
 * Preserves Kerala heritage design, local storage persistence, responsive UI and accessibility.
 */

(function () {
  'use strict';

  // 14 Kerala Revenue Districts
  const KERALA_DISTRICTS = [
    "Alappuzha", "Ernakulam", "Idukki", "Kannur", "Kasaragod",
    "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Palakkad",
    "Pathanamthitta", "Thiruvananthapuram", "Thrissur", "Wayanad"
  ];

  // 7 Standard Weight Options (up to 3 KG max)
  const WEIGHT_OPTIONS = ["250 g", "500 g", "1 KG", "1.5 KG", "2 KG", "2.5 KG", "3 KG"];

  // LocalStorage Keys
  const ORDERS_STORAGE_KEY = "achar_orders";
  const CART_STORAGE_KEY = "achar_co_cart";

  // State
  let currentActiveOrder = null; // Currently submitted order for confirmation

  /* ==========================================================================
     STORAGE HELPERS (Browser-local demonstration storage)
     ========================================================================== */
  function getStoredOrders() {
    try {
      const data = localStorage.getItem(ORDERS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn("Could not read orders from localStorage", e);
      return [];
    }
  }

  function saveStoredOrders(orders) {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.warn("Could not write orders to localStorage", e);
    }
  }

  function getCart() {
    try {
      const data = localStorage.getItem(CART_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      if (typeof window.ACHAR_CART !== "undefined") {
        window.ACHAR_CART = cart;
      }
    } catch (e) {}
  }

  /* ==========================================================================
     PRODUCT & PRICING HELPERS
     ========================================================================== */
  function getAllProducts() {
    return (window.ACHAR_CONFIG && Array.isArray(window.ACHAR_CONFIG.products))
      ? window.ACHAR_CONFIG.products
      : [];
  }

  function findProductById(id) {
    if (!id) return null;
    const str = String(id).trim().toLowerCase();
    return getAllProducts().find(p => 
      String(p.id).toLowerCase() === str || 
      String(p.slug || '').toLowerCase() === str ||
      String(p.name).toLowerCase() === str
    );
  }

  function calculatePriceForWeight(product, weight) {
    if (!product) return null;
    if (window.ACHAR_CONFIG && typeof window.ACHAR_CONFIG.getPriceForWeight === "function") {
      const calculated = window.ACHAR_CONFIG.getPriceForWeight(product, weight);
      if (calculated !== null) return calculated;
    }
    if (!product.prices || typeof product.prices !== "object") return null;

    const clean = String(weight || "").trim().toLowerCase().replace(/\s+/g, "");
    if (clean === "250g") return product.prices["250g"] ?? null;
    if (clean === "500g") return product.prices["500g"] ?? null;
    if (clean === "1kg") return product.prices["1kg"] ?? null;

    const base1kg = product.prices["1kg"] || (product.prices["500g"] ? product.prices["500g"] * 2 : null);
    if (!base1kg) return null;

    if (clean === "1.5kg") return Math.round(base1kg * 1.5);
    if (clean === "2kg") return Math.round(base1kg * 2);
    if (clean === "2.5kg") return Math.round(base1kg * 2.5);
    if (clean === "3kg") return Math.round(base1kg * 3);
    return null;
  }

  function formatMoney(amount) {
    if (amount === null || typeof amount === "undefined" || isNaN(amount)) {
      return "Price on request";
    }
    return "₹" + Number(amount).toLocaleString("en-IN");
  }

  /* ==========================================================================
     AUTOMATIC UNIQUE ORDER ID GENERATOR
     Format: ACH-YYYY-XXXXXXXX (e.g. ACH-2026-A7F29C81)
     Uses crypto.randomUUID() with collision checks against stored orders.
     ========================================================================== */
  function generateUniqueOrderId() {
    const year = new Date().getFullYear();
    const existingOrders = getStoredOrders();
    const existingIds = new Set(existingOrders.map(o => String(o.orderId || '').toUpperCase()));

    for (let i = 0; i < 100; i++) {
      let rawId = "";
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        rawId = crypto.randomUUID().replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      } else {
        rawId = (Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)).toUpperCase();
      }
      const segment = rawId.slice(0, 8);
      const candidate = `ACH-${year}-${segment}`;
      if (!existingIds.has(candidate)) {
        return candidate;
      }
    }
    // Fallback if collision occurred repeatedly
    return `ACH-${year}-${Date.now().toString(36).slice(-8).toUpperCase()}`;
  }

  /* ==========================================================================
     INJECT STYLES FOR ORDER MODALS, FLOATING BAG & TRACKING
     ========================================================================== */
  function injectStyles() {
    if (document.getElementById("acFrontendOrderStyles")) return;
    const style = document.createElement("style");
    style.id = "acFrontendOrderStyles";
    style.textContent = `
      /* Floating Shopping Bag Button */
      .floating-bag-btn {
        position: fixed;
        bottom: 28px;
        right: 28px;
        z-index: 9999;
        display: flex;
        align-items: center;
        gap: 9px;
        background: #244b38;
        color: #fffdf9;
        padding: 12px 20px 12px 16px;
        border-radius: 999px;
        border: 2px solid #d4a34b;
        box-shadow: 0 10px 30px rgba(21, 38, 28, 0.35);
        cursor: pointer;
        font-family: inherit;
        font-weight: 600;
        font-size: 14px;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease, background-color 0.2s ease;
      }
      .floating-bag-btn:hover {
        transform: translateY(-3px) scale(1.03);
        background: #1b3b2b;
        box-shadow: 0 14px 36px rgba(21, 38, 28, 0.45);
      }
      .floating-bag-btn:active {
        transform: translateY(0) scale(0.98);
      }
      .floating-bag-icon {
        font-size: 19px;
        line-height: 1;
      }
      .floating-bag-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 22px;
        height: 22px;
        padding: 0 6px;
        border-radius: 999px;
        background: #8b3a2b;
        color: #fff;
        font-size: 12px;
        font-weight: 700;
        margin-left: 2px;
        box-shadow: 0 2px 6px rgba(0,0,0,0.25);
        transition: transform 0.2s ease;
      }
      .floating-bag-badge.badge-bump {
        animation: acBadgeBump 0.35s ease;
      }
      @keyframes acBadgeBump {
        0% { transform: scale(1); }
        50% { transform: scale(1.35); }
        100% { transform: scale(1); }
      }

      /* Header Track Order Button */
      .header-track-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        background: rgba(36, 75, 56, 0.08);
        color: #244b38;
        border: 1px solid rgba(36, 75, 56, 0.25);
        border-radius: 999px;
        font-family: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
      }
      .header-track-btn:hover {
        background: #244b38;
        color: #fffdf9;
        border-color: #244b38;
      }

      /* Base Dialog / Modals */
      .ac-modal-dialog {
        width: min(640px, calc(100% - 32px));
        max-height: 90vh;
        border: 0;
        border-radius: 20px;
        padding: 0;
        background: #fffdf9;
        color: #25372d;
        box-shadow: 0 24px 80px rgba(21, 38, 28, 0.4);
      }
      .ac-modal-dialog::backdrop {
        background: rgba(21, 38, 28, 0.65);
        backdrop-filter: blur(4px);
      }
      .ac-modal-shell {
        padding: clamp(20px, 4vw, 32px);
        overflow-y: auto;
        max-height: 90vh;
      }
      .ac-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 1px solid #ece5d8;
      }
      .ac-modal-eyebrow {
        font-size: 11px;
        letter-spacing: 1.5px;
        text-transform: uppercase;
        color: #8b3a2b;
        font-weight: 700;
        display: block;
        margin-bottom: 4px;
      }
      .ac-modal-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: clamp(22px, 3.5vw, 28px);
        font-weight: 600;
        margin: 0;
        color: #1b3b2b;
      }
      .ac-modal-desc {
        font-size: 13px;
        color: #697669;
        margin: 4px 0 0;
      }
      .ac-modal-close {
        border: 0;
        background: #f3efe6;
        border-radius: 50%;
        width: 36px;
        height: 36px;
        font-size: 22px;
        line-height: 1;
        cursor: pointer;
        color: #435445;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .ac-modal-close:hover {
        background: #e8e2d4;
        transform: scale(1.05);
      }

      /* Order Form Fields */
      .ac-form-section-title {
        font-family: 'Playfair Display', Georgia, serif;
        font-size: 18px;
        font-weight: 600;
        color: #244b38;
        margin: 18px 0 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ac-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .ac-field {
        display: grid;
        gap: 5px;
        font-size: 12px;
        font-weight: 600;
        color: #3b4e3e;
      }
      .ac-field.ac-col-full {
        grid-column: 1 / -1;
      }
      .ac-field input, .ac-field select, .ac-field textarea {
        width: 100%;
        padding: 10px 12px;
        border: 1px solid #d9d1c1;
        border-radius: 8px;
        background: #ffffff;
        font-family: inherit;
        font-size: 14px;
        color: #203324;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        box-sizing: border-box;
      }
      .ac-field input:focus, .ac-field select:focus, .ac-field textarea:focus {
        outline: none;
        border-color: #244b38;
        box-shadow: 0 0 0 3px rgba(36, 75, 56, 0.12);
      }
      .ac-field textarea {
        min-height: 72px;
        resize: vertical;
      }
      .ac-field-help {
        font-size: 11px;
        font-weight: 400;
        color: #7a867a;
      }

      /* Items Summary Card in Modal */
      .ac-order-items-box {
        background: #fbf7ee;
        border: 1px solid #e7ded0;
        border-radius: 12px;
        padding: 14px;
        margin: 12px 0 18px;
      }
      .ac-order-item-line {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;
        border-bottom: 1px dashed #e2d7c5;
        font-size: 13px;
      }
      .ac-order-item-line:last-child {
        border-bottom: 0;
      }
      .ac-item-line-title {
        font-weight: 600;
        color: #1b3b2b;
      }
      .ac-item-line-sub {
        font-size: 12px;
        color: #697669;
      }
      .ac-item-line-price {
        font-weight: 700;
        color: #244b38;
        font-size: 14px;
      }
      .ac-order-total-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        margin-top: 8px;
        border-top: 2px solid #d4a34b;
        font-size: 15px;
        font-weight: 700;
        color: #1b3b2b;
      }
      .ac-order-total-bar .ac-total-num {
        font-size: 18px;
        color: #8b3a2b;
      }

      /* Form Buttons */
      .ac-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 20px;
      }
      .ac-btn-cancel {
        padding: 11px 18px;
        border-radius: 8px;
        border: 1px solid #d9d1c1;
        background: #f7f3ea;
        color: #495a4c;
        font-family: inherit;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      .ac-btn-cancel:hover {
        background: #ebe4d5;
      }
      .ac-btn-submit {
        padding: 11px 24px;
        border-radius: 8px;
        border: 0;
        background: #244b38;
        color: #fffdf9;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 14px rgba(36, 75, 56, 0.25);
        transition: background 0.2s ease, transform 0.2s ease;
      }
      .ac-btn-submit:hover:not(:disabled) {
        background: #1b3b2b;
        transform: translateY(-1px);
      }
      .ac-btn-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .ac-form-error {
        color: #9e3629;
        background: #fbf0ed;
        border: 1px solid #f3d4cd;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 500;
        margin: 12px 0 0;
        display: none;
      }

      /* Confirmation Modal Elements */
      .ac-confirm-notice-banner {
        background: #fff8e6;
        border: 1px solid #f0dc9e;
        border-left: 4px solid #d4a34b;
        border-radius: 8px;
        padding: 12px 14px;
        margin: 14px 0 18px;
        font-size: 13px;
        color: #634b07;
        line-height: 1.45;
      }
      .ac-order-id-badge-wrap {
        text-align: center;
        background: #f3f7f4;
        border: 1px dashed #244b38;
        border-radius: 12px;
        padding: 18px 14px;
        margin: 16px 0;
      }
      .ac-order-id-label {
        font-size: 11px;
        letter-spacing: 1.2px;
        text-transform: uppercase;
        color: #556c59;
        font-weight: 700;
        display: block;
        margin-bottom: 6px;
      }
      .ac-order-id-value {
        font-family: monospace, 'Courier New', Courier;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 1.5px;
        color: #244b38;
        user-select: all;
      }
      .ac-confirm-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        background: #fbf7ee;
        border: 1px solid #ece4d6;
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 18px;
        font-size: 13px;
      }
      .ac-confirm-field b {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: #7c887a;
        margin-bottom: 2px;
      }
      .ac-confirm-field span {
        color: #203324;
        font-weight: 600;
        word-break: break-word;
      }
      .ac-confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }
      .ac-btn-copy {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        border-radius: 8px;
        border: 1px solid #244b38;
        background: #f4f8f5;
        color: #244b38;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .ac-btn-copy:hover {
        background: #244b38;
        color: #fff;
      }

      /* Track Order Result */
      .ac-track-status-box {
        margin-top: 18px;
        padding: 16px;
        background: #fbf7ee;
        border: 1px solid #e7dfd2;
        border-radius: 12px;
      }
      .ac-track-not-found {
        color: #9e3629;
        background: #fcf1ef;
        border: 1px solid #f6d8d2;
        border-radius: 8px;
        padding: 14px;
        font-size: 13px;
        margin-top: 14px;
      }
      .ac-track-future-note {
        font-size: 12px;
        color: #697669;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px dashed #d9d1c1;
        font-style: italic;
      }

      /* Product Card Buttons (Order Now & Add to Bag) */
      .btn-order-now {
        background: #244b38 !important;
        color: #fffdf9 !important;
        border: 0 !important;
        font-weight: 700 !important;
        letter-spacing: 0.3px;
        padding: 9px 14px !important;
        border-radius: 6px !important;
        cursor: pointer;
        transition: background 0.2s ease, transform 0.15s ease;
      }
      .btn-order-now:hover:not(:disabled) {
        background: #1b3b2b !important;
        transform: translateY(-1px);
      }
      .btn-order-now:disabled, .btn-order-now.disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      .btn-add-bag {
        background: transparent !important;
        color: #244b38 !important;
        border: 1.5px solid #244b38 !important;
        font-weight: 600 !important;
        padding: 8px 12px !important;
        border-radius: 6px !important;
        cursor: pointer;
        transition: background 0.2s ease, color 0.2s ease;
      }
      .btn-add-bag:hover:not(:disabled) {
        background: rgba(36, 75, 56, 0.08) !important;
      }
      .btn-add-bag:disabled, .btn-add-bag.disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }

      @media (max-width: 600px) {
        .ac-form-grid, .ac-confirm-grid {
          grid-template-columns: 1fr;
        }
        .floating-bag-btn {
          bottom: 20px;
          right: 20px;
          padding: 10px 16px 10px 14px;
          font-size: 13px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ==========================================================================
     INJECT REUSABLE MODALS INTO DOM
     1. #customerOrderModal (One shared form for Product, Bag, Combo)
     2. #orderConfirmationModal (Order details recorded with browser notice)
     3. #trackOrderModal (Local order search by Order ID + Phone)
     4. #floatingBagBtn (Floating shopping bag icon & badge)
     ========================================================================== */
  function ensureModals() {
    // 1. Customer Order Modal
    if (!document.getElementById("customerOrderModal")) {
      const orderModal = document.createElement("dialog");
      orderModal.id = "customerOrderModal";
      orderModal.className = "ac-modal-dialog";
      orderModal.innerHTML = `
        <div class="ac-modal-shell">
          <div class="ac-modal-head">
            <div>
              <span class="ac-modal-eyebrow">Achar &amp; Co. &middot; Kerala Heritage Kitchen</span>
              <h2 class="ac-modal-title" id="orderModalTitle">Complete Your Order</h2>
              <p class="ac-modal-desc">Enter your delivery details to record your order directly in this browser.</p>
            </div>
            <button type="button" class="ac-modal-close" id="btnCloseOrderModal" aria-label="Close form">&times;</button>
          </div>

          <form id="acCustomerOrderForm" novalidate>
            <!-- Dynamic Order Items Area -->
            <div id="modalOrderSummaryArea" class="ac-order-items-box">
              <!-- Rendered dynamically -->
            </div>

            <!-- Customer Details -->
            <div class="ac-form-section-title">
              <span>Customer Information</span>
            </div>

            <div class="ac-form-grid">
              <label class="ac-field">
                <span>Full Name *</span>
                <input type="text" id="orderCustName" name="name" autocomplete="name" placeholder="e.g. Anjali Menon" required>
              </label>

              <label class="ac-field">
                <span>Phone Number *</span>
                <input type="tel" id="orderCustPhone" name="phone" autocomplete="tel" placeholder="10-digit mobile number" required>
                <span class="ac-field-help">Indian 10-digit mobile number</span>
              </label>

              <label class="ac-field ac-col-full">
                <span>District in Kerala *</span>
                <select id="orderCustDistrict" name="district" required>
                  <option value="">Select your district</option>
                  ${KERALA_DISTRICTS.map(d => `<option value="${d}">${d}</option>`).join("")}
                </select>
              </label>

              <label class="ac-field ac-col-full">
                <span>Full Delivery Address *</span>
                <textarea id="orderCustAddress" name="address" autocomplete="street-address" placeholder="House/Flat name, street, locality, landmark, PIN code" required></textarea>
              </label>
            </div>

            <!-- Additional Information -->
            <div class="ac-form-section-title" style="margin-top: 14px;">
              <span>Additional Information</span>
            </div>

            <div class="ac-form-grid">
              <label class="ac-field ac-col-full">
                <span>Additional Notes / Feedback (Optional)</span>
                <textarea id="orderCustNotes" name="notes" placeholder="Any custom spice preference, gift packaging note, or special delivery instructions..."></textarea>
              </label>
            </div>

            <div id="orderFormError" class="ac-form-error" role="alert"></div>

            <div class="ac-form-actions">
              <button type="button" class="ac-btn-cancel" id="btnCancelOrder">Cancel</button>
              <button type="submit" class="ac-btn-submit" id="btnSubmitOrder">Submit Order</button>
            </div>
          </form>
        </div>
      `;
      document.body.appendChild(orderModal);

      // Bind events
      document.getElementById("btnCloseOrderModal").addEventListener("click", () => orderModal.close());
      document.getElementById("btnCancelOrder").addEventListener("click", () => orderModal.close());
      orderModal.addEventListener("click", (e) => { if (e.target === orderModal) orderModal.close(); });
      document.getElementById("acCustomerOrderForm").addEventListener("submit", handleOrderSubmit);
    }

    // 2. Order Confirmation Modal
    if (!document.getElementById("orderConfirmationModal")) {
      const confirmModal = document.createElement("dialog");
      confirmModal.id = "orderConfirmationModal";
      confirmModal.className = "ac-modal-dialog";
      confirmModal.innerHTML = `
        <div class="ac-modal-shell">
          <div class="ac-modal-head">
            <div>
              <span class="ac-modal-eyebrow">Order Recorded</span>
              <h2 class="ac-modal-title">Order Details Recorded</h2>
            </div>
            <button type="button" class="ac-modal-close" id="btnCloseConfirmModal" aria-label="Close dialog">&times;</button>
          </div>

          <!-- Mandatory Non-Reception Disclaimer -->
          <div class="ac-confirm-notice-banner">
            <strong>Notice:</strong> Your order details have been saved in this browser. Your order has not yet been sent to Achar &amp; Co.
          </div>

          <!-- Unique Order ID Display -->
          <div class="ac-order-id-badge-wrap">
            <span class="ac-order-id-label">Your Unique Order ID</span>
            <div class="ac-order-id-value" id="confirmOrderIdDisplay">ACH-2026-XXXXXXXX</div>
          </div>

          <!-- Summary Grid -->
          <div class="ac-confirm-grid" id="confirmSummaryGrid">
            <!-- Dynamic order details -->
          </div>

          <div class="ac-confirm-actions">
            <button type="button" class="ac-btn-copy" id="btnCopyOrderId">
              <span>📋</span> <span id="copyBtnText">Copy Order ID</span>
            </button>
            <button type="button" class="ac-btn-submit" id="btnCloseConfirmDone">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmModal);

      document.getElementById("btnCloseConfirmModal").addEventListener("click", () => confirmModal.close());
      document.getElementById("btnCloseConfirmDone").addEventListener("click", () => confirmModal.close());
      confirmModal.addEventListener("click", (e) => { if (e.target === confirmModal) confirmModal.close(); });

      document.getElementById("btnCopyOrderId").addEventListener("click", () => {
        const orderId = document.getElementById("confirmOrderIdDisplay").textContent.trim();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(orderId).then(() => {
            const btnText = document.getElementById("copyBtnText");
            btnText.textContent = "Copied! ✓";
            setTimeout(() => { btnText.textContent = "Copy Order ID"; }, 2000);
          }).catch(() => fallbackCopy(orderId));
        } else {
          fallbackCopy(orderId);
        }
      });
    }

    // 3. Track Order Modal
    if (!document.getElementById("trackOrderModal")) {
      const trackModal = document.createElement("dialog");
      trackModal.id = "trackOrderModal";
      trackModal.className = "ac-modal-dialog";
      trackModal.innerHTML = `
        <div class="ac-modal-shell">
          <div class="ac-modal-head">
            <div>
              <span class="ac-modal-eyebrow">Local Order Search</span>
              <h2 class="ac-modal-title">Track Order</h2>
              <p class="ac-modal-desc">Search locally stored orders saved in this browser.</p>
            </div>
            <button type="button" class="ac-modal-close" id="btnCloseTrackModal" aria-label="Close dialog">&times;</button>
          </div>

          <form id="acTrackOrderForm" novalidate>
            <div class="ac-form-grid">
              <label class="ac-field ac-col-full">
                <span>Order ID *</span>
                <input type="text" id="trackOrderIdInput" placeholder="e.g. ACH-2026-A7F29C81" required>
              </label>

              <label class="ac-field ac-col-full">
                <span>Registered Phone Number *</span>
                <input type="tel" id="trackPhoneInput" placeholder="10-digit mobile number" required>
              </label>
            </div>

            <div style="margin-top: 14px;">
              <button type="submit" class="ac-btn-submit" style="width: 100%;">Track Order</button>
            </div>
          </form>

          <div id="trackOrderResult"></div>
        </div>
      `;
      document.body.appendChild(trackModal);

      document.getElementById("btnCloseTrackModal").addEventListener("click", () => trackModal.close());
      trackModal.addEventListener("click", (e) => { if (e.target === trackModal) trackModal.close(); });
      document.getElementById("acTrackOrderForm").addEventListener("submit", handleTrackSubmit);
    }

    // 4. Floating Shopping Bag Button
    if (!document.getElementById("floatingBagBtn")) {
      const floatBtn = document.createElement("button");
      floatBtn.id = "floatingBagBtn";
      floatBtn.className = "floating-bag-btn";
      floatBtn.type = "button";
      floatBtn.setAttribute("aria-label", "View Shopping Bag");
      floatBtn.innerHTML = `
        <span class="floating-bag-icon" aria-hidden="true">🧺</span>
        <span class="floating-bag-label">Bag</span>
        <span id="floatingBagBadge" class="floating-bag-badge">0</span>
      `;
      floatBtn.addEventListener("click", () => {
        if (typeof window.openCart === "function") {
          window.openCart();
        } else {
          openOrderModalForBag();
        }
      });
      document.body.appendChild(floatBtn);
    }
  }

  function fallbackCopy(text) {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    try {
      document.execCommand("copy");
      const btnText = document.getElementById("copyBtnText");
      if (btnText) {
        btnText.textContent = "Copied! ✓";
        setTimeout(() => { btnText.textContent = "Copy Order ID"; }, 2000);
      }
    } catch (e) {}
    el.remove();
  }

  /* ==========================================================================
     UPDATE FLOATING BAG BADGE
     ========================================================================== */
  function updateFloatingBagBadge() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0);
    const badge = document.getElementById("floatingBagBadge");
    const headerBadge = document.getElementById("bagCountBadge");

    if (badge) {
      badge.textContent = count;
      badge.classList.remove("badge-bump");
      void badge.offsetWidth; // trigger reflow
      badge.classList.add("badge-bump");
    }
    if (headerBadge) {
      headerBadge.textContent = count;
    }

    const headerBagBtn = document.getElementById("openBagBtn");
    if (headerBagBtn) {
      headerBagBtn.classList.remove("is-hidden");
      headerBagBtn.classList.add("is-visible");
      headerBagBtn.setAttribute("aria-hidden", "false");
    }
  }

  /* ==========================================================================
     PHONE NUMBER VALIDATION
     Validates standard Indian 10-digit mobile numbers: [6-9]\d{9}
     ========================================================================== */
  function validateIndianPhone(input) {
    if (!input) return false;
    let clean = String(input).replace(/[^\d+]/g, "").trim();
    if (clean.startsWith("+91")) clean = clean.slice(3);
    else if (clean.startsWith("91") && clean.length === 12) clean = clean.slice(2);
    else if (clean.startsWith("0") && clean.length === 11) clean = clean.slice(1);
    return /^[6-9]\d{9}$/.test(clean);
  }

  function normalizePhone(input) {
    let clean = String(input || "").replace(/\D/g, "");
    if (clean.length > 10) clean = clean.slice(-10);
    return clean;
  }

  /* ==========================================================================
     OPEN ORDER MODAL FOR SINGLE PRODUCT
     ========================================================================== */
  let currentOrderPayload = {
    type: "single", // "single", "bag", or "combo"
    singleProduct: null,
    singleWeight: "250 g",
    singleQty: 1,
    bagItems: [],
    comboItems: []
  };

  function openOrderModalForProduct(productId, preferredWeight) {
    ensureModals();
    const product = findProductById(productId);
    if (!product) return;

    if (product.is_out_of_stock || product.availability_status === 'Out of Stock') {
      showToast(`${product.name} is currently out of stock.`);
      return;
    }

    const weightSelectOnCard = document.getElementById(`sizeSelect-${product.id}`);
    const selectedWeight = preferredWeight || (weightSelectOnCard ? weightSelectOnCard.value : "250 g");

    currentOrderPayload = {
      type: "single",
      singleProduct: product,
      singleWeight: selectedWeight,
      singleQty: 1,
      bagItems: [],
      comboItems: []
    };

    renderModalOrderSummary();
    resetFormErrors();
    const modal = document.getElementById("customerOrderModal");
    modal.showModal();
  }

  /* ==========================================================================
     OPEN ORDER MODAL FOR SHOPPING BAG
     ========================================================================== */
  function openOrderModalForBag() {
    ensureModals();
    const cart = getCart();
    if (!cart.length) {
      showToast("Your shopping bag is currently empty.");
      return;
    }

    currentOrderPayload = {
      type: "bag",
      singleProduct: null,
      singleWeight: "250 g",
      singleQty: 1,
      bagItems: [...cart],
      comboItems: []
    };

    if (typeof window.closeCart === "function") {
      window.closeCart();
    }

    renderModalOrderSummary();
    resetFormErrors();
    const modal = document.getElementById("customerOrderModal");
    modal.showModal();
  }

  /* ==========================================================================
     OPEN ORDER MODAL FOR COMBO
     ========================================================================== */
  function openOrderModalForCombo(comboIds) {
    ensureModals();
    const ids = Array.isArray(comboIds) && comboIds.length === 3 
      ? comboIds 
      : (typeof window.selectedComboIds !== "undefined" ? window.selectedComboIds : []);

    if (ids.length !== 3) {
      showToast("Please choose 3 pickle varieties to build your trio.");
      return;
    }

    const prods = ids.map(findProductById).filter(Boolean);
    if (prods.length !== 3) {
      showToast("Please select 3 valid pickle jars.");
      return;
    }

    currentOrderPayload = {
      type: "combo",
      singleProduct: null,
      singleWeight: "250 g",
      singleQty: 1,
      bagItems: [],
      comboItems: prods
    };

    renderModalOrderSummary();
    resetFormErrors();
    const modal = document.getElementById("customerOrderModal");
    modal.showModal();
  }

  /* ==========================================================================
     RENDER MODAL ORDER SUMMARY (Dynamic section in the form)
     ========================================================================== */
  function renderModalOrderSummary() {
    const box = document.getElementById("modalOrderSummaryArea");
    if (!box) return;

    if (currentOrderPayload.type === "single") {
      const p = currentOrderPayload.singleProduct;
      const weight = currentOrderPayload.singleWeight;
      const qty = currentOrderPayload.singleQty;
      const unitPrice = calculatePriceForWeight(p, weight);
      const lineTotal = unitPrice ? unitPrice * qty : null;

      box.innerHTML = `
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7c887a; font-weight: 700; margin-bottom: 8px;">Selected Pickle</div>
        <div class="ac-form-grid" style="align-items: center; margin-bottom: 8px;">
          <div class="ac-field" style="grid-column: 1 / -1;">
            <span>Pickle Variety:</span>
            <select id="modalProductSelect" style="font-weight: 600;">
              ${getAllProducts().filter(prod => !prod.is_out_of_stock).map(prod => `
                <option value="${prod.id}" ${prod.id === p.id ? 'selected' : ''}>${prod.name}</option>
              `).join("")}
            </select>
          </div>
          <div class="ac-field">
            <span>Select Weight (Max 3 KG):</span>
            <select id="modalWeightSelect">
              ${WEIGHT_OPTIONS.map(w => `<option value="${w}" ${w === weight ? 'selected' : ''}>${w}</option>`).join("")}
            </select>
          </div>
          <div class="ac-field">
            <span>Quantity:</span>
            <input type="number" id="modalQtyInput" min="1" max="99" value="${qty}">
          </div>
        </div>

        <div class="ac-order-total-bar">
          <span>Estimated Total:</span>
          <span class="ac-total-num">${formatMoney(lineTotal)}</span>
        </div>
      `;

      // Change listeners for dynamic recalculation
      document.getElementById("modalProductSelect").addEventListener("change", (e) => {
        const next = findProductById(e.target.value);
        if (next) {
          currentOrderPayload.singleProduct = next;
          renderModalOrderSummary();
        }
      });
      document.getElementById("modalWeightSelect").addEventListener("change", (e) => {
        currentOrderPayload.singleWeight = e.target.value;
        renderModalOrderSummary();
      });
      document.getElementById("modalQtyInput").addEventListener("input", (e) => {
        const val = Math.max(1, parseInt(e.target.value, 10) || 1);
        currentOrderPayload.singleQty = val;
        renderModalOrderSummary();
      });

    } else if (currentOrderPayload.type === "bag") {
      const items = currentOrderPayload.bagItems;
      let total = 0;
      let allHavePrice = true;

      const linesHtml = items.map(item => {
        const itemPrice = typeof item.price === "number" ? item.price * item.qty : null;
        if (itemPrice !== null) total += itemPrice; else allHavePrice = false;
        return `
          <div class="ac-order-item-line">
            <div>
              <div class="ac-item-line-title">${item.name}</div>
              <div class="ac-item-line-sub">Pack Size: ${item.size} &middot; Qty: ${item.qty}</div>
            </div>
            <div class="ac-item-line-price">${formatMoney(itemPrice)}</div>
          </div>
        `;
      }).join("");

      box.innerHTML = `
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7c887a; font-weight: 700; margin-bottom: 8px;">Items From Shopping Bag (${items.length})</div>
        <div style="max-height: 180px; overflow-y: auto;">
          ${linesHtml}
        </div>
        <div class="ac-order-total-bar">
          <span>Combined Total (${items.reduce((s, i) => s + i.qty, 0)} items):</span>
          <span class="ac-total-num">${allHavePrice ? formatMoney(total) : 'Custom Batch Total'}</span>
        </div>
      `;

    } else if (currentOrderPayload.type === "combo") {
      const trio = currentOrderPayload.comboItems;
      const subtotal = trio.reduce((sum, p) => sum + (calculatePriceForWeight(p, "250 g") || 190), 0);
      const discount = Math.round(subtotal * 0.10); // 10% combo discount
      const total = subtotal - discount;

      box.innerHTML = `
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7c887a; font-weight: 700; margin-bottom: 8px;">Custom 3-Jar Heritage Trio (250 g each)</div>
        <div style="margin-bottom: 8px;">
          ${trio.map((p, idx) => `
            <div class="ac-order-item-line">
              <span class="ac-item-line-title">${idx + 1}. ${p.name} (250 g)</span>
              <span class="ac-item-line-price">${formatMoney(calculatePriceForWeight(p, "250 g") || 190)}</span>
            </div>
          `).join("")}
        </div>
        <div style="font-size: 12px; color: #244b38; margin-bottom: 6px;">
          ✦ Includes 10% Heirloom Trio Discount &amp; Gift Packaging Box
        </div>
        <div class="ac-order-total-bar">
          <span>Trio Total:</span>
          <span class="ac-total-num">${formatMoney(total)}</span>
        </div>
      `;
    }
  }

  function resetFormErrors() {
    const err = document.getElementById("orderFormError");
    if (err) {
      err.style.display = "none";
      err.textContent = "";
    }
  }

  function showFormError(message) {
    const err = document.getElementById("orderFormError");
    if (err) {
      err.textContent = message;
      err.style.display = "block";
      err.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* ==========================================================================
     FORM SUBMIT HANDLER
     Validates fields, validates Indian mobile number, prevents duplicate submissions,
     generates unique Order ID, stores order in localStorage, shows confirmation modal.
     ========================================================================== */
  function handleOrderSubmit(e) {
    e.preventDefault();
    resetFormErrors();

    const nameInput = document.getElementById("orderCustName");
    const phoneInput = document.getElementById("orderCustPhone");
    const districtSelect = document.getElementById("orderCustDistrict");
    const addressInput = document.getElementById("orderCustAddress");
    const notesInput = document.getElementById("orderCustNotes");
    const submitBtn = document.getElementById("btnSubmitOrder");

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const district = districtSelect.value.trim();
    const address = addressInput.value.trim();
    const notes = notesInput ? notesInput.value.trim() : "";

    if (!name) {
      showFormError("Please enter your full name.");
      nameInput.focus();
      return;
    }
    if (!phone) {
      showFormError("Please enter your phone number.");
      phoneInput.focus();
      return;
    }
    if (!validateIndianPhone(phone)) {
      showFormError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
      phoneInput.focus();
      return;
    }
    if (!district) {
      showFormError("Please choose your delivery district in Kerala.");
      districtSelect.focus();
      return;
    }
    if (!address || address.length < 5) {
      showFormError("Please enter your complete delivery address.");
      addressInput.focus();
      return;
    }

    // Prevent duplicate submission
    submitBtn.disabled = true;
    submitBtn.textContent = "Recording Order…";

    // Build structured order object
    const orderId = generateUniqueOrderId();
    let orderProducts = [];
    let comboDetails = null;
    let totalQty = 0;
    let totalAmount = 0;
    let weightSummary = "";

    if (currentOrderPayload.type === "single") {
      const p = currentOrderPayload.singleProduct;
      const weight = currentOrderPayload.singleWeight;
      const qty = currentOrderPayload.singleQty;
      const unitPrice = calculatePriceForWeight(p, weight);
      const lineTotal = unitPrice ? unitPrice * qty : 0;

      orderProducts.push({
        id: p.id,
        name: p.name,
        malayalamName: p.malayalamName || "",
        weight: weight,
        quantity: qty,
        unitPrice: unitPrice,
        totalPrice: lineTotal
      });
      totalQty = qty;
      totalAmount = lineTotal;
      weightSummary = `${weight} (${qty} jar${qty > 1 ? 's' : ''})`;

    } else if (currentOrderPayload.type === "bag") {
      const items = currentOrderPayload.bagItems;
      items.forEach(item => {
        const itemTotal = typeof item.price === "number" ? item.price * item.qty : 0;
        totalAmount += itemTotal;
        totalQty += item.qty;
        orderProducts.push({
          id: item.id || item.key,
          name: item.name,
          weight: item.size || "250 g",
          quantity: item.qty,
          unitPrice: item.price || 0,
          totalPrice: itemTotal
        });
      });
      weightSummary = `${items.length} variety${items.length > 1 ? 'ies' : ''} (${totalQty} jars total)`;

      // Clear shopping bag after checkout
      saveCart([]);
      if (typeof window.ACHAR_CART !== "undefined") {
        window.ACHAR_CART.length = 0;
      }
      updateFloatingBagBadge();
      if (typeof window.renderCartItems === "function") {
        window.renderCartItems();
      }

    } else if (currentOrderPayload.type === "combo") {
      const trio = currentOrderPayload.comboItems;
      comboDetails = trio.map(p => p.name);
      const subtotal = trio.reduce((sum, p) => sum + (calculatePriceForWeight(p, "250 g") || 190), 0);
      const discount = Math.round(subtotal * 0.10);
      totalAmount = subtotal - discount;
      totalQty = 3;
      weightSummary = "Custom 3-Jar Trio (3 × 250 g)";

      trio.forEach(p => {
        orderProducts.push({
          id: p.id,
          name: p.name,
          weight: "250 g",
          quantity: 1,
          unitPrice: calculatePriceForWeight(p, "250 g") || 190,
          totalPrice: calculatePriceForWeight(p, "250 g") || 190
        });
      });
    }

    const newOrder = {
      orderId: orderId,
      customerName: name,
      phoneNumber: phone,
      normalizedPhone: normalizePhone(phone),
      deliveryDistrict: district,
      deliveryAddress: address,
      orderType: currentOrderPayload.type,
      products: orderProducts,
      comboDetails: comboDetails,
      weightSummary: weightSummary,
      quantity: totalQty,
      totalAmount: totalAmount,
      additionalNotes: notes,
      orderDate: new Date().toISOString(),
      displayDate: new Date().toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
      })
    };

    // Save order in localStorage
    const stored = getStoredOrders();
    stored.unshift(newOrder);
    saveStoredOrders(stored);

    currentActiveOrder = newOrder;

    // Reset form & close modal
    document.getElementById("acCustomerOrderForm").reset();
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Order";
    document.getElementById("customerOrderModal").close();

    // Show Confirmation Modal
    showOrderConfirmation(newOrder);
  }

  /* ==========================================================================
     SHOW ORDER CONFIRMATION MODAL
     ========================================================================== */
  function showOrderConfirmation(order) {
    ensureModals();
    const modal = document.getElementById("orderConfirmationModal");
    const idEl = document.getElementById("confirmOrderIdDisplay");
    const grid = document.getElementById("confirmSummaryGrid");

    idEl.textContent = order.orderId;

    const productsHtml = order.products.map(p => 
      `${p.name} (${p.weight} &times; ${p.quantity})`
    ).join(", ");

    grid.innerHTML = `
      <div class="ac-confirm-field">
        <b>Customer Name</b>
        <span>${escapeHtml(order.customerName)}</span>
      </div>
      <div class="ac-confirm-field">
        <b>Phone Number</b>
        <span>${escapeHtml(order.phoneNumber)}</span>
      </div>
      <div class="ac-confirm-field">
        <b>Delivery District</b>
        <span>${escapeHtml(order.deliveryDistrict)}</span>
      </div>
      <div class="ac-confirm-field">
        <b>Order Date</b>
        <span>${escapeHtml(order.displayDate)}</span>
      </div>
      <div class="ac-confirm-field" style="grid-column: 1 / -1;">
        <b>Delivery Address</b>
        <span>${escapeHtml(order.deliveryAddress)}</span>
      </div>
      <div class="ac-confirm-field" style="grid-column: 1 / -1;">
        <b>Pickles Ordered</b>
        <span>${escapeHtml(productsHtml)}</span>
      </div>
      <div class="ac-confirm-field">
        <b>Weight &amp; Quantity</b>
        <span>${escapeHtml(order.weightSummary)}</span>
      </div>
      <div class="ac-confirm-field">
        <b>Estimated Total</b>
        <span style="color: #244b38; font-size: 15px;">${formatMoney(order.totalAmount)}</span>
      </div>
      ${order.additionalNotes ? `
        <div class="ac-confirm-field" style="grid-column: 1 / -1;">
          <b>Notes</b>
          <span>${escapeHtml(order.additionalNotes)}</span>
        </div>
      ` : ''}
    `;

    modal.showModal();
  }

  /* ==========================================================================
     TRACK ORDER INTERFACE
     Searches localStorage for matching Order ID and Phone Number.
     ========================================================================== */
  function openTrackOrderModal() {
    ensureModals();
    const modal = document.getElementById("trackOrderModal");
    const resBox = document.getElementById("trackOrderResult");
    if (resBox) resBox.innerHTML = "";
    document.getElementById("acTrackOrderForm").reset();
    modal.showModal();
  }

  function handleTrackSubmit(e) {
    e.preventDefault();
    const idInput = document.getElementById("trackOrderIdInput").value.trim().toUpperCase();
    const phoneInput = normalizePhone(document.getElementById("trackPhoneInput").value);
    const resBox = document.getElementById("trackOrderResult");

    if (!idInput || !phoneInput) {
      resBox.innerHTML = `<div class="ac-track-not-found">Please enter both your Order ID and Registered Phone Number.</div>`;
      return;
    }

    const stored = getStoredOrders();
    const match = stored.find(o => {
      const matchId = String(o.orderId || '').trim().toUpperCase() === idInput;
      const matchPhone = normalizePhone(o.phoneNumber) === phoneInput;
      return matchId && matchPhone;
    });

    if (match) {
      const itemsList = match.products.map(p => 
        `<li><b>${escapeHtml(p.name)}</b> &mdash; ${escapeHtml(p.weight)} &times; ${p.quantity} (${formatMoney(p.totalPrice)})</li>`
      ).join("");

      resBox.innerHTML = `
        <div class="ac-track-status-box">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #244b38; letter-spacing: 1px;">Local Order Record</span>
            <span style="background: #e6ede8; color: #244b38; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;">Recorded</span>
          </div>
          <h4 style="margin: 0 0 6px; font-family: 'Playfair Display', Georgia, serif; font-size: 18px; color: #1b3b2b;">${escapeHtml(match.orderId)}</h4>
          <p style="margin: 0 0 10px; font-size: 12px; color: #697669;">Recorded on ${escapeHtml(match.displayDate)}</p>
          
          <div style="font-size: 13px; margin-bottom: 8px;">
            <div><b>Customer:</b> ${escapeHtml(match.customerName)} (${escapeHtml(match.phoneNumber)})</div>
            <div><b>Destination:</b> ${escapeHtml(match.deliveryDistrict)}, Kerala</div>
          </div>

          <div style="font-size: 13px; margin: 10px 0;">
            <b>Ordered Pickles:</b>
            <ul style="margin: 4px 0 0 18px; padding: 0;">${itemsList}</ul>
          </div>

          <div style="font-size: 14px; font-weight: 700; color: #244b38; margin-top: 10px; padding-top: 8px; border-top: 1px solid #e7ded0;">
            Estimated Total: ${formatMoney(match.totalAmount)}
          </div>

          <div class="ac-track-future-note">
            ✦ Local Order Record &mdash; Live order tracking will be available soon.
          </div>
        </div>
      `;
    } else {
      resBox.innerHTML = `
        <div class="ac-track-not-found">
          <strong>No matching order was found in this browser.</strong>
          <p style="margin: 6px 0 0; font-size: 12px; color: #732a20;">
            Please ensure you entered the exact Order ID (e.g. ACH-2026-XXXXXXXX) and 10-digit mobile number used when ordering in this browser.
          </p>
        </div>
      `;
    }
  }

  function escapeHtml(str) {
    if (str === null || typeof str === "undefined") return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* ==========================================================================
     ADD TO BAG HELPER (Product card Add to Bag)
     ========================================================================== */
  function addCardToBag(productId) {
    const product = findProductById(productId);
    if (!product) return;

    if (product.is_out_of_stock || product.availability_status === 'Out of Stock') {
      showToast(`${product.name} is currently out of stock.`);
      return;
    }

    const select = document.getElementById(`sizeSelect-${product.id}`);
    const weight = select ? select.value : "250 g";
    const price = calculatePriceForWeight(product, weight) || 0;

    const cart = getCart();
    const key = `${product.id}_${weight}`;
    const existing = cart.find(i => i.key === key);

    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({
        key: key,
        id: product.id,
        name: product.name,
        size: weight,
        price: price,
        qty: 1,
        image: product.image
      });
    }

    saveCart(cart);
    updateFloatingBagBadge();
    if (typeof window.renderCartItems === "function") {
      window.renderCartItems();
    }
    showToast(`Added ${product.name} (${weight}) to your bag!`);
  }

  function addComboToBag() {
    const ids = typeof window.selectedComboIds !== "undefined" ? window.selectedComboIds : [];
    if (ids.length !== 3) {
      showToast("Please select 3 jars before adding to bag.");
      return;
    }

    const prods = ids.map(findProductById).filter(Boolean);
    if (prods.length !== 3) return;

    const subtotal = prods.reduce((sum, p) => sum + (calculatePriceForWeight(p, "250 g") || 190), 0);
    const discount = Math.round(subtotal * 0.10);
    const total = subtotal - discount;

    const comboKey = `combo_${Date.now()}`;
    const comboNames = prods.map(p => p.name).join(" + ");

    const cart = getCart();
    cart.push({
      key: comboKey,
      id: "custom-trio",
      name: "Custom 3-Jar Heritage Trio",
      size: comboNames,
      price: total,
      qty: 1,
      image: prods[0].image,
      isCombo: true,
      comboItems: prods.map(p => ({ id: p.id, name: p.name, size: "250 g" }))
    });

    saveCart(cart);
    updateFloatingBagBadge();
    if (typeof window.renderCartItems === "function") {
      window.renderCartItems();
    }
    showToast("Custom 3-Jar Heritage Trio added to your bag!");
  }

  /* ==========================================================================
     TOAST NOTIFICATIONS
     ========================================================================== */
  function showToast(message) {
    if (typeof window.showToast === "function" && window.showToast !== showToast) {
      window.showToast(message);
      return;
    }
    const existing = document.querySelector(".ac-order-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = "ac-order-toast";
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #244b38;
      color: #fffdf9;
      padding: 12px 22px;
      border-radius: 999px;
      box-shadow: 0 10px 28px rgba(0,0,0,0.3);
      font-size: 14px;
      font-weight: 600;
      z-index: 10001;
      border: 1px solid #d4a34b;
      transition: all 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(10px)";
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  /* ==========================================================================
     UPDATE HEADER BUTTONS & WIRE BUTTON LABELS
     ========================================================================== */
  function wireHeaderButtons() {
    const actions = document.querySelector(".header-actions");
    if (actions && !document.getElementById("headerTrackOrderBtn")) {
      const trackBtn = document.createElement("button");
      trackBtn.type = "button";
      trackBtn.id = "headerTrackOrderBtn";
      trackBtn.className = "header-track-btn";
      trackBtn.innerHTML = `<span>📦</span> <span>Track Order</span>`;
      trackBtn.addEventListener("click", openTrackOrderModal);
      const toggle = actions.querySelector(".mobile-toggle");
      if (toggle) {
        actions.insertBefore(trackBtn, toggle);
      } else {
        actions.appendChild(trackBtn);
      }
    }

    // Also connect drawer checkout button to openOrderModalForBag
    const drawerCheckoutBtn = document.getElementById("checkoutWhatsAppBtn");
    if (drawerCheckoutBtn && drawerCheckoutBtn.dataset.acBound !== "true") {
      drawerCheckoutBtn.dataset.acBound = "true";
      drawerCheckoutBtn.innerHTML = `<span>Order Now</span>`;
      drawerCheckoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        openOrderModalForBag();
      }, true);
    }

    // Connect combo section buttons if present
    const comboWaBtn = document.getElementById("btnOrderComboWA");
    if (comboWaBtn && comboWaBtn.dataset.acBound !== "true") {
      comboWaBtn.dataset.acBound = "true";
      comboWaBtn.innerHTML = `<span>Order Now</span>`;
      comboWaBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        openOrderModalForCombo();
      }, true);
    }
  }

  /* ==========================================================================
     INITIALIZATION & GLOBAL EXPOSURE
     ========================================================================== */
  function init() {
    injectStyles();
    ensureModals();
    updateFloatingBagBadge();
    wireHeaderButtons();

    // Re-check badge and header on storage updates across tabs
    window.addEventListener("storage", (e) => {
      if (e.key === CART_STORAGE_KEY) {
        updateFloatingBagBadge();
      }
    });

    // Observe DOM mutations to keep header button and labels wired
    new MutationObserver(() => {
      wireHeaderButtons();
      updateFloatingBagBadge();
    }).observe(document.body, { childList: true, subtree: true });
  }

  // Export functions to window
  window.openOrderModalForProduct = openOrderModalForProduct;
  window.openOrderModalForBag = openOrderModalForBag;
  window.openOrderModalForCombo = openOrderModalForCombo;
  window.openTrackOrderModal = openTrackOrderModal;
  window.addCardToBag = addCardToBag;
  window.addComboToBag = addComboToBag;
  window.updateFloatingBagBadge = updateFloatingBagBadge;
  window.generateUniqueOrderId = generateUniqueOrderId;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
