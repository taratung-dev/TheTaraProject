import { beforeAll, describe, expect, test } from "bun:test";
import { db as legacyDb, migrate, resetForTests, seed } from "../src/server/db";
import { browserSettings, db } from "../services/browser/src/repo";

beforeAll(async () => {
  migrate();
  resetForTests();
  await seed();
});

describe("browser service storage", () => {
  test("stores browser history", () => {
    db.prepare(
      "INSERT INTO browser_history (user_id, url, title) VALUES (?, ?, ?)",
    ).run(1, "/gopost", "GOpost! Classic");
    const rows = db
      .query("SELECT url, title FROM browser_history WHERE user_id = ?")
      .all(1) as { url: string; title: string }[];
    expect(rows).toEqual([{ url: "/gopost", title: "GOpost! Classic" }]);
  });

  test("stores bookmarks", () => {
    db.prepare(
      "INSERT INTO browser_bookmarks (user_id, url, title) VALUES (?, ?, ?)",
    ).run(1, "https://example.com", "Example");
    const row = db
      .query("SELECT url, title FROM browser_bookmarks WHERE user_id = ?")
      .get(1) as { url: string; title: string };
    expect(row.title).toBe("Example");
  });

  test("returns default homepage settings", () => {
    expect(browserSettings(1).homepage).toBe("/gopost");
    const userCount = legacyDb
      .query("SELECT COUNT(*) AS count FROM users")
      .get() as { count: number };
    expect(userCount.count).toBe(3);
  });
});
