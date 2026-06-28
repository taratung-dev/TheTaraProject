import { Database } from "bun:sqlite";

export function openServiceDb() {
  const db = new Database(process.env.DB_PATH ?? "data/platform.sqlite", {
    create: true,
  });
  // WAL mode allows concurrent reads alongside writes and avoids SQLITE_BUSY
  // under the multi-process architecture where all services share one file.
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA busy_timeout = 5000");
  db.run("PRAGMA foreign_keys = ON");
  return db;
}
