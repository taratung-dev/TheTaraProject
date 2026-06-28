import { Database } from "bun:sqlite";

export function openServiceDb() {
  const db = new Database(process.env.DB_PATH ?? "data/platform.sqlite", { create: true });
  db.run("PRAGMA foreign_keys = ON");
  return db;
}
