import { beforeAll, describe, expect, test } from "bun:test";
import { db, migrate, resetForTests, seed } from "../src/server/db";

beforeAll(async () => {
  migrate();
  resetForTests();
  await seed();
});

describe("seed data", () => {
  test("creates 13 GOpost posts", () => {
    const row = db.query("SELECT COUNT(*) AS count FROM posts").get() as { count: number };
    expect(row.count).toBe(13);
  });

  test("installs core dock apps for demo user", () => {
    const rows = db.query("SELECT app_id FROM installed_apps WHERE user_id = 1 ORDER BY app_id").all() as { app_id: string }[];
    expect(rows.map((row) => row.app_id)).toEqual(["browser", "gopost", "messenger", "minecraft", "settings"]);
  });

  test("persists settings rows", () => {
    db.prepare("UPDATE user_settings SET classic_sounds = 1 WHERE user_id = 1").run();
    const row = db.query("SELECT classic_sounds AS classicSounds FROM user_settings WHERE user_id = 1").get() as { classicSounds: number };
    expect(row.classicSounds).toBe(1);
  });
});
