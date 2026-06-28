import {
  body,
  json,
  requireUser,
  route,
  servicePort,
  userIdFromHeader,
  type Route,
} from "../../_lib/http";
import {
  conversationRows,
  db,
  isMember,
  messageRows,
  migrateRealtime,
  seedRealtime,
  sendMessage,
} from "./repo";

await migrateRealtime();
seedRealtime();

const routes: Route[] = [
  [
    "GET",
    /^\/conversations$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      return json({ conversations: conversationRows(userId!) });
    },
  ],
  [
    "GET",
    /^\/conversations\/([^/]+)\/messages$/,
    ["id"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const conversationId = Number(params.id);
      if (!isMember(conversationId, userId!))
        return json({ error: "Conversation not found." }, 404);
      return json({ messages: messageRows(conversationId) });
    },
  ],
  [
    "POST",
    /^\/conversations\/([^/]+)\/messages$/,
    ["id"],
    async ({ request, params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const conversationId = Number(params.id);
      if (!isMember(conversationId, userId!))
        return json({ error: "Conversation not found." }, 404);
      const input = await body<{ body: string }>(request);
      if (!input || !input.body?.trim())
        return json({ error: "Message body is required." }, 400);
      sendMessage(conversationId, userId!, input.body.trim());
      return json({ message: messageRows(conversationId).at(-1) }, 201);
    },
  ],
  [
    "GET",
    /^\/notifications$/,
    [],
    ({ userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      const notifications = db
        .query(
          "SELECT id, type, title, body, read, created_at AS createdAt FROM notifications WHERE user_id = ? ORDER BY id DESC",
        )
        .all(userId)
        .map((row: any) => ({ ...row, read: Boolean(row.read) }));
      return json({ notifications });
    },
  ],
  [
    "POST",
    /^\/notifications\/([^/]+)\/read$/,
    ["id"],
    ({ params, userId }) => {
      const unauthorized = requireUser(userId);
      if (unauthorized) return unauthorized;
      db.prepare(
        "UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?",
      ).run(Number(params.id), userId);
      return json({ ok: true });
    },
  ],
];

const server = Bun.serve({
  port: servicePort(4103),
  fetch: (request) => route(request, routes, userIdFromHeader(request)),
});

console.log(`realtime service listening on http://localhost:${server.port}`);
