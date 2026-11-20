import "dotenv/config";
import { initializeDatabase, closePool } from "./db.js";

try {
  await initializeDatabase();
  console.log("Database schema is ready and seed products are loaded.");
} finally {
  await closePool();
}
