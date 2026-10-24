/**
 * Database abstraction layer.
 * Uses JSON file storage for development, can be swapped for Drizzle/SQLite in production.
 */

export { jsonStorage as db } from "./json-storage.js";
export * from "./schema.js";
export { jsonStorage } from "./json-storage.js";