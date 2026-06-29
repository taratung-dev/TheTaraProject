import { beforeEach, describe, expect, test } from "bun:test";
import { migrate, resetForTests, seed } from "../src/server/db";
import {
  createDrawing,
  createNote,
  db,
  deleteDrawing,
  deleteNote,
  desktopState,
  listDrawings,
  listNotes,
  seedPlatform,
  settings,
  updateDrawing,
  updateNote,
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
        "notes",
        "paint",
        "settings",
        "store",
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
        "notes",
        "paint",
      ],
      openedApps: ["gopost", "store"],
      wallpaper: "dev-bright",
    });
  });

  test("creates and updates markdown notes", () => {
    const created = createNote(1, { title: "Roadmap", body: "# Phase 6" });
    expect(created.title).toBe("Roadmap");

    const updated = updateNote(1, created.id, { body: "# Phase 6\n\n- notes" });
    expect(updated?.body).toContain("notes");
    expect(listNotes(1).some((note) => note.id === created.id)).toBe(true);
  });

  test("deletes notes owned by the user", () => {
    const created = createNote(1, { title: "Throwaway", body: "temporary" });
    expect(deleteNote(1, created.id)).toBe(1);
    expect(listNotes(1).some((note) => note.id === created.id)).toBe(false);
  });

  test("creates and updates pixel drawings", () => {
    const drawing = createDrawing(1, {
      name: "Icon Draft",
      width: 8,
      height: 8,
      pixels: Array.from({ length: 64 }, (_, index) =>
        index === 0 ? "#111827" : "transparent",
      ),
    });
    expect(drawing.width).toBe(8);
    expect(drawing.pixels[0]).toBe("#111827");

    const updated = updateDrawing(1, drawing.id, {
      name: "Icon Final",
      pixels: drawing.pixels.map((pixel, index) =>
        index === 1 ? "#22c55e" : pixel,
      ),
    });
    expect(updated?.name).toBe("Icon Final");
    expect(updated?.pixels[1]).toBe("#22c55e");
    expect(listDrawings(1).some((item) => item.id === drawing.id)).toBe(true);
  });

  test("deletes drawings owned by the user", () => {
    const drawing = createDrawing(1, { name: "Delete Me" });
    expect(deleteDrawing(1, drawing.id)).toBe(1);
    expect(listDrawings(1).some((item) => item.id === drawing.id)).toBe(false);
  });

  test("note title is trimmed and capped at 200 characters", () => {
    const longTitle = "A".repeat(250);
    const note = createNote(1, { title: longTitle, body: "short" });
    expect(note.title.length).toBeLessThanOrEqual(200);
    expect(note.title).toBe("A".repeat(200));
  });

  test("note body is capped at 10000 characters", () => {
    const longBody = "B".repeat(12000);
    const note = createNote(1, { title: "Big Note", body: longBody });
    expect(note.body.length).toBeLessThanOrEqual(10000);
  });

  test("drawing name is trimmed and capped at 100 characters", () => {
    const longName = "C".repeat(150);
    const drawing = createDrawing(1, { name: longName });
    expect(drawing.name.length).toBeLessThanOrEqual(100);
  });

  test("user cannot update another user's note", () => {
    const note = createNote(1, { title: "Private", body: "mine" });
    const result = updateNote(2, note.id, { title: "Hacked" });
    expect(result).toBeNull();
    const original = listNotes(1).find((n) => n.id === note.id);
    expect(original?.title).toBe("Private");
  });

  test("user cannot delete another user's note", () => {
    const note = createNote(1, { title: "Keep", body: "safe" });
    const deleted = deleteNote(2, note.id);
    expect(deleted).toBe(0);
    expect(listNotes(1).some((n) => n.id === note.id)).toBe(true);
  });

  test("user cannot update another user's drawing", () => {
    const drawing = createDrawing(1, { name: "My Art" });
    const result = updateDrawing(2, drawing.id, { name: "Stolen" });
    expect(result).toBeNull();
    const original = listDrawings(1).find((d) => d.id === drawing.id);
    expect(original?.name).toBe("My Art");
  });

  test("user cannot delete another user's drawing", () => {
    const drawing = createDrawing(1, { name: "Protected" });
    const deleted = deleteDrawing(2, drawing.id);
    expect(deleted).toBe(0);
    expect(listDrawings(1).some((d) => d.id === drawing.id)).toBe(true);
  });
});
