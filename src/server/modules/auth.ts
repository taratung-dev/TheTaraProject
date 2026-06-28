import { db } from "../db";
import { body, clearSessionCookie, hash, json, newToken, parseCookies, requireUser, sessionCookie, type RouteHandler } from "../http";

const userSelect = `
  SELECT id, username, display_name AS displayName, avatar_color AS avatarColor
  FROM users
`;

export function getSessionUserId(request: Request) {
  const token = parseCookies(request).session;
  if (!token) return null;
  const row = db.query("SELECT user_id AS userId FROM sessions WHERE token_hash = ? AND expires_at > CURRENT_TIMESTAMP")
    .get(hash(token)) as { userId: number } | null;
  return row?.userId ?? null;
}

export const me: RouteHandler = ({ userId }) => {
  if (!userId) return json({ user: null });
  const user = db.query(`${userSelect} WHERE id = ?`).get(userId);
  return json({ user });
};

export const signup: RouteHandler = async ({ request }) => {
  const input = await body<{ username: string; displayName: string; password: string }>(request);
  if (!input.username || !input.displayName || !input.password || input.password.length < 4) {
    return json({ error: "Username, display name, and a 4+ character password are required." }, 400);
  }

  try {
    const passwordHash = await Bun.password.hash(input.password);
    const colors = ["#2f80ed", "#f25f8c", "#27ae60", "#f2994a"];
    const result = db.prepare("INSERT INTO users (username, display_name, password_hash, avatar_color) VALUES (?, ?, ?, ?)")
      .run(input.username.toLowerCase(), input.displayName, passwordHash, colors[Math.floor(Math.random() * colors.length)]);
    db.prepare("INSERT INTO user_settings VALUES (?, ?, ?, ?, ?)").run(Number(result.lastInsertRowid), "dev-bright", "glass", 1, 0);
    for (const app of ["gopost", "settings", "minecraft", "messenger"]) {
      db.prepare("INSERT INTO installed_apps (user_id, app_id) VALUES (?, ?)").run(Number(result.lastInsertRowid), app);
    }
    return await login({ request: new Request(request.url, { method: "POST", body: JSON.stringify({ username: input.username, password: input.password }) }), params: {}, userId: null });
  } catch {
    return json({ error: "That username is already taken." }, 409);
  }
};

export const login: RouteHandler = async ({ request }) => {
  const input = await body<{ username: string; password: string }>(request);
  const row = db.query("SELECT id, password_hash AS passwordHash FROM users WHERE username = ?")
    .get(input.username?.toLowerCase()) as { id: number; passwordHash: string } | null;
  if (!row || !(await Bun.password.verify(input.password ?? "", row.passwordHash))) {
    return json({ error: "Invalid username or password." }, 401);
  }

  const token = newToken();
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+7 days'))")
    .run(hash(token), row.id);
  const user = db.query(`${userSelect} WHERE id = ?`).get(row.id);
  return json({ user }, 200, { "Set-Cookie": sessionCookie(token) });
};

export const logout: RouteHandler = ({ request }) => {
  const token = parseCookies(request).session;
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(token));
  return json({ ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
};

export const requireAuthed: RouteHandler = ({ userId }) => requireUser(userId) ?? json({ ok: true });
