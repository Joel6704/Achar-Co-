/**
 * Achar & Co. — Core Application Scripts
 * Shared across all pages: Navigation, Cart Drawer, WhatsApp Links, Modals, Toasts
 */

// Cart state (stored in localStorage)
let ACHAR_CART = JSON.parse(localStorage.getItem("achar_co_cart") || "[]");

document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initFloatingWhatsApp();
  initCartDrawer();
  updateCartBadge();
  setupGlobalPlaceholders();
  if (document.getElementById("heroPhotoStage") || document.getElementById("heroShowcase3DScene")) {
    initHero3DCarousel();
  } else if (document.getElementById("cards3dStage")) {
    initEditorial3DCards();
  }
});

/**
 * Navigation & Header handling
 */
function initNavigation() {
  const header = document.querySelector(".site-header");
  const mobileToggle = document.querySelector(".mobile-toggle");
  const nav = document.querySelector(".main-navigation");

  // Sticky header class
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      header?.classList.add("scrolled");
    } else {
      header?.classList.remove("scrolled");
    }
  });

  // Mobile menu toggle
  if (mobileToggle && nav) {
    mobileToggle.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("open");
      mobileToggle.setAttribute("aria-expanded", String(isOpen));
      mobileToggle.innerHTML = isOpen ? "&times;" : "&#9776;";
    });

    // Close when clicking outside or on a link
    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !mobileToggle.contains(e.target)) {
        nav.classList.remove("open");
        mobileToggle.setAttribute("aria-expanded", "false");
        mobileToggle.innerHTML = "&#9776;";
      }
    });
  }

  // Highlight active link based on current pathname
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });
}

/**
 * Floating WhatsApp Button setup
 */
function initFloatingWhatsApp() {
  const floatingBtn = document.getElementById("floatingWhatsApp");
  if (floatingBtn && typeof ACHAR_CONFIG !== "undefined") {
    const defaultMsg = `Namaskaram Achar & Co.! 🌶️ I am visiting your website and would like to enquire about ordering traditional Kerala pickles.`;
    floatingBtn.href = ACHAR_CONFIG.getWhatsAppUrl(defaultMsg);
  }

  // Any header WA button
  const headerWa = document.querySelector(".header-wa-btn");
  if (headerWa && typeof ACHAR_CONFIG !== "undefined") {
    const headerMsg = `Namaskaram Achar & Co.! I would like to place an order for Kerala pickles.`;
    headerWa.href = ACHAR_CONFIG.getWhatsAppUrl(headerMsg);
  }
}

/**
 * Global Cart Drawer Management
 */
function initCartDrawer() {
  const openBtn = document.getElementById("openBagBtn");
  const closeBtn = document.getElementById("closeBagBtn");
  const backdrop = document.getElementById("cartBackdrop");
  const drawer = document.getElementById("cartDrawer");
  const checkoutBtn = document.getElementById("checkoutWhatsAppBtn");

  if (openBtn) openBtn.addEventListener("click", openCart);
  if (closeBtn) closeBtn.addEventListener("click", closeCart);
  if (backdrop) backdrop.addEventListener("click", closeCart);

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", () => {
      if (ACHAR_CART.length === 0) {
        showToast("Your bag is currently empty.");
        return;
      }
      if (typeof openOrderModalForBag === "function") {
        openOrderModalForBag();
        return;
      }
      // Generate formatted multi-product WhatsApp order message
      let message = `Namaskaram Achar & Co.! 🌶️\nI would like to order the following items from your Kerala heritage pickle collection:\n\n`;
      let total = 0;

      ACHAR_CART.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        message += `${index + 1}. *${item.name}*\n   Pack Size: ${item.size}\n   Quantity: ${item.qty}\n   Subtotal: ₹${itemTotal}\n\n`;
      });

      message += `------------------------------\n*Estimated Total: ₹${total}*\nDelivery Location in Kerala: [Please enter your town/district]\n------------------------------\n\nPlease confirm batch availability, courier delivery charges to my district, and payment options. Thank you!`;

      const waUrl = ACHAR_CONFIG.getWhatsAppUrl(message);
      window.open(waUrl, "_blank");
      showToast("Opening WhatsApp with your order details...");
    });
  }

  renderCartItems();
}

function openCart() {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  if (drawer && backdrop) {
    renderCartItems();
    drawer.classList.add("open");
    backdrop.classList.add("open");
    document.body.style.overflow = "hidden";
  }
}

function closeCart() {
  const drawer = document.getElementById("cartDrawer");
  const backdrop = document.getElementById("cartBackdrop");
  if (drawer && backdrop) {
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    document.body.style.overflow = "";
  }
}

function addToCart(productId, size = "250g", qty = 1) {
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product) return;

  if (product.is_out_of_stock) {
    showToast(`${product.name} is currently Out of Stock.`);
    return;
  }

  const price = typeof ACHAR_CONFIG.getPriceForWeight === "function"
    ? (ACHAR_CONFIG.getPriceForWeight(product, size) || 0)
    : (product.prices ? (product.prices[size] || Object.values(product.prices)[0] || 0) : 0);

  const key = `${product.id}_${size}`;
  const existing = ACHAR_CART.find(item => item.key === key);

  if (existing) {
    existing.qty += qty;
  } else {
    ACHAR_CART.push({
      key,
      id: product.id,
      name: product.name,
      size,
      price,
      qty,
      image: product.image
    });
  }

  saveCart();
  renderCartItems();
  updateCartBadge();
  if (typeof window.updateFloatingBagBadge === "function") {
    window.updateFloatingBagBadge();
  }
  showToast(`Added ${product.name} (${size}) to your bag!`);
}

function updateCartQty(key, delta) {
  const item = ACHAR_CART.find(i => i.key === key);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    ACHAR_CART = ACHAR_CART.filter(i => i.key !== key);
  }
  saveCart();
  renderCartItems();
  updateCartBadge();
}

function removeCartItem(key) {
  ACHAR_CART = ACHAR_CART.filter(i => i.key !== key);
  saveCart();
  renderCartItems();
  updateCartBadge();
  showToast("Item removed from bag.");
}

function saveCart() {
  localStorage.setItem("achar_co_cart", JSON.stringify(ACHAR_CART));
}

function updateCartBadge() {
  const badge = document.getElementById("bagCountBadge");
  const openBagBtn = document.getElementById("openBagBtn");
  const count = ACHAR_CART.reduce((sum, item) => sum + item.qty, 0);

  if (badge) {
    badge.textContent = count;
  }
  if (typeof window.updateFloatingBagBadge === "function") {
    window.updateFloatingBagBadge();
  }

  if (openBagBtn) {
    if (count > 0) {
      openBagBtn.classList.remove("is-hidden");
      openBagBtn.classList.add("is-visible");
      openBagBtn.setAttribute("aria-hidden", "false");
    } else {
      openBagBtn.classList.remove("is-visible");
      openBagBtn.classList.add("is-hidden");
      openBagBtn.setAttribute("aria-hidden", "true");
    }
  }
}

function renderCartItems() {
  const container = document.getElementById("cartItemsContainer");
  const subtotalEl = document.getElementById("cartSubtotalDisplay");
  const countHeader = document.getElementById("drawerItemCount");
  if (!container || !subtotalEl) return;

  const totalCount = ACHAR_CART.reduce((sum, item) => sum + item.qty, 0);
  const totalAmount = ACHAR_CART.reduce((sum, item) => sum + (item.price * item.qty), 0);

  if (countHeader) countHeader.textContent = `(${totalCount})`;
  subtotalEl.textContent = `₹${totalAmount.toLocaleString("en-IN")}`;

  if (ACHAR_CART.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px 10px; color: var(--ink-light);">
        <div style="font-size: 32px; margin-bottom: 12px; color: var(--gold-turmeric);">🧺</div>
        <p style="font-family: var(--font-serif); font-size: 17px; color: var(--green-deep);">Your bag is empty</p>
        <p style="font-size: 13px;">Add some heirloom Kerala pickles to continue.</p>
        <a href="products.html" class="btn btn-primary btn-sm" style="margin-top: 16px;" onclick="closeCart()">Browse Pickles &rarr;</a>
      </div>
    `;
    return;
  }

  container.innerHTML = ACHAR_CART.map(item => `
    <div class="cart-item-row">
      <img src="${item.image}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <b>${item.name}</b>
        <small>${item.size} &middot; ₹${item.price.toLocaleString("en-IN")}</small>
        <div class="cart-qty-ctrl">
          <button type="button" onclick="updateCartQty('${item.key}', -1)" aria-label="Decrease">&minus;</button>
          <span>${item.qty}</span>
          <button type="button" onclick="updateCartQty('${item.key}', 1)" aria-label="Increase">&#43;</button>
        </div>
      </div>
      <div class="cart-item-price">
        <b>₹${(item.price * item.qty).toLocaleString("en-IN")}</b>
        <button class="btn-del" onclick="removeCartItem('${item.key}')">Remove</button>
      </div>
    </div>
  `).join("");
}

/**
 * Direct WhatsApp Order for a Single Product
 */
function orderSingleProductOnWhatsApp(productId) {
  if (typeof window.openOrderModalForProduct === "function") {
    const sizeSelect = document.getElementById(`sizeSelect-${productId}`);
    const selectedSize = sizeSelect ? sizeSelect.value : "250 g";
    window.openOrderModalForProduct(productId, selectedSize);
    return;
  }
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product) return;

  if (product.is_out_of_stock) {
    showToast(`${product.name} is currently Out of Stock.`);
    return;
  }

  // If newly listed variety with unconfirmed pricing, launch availability enquiry
  if (!product.prices || typeof product.prices !== "object" || Object.keys(product.prices).length === 0) {
    enquireProductOnWhatsApp(productId);
    return;
  }

  const sizeSelect = document.getElementById(`sizeSelect-${productId}`);
  const selectedSize = sizeSelect ? sizeSelect.value : Object.keys(product.prices)[0] || "250g";
  const qtyInput = document.getElementById(`qtyInput-${productId}`);
  const qty = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
  const unitPrice = product.prices[selectedSize] || 0;
  const subtotal = unitPrice * qty;

  const msg = `Namaskaram Achar & Co.! 🌶️\n\nI would like to order:\n• Product: *${product.name}* (${product.malayalamName || ''})\n• Pack Size: *${selectedSize}*\n• Quantity: *${qty} jar(s)*\n• Subtotal: *₹${subtotal.toLocaleString("en-IN")}*\n\nPlease let me know dispatch availability and courier charges across Kerala. Thank you!`;

  const url = ACHAR_CONFIG.getWhatsAppUrl(msg);
  window.open(url, "_blank");
}

/**
 * Availability enquiry for seasonal / unconfirmed pricing varieties
 */
function enquireProductOnWhatsApp(productId) {
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product) return;
  const msg = `Hi Achar & Co.! Is ${product.name} available? Could you share the pack sizes and prices?`;
  const url = ACHAR_CONFIG.getWhatsAppUrl(msg);
  window.open(url, "_blank");
}

/**
 * Quick View Product Modal with Multi-Image Support & Live Subtotal Calculation
 */
let CURRENT_QUICKVIEW_QTY = 1;

function openQuickView(productId) {
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product) return;

  CURRENT_QUICKVIEW_QTY = 1;
  const modalBackdrop = document.getElementById("quickViewModal");
  const modalBody = document.getElementById("quickViewContent");
  if (!modalBackdrop || !modalBody) return;

  const hasConfirmedPricing = product.prices && typeof product.prices === "object" && Object.keys(product.prices).length > 0;
  const productImages = product.images && product.images.length > 0
    ? product.images
    : [{ image_url: product.image, alt_text: product.name }];

  const thumbsHtml = productImages.length > 1 ? `
    <div class="quickview-thumbs">
      ${productImages.map((img, idx) => `
        <div class="quickview-thumb-item ${idx === 0 ? 'active' : ''}" onclick="switchQuickViewImage('${img.image_url}', this)">
          <img src="${img.image_url}" alt="Thumbnail ${idx + 1}" onerror="this.src='/images/pickle-jar-placeholder.svg'">
        </div>
      `).join('')}
    </div>
  ` : '';

  const pricingControlsHtml = hasConfirmedPricing ? `
    <div style="background: var(--cream-soft); border-radius: 8px; padding: 14px; margin-bottom: 18px; border: 1px solid var(--cream-line);">
      <div style="display: flex; gap: 12px; align-items: center; justify-content: space-between; flex-wrap: wrap;">
        <div>
          <label for="modalSizeSelect" style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--green-deep); display: block; margin-bottom: 4px;">Pack Size:</label>
          <select id="modalSizeSelect" class="size-selector" onchange="updateModalCalculation('${product.id}')" ${product.is_out_of_stock ? 'disabled' : ''}>
            ${Object.entries(product.prices).map(([sz, pr]) => `<option value="${sz}">${sz} &mdash; ₹${pr}</option>`).join("")}
          </select>
        </div>

        <div>
          <label style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--green-deep); display: block; margin-bottom: 4px;">Quantity:</label>
          <div style="border: 1px solid var(--cream-line); border-radius: 6px; display: inline-flex; align-items: center; background: #fff; overflow: hidden;">
            <button type="button" onclick="changeModalQty('${product.id}', -1)" style="width: 32px; height: 32px; border: 0; background: var(--cream-soft); font-weight: 700; cursor: pointer; color: var(--green-deep);">&minus;</button>
            <span id="modalQtyDisplay" style="width: 36px; text-align: center; font-size: 13px; font-weight: 700; color: var(--green-deep);">1</span>
            <button type="button" onclick="changeModalQty('${product.id}', 1)" style="width: 32px; height: 32px; border: 0; background: var(--cream-soft); font-weight: 700; cursor: pointer; color: var(--green-deep);">&#43;</button>
          </div>
        </div>

        <div style="text-align: right; margin-left: auto;">
          <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--ink-light); display: block;">Subtotal</span>
          <b id="modalSubtotalPrice" style="font-family: var(--font-serif); font-size: 22px; color: var(--green-deep);">₹${Object.values(product.prices)[0]}</b>
        </div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 10px;">
      <button class="btn btn-wa btn-sm ${product.is_out_of_stock ? 'disabled' : ''}" onclick="orderModalProduct('${product.id}')" ${product.is_out_of_stock ? 'disabled' : ''}>
        <span>💬</span> ${product.is_out_of_stock ? 'Out of Stock' : 'Order on WhatsApp'}
      </button>
      <button class="btn btn-primary btn-sm ${product.is_out_of_stock ? 'disabled' : ''}" onclick="addModalToBag('${product.id}')" ${product.is_out_of_stock ? 'disabled' : ''}>
        ${product.is_out_of_stock ? 'Unavailable' : 'Add to Bag +'}
      </button>
    </div>
  ` : `
    <div style="background: rgba(199, 141, 31, 0.08); border-left: 3px solid var(--gold-turmeric); padding: 12px 14px; margin-bottom: 18px; border-radius: 4px;">
      <b style="font-size: 12px; color: var(--green-deep); display: block; margin-bottom: 4px;">🌿 Seasonal Small Batch:</b>
      <p style="font-size: 12px; color: var(--ink-muted); margin: 0; line-height: 1.5;">This variety is handcrafted on seasonal request. Pack sizes and custom lot pricing are confirmed on WhatsApp enquiry.</p>
    </div>

    <div>
      <button class="btn btn-wa btn-full" onclick="enquireProductOnWhatsApp('${product.id}')">
        <span>💬</span> Enquire on WhatsApp
      </button>
    </div>
  `;

  modalBody.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 26px;">
      <div>
        <div style="background: radial-gradient(circle at center, #fff 0%, #f6efe4 100%); border-radius: 12px; overflow: hidden; border: 1px solid var(--cream-line); height: 300px; display: flex; align-items: center; justify-content: center; padding: 20px;">
          <img id="quickViewMainImage" src="${product.image}" alt="${product.name}" onerror="this.src='/images/pickle-jar-placeholder.svg'" style="max-height: 100%; max-width: 100%; object-fit: contain;">
        </div>
        ${thumbsHtml}
        <div style="margin-top: 14px; background: var(--cream-soft); padding: 12px; border-radius: 8px; font-size: 11px;">
          <b style="color: var(--green-deep); display: block; margin-bottom: 4px;">🌿 Traditional Preparation Note:</b>
          <p style="margin: 0; line-height: 1.5; color: var(--ink-muted);">Made in small unhurried batches. Free from synthetic vinegar, chemical preservatives, or artificial food dyes.</p>
        </div>
      </div>
      <div>
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
          <span class="eyebrow no-after" style="margin: 0;">${product.category} &middot; ${product.badge || 'HERITAGE RECIPE'}</span>
          ${product.is_out_of_stock ? '<span class="product-badge out-of-stock" style="position: static; font-size: 9px; padding: 2px 7px;">OUT OF STOCK</span>' : ''}
        </div>
        <h3 style="font-family: var(--font-serif); font-size: 24px; color: var(--green-deep); margin-bottom: 3px;">${product.name}</h3>
        <p class="malayalam-script" style="margin-bottom: 14px; font-size: 13px; color: var(--gold-turmeric); font-weight: 600;">${product.malayalamName || ''}</p>
        <p style="font-size: 13.5px; line-height: 1.65; color: var(--ink-muted); margin-bottom: 16px;">${product.fullStory || product.shortDesc || ''}</p>
        
        <div style="background: var(--cream-paper); border: 1px solid var(--cream-line); border-radius: 8px; padding: 14px; margin-bottom: 18px;">
          ${product.ingredients ? `
            <div style="margin-bottom: 10px;">
              <b style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--green-deep); display: block;">Ingredients & Spice Level:</b>
              <span style="font-size: 12px; color: var(--ink-muted);">${product.ingredients}</span>
            </div>
          ` : ''}
          ${product.allergens ? `
            <div style="margin-bottom: 10px;">
              <b style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--red-chilli); display: block;">Allergen Information:</b>
              <span style="font-size: 12px; color: var(--ink-muted);">${product.allergens}</span>
            </div>
          ` : ''}
          ${product.storage ? `
            <div>
              <b style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--gold-turmeric); display: block;">Storage & Shelf Life:</b>
              <span style="font-size: 12px; color: var(--ink-muted);">${product.storage} ${product.shelfLife ? `(${product.shelfLife})` : ''}</span>
            </div>
          ` : ''}
        </div>

        ${pricingControlsHtml}
      </div>
    </div>
  `;

  modalBackdrop.classList.add("open");
  document.body.style.overflow = "hidden";
}

function changeModalQty(productId, delta) {
  CURRENT_QUICKVIEW_QTY = Math.max(1, Math.min(25, CURRENT_QUICKVIEW_QTY + delta));
  const qtyEl = document.getElementById("modalQtyDisplay");
  if (qtyEl) qtyEl.textContent = CURRENT_QUICKVIEW_QTY;
  updateModalCalculation(productId);
}

function updateModalCalculation(productId) {
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product || !product.prices) return;
  const select = document.getElementById("modalSizeSelect");
  const size = select ? select.value : Object.keys(product.prices)[0] || "250g";
  const unitPrice = product.prices[size] || 0;
  const subtotal = unitPrice * (CURRENT_QUICKVIEW_QTY || 1);
  const subtotalEl = document.getElementById("modalSubtotalPrice");
  if (subtotalEl) {
    subtotalEl.textContent = `₹${subtotal.toLocaleString("en-IN")}`;
  }
}

function switchQuickViewImage(url, element) {
  const mainImg = document.getElementById("quickViewMainImage");
  if (mainImg) mainImg.src = url;
  document.querySelectorAll(".quickview-thumb-item").forEach(el => el.classList.remove("active"));
  if (element) element.classList.add("active");
}

function closeQuickView() {
  const modalBackdrop = document.getElementById("quickViewModal");
  if (modalBackdrop) {
    modalBackdrop.classList.remove("open");
    document.body.style.overflow = "";
  }
}

function orderModalProduct(productId) {
  if (typeof window.openOrderModalForProduct === "function") {
    closeQuickView();
    window.openOrderModalForProduct(productId);
    return;
  }
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product || product.is_out_of_stock) return;

  if (!product.prices || typeof product.prices !== "object" || Object.keys(product.prices).length === 0) {
    enquireProductOnWhatsApp(productId);
    return;
  }

  const select = document.getElementById("modalSizeSelect");
  const size = select ? select.value : Object.keys(product.prices)[0] || "250g";
  const qty = CURRENT_QUICKVIEW_QTY || 1;
  const unitPrice = product.prices[size] || 0;
  const subtotal = unitPrice * qty;

  const msg = `Namaskaram Achar & Co.! 🌶️\n\nI would like to order:\n• Product: *${product.name}* (${product.malayalamName || ''})\n• Pack Size: *${size}*\n• Quantity: *${qty} jar(s)*\n• Subtotal: *₹${subtotal.toLocaleString("en-IN")}*\n\nPlease confirm availability and delivery dispatch across Kerala. Thank you!`;

  window.open(ACHAR_CONFIG.getWhatsAppUrl(msg), "_blank");
}

function addModalToBag(productId) {
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product || !product.prices) return;
  const select = document.getElementById("modalSizeSelect");
  const size = select ? select.value : Object.keys(product.prices)[0] || "250g";
  const qty = CURRENT_QUICKVIEW_QTY || 1;
  addToCart(productId, size, qty);
  closeQuickView();
}

/**
 * Toast Notification system
 */
function showToast(text) {
  let toast = document.getElementById("globalToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "globalToast";
    toast.className = "toast-msg";
    document.body.appendChild(toast);
  }

  toast.innerHTML = `<span>🌶️</span> ${text}`;
  toast.classList.add("show");

  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 3200);
}

/**
 * Placeholders Helper: Ensures dynamic placeholder fields display cleanly
 */
function setupGlobalPlaceholders() {
  document.querySelectorAll("[data-config-phone]").forEach(el => {
    el.textContent = ACHAR_CONFIG.displayPhone;
  });
  document.querySelectorAll("[data-config-email]").forEach(el => {
    el.textContent = ACHAR_CONFIG.displayEmail;
  });
  document.querySelectorAll("[data-config-address]").forEach(el => {
    el.textContent = ACHAR_CONFIG.address;
  });
}

/**
 * =============================================================
 * ACHAR & CO. — EXACT REFERENCE 3D ROTATING PICKLE SHOWCASE
 * Sequence: Mango (0) -> Chicken (1) -> Lemon (2) -> Garlic (3)
 * =============================================================
 */

const HERO_BOTTLES = [
  { id: "cut-mango", elementId: "bottleMango", name: "Mango Pickle" },
  { id: "nadan-chicken", elementId: "bottleChicken", name: "Chicken Pickle" },
  { id: "vadukapuli-lemon", elementId: "bottleLemon", name: "Lemon Pickle" },
  { id: "veluthulli-garlic", elementId: "bottleGarlic", name: "Garlic Pickle" }
];

let HERO_CAROUSEL_INDEX = 0;
let HERO_CAROUSEL_TIMER = null;
let HERO_CAROUSEL_PAUSED = false;

function initHero3DCarousel() {
  const stage = document.getElementById("heroPhotoStage") || document.getElementById("heroShowcase3DScene");
  const wrapper = document.getElementById("heroShowcaseWrapper");
  if (!stage && !wrapper) return;

  // Initial slot / bottle assignment
  applyHeroBottleSlots(0);

  // 3D Parallax Tilt & Light Glare Sheen on Hero Photo Stage
  if (stage) {
    stage.addEventListener("mousemove", (e) => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const midX = rect.width / 2;
      const midY = rect.height / 2;

      const tiltX = ((y - midY) / midY) * -3.5;
      const tiltY = ((x - midX) / midX) * 4.5;

      stage.style.setProperty("--mouse-x", `${(x / rect.width * 100).toFixed(1)}%`);
      stage.style.setProperty("--mouse-y", `${(y / rect.height * 100).toFixed(1)}%`);
      stage.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(-4px) scale3d(1.008, 1.008, 1.008)`;
    });

    stage.addEventListener("mouseleave", () => {
      stage.style.transform = "";
    });

    stage.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openFeaturedPickleModal();
      }
    });
  }

  // Click & keyboard interactions on fallback bottles
  HERO_BOTTLES.forEach((b, idx) => {
    const el = document.getElementById(b.elementId);
    if (!el) return;

    el.addEventListener("click", () => {
      if (HERO_CAROUSEL_INDEX === idx) {
        openPurchaseModal(b.id);
      } else {
        goToHeroBottle(idx, true);
      }
    });

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  });

  // Pause on hover
  if (wrapper) {
    wrapper.addEventListener("mouseenter", () => {
      HERO_CAROUSEL_PAUSED = true;
      stopHeroCarouselTimer();
    });

    wrapper.addEventListener("mouseleave", () => {
      HERO_CAROUSEL_PAUSED = false;
      startHeroCarouselTimer();
    });
  }

  // Touch swipe support for mobile
  let touchStartX = 0;
  let touchStartY = 0;
  const touchTarget = stage || wrapper;
  if (touchTarget) {
    touchTarget.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        HERO_CAROUSEL_PAUSED = true;
        stopHeroCarouselTimer();
      }
    }, { passive: true });

    touchTarget.addEventListener("touchend", (e) => {
      if (e.changedTouches.length > 0) {
        const diffX = e.changedTouches[0].clientX - touchStartX;
        const diffY = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(diffX) > 30 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0) {
            nextHeroBottle(true);
          } else {
            prevHeroBottle(true);
          }
        }
        HERO_CAROUSEL_PAUSED = false;
        startHeroCarouselTimer();
      }
    }, { passive: true });
  }

  // Tab visibility handling
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopHeroCarouselTimer();
    } else if (!HERO_CAROUSEL_PAUSED) {
      startHeroCarouselTimer();
    }
  });

  // Start continuous 4-second automatic carousel
  startHeroCarouselTimer();
}

window.openFeaturedPickleModal = function() {
  const active = HERO_BOTTLES[HERO_CAROUSEL_INDEX];
  if (active && typeof openPurchaseModal === "function") {
    openPurchaseModal(active.id);
  }
};

function applyHeroBottleSlots(index) {
  HERO_CAROUSEL_INDEX = index;
  const N = HERO_BOTTLES.length;

  HERO_BOTTLES.forEach((b, i) => {
    const el = document.getElementById(b.elementId);
    if (!el) return;

    el.classList.remove("slot-featured", "slot-right", "slot-back", "slot-left");

    // Relative offset from active index
    const offset = (i - index + N) % N;
    if (offset === 0) {
      el.classList.add("slot-featured");
      el.setAttribute("aria-hidden", "false");
    } else if (offset === 1) {
      el.classList.add("slot-right");
      el.setAttribute("aria-hidden", "true");
    } else if (offset === 2) {
      el.classList.add("slot-back");
      el.setAttribute("aria-hidden", "true");
    } else {
      el.classList.add("slot-left");
      el.setAttribute("aria-hidden", "true");
    }
  });

  // Update dots
  for (let i = 0; i < N; i++) {
    const dot = document.getElementById(`heroDot${i}`);
    if (dot) {
      dot.classList.toggle("active", i === index);
      dot.setAttribute("aria-selected", String(i === index));
    }
  }

  // Update floating pill text
  const pillText = document.getElementById("heroActivePillText");
  if (pillText && HERO_BOTTLES[index]) {
    pillText.textContent = `${HERO_BOTTLES[index].name} · 500g Jar`;
  }

  // Update Order Now WhatsApp button on hero left
  const orderNowBtn = document.getElementById("heroOrderNowBtn");
  if (orderNowBtn && typeof ACHAR_CONFIG !== "undefined" && HERO_BOTTLES[index]) {
    const msg = `Namaskaram Achar & Co.! 🌶️ I would like to order the freshly made ${HERO_BOTTLES[index].name} (500g) featured on your homepage.`;
    orderNowBtn.href = ACHAR_CONFIG.getWhatsAppUrl(msg);
  }
}

function goToHeroBottle(index, isManual = false) {
  const N = HERO_BOTTLES.length;
  const normalized = ((index % N) + N) % N;
  applyHeroBottleSlots(normalized);

  if (isManual) {
    stopHeroCarouselTimer();
    startHeroCarouselTimer();
  }
}

function nextHeroBottle(isManual = false) {
  goToHeroBottle(HERO_CAROUSEL_INDEX + 1, isManual);
}

function prevHeroBottle(isManual = false) {
  goToHeroBottle(HERO_CAROUSEL_INDEX - 1, isManual);
}

function startHeroCarouselTimer() {
  stopHeroCarouselTimer();
  HERO_CAROUSEL_TIMER = setInterval(() => {
    if (!HERO_CAROUSEL_PAUSED && !document.hidden) {
      nextHeroBottle(false);
    }
  }, 4000);
}

function stopHeroCarouselTimer() {
  if (HERO_CAROUSEL_TIMER) {
    clearInterval(HERO_CAROUSEL_TIMER);
    HERO_CAROUSEL_TIMER = null;
  }
}

// Expose globally for inline onclick handlers
window.goToHeroBottle = goToHeroBottle;
window.nextHeroBottle = nextHeroBottle;
window.prevHeroBottle = prevHeroBottle;

/**
 * =============================================================
 * ACHAR & CO. — INTERACTIVE 3D OVERLAPPING PICKLE CARDS (LEGACY)
 * =============================================================
 */

let HERO_CARD_STEP = 0; // 0: Mango center, 1: Chicken center, 2: Lemon center
let HERO_AUTO_TIMER = null;
let HERO_INACTIVITY_TIMER = null;
let HERO_IS_PAUSED = false;

// Step 0: Mango center (0deg), Lemon left (-12deg), Chicken right (+12deg)
// Step 1: Chicken center (0deg), Mango left (-12deg), Lemon right (+12deg)
// Step 2: Lemon center (0deg), Chicken left (-12deg), Mango right (+12deg)
const CARD_ROTATION_SLOTS = [
  { center: "cardMango", left: "cardLemon", right: "cardChicken" },
  { center: "cardChicken", left: "cardMango", right: "cardLemon" },
  { center: "cardLemon", left: "cardChicken", right: "cardMango" }
];

function initEditorial3DCards() {
  const stage = document.getElementById("cards3dStage");
  if (!stage) return;

  const cardMango = document.getElementById("cardMango");
  const cardLemon = document.getElementById("cardLemon");
  const cardChicken = document.getElementById("cardChicken");
  const cards = [cardLemon, cardMango, cardChicken].filter(Boolean);

  if (cards.length < 3) return;

  // 1. Initial entrance animation: assign entering classes
  cardLemon.classList.add("slot-left", "entering-left");
  cardMango.classList.add("slot-center", "entering-center");
  cardChicken.classList.add("slot-right", "entering-right");

  // Remove entering classes once entrance animation finishes (after 2.3s)
  setTimeout(() => {
    cards.forEach(c => c.classList.remove("entering-left", "entering-center", "entering-right"));
  }, 2300);

  // 2. Click on Card:
  // If clicking center card -> open product order modal
  // If clicking side card -> smoothly rotate that card into center!
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const prodId = card.getAttribute("data-product-id");
      const currentCenterId = CARD_ROTATION_SLOTS[HERO_CARD_STEP].center;

      if (card.id === currentCenterId) {
        // Active center card clicked -> open modal for ordering
        openPurchaseModal(prodId);
      } else {
        // Side card clicked -> rotate to make this card center
        if (card.id === "cardMango") setCardRotationStep(0, true);
        else if (card.id === "cardChicken") setCardRotationStep(1, true);
        else if (card.id === "cardLemon") setCardRotationStep(2, true);
      }
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
  });

  // 3. Hover on Stage: Pause / Resume
  stage.addEventListener("mouseenter", () => {
    HERO_IS_PAUSED = true;
    stopHeroAutoTimer();
  });

  stage.addEventListener("mouseleave", () => {
    HERO_IS_PAUSED = false;
    startHeroAutoTimer();
    // Reset any mouse parallax on center card
    const centerCard = document.getElementById(CARD_ROTATION_SLOTS[HERO_CARD_STEP].center);
    if (centerCard) centerCard.style.transform = "";
  });

  // 4. Subtle Mouse 3D Parallax on Center Card
  stage.addEventListener("mousemove", (e) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const centerCardId = CARD_ROTATION_SLOTS[HERO_CARD_STEP].center;
    const centerCard = document.getElementById(centerCardId);
    if (!centerCard) return;

    const rect = stage.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    const tiltX = (y / (rect.height / 2)) * -4;
    const tiltY = (x / (rect.width / 2)) * 5;
    const panX = (x / (rect.width / 2)) * 6;

    centerCard.style.transform = `translate3d(${panX.toFixed(1)}px, 0, 48px) rotateX(${tiltX.toFixed(1)}deg) rotateY(${tiltY.toFixed(1)}deg) scale(1.05)`;
  });

  // 5. Mobile Touch Swipe Handlers
  let touchStartX = 0;
  let touchStartY = 0;
  stage.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      HERO_IS_PAUSED = true;
      stopHeroAutoTimer();
    }
  }, { passive: true });

  stage.addEventListener("touchend", (e) => {
    if (e.changedTouches.length > 0) {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const diffX = touchEndX - touchStartX;
      const diffY = touchEndY - touchStartY;

      if (Math.abs(diffX) > 36 && Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX < 0) {
          // Swipe left -> advance to next card (Mango -> Chicken -> Lemon)
          advanceCardRotation(1, true);
        } else {
          // Swipe right -> advance backward
          advanceCardRotation(-1, true);
        }
      }
      scheduleHeroAutoResume();
    }
  }, { passive: true });

  // 6. Tab Visibility: Pause when tab is hidden, resume when tab is visible
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopHeroAutoTimer();
    } else if (!HERO_IS_PAUSED) {
      startHeroAutoTimer();
    }
  });

  // 7. Start auto rotation after initial entrance delay (4 seconds after entrance = 4000ms)
  setTimeout(() => {
    startHeroAutoTimer();
  }, 2400);
}

/**
 * Apply 3D slot classes to the 3 cards
 */
function applyCardSlots() {
  const currentSlot = CARD_ROTATION_SLOTS[HERO_CARD_STEP];
  if (!currentSlot) return;

  const cardMango = document.getElementById("cardMango");
  const cardLemon = document.getElementById("cardLemon");
  const cardChicken = document.getElementById("cardChicken");
  const cards = [cardLemon, cardMango, cardChicken].filter(Boolean);

  cards.forEach(card => {
    card.classList.remove("slot-center", "slot-left", "slot-right");
    card.style.transform = ""; // clear any inline mouse parallax
  });

  const centerEl = document.getElementById(currentSlot.center);
  const leftEl = document.getElementById(currentSlot.left);
  const rightEl = document.getElementById(currentSlot.right);

  if (centerEl) {
    centerEl.classList.add("slot-center");
    centerEl.setAttribute("aria-hidden", "false");
  }
  if (leftEl) {
    leftEl.classList.add("slot-left");
    leftEl.setAttribute("aria-hidden", "true");
  }
  if (rightEl) {
    rightEl.classList.add("slot-right");
    rightEl.setAttribute("aria-hidden", "true");
  }
}

/**
 * Step forward or backward in the sequence:
 * Sequence: Mango (0) -> Chicken (1) -> Lemon (2) -> Mango (0)
 */
function advanceCardRotation(delta = 1, isManual = false) {
  let nextStep = (HERO_CARD_STEP + delta) % 3;
  if (nextStep < 0) nextStep += 3;
  setCardRotationStep(nextStep, isManual);
}

function setCardRotationStep(step, isManual = false) {
  HERO_CARD_STEP = step;
  applyCardSlots();

  if (isManual) {
    scheduleHeroAutoResume();
  }
}

/**
 * Start 4-second automatic rotation
 */
function startHeroAutoTimer() {
  stopHeroAutoTimer();
  HERO_AUTO_TIMER = setInterval(() => {
    if (!HERO_IS_PAUSED && !document.hidden) {
      advanceCardRotation(1, false);
    }
  }, 4000);
}

function stopHeroAutoTimer() {
  if (HERO_AUTO_TIMER) {
    clearInterval(HERO_AUTO_TIMER);
    HERO_AUTO_TIMER = null;
  }
}

function scheduleHeroAutoResume() {
  stopHeroAutoTimer();
  if (HERO_INACTIVITY_TIMER) {
    clearTimeout(HERO_INACTIVITY_TIMER);
  }
  HERO_INACTIVITY_TIMER = setTimeout(() => {
    HERO_IS_PAUSED = false;
    startHeroAutoTimer();
  }, 4000);
}

/**
 * Handler for clicking the circular plus button on any card
 */
function handleCardPlusClick(productId) {
  openPurchaseModal(productId);
}

/**
 * =============================================================
 * Interactive Bottle Order Modal & Kerala District Checkout
 * =============================================================
 */

let CURRENT_ORDER_PRODUCT = null;
let CURRENT_ORDER_SIZE = "250g";
let CURRENT_ORDER_QTY = 1;

function openPurchaseModal(productId) {
  const product = ACHAR_CONFIG.products.find(p => p.id === productId || p.slug === productId);
  if (!product) return;

  CURRENT_ORDER_PRODUCT = product;
  CURRENT_ORDER_SIZE = "250g";
  CURRENT_ORDER_QTY = 1;

  const modal = document.getElementById("bottleOrderModal");
  if (!modal) return;

  const imgEl = document.getElementById("orderModalImg");
  if (imgEl) {
    imgEl.src = product.image;
    imgEl.onerror = function() {
      this.src = product.fallbackImage || product.image;
    };
  }

  const titleEl = document.getElementById("orderModalTitle");
  if (titleEl) titleEl.textContent = product.name;

  const malEl = document.getElementById("orderModalMalayalam");
  if (malEl) malEl.textContent = product.malayalamName || "";

  const catEl = document.getElementById("orderModalCategory");
  if (catEl) catEl.textContent = `${product.category} · ${product.badge}`;

  const descEl = document.getElementById("orderModalDesc");
  if (descEl) descEl.textContent = product.shortDesc;

  // Render sizes
  const sizesContainer = document.getElementById("orderModalSizeOptions");
  if (sizesContainer) {
    sizesContainer.innerHTML = Object.entries(product.prices).map(([sz, pr]) => `
      <button type="button" class="order-size-btn ${sz === '250g' ? 'active' : ''}" onclick="selectOrderModalSize('${sz}', this)">
        <span>${sz}</span>
        <small>₹${pr}</small>
      </button>
    `).join("");
  }

  // Populate Kerala Districts
  const districtSelect = document.getElementById("orderDistrictSelect");
  if (districtSelect && ACHAR_CONFIG.keralaDistricts) {
    districtSelect.innerHTML = ACHAR_CONFIG.keralaDistricts.map(d => `
      <option value="${d}">${d}</option>
    `).join("");
  }

  updateOrderModalCalculation();

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closePurchaseModal() {
  const modal = document.getElementById("bottleOrderModal");
  if (modal) {
    modal.classList.remove("open");
    document.body.style.overflow = "";
  }
}

function selectOrderModalSize(size, btnEl) {
  CURRENT_ORDER_SIZE = size;
  const container = document.getElementById("orderModalSizeOptions");
  if (container) {
    container.querySelectorAll(".order-size-btn").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
  }
  updateOrderModalCalculation();
}

function adjustOrderModalQty(delta) {
  CURRENT_ORDER_QTY = Math.max(1, Math.min(20, CURRENT_ORDER_QTY + delta));
  updateOrderModalCalculation();
}

function updateOrderModalCalculation() {
  if (!CURRENT_ORDER_PRODUCT) return;
  const unitPrice = CURRENT_ORDER_PRODUCT.prices[CURRENT_ORDER_SIZE] || 190;
  const total = unitPrice * CURRENT_ORDER_QTY;

  const qtyEl = document.getElementById("orderModalQtyDisplay");
  if (qtyEl) qtyEl.textContent = CURRENT_ORDER_QTY;

  const totalEl = document.getElementById("orderModalTotalPrice");
  if (totalEl) totalEl.textContent = `₹${total.toLocaleString("en-IN")}`;
}

function submitWhatsAppPurchase() {
  if (!CURRENT_ORDER_PRODUCT) return;

  if (typeof window.openOrderModalForProduct === "function") {
    const pId = CURRENT_ORDER_PRODUCT.id;
    const sz = CURRENT_ORDER_SIZE;
    closePurchaseModal();
    window.openOrderModalForProduct(pId, sz);
    return;
  }

  const nameInput = document.getElementById("orderCustomerName");
  const phoneInput = document.getElementById("orderCustomerPhone");
  const districtSelect = document.getElementById("orderDistrictSelect");
  const addressInput = document.getElementById("orderCustomerAddress");

  const name = nameInput ? nameInput.value.trim() : "";
  const phone = phoneInput ? phoneInput.value.trim() : "";
  const district = districtSelect ? districtSelect.value : "Kerala";
  const address = addressInput ? addressInput.value.trim() : "";

  if (!name) {
    alert("Please enter your name so our kitchen team can address you.");
    if (nameInput) nameInput.focus();
    return;
  }
  if (!phone || phone.length < 7) {
    alert("Please enter a valid phone or WhatsApp number.");
    if (phoneInput) phoneInput.focus();
    return;
  }

  const unitPrice = CURRENT_ORDER_PRODUCT.prices[CURRENT_ORDER_SIZE] || 190;
  const total = unitPrice * CURRENT_ORDER_QTY;

  const msg = `Namaskaram Achar & Co.! 🌶️\n\nI would like to place an order from your website:\n\n• Product: *${CURRENT_ORDER_PRODUCT.name}* (${CURRENT_ORDER_PRODUCT.malayalamName || ''})\n• Pack Size: *${CURRENT_ORDER_SIZE}*\n• Quantity: *${CURRENT_ORDER_QTY} jar(s)*\n• Total Amount: *₹${total.toLocaleString("en-IN")}*\n\n*Customer Details:*\n• Name: *${name}*\n• Phone / WhatsApp: *${phone}*\n• Delivery District in Kerala: *${district}*\n${address ? `• Address: ${address}\n` : ''}\nPlease confirm delivery schedule and dispatch details. Thank you!`;

  const waUrl = ACHAR_CONFIG.getWhatsAppUrl(msg);
  window.open(waUrl, "_blank");
  showToast("Launching WhatsApp with your order summary...");
  closePurchaseModal();
}

function addOrderModalToBag() {
  if (!CURRENT_ORDER_PRODUCT) return;
  addToCart(CURRENT_ORDER_PRODUCT.id, CURRENT_ORDER_SIZE, CURRENT_ORDER_QTY);
  closePurchaseModal();
}
