import { openServiceDb } from "../../_lib/db";

export const db = openServiceDb();

export function migrateBrowser() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS browser_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS browser_bookmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS browser_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      homepage TEXT NOT NULL
    );
  `);
}

export function browserSettings(userId: number) {
  const row = db.query("SELECT homepage FROM browser_settings WHERE user_id = ?").get(userId) as { homepage: string } | null;
  return { homepage: row?.homepage ?? "/gopost" };
}

export function historyRows(userId: number) {
  return db.query("SELECT id, url, title, created_at AS createdAt FROM browser_history WHERE user_id = ? ORDER BY id DESC LIMIT 50").all(userId);
}

export function bookmarkRows(userId: number) {
  return db.query("SELECT id, url, title, created_at AS createdAt FROM browser_bookmarks WHERE user_id = ? ORDER BY id DESC").all(userId);
}
