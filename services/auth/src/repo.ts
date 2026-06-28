import { createHash, randomBytes } from "crypto";
import { openServiceDb } from "../../_lib/db";

export type UserRow = {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string;
};

export type UserWithPassword = {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string;
  passwordHash: string;
};

export const db = openServiceDb();

export function migrateAuth() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
  `);
}

export async function seedAuth() {
  const count = db.query("SELECT COUNT(*) AS count FROM users").get() as {
    count: number;
  };
  if (count.count > 0) return;
  const users = [
    ["demo", "Tara Games", await Bun.password.hash("demo123"), "#2f80ed"],
    ["alya", "Alya Star", await Bun.password.hash("demo123"), "#f25f8c"],
    ["joko", "Joko Byte", await Bun.password.hash("demo123"), "#27ae60"],
  ];
  const insert = db.prepare(
    "INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (?, ?, ?, ?)",
  );
  for (const user of users) insert.run(...user);
}

export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function userById(id: number) {
  return db
    .query(
      "SELECT id, username, display_name AS displayName, avatar_color AS avatarColor FROM users WHERE id = ?",
    )
    .get(id) as UserRow | null;
}

export function userByUsername(username: string) {
  return db
    .query(
      "SELECT id, username, display_name AS displayName, avatar_color AS avatarColor, password_hash AS passwordHash FROM users WHERE username = ?",
    )
    .get(username.toLowerCase()) as UserWithPassword | null;
}

export function createSession(userId: number, token: string) {
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))",
  ).run(hash(token), userId);
}

export function sessionUserId(token: string | undefined) {
  if (!token) return null;
  const row = db
    .query(
      "SELECT user_id AS userId FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP",
    )
    .get(hash(token)) as { userId: number } | null;
  return row?.userId ?? null;
}

export function deleteSession(token: string | undefined) {
  if (token)
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(token));
}

export function createUser(
  username: string,
  displayName: string,
  passwordHash: string,
) {
  const colors = ["#2f80ed", "#f25f8c", "#27ae60", "#f2994a"];
  const result = db
    .prepare(
      "INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (?, ?, ?, ?)",
    )
    .run(
      username.toLowerCase(),
      displayName,
      passwordHash,
      colors[Math.floor(Math.random() * colors.length)],
    );
  return Number(result.lastInsertRowid);
}
