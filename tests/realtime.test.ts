import { beforeEach, describe, expect, test } from "bun:test";
import { migrate, resetForTests, seed } from "../src/server/db";
import {
  conversationRows,
  db,
  isMember,
  messageRows,
  notifyOthers,
  sendMessage,
} from "../services/realtime/src/repo";

async function resetAndSeed() {
  migrate();
  resetForTests();
  await seed();
}

beforeEach(async () => {
  await resetAndSeed();
});

describe("realtime service", () => {
  test("creates conversations with distinct members", () => {
    const result = db.prepare("INSERT INTO conversations (title, type) VALUES (?, ?)").run(
      "Project Squad",
      "group",
    );
    const conversationId = Number(result.lastInsertRowid);
    const insertMember = db.prepare(
      "INSERT INTO conversation_members (conversation_id, user_id) VALUES (?, ?)",
    );

    insertMember.run(conversationId, 1);
    insertMember.run(conversationId, 2);

    expect(isMember(conversationId, 1)).toBe(true);
    expect(isMember(conversationId, 2)).toBe(true);
    expect(isMember(conversationId, 3)).toBe(false);

    const userOneConversations = conversationRows(1);
    expect(userOneConversations.some((row: any) => row.id === conversationId)).toBe(true);
    const userThreeConversations = conversationRows(3);
    expect(userThreeConversations.some((row: any) => row.id === conversationId)).toBe(false);
  });

  test("sendMessage appends a message and notifies other members only", () => {
    const beforeMessages = messageRows(1).length;
    const beforeNotifications = db
      .query("SELECT user_id AS userId, COUNT(*) AS count FROM notifications GROUP BY user_id ORDER BY user_id")
      .all() as { userId: number; count: number }[];

    sendMessage(1, 1, "Hello team");

    const afterMessages = messageRows(1);
    expect(afterMessages).toHaveLength(beforeMessages + 1);
    expect(afterMessages.at(-1)?.body).toBe("Hello team");
    expect(afterMessages.at(-1)?.sender.id).toBe(1);

    const recipientCounts = db
      .query("SELECT user_id AS userId, COUNT(*) AS count FROM notifications GROUP BY user_id ORDER BY user_id")
      .all() as { userId: number; count: number }[];

    const beforeByUser = new Map(beforeNotifications.map((row) => [row.userId, row.count]));
    const afterByUser = new Map(recipientCounts.map((row) => [row.userId, row.count]));
    expect(afterByUser.get(1) ?? 0).toBe(beforeByUser.get(1) ?? 0);
    expect(afterByUser.get(2)).toBe((beforeByUser.get(2) ?? 0) + 1);
    expect(afterByUser.get(3)).toBe((beforeByUser.get(3) ?? 0) + 1);
  });

  test("conversation unread counts reflect unread message notifications", () => {
    sendMessage(1, 1, "Unread count check");

    const forAlya = conversationRows(2).find((row: any) => row.id === 1) as { unreadCount: number } | undefined;
    const forDemo = conversationRows(1).find((row: any) => row.id === 1) as { unreadCount: number } | undefined;

    expect(forAlya?.unreadCount).toBeGreaterThan(0);
    expect(forDemo?.unreadCount ?? 0).toBe(0);
  });

  test("notifyOthers can create multiple notifications without touching the sender", () => {
    notifyOthers(1, 2, "Heads up");

    const senderCount = db
      .query("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?")
      .get(2) as { count: number };
    const demoCount = db
      .query("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?")
      .get(1) as { count: number };
    const jokoCount = db
      .query("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ?")
      .get(3) as { count: number };

    expect(senderCount.count).toBe(0);
    expect(demoCount.count).toBe(1);
    expect(jokoCount.count).toBe(1);
  });
});
