const API = window.ACHAR_API_BASE || window.location.origin;
const $ = (selector) => document.querySelector(selector);
const tokenKey = "achar_admin_token";
let token = sessionStorage.getItem(tokenKey) || "";
let products = [];
let enquiries = [];
let orders = [];
let activeView = "overview";
let noticeTimer;

function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[char]);
}
function money(value) { return value ? "₹" + Number(value).toLocaleString("en-IN") : "Enquire"; }
function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-IN", { day:"numeric", month:"short", hour:"numeric", minute:"2-digit" });
}
async function request(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: { "Content-Type":"application/json", ...(token ? { Authorization:"Bearer " + token } : {}), ...(options.headers || {}) }
  });
  if (response.status === 401 && path !== "/api/auth/login") signOut();
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "Request failed.");
  return data;
}
function showNotice(message, type = "success") {
  const box = $("#notice"); box.textContent = message; box.className = "notice show " + type;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => box.className = "notice", 4200);
}
function showLogin(message = "") {
  $("#loginView").classList.remove("hidden"); $("#appView").classList.add("hidden");
  $("#loginError").textContent = message;
}
function showApp(email) {
  $("#loginView").classList.add("hidden"); $("#appView").classList.remove("hidden");
  $("#adminEmail").textContent = email || "Admin";
}
function signOut() {
  token = ""; sessionStorage.removeItem(tokenKey); showLogin();
}
async function login(event) {
  event.preventDefault(); $("#loginError").textContent = "";
  try {
    const data = await request("/api/auth/login", { method:"POST", body:JSON.stringify({ email:$("#loginEmail").value, password:$("#loginPassword").value }) });
    token = data.token; sessionStorage.setItem(tokenKey, token); showApp(data.admin.email); await loadAll();
  } catch (error) { showLogin(error.message); }
}
function setView(view) {
  activeView = view;
  document.querySelectorAll(".view").forEach((node) => node.classList.add("hidden"));
  $("#" + view + "View").classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((node) => node.classList.toggle("active", node.dataset.view === view));
  $("#pageTitle").textContent = ({overview:"Overview", products:"Products", enquiries:"Enquiries", orders:"Orders"})[view];
  if (view === "products") renderProducts();
  if (view === "enquiries") renderEnquiries();
  if (view === "orders") renderOrders();
}
async function loadAll() {
  const [productData, enquiryData, orderData] = await Promise.all([
    request("/api/admin/products"), request("/api/admin/enquiries"), request("/api/admin/orders")
  ]);
  products = productData.products; enquiries = enquiryData.enquiries; orders = orderData.orders; renderAll();
}
function renderAll() {
  const active = products.filter((p) => p.isActive).length;
  const out = products.filter((p) => p.isOutOfStock).length;
  const fresh = enquiries.filter((e) => e.status === "new").length;
  const openOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  $("#productNavCount").textContent = products.length;
  $("#newEnquiryCount").textContent = fresh;
  $("#activeProductsStat").textContent = active;
  $("#stockProductsStat").textContent = out;
  $("#newEnquiriesStat").textContent = fresh;
  $("#orderNavCount").textContent = orders.length;
  $("#openOrdersStat").textContent = openOrders;
  $("#productCountLabel").textContent = products.length;
  renderProducts(); renderEnquiries(); renderRecentEnquiries(); renderOrders();
}
function productRows() {
  const search = $("#productSearch").value.trim().toLowerCase();
  const rows = products.filter((p) => (p.name + " " + p.category).toLowerCase().includes(search));
  $("#emptyProducts").classList.toggle("hidden", rows.length > 0);
  $("#productsTable").innerHTML = rows.map((p) => {
    const startPrice = Object.values(p.prices || {}).map(Number).filter(Number.isFinite).sort((a,b)=>a-b)[0];
    const stock = p.isOutOfStock ? '<span class="badge warn">Out of stock</span>' : p.isActive ? '<span class="badge">In stock</span>' : '<span class="badge off">Hidden</span>';
    const image = p.image || p.fallbackImage || "";
    return `<tr><td class="product-cell"><img class="product-thumb" src="${safeText(image)}" alt="" onerror="this.style.visibility='hidden'"><span>${safeText(p.name)}<small>${safeText(p.slug)}</small></span></td><td>${safeText(p.category)}</td><td>${money(startPrice)}</td><td>${stock}</td><td><div class="row-actions"><button class="small-button" data-edit="${p.id}">Edit</button><button class="small-button" data-toggle="${p.id}">${p.isActive ? "Hide" : "Publish"}</button></div></td></tr>`;
  }).join("");
}
function renderProducts() { if ($("#productsTable")) productRows(); }
function enquiryCard(e, compact = false) {
  const statusOptions = ["new","read","replied","archived"].map((s) => `<option value="${s}" ${e.status===s?"selected":""}>${s[0].toUpperCase()+s.slice(1)}</option>`).join("");
  return `<article class="enquiry-row"><div class="enquiry-person">${safeText(e.name)}<small>${safeText(e.phone)} ${e.email ? "· "+safeText(e.email) : ""}</small></div><div class="${compact?"enquiry-preview":"inbox-message"}">${safeText(e.message)}</div>${compact ? `<time class="enquiry-date">${dateLabel(e.createdAt)}</time>` : `<div class="inbox-controls"><span class="enquiry-date">${dateLabel(e.createdAt)}</span><select class="select" data-status-id="${e.id}">${statusOptions}</select></div>`}</article>`;
}
function renderRecentEnquiries() {
  const recent = enquiries.slice(0, 5);
  $("#recentEnquiries").innerHTML = recent.length ? recent.map((e) => enquiryCard(e, true)).join("") : '<p class="muted">No enquiries yet. Messages submitted from your website will appear here.</p>';
}
function renderEnquiries() {
  const filter = $("#enquiryFilter")?.value || "";
  const rows = enquiries.filter((e) => !filter || e.status === filter);
  $("#enquiriesList").innerHTML = rows.length ? rows.map((e) => enquiryCard(e)).join("") : '<div class="empty-state">No enquiries in this view.</div>';
}
function orderCard(order) {
  const statuses = [["received","Received"],["making","Making"],["making_done","Making done"],["shipping","Shipping"],["delivered","Delivered"],["cancelled","Cancelled"]];
  const options = statuses.map(([value,label]) => `<option value="${value}" ${order.status===value?"selected":""}>${label}</option>`).join("");
  const items = order.items.map((item) => `<li><span>${safeText(item.productName)} · ${safeText(item.size)} × ${item.quantity}</span><b>${money(item.lineTotal)}</b></li>`).join("");
  return `<article class="order-card"><div class="order-card-head"><div><p class="eyebrow">ORDER NUMBER</p><h3>${safeText(order.orderNumber)}</h3><span class="muted">Placed ${dateLabel(order.createdAt)}</span></div><strong class="order-total">${money(order.subtotal)}</strong></div><div class="order-card-body"><div class="order-customer"><b>${safeText(order.customerName)}</b><a href="tel:${safeText(order.phone)}">${safeText(order.phone)}</a>${order.email?`<span>${safeText(order.email)}</span>`:""}<span>${safeText(order.address)}, ${safeText(order.district)}</span></div><ul class="order-items">${items}</ul></div><div class="order-card-footer"><div><span class="badge">${safeText(order.status.replaceAll("_"," "))}</span></div><div class="order-status-control"><label class="sr-only" for="order-status-${order.id}">Order status</label><select id="order-status-${order.id}" class="select" data-order-status>${options}</select><button class="small-button" data-save-order="${order.id}">Save status</button></div></div></article>`;
}
function renderOrders() {
  const list = $("#ordersList"); if (!list) return;
  const filter = $("#orderFilter")?.value || "";
  const rows = orders.filter((order) => !filter || order.status === filter);
  list.innerHTML = rows.length ? rows.map(orderCard).join("") : '<div class="panel empty-state">No orders in this view yet.</div>';
}
function openProduct(product) {
  $("#productForm").reset(); $("#productFormError").textContent = "";
  $("#dialogTitle").textContent = product ? "Edit product" : "Add a product";
  $("#productId").value = product?.id || "";
  $("#productName").value = product?.name || "";
  $("#productSlug").value = product?.slug || "";
  $("#productCategory").value = product?.category || "Vegetarian";
  $("#productBadge").value = product?.badge || "";
  $("#productShortDesc").value = product?.shortDesc || "";
  $("#productImage").value = product?.image || "";
  $("#price250").value = product?.prices?.["250g"] ?? "";
  $("#price500").value = product?.prices?.["500g"] ?? "";
  $("#price1kg").value = product?.prices?.["1kg"] ?? "";
  $("#productOutOfStock").checked = Boolean(product?.isOutOfStock);
  $("#productActive").checked = product ? Boolean(product.isActive) : true;
  $("#productDialog").showModal();
}
function collectProduct() {
  const editing = products.find((product) => String(product.id) === $("#productId").value);
  const prices = {};
  [["250g","#price250"],["500g","#price500"],["1kg","#price1kg"]].forEach(([size, selector]) => {
    const value = $(selector).value;
    if (value !== "") prices[size] = Number(value);
  });
  return {
    name:$("#productName").value, slug:$("#productSlug").value, category:$("#productCategory").value,
    badge:$("#productBadge").value, shortDesc:$("#productShortDesc").value, image:$("#productImage").value,
    malayalamName:editing?.malayalamName || "", fullStory:editing?.fullStory || "",
    fallbackImage:editing?.fallbackImage || "", ingredients:editing?.ingredients || "",
    allergens:editing?.allergens || "", storage:editing?.storage || "",
    shelfLife:editing?.shelfLife || "", sortOrder:editing?.sortOrder || 0,
    prices, isOutOfStock:$("#productOutOfStock").checked, isActive:$("#productActive").checked
  };
}
async function saveProduct(event) {
  event.preventDefault(); $("#productFormError").textContent = "";
  const id = $("#productId").value;
  try {
    await request(id ? `/api/admin/products/${id}` : "/api/admin/products", {
      method:id ? "PATCH" : "POST", body:JSON.stringify(collectProduct())
    });
    $("#productDialog").close(); await loadAll(); showNotice(id ? "Product updated." : "Product added."); setView("products");
  } catch (error) { $("#productFormError").textContent = error.message; }
}
async function toggleProduct(id) {
  const product = products.find((p) => String(p.id) === String(id)); if (!product) return;
  await request(`/api/admin/products/${id}`, { method:"PATCH", body:JSON.stringify({ ...product, isActive:!product.isActive }) });
  await loadAll(); showNotice(product.isActive ? "Product hidden from the website." : "Product published to the website.");
}
async function updateEnquiry(id, status) {
  await request(`/api/admin/enquiries/${id}`, { method:"PATCH", body:JSON.stringify({status}) });
  const item = enquiries.find((e) => String(e.id) === String(id)); if (item) item.status = status;
  renderAll(); showNotice("Enquiry status updated.");
}
async function updateOrder(id, status) {
  await request(`/api/admin/orders/${id}`, { method:"PATCH", body:JSON.stringify({status}) });
  await loadAll(); showNotice("Order status saved. Customer tracking is updated.");
}

$("#loginForm").addEventListener("submit", login);
$("#logoutButton").addEventListener("click", signOut);
document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.go)));
$("#addProductButton").addEventListener("click", () => openProduct());
$("#closeDialog").addEventListener("click", () => $("#productDialog").close());
$("#cancelDialog").addEventListener("click", () => $("#productDialog").close());
$("#productForm").addEventListener("submit", saveProduct);
$("#productSearch").addEventListener("input", renderProducts);
$("#productsTable").addEventListener("click", async (event) => {
  const edit = event.target.closest("[data-edit]"); const toggle = event.target.closest("[data-toggle]");
  if (edit) openProduct(products.find((p) => String(p.id) === edit.dataset.edit));
  if (toggle) { try { await toggleProduct(toggle.dataset.toggle); } catch (error) { showNotice(error.message,"error"); } }
});
$("#enquiryFilter").addEventListener("change", renderEnquiries);
$("#enquiriesList").addEventListener("change", async (event) => {
  const select = event.target.closest("[data-status-id]"); if (!select) return;
  try { await updateEnquiry(select.dataset.statusId, select.value); } catch (error) { showNotice(error.message,"error"); }
});
$("#orderFilter").addEventListener("change", renderOrders);
$("#refreshOrdersButton").addEventListener("click", async () => {
  try { await loadAll(); showNotice("Orders refreshed."); } catch (error) { showNotice(error.message,"error"); }
});
$("#ordersList").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-save-order]"); if (!button) return;
  const card = button.closest(".order-card"); const select = card?.querySelector("[data-order-status]");
  if (!select) return;
  button.disabled = true;
  try { await updateOrder(button.dataset.saveOrder, select.value); } catch (error) { showNotice(error.message,"error"); }
  finally { button.disabled = false; }
});

if (token) {
  request("/api/admin/products").then(async (data) => {
    showApp(); products = data.products;
    const [enquiryData, orderData] = await Promise.all([request("/api/admin/enquiries"), request("/api/admin/orders")]);
    enquiries = enquiryData.enquiries; orders = orderData.orders; renderAll();
  }).catch(() => signOut());
}
