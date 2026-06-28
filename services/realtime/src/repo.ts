import { openServiceDb } from "../../_lib/db";

export const db = openServiceDb();

export function migrateRealtime() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function seedRealtime() {
  const userCount = db.query("SELECT COUNT(*) AS count FROM users").get() as { count: number };
  const conversationCount = db.query("SELECT COUNT(*) AS count FROM conversations").get() as { count: number };
  if (userCount.count < 3 || conversationCount.count > 0) return;
  db.prepare("INSERT INTO conversations (title, type) VALUES (?, ?)").run("GOpost Friends", "group");
  for (const userId of [1, 2, 3]) db.prepare("INSERT INTO conversation_members VALUES (?, ?)").run(1, userId);
  const insert = db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)");
  insert.run(1, 2, "Did you see the new dock?");
  insert.run(1, 1, "Store and Minecraft are already pinned.");
  insert.run(1, 3, "macOS Dev 3.4.6 is online.");
}

export function conversationRows(userId: number) {
  return db.query(`
    SELECT c.id, c.title, c.type,
      (SELECT COUNT(*) FROM notifications n WHERE n.user_id = ? AND n.read = 0 AND n.type = 'message') AS unreadCount
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.id
  `).all(userId, userId);
}

export function messageRows(conversationId: number) {
  return db.query(`
    SELECT m.id, m.conversation_id AS conversationId, m.body, m.created_at AS createdAt,
      u.id AS authorId, u.username, u.display_name AS displayName, u.avatar_color AS avatarColor
    FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.conversation_id = ?
    ORDER BY m.id
  `).all(conversationId).map((row: any) => ({
    id: row.id,
    conversationId: row.conversationId,
    body: row.body,
    createdAt: row.createdAt,
    sender: { id: row.authorId, username: row.username, displayName: row.displayName, avatarColor: row.avatarColor }
  }));
}

export function notifyOthers(conversationId: number, senderId: number, body: string) {
  const members = db.query("SELECT user_id AS userId FROM conversation_members WHERE conversation_id = ? AND user_id != ?").all(conversationId, senderId) as { userId: number }[];
  const insert = db.prepare("INSERT INTO notifications (user_id, type, title, body) VALUES (?, ?, ?, ?)");
  for (const member of members) insert.run(member.userId, "message", "New Messenger message", body);
}
