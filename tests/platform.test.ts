import { beforeEach, describe, expect, test } from "bun:test";
import { migrate, resetForTests, seed } from "../src/server/db";
import {
  db,
  desktopState,
  seedPlatform,
  settings,
} from "../services/platform/src/repo";

async function resetAndSeed() {
  migrate();
  resetForTests();
  await seed();
  seedPlatform();
}

beforeEach(async () => {
  await resetAndSeed();
});

describe("platform service storage", () => {
  test("installs the core dock apps for every seeded user", () => {
    for (const userId of [1, 2, 3]) {
      const rows = db
        .query(
          "SELECT app_id FROM installed_apps WHERE user_id = ? ORDER BY app_id",
        )
        .all(userId) as { app_id: string }[];
      expect(rows.map((row) => row.app_id)).toEqual([
        "browser",
        "gopost",
        "messenger",
        "minecraft",
        "settings",
      ]);
    }
  });

  test("returns settings booleans including dark mode", () => {
    expect(settings(1)).toEqual({
      wallpaper: "dev-bright",
      dockStyle: "glass",
      notifications: true,
      classicSounds: false,
      darkMode: false,
    });

    expect(settings(2).classicSounds).toBe(true);
  });

  test("persists settings updates", () => {
    db.prepare(
      "UPDATE user_settings SET wallpaper = ?, dock_style = ?, notifications = ?, classic_sounds = ?, dark_mode = ? WHERE user_id = ?",
    ).run("night-sky", "solid", 0, 1, 1, 1);

    expect(settings(1)).toEqual({
      wallpaper: "night-sky",
      dockStyle: "solid",
      notifications: false,
      classicSounds: true,
      darkMode: true,
    });
  });

  test("returns desktop state with persisted dock and window data", () => {
    db.prepare(
      "UPDATE desktop_state SET dock_apps = ?, opened_apps = ?, wallpaper = ? WHERE user_id = ?",
    ).run(
      JSON.stringify(["gopost", "browser", "notes"]),
      JSON.stringify(["notes", "settings"]),
      "night-sky",
      1,
    );

    expect(desktopState(1)).toEqual({
      dockApps: ["gopost", "browser", "notes"],
      openedApps: ["notes", "settings"],
      wallpaper: "night-sky",
    });
  });

  test("falls back to defaults for users without desktop state", () => {
    expect(desktopState(999)).toEqual({
      dockApps: [
        "gopost",
        "browser",
        "store",
        "settings",
        "minecraft",
        "messenger",
      ],
      openedApps: ["gopost", "store"],
      wallpaper: "dev-bright",
    });
  });
});
