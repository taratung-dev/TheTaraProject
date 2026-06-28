import { beforeEach, describe, expect, test } from "bun:test";
import { migrate, resetForTests, seed } from "../src/server/db";
import {
  bookmarkRows,
  browserSettings,
  db,
  historyRows,
} from "../services/browser/src/repo";

async function resetAndSeed() {
  migrate();
  resetForTests();
  await seed();
}

beforeEach(async () => {
  await resetAndSeed();
});

type BrowserRow = {
  id: number;
  url: string;
  title: string;
  createdAt: string;
};

describe("browser service storage", () => {
  test("stores browser history in reverse chronological order", () => {
    db.prepare(
      "INSERT INTO browser_history (user_id, url, title) VALUES (?, ?, ?)",
    ).run(1, "/gopost", "GOpost! Classic");
    db.prepare(
      "INSERT INTO browser_history (user_id, url, title) VALUES (?, ?, ?)",
    ).run(1, "https://example.com", "Example");

    const rows = historyRows(1) as BrowserRow[];
    expect(rows).toHaveLength(2);
    expect(rows[0].url).toBe("https://example.com");
    expect(rows[0].title).toBe("Example");
    expect(rows[1].url).toBe("/gopost");
  });

  test("caps browser history to the latest 50 items", () => {
    const insert = db.prepare(
      "INSERT INTO browser_history (user_id, url, title) VALUES (?, ?, ?)",
    );
    for (let index = 1; index <= 55; index += 1) {
      insert.run(1, `https://example.com/${index}`, `Page ${index}`);
    }

    const rows = historyRows(1) as BrowserRow[];
    expect(rows).toHaveLength(50);
    expect(rows[0].title).toBe("Page 55");
    expect(rows.at(-1)?.title).toBe("Page 6");
  });

  test("stores bookmarks in reverse chronological order", () => {
    db.prepare(
      "INSERT INTO browser_bookmarks (user_id, url, title) VALUES (?, ?, ?)",
    ).run(1, "https://first.example", "First");
    db.prepare(
      "INSERT INTO browser_bookmarks (user_id, url, title) VALUES (?, ?, ?)",
    ).run(1, "https://second.example", "Second");

    const rows = bookmarkRows(1) as BrowserRow[];
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe("Second");
    expect(rows[1].title).toBe("First");
  });

  test("returns default homepage settings and persists overrides", () => {
    expect(browserSettings(1).homepage).toBe("/gopost");

    db.prepare(
      `
        INSERT INTO browser_settings (user_id, homepage)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET homepage = excluded.homepage
      `,
    ).run(1, "https://example.com");

    expect(browserSettings(1).homepage).toBe("https://example.com");
  });
});
