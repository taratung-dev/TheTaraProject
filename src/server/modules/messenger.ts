import { db } from "../db";
import { body, json, requireUser, type RouteHandler } from "../http";
import { broadcast } from "./live";

export const conversations: RouteHandler = ({ userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const rows = db.query(`
    SELECT c.id, c.title, c.type
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.id
    WHERE cm.user_id = ?
    ORDER BY c.id
  `).all(userId);
  return json({ conversations: rows });
};

function messageRows(conversationId: number) {
  return db.query(`
    SELECT m.id, m.conversation_id AS conversationId, m.body, m.created_at AS createdAt,
      u.id AS authorId, u.username, u.display_name AS displayName, u.avatar_color AS avatarColor
    FROM messages m
    JOIN users u ON u.id = m.sender_id
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

export const messages: RouteHandler = ({ params, userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  return json({ messages: messageRows(Number(params.id)) });
};

export const sendMessage: RouteHandler = async ({ request, params, userId }) => {
  const unauthorized = requireUser(userId);
  if (unauthorized) return unauthorized;
  const input = await body<{ body: string }>(request);
  if (!input.body?.trim()) return json({ error: "Message body is required." }, 400);
  db.prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)")
    .run(Number(params.id), userId, input.body.trim());
  const sent = messageRows(Number(params.id)).at(-1);
  broadcast({ type: "message.created", message: sent });
  return json({ message: sent }, 201);
};
