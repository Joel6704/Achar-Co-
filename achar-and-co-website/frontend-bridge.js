/*
 * Achar & Co. API bridge.
 * Set ACHAR_CONFIG.apiBaseUrl in config.js to your deployed API origin.
 * The bridge leaves the static site and WhatsApp ordering usable if no API is configured.
 */
(function () {
  const configuredBase = typeof ACHAR_CONFIG !== "undefined" ? ACHAR_CONFIG.apiBaseUrl : "";
  const API_BASE = String(window.ACHAR_API_BASE || configuredBase || "").trim().replace(/\/$/, "");
  if (!API_BASE || API_BASE.includes("YOUR-ACHAR-BACKEND")) return;

  const toWebsiteProduct = (record) => {
    const existing = ACHAR_CONFIG.products.find((item) => item.id === record.slug) || {};
    const prices = record.prices && typeof record.prices === "object" ? record.prices : {};
    return {
      ...existing,
      id: record.slug,
      slug: record.slug,
      name: record.name,
      malayalamName: record.malayalamName || existing.malayalamName || "",
      category: record.category,
      badge: record.badge || "",
      shortDesc: record.shortDesc || "",
      fullStory: record.fullStory || "",
      image: record.image || record.fallbackImage || existing.image || "",
      fallbackImage: record.fallbackImage || existing.fallbackImage || record.image || "",
      prices,
      ingredients: record.ingredients || "",
      allergens: record.allergens || "",
      storage: record.storage || "",
      shelfLife: record.shelfLife || "",
      createdAt: record.createdAt || null,
      is_out_of_stock: Boolean(record.isOutOfStock),
      regular_price: Object.values(prices).map(Number).filter(Number.isFinite).sort((a,b)=>a-b)[0] || 0
    };
  };

  async function refreshProducts() {
    try {
      const response = await fetch(API_BASE + "/api/products", { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Catalogue API request failed");
      const { products } = await response.json();
      if (!Array.isArray(products)) return;
      ACHAR_CONFIG.products.splice(0, ACHAR_CONFIG.products.length, ...products.map(toWebsiteProduct));
      if (typeof window.renderCatalogue === "function") window.renderCatalogue();
      if (typeof window.renderHomeFeatured === "function") window.renderHomeFeatured();
      if (typeof window.initComboBuilder === "function") window.initComboBuilder();
    } catch (error) {
      console.warn("Achar & Co. catalogue API is unavailable; using the local catalogue.", error);
    }
  }

  function connectContactForm() {
    const form = document.getElementById("contactPageForm");
    if (!form || form.dataset.apiBridge === "connected") return;
    form.dataset.apiBridge = "connected";
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const status = document.getElementById("contactFormStatus");
      const submit = form.querySelector('button[type="submit"]');
      const payload = {
        name: document.getElementById("contactName")?.value.trim(),
        phone: document.getElementById("contactPhone")?.value.trim(),
        email: document.getElementById("contactEmail")?.value.trim(),
        district: document.getElementById("contactDistrict")?.value,
        message: document.getElementById("contactMessage")?.value.trim()
      };
      if (submit) submit.disabled = true;
      if (status) { status.style.display = "block"; status.textContent = "Sending your message…"; }
      try {
        const response = await fetch(API_BASE + "/api/enquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Your message could not be saved.");
        form.reset();
        if (status) status.textContent = "Thank you! Your message has been sent to the Achar & Co. team.";
        if (typeof window.showToast === "function") window.showToast("Your enquiry has been sent.");
      } catch (error) {
        if (status) status.textContent = error.message + " Please use the WhatsApp button to reach us.";
        if (typeof window.showToast === "function") window.showToast("Message was not sent. Please try WhatsApp.");
      } finally {
        if (submit) submit.disabled = false;
      }
    }, true);
  }

  document.addEventListener("DOMContentLoaded", () => {
    void refreshProducts();
    connectContactForm();
  });
})();
