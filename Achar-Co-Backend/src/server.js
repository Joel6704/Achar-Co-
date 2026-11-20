import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeDatabase, query, withClient } from "./db.js";

const app = express();
app.set("trust proxy", 1);
const port = Number(process.env.PORT || 4000);
const jwtSecret = process.env.JWT_SECRET;
const here = path.dirname(fileURLToPath(import.meta.url));
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:3000")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin || allowedOrigins.includes(origin)) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }

  const railwayDomain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (railwayDomain && parsed.origin === `https://${railwayDomain}`) return true;

  // Vercel gives each deployment a project-prefixed hostname. Permit previews
  // from this exact project while keeping unrelated Vercel sites blocked.
  const productionVercelHost = allowedOrigins
    .map((allowed) => { try { return new URL(allowed).hostname; } catch { return ""; } })
    .find((hostname) => hostname.endsWith(".vercel.app"));
  if (!productionVercelHost) return false;
  const projectSlug = productionVercelHost.slice(0, -".vercel.app".length);
  return parsed.protocol === "https:"
    && parsed.hostname.endsWith(".vercel.app")
    && parsed.hostname.startsWith(`${projectSlug}-`);
}

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!jwtSecret || jwtSecret.length < 32) throw new Error("Set JWT_SECRET to a random value with at least 32 characters.");
if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) {
  throw new Error("Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.");
}

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(compression());
app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    console.warn("Rejected CORS origin:", origin);
    return callback(new Error("This website origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "100kb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false }));
app.use("/api/enquiries", rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }));
app.use("/admin", express.static(path.join(here, "../public"), { index: "admin.html" }));

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const cleanText = (value, max = 2000) => String(value ?? "").trim().slice(0, max);

function requireAdmin(req, res, next) {
  const token = req.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to continue." });
  try {
    req.admin = jwt.verify(token, jwtSecret, { issuer: "achar-and-co" });
    return next();
  } catch {
    return res.status(401).json({ error: "Your session expired. Sign in again." });
  }
}

function productPayload(body) {
  const slug = cleanText(body.slug, 90).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const category = cleanText(body.category, 20);
  const prices = body.prices && typeof body.prices === "object" && !Array.isArray(body.prices) ? body.prices : {};
  for (const [size, price] of Object.entries(prices)) {
    if (!["250g", "500g", "1kg"].includes(size) || !Number.isFinite(Number(price)) || Number(price) < 0) {
      throw Object.assign(new Error("Prices must use 250g, 500g or 1kg with a valid non-negative amount."), { status: 400 });
    }
  }
  if (!slug || !cleanText(body.name, 120)) throw Object.assign(new Error("Product name and URL slug are required."), { status: 400 });
  if (!["Vegetarian", "Meat", "Seafood"].includes(category)) throw Object.assign(new Error("Choose Vegetarian, Meat or Seafood."), { status: 400 });
  return {
    slug, name: cleanText(body.name, 120), malayalam_name: cleanText(body.malayalamName, 160),
    category, badge: cleanText(body.badge, 80), short_desc: cleanText(body.shortDesc, 500),
    full_story: cleanText(body.fullStory, 4000), image: cleanText(body.image, 1000),
    fallback_image: cleanText(body.fallbackImage, 1000), prices, ingredients: cleanText(body.ingredients, 1500),
    allergens: cleanText(body.allergens, 500), storage: cleanText(body.storage, 500),
    shelf_life: cleanText(body.shelfLife, 120), is_out_of_stock: Boolean(body.isOutOfStock),
    is_active: body.isActive !== false, sort_order: Math.max(-10000, Math.min(10000, Number(body.sortOrder) || 0))
  };
}

const productSelect = `SELECT id, slug, name, malayalam_name AS "malayalamName", category, badge,
  short_desc AS "shortDesc", full_story AS "fullStory", image, fallback_image AS "fallbackImage",
  prices, ingredients, allergens, storage, shelf_life AS "shelfLife",
  is_out_of_stock AS "isOutOfStock", is_active AS "isActive", sort_order AS "sortOrder",
  created_at AS "createdAt", updated_at AS "updatedAt" FROM products`;

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "achar-and-co-api" }));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const email = cleanText(req.body?.email, 254).toLowerCase();
  const password = String(req.body?.password ?? "");
  const found = await query("SELECT id, email, password_hash FROM admins WHERE email = $1", [email]);
  if (!found.rowCount || !(await bcrypt.compare(password, found.rows[0].password_hash))) {
    return res.status(401).json({ error: "Email or password is incorrect." });
  }
  const user = found.rows[0];
  const token = jwt.sign({ sub: String(user.id), email: user.email }, jwtSecret,
    { expiresIn: "8h", issuer: "achar-and-co", audience: "achar-admin" });
  res.json({ token, admin: { email: user.email }, expiresIn: 28800 });
}));

app.get("/api/products", asyncRoute(async (_req, res) => {
  const { rows } = await query(`${productSelect} WHERE is_active = TRUE ORDER BY sort_order, id`);
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300").json({ products: rows });
}));

app.get("/api/admin/products", requireAdmin, asyncRoute(async (_req, res) => {
  const { rows } = await query(`${productSelect} ORDER BY sort_order, id`);
  res.json({ products: rows });
}));

app.post("/api/admin/products", requireAdmin, asyncRoute(async (req, res) => {
  const p = productPayload(req.body);
  const { rows } = await query(
    `INSERT INTO products (slug,name,malayalam_name,category,badge,short_desc,full_story,image,fallback_image,prices,
      ingredients,allergens,storage,shelf_life,is_out_of_stock,is_active,sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17)
     RETURNING id,slug,name,malayalam_name AS "malayalamName",category,badge,short_desc AS "shortDesc",
      full_story AS "fullStory",image,fallback_image AS "fallbackImage",prices,ingredients,allergens,storage,
      shelf_life AS "shelfLife",is_out_of_stock AS "isOutOfStock",is_active AS "isActive",sort_order AS "sortOrder"`,
    [p.slug,p.name,p.malayalam_name,p.category,p.badge,p.short_desc,p.full_story,p.image,p.fallback_image,
      JSON.stringify(p.prices),p.ingredients,p.allergens,p.storage,p.shelf_life,p.is_out_of_stock,p.is_active,p.sort_order]
  );
  res.status(201).json({ product: rows[0] });
}));

app.patch("/api/admin/products/:id", requireAdmin, asyncRoute(async (req, res) => {
  const p = productPayload(req.body);
  const { rows } = await query(
    `UPDATE products SET slug=$1,name=$2,malayalam_name=$3,category=$4,badge=$5,short_desc=$6,full_story=$7,
      image=$8,fallback_image=$9,prices=$10::jsonb,ingredients=$11,allergens=$12,storage=$13,shelf_life=$14,
      is_out_of_stock=$15,is_active=$16,sort_order=$17,updated_at=NOW()
     WHERE id=$18
     RETURNING id,slug,name,malayalam_name AS "malayalamName",category,badge,short_desc AS "shortDesc",
      full_story AS "fullStory",image,fallback_image AS "fallbackImage",prices,ingredients,allergens,storage,
      shelf_life AS "shelfLife",is_out_of_stock AS "isOutOfStock",is_active AS "isActive",sort_order AS "sortOrder"`,
    [p.slug,p.name,p.malayalam_name,p.category,p.badge,p.short_desc,p.full_story,p.image,p.fallback_image,
      JSON.stringify(p.prices),p.ingredients,p.allergens,p.storage,p.shelf_life,p.is_out_of_stock,p.is_active,p.sort_order,req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Product not found." });
  res.json({ product: rows[0] });
}));

app.delete("/api/admin/products/:id", requireAdmin, asyncRoute(async (req, res) => {
  const result = await query("DELETE FROM products WHERE id = $1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Product not found." });
  res.status(204).end();
}));

app.post("/api/enquiries", asyncRoute(async (req, res) => {
  const name = cleanText(req.body?.name, 120);
  const phone = cleanText(req.body?.phone, 40);
  const email = cleanText(req.body?.email, 254);
  const district = cleanText(req.body?.district, 80);
  const message = cleanText(req.body?.message, 3000);
  if (!name || !phone || !message) return res.status(400).json({ error: "Name, phone and message are required." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  const { rows } = await query(
    "INSERT INTO enquiries (name,phone,email,district,message) VALUES ($1,$2,$3,$4,$5) RETURNING id,created_at",
    [name,phone,email,district,message]
  );
  res.status(201).json({ enquiry: { id: rows[0].id, createdAt: rows[0].created_at }, message: "Enquiry saved." });
}));

app.get("/api/admin/enquiries", requireAdmin, asyncRoute(async (req, res) => {
  const status = ["new","read","replied","archived"].includes(req.query.status) ? req.query.status : null;
  const { rows } = await query(
    `SELECT id,name,phone,email,district,message,status,created_at AS "createdAt"
     FROM enquiries WHERE ($1::text IS NULL OR status=$1) ORDER BY created_at DESC LIMIT 500`, [status]
  );
  res.json({ enquiries: rows });
}));

app.patch("/api/admin/enquiries/:id", requireAdmin, asyncRoute(async (req, res) => {
  const status = req.body?.status;
  if (!["new","read","replied","archived"].includes(status)) return res.status(400).json({ error: "Choose a valid enquiry status." });
  const { rows } = await query(
    `UPDATE enquiries SET status=$1 WHERE id=$2 RETURNING id,name,phone,email,district,message,status,created_at AS "createdAt"`,
    [status, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Enquiry not found." });
  res.json({ enquiry: rows[0] });
}));

const orderStatuses = ["received", "making", "making_done", "shipping", "delivered", "cancelled"];
const orderStatusLabels = { received: "Order received", making: "Making", making_done: "Making done", shipping: "Shipping", delivered: "Delivered", cancelled: "Cancelled" };

app.post("/api/orders", rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false }), asyncRoute(async (req, res) => {
  const name = cleanText(req.body?.name, 120);
  const phone = cleanText(req.body?.phone, 40);
  const email = cleanText(req.body?.email, 254);
  const address = cleanText(req.body?.address, 1000);
  const district = cleanText(req.body?.district, 80);
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!name || !phone || !address || !district) return res.status(400).json({ error: "Name, phone, full address and district are required." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
  if (!items.length || items.length > 20) return res.status(400).json({ error: "Choose between 1 and 20 products." });
  const normalized = items.map((item) => {
    const productId = cleanText(item.productId || item.slug, 90).toLowerCase();
    const size = cleanText(item.size, 10);
    const quantity = Number(item.quantity);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productId) || !["250g", "500g", "1kg"].includes(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw Object.assign(new Error("Each item needs a valid product, pack size and quantity."), { status: 400 });
    }
    return { productId, size, quantity };
  });

  const created = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const pricedItems = [];
      for (const item of normalized) {
        const found = await client.query(
          `SELECT id,slug,name,(prices->>$2)::numeric AS unit_price
           FROM products WHERE slug=$1 AND is_active=TRUE AND is_out_of_stock=FALSE`, [item.productId, item.size]
        );
        if (!found.rowCount || found.rows[0].unit_price === null) {
          throw Object.assign(new Error("One selected product or pack size is currently unavailable. Please refresh the catalogue."), { status: 400 });
        }
        const product = found.rows[0];
        pricedItems.push({ ...item, id: product.id, name: product.name, unitPrice: Number(product.unit_price) });
      }
      const subtotal = pricedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const orderNumber = `AC-${new Date().toISOString().slice(2, 10).replaceAll("-", "")}-${randomBytes(4).toString("hex").toUpperCase()}`;
      const order = await client.query(
        `INSERT INTO orders (order_number,customer_name,phone,email,address,district,subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,order_number AS "orderNumber",status,created_at AS "createdAt",subtotal`,
        [orderNumber, name, phone, email, address, district, subtotal]
      );
      for (const item of pricedItems) {
        await client.query(
          `INSERT INTO order_items (order_id,product_id,product_slug,product_name,pack_size,quantity,unit_price,line_total)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [order.rows[0].id, item.id, item.productId, item.name, item.size, item.quantity, item.unitPrice, item.unitPrice * item.quantity]
        );
      }
      await client.query("INSERT INTO order_status_history (order_id,status,note) VALUES ($1,'received','Order submitted')", [order.rows[0].id]);
      await client.query("COMMIT");
      return { ...order.rows[0], subtotal: Number(order.rows[0].subtotal) };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
  res.status(201).json({ order: { ...created, statusLabel: orderStatusLabels[created.status] } });
}));

app.post("/api/orders/track", rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false }), asyncRoute(async (req, res) => {
  const digits = cleanText(req.body?.phone, 40).replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) return res.status(400).json({ error: "Enter the phone number used for your order." });
  const phoneSuffix = digits.slice(-10);
  const { rows } = await query(
    `SELECT id,order_number AS "orderNumber",status,created_at AS "createdAt",updated_at AS "updatedAt"
     FROM orders WHERE right(regexp_replace(phone,'[^0-9]','','g'),10)=$1 ORDER BY created_at DESC LIMIT 20`, [phoneSuffix]
  );
  if (!rows.length) return res.status(404).json({ error: "No orders were found for that phone number. Check the number and try again." });
  const ids = rows.map((order) => order.id);
  const [itemResult, historyResult] = await Promise.all([
    query(`SELECT order_id AS "orderId",product_name AS "productName",pack_size AS size,quantity
      FROM order_items WHERE order_id=ANY($1::bigint[]) ORDER BY id`, [ids]),
    query(`SELECT order_id AS "orderId",status,note,created_at AS "createdAt"
      FROM order_status_history WHERE order_id=ANY($1::bigint[]) ORDER BY created_at,id`, [ids])
  ]);
  const groupByOrder = (items) => items.reduce((map, item) => {
    const key = String(item.orderId); const list = map.get(key) || []; list.push(item); map.set(key, list); return map;
  }, new Map());
  const items = groupByOrder(itemResult.rows);
  const history = groupByOrder(historyResult.rows);
  res.set("Cache-Control", "no-store").json({ orders: rows.map((order) => ({
    orderNumber: order.orderNumber, status: order.status, statusLabel: orderStatusLabels[order.status],
    createdAt: order.createdAt, updatedAt: order.updatedAt, items: items.get(String(order.id)) || [],
    history: (history.get(String(order.id)) || []).map((entry) => ({ ...entry, statusLabel: orderStatusLabels[entry.status] }))
  })) });
}));

app.get("/api/orders/:orderNumber/track", rateLimit({ windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }), asyncRoute(async (req, res) => {
  const number = cleanText(req.params.orderNumber, 40).toUpperCase();
  const found = await query(
    `SELECT id,order_number AS "orderNumber",status,created_at AS "createdAt",updated_at AS "updatedAt"
     FROM orders WHERE order_number=$1`, [number]
  );
  if (!found.rowCount) return res.status(404).json({ error: "We could not find that order number. Check it and try again." });
  const history = await query(
    `SELECT status,note,created_at AS "createdAt" FROM order_status_history WHERE order_id=$1 ORDER BY created_at,id`, [found.rows[0].id]
  );
  const order = found.rows[0];
  res.set("Cache-Control", "no-store").json({ order: { orderNumber: order.orderNumber, status: order.status,
    statusLabel: orderStatusLabels[order.status], createdAt: order.createdAt, updatedAt: order.updatedAt,
    history: history.rows.map((entry) => ({ ...entry, statusLabel: orderStatusLabels[entry.status] })) } });
}));

app.get("/api/admin/orders", requireAdmin, asyncRoute(async (req, res) => {
  const status = orderStatuses.includes(req.query.status) ? req.query.status : null;
  const { rows } = await query(
    `SELECT id,order_number AS "orderNumber",customer_name AS "customerName",phone,email,address,district,
       subtotal,status,created_at AS "createdAt",updated_at AS "updatedAt"
     FROM orders WHERE ($1::text IS NULL OR status=$1) ORDER BY created_at DESC LIMIT 500`, [status]
  );
  if (!rows.length) return res.json({ orders: [] });
  const itemRows = await query(
    `SELECT order_id AS "orderId",product_name AS "productName",pack_size AS size,quantity,
       unit_price AS "unitPrice",line_total AS "lineTotal" FROM order_items WHERE order_id=ANY($1::bigint[]) ORDER BY id`,
    [rows.map((order) => order.id)]
  );
  const byOrder = new Map();
  for (const item of itemRows.rows) {
    const list = byOrder.get(String(item.orderId)) || [];
    list.push({ ...item, unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal) });
    byOrder.set(String(item.orderId), list);
  }
  res.json({ orders: rows.map(({ id, ...order }) => ({ ...order, subtotal: Number(order.subtotal), items: byOrder.get(String(id)) || [] })) });
}));

app.patch("/api/admin/orders/:id", requireAdmin, asyncRoute(async (req, res) => {
  const status = req.body?.status;
  if (!orderStatuses.includes(status)) return res.status(400).json({ error: "Choose a valid order status." });
  const updated = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const result = await client.query(
        `UPDATE orders SET status=$1,updated_at=NOW() WHERE id=$2
         RETURNING id,order_number AS "orderNumber",status,updated_at AS "updatedAt"`, [status, req.params.id]
      );
      if (!result.rowCount) { await client.query("ROLLBACK"); return null; }
      await client.query("INSERT INTO order_status_history (order_id,status,note) VALUES ($1,$2,$3)",
        [result.rows[0].id, status, orderStatusLabels[status]]);
      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  });
  if (!updated) return res.status(404).json({ error: "Order not found." });
  res.json({ order: { ...updated, statusLabel: orderStatusLabels[updated.status] } });
}));


app.use((err, _req, res, _next) => {
  if (err.code === "23505") return res.status(409).json({ error: "A product with that slug already exists." });
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? "The server could not complete this request." : err.message });
});

await initializeDatabase();
const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();
const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
await query(
  `INSERT INTO admins (email,password_hash) VALUES ($1,$2)
   ON CONFLICT (email) DO NOTHING`, [adminEmail, passwordHash]
);
app.listen(port, () => console.log(`Achar & Co. API listening on port ${port}`));
