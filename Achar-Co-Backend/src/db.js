import pg from "pg";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined
});

export const query = (text, params) => pool.query(text, params);
export const withClient = async (fn) => {
  const client = await pool.connect();
  try { return await fn(client); } finally { client.release(); }
};
export const closePool = () => pool.end();

export async function initializeDatabase() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const schema = await fs.readFile(path.join(here, "schema.sql"), "utf8");
  await query(schema);
  const seed = JSON.parse(await fs.readFile(path.join(here, "../data/seed-products.json"), "utf8"));
  for (const product of seed) {
    await query(
      `INSERT INTO products
        (slug, name, malayalam_name, category, badge, short_desc, full_story, image, fallback_image,
         prices, ingredients, allergens, storage, shelf_life, is_out_of_stock, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12,$13,$14,$15,$16,$17)
       ON CONFLICT (slug) DO NOTHING`,
      [product.slug, product.name, product.malayalamName || "", product.category, product.badge || "",
       product.shortDesc || "", product.fullStory || "", product.image || "", product.fallbackImage || "",
       JSON.stringify(product.prices || {}), product.ingredients || "", product.allergens || "",
       product.storage || "", product.shelfLife || "", product.isOutOfStock, product.isActive, product.sortOrder]
    );
  }
}
