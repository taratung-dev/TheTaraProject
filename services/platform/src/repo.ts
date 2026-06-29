import { openServiceDb } from "../../_lib/db";

export type SettingsRow = {
  wallpaper: string;
  dockStyle: string;
  notifications: number;
  classicSounds: number;
  darkMode: number;
};

export type DesktopStateRow = {
  dockApps: string;
  openedApps: string;
  recentApps: string;
  wallpaper: string;
};

export type NoteRow = {
  id: number;
  title: string;
  body: string;
  updatedAt: string;
};

export type DrawingRow = {
  id: number;
  name: string;
  width: number;
  height: number;
  pixels: string;
  updatedAt: string;
};

export const db = openServiceDb();

const DEFAULT_NOTE_BODY = `# Welcome to Notes Mini

- Write quick plans
- Save markdown ideas
- Keep track of TaraGames polish tasks

## Tip
Use the preview tab to check headings and lists.`;

const DEFAULT_DOCK_APPS = [
  "gopost",
  "browser",
  "store",
  "settings",
  "minecraft",
  "messenger",
  "notes",
  "paint",
];

const DEFAULT_SESSION_APPS = ["gopost", "store"];

function defaultPixels(width = 16, height = 16) {
  return Array.from({ length: width * height }, () => "transparent");
}

export function migratePlatform() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS apps (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS installed_apps (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, app_id)
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      wallpaper TEXT NOT NULL,
      dock_style TEXT NOT NULL,
      notifications INTEGER NOT NULL,
      classic_sounds INTEGER NOT NULL,
      dark_mode INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS desktop_state (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      dock_apps TEXT NOT NULL,
      opened_apps TEXT NOT NULL,
      recent_apps TEXT NOT NULL,
      wallpaper TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS minecraft_worlds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      mode TEXT NOT NULL,
      last_played TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS paint_drawings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      pixels TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.exec(
      "ALTER TABLE user_settings ADD COLUMN dark_mode INTEGER NOT NULL DEFAULT 0",
    );
  } catch {
    // Column already exists.
  }

  try {
    db.exec(
      `ALTER TABLE desktop_state ADD COLUMN recent_apps TEXT NOT NULL DEFAULT '${JSON.stringify(DEFAULT_SESSION_APPS)}'`,
    );
  } catch {
    // Column already exists.
  }
}

export function seedPlatform() {
  const userCount = db.query("SELECT COUNT(*) AS count FROM users").get() as {
    count: number;
  };
  if (userCount.count < 3) return;
  const apps = [
    [
      "store",
      "Store",
      "Store",
      "Install and remove desktop apps from the TaraGames dock.",
      "System",
    ],
    [
      "gopost",
      "GOpost!",
      "GO",
      "A 2017-style social feed for status updates and photos.",
      "Social",
    ],
    [
      "settings",
      "Settings",
      "Set",
      "Tune wallpaper, dock, notifications, and classic sounds.",
      "System",
    ],
    [
      "minecraft",
      "Minecraft",
      "MC",
      "Launch demo worlds from macOS Dev.",
      "Games",
    ],
    [
      "messenger",
      "Messenger",
      "Msg",
      "Live chat with friends from the dock.",
      "Social",
    ],
    [
      "browser",
      "Browser",
      "Web",
      "Browse platform pages and safe internet previews.",
      "System",
    ],
    [
      "notes",
      "Notes Mini",
      "Note",
      "Small sticky notes for quick thoughts.",
      "Tools",
    ],
    [
      "paint",
      "Pixel Paint",
      "Paint",
      "Retro icon drawing and pixel art.",
      "Creative",
    ],
  ];
  const insertApp = db.prepare(
    "INSERT OR IGNORE INTO apps (id, name, icon, description, category) VALUES (?, ?, ?, ?, ?)",
  );
  for (const app of apps) insertApp.run(...app);
  for (const userId of [1, 2, 3]) {
    for (const app of [
      "store",
      "gopost",
      "settings",
      "minecraft",
      "messenger",
      "browser",
      "notes",
      "paint",
    ]) {
      db.prepare(
        "INSERT OR IGNORE INTO installed_apps (user_id, app_id) VALUES (?, ?)",
      ).run(userId, app);
    }
    db.prepare(
      "INSERT OR IGNORE INTO user_settings VALUES (?, ?, ?, ?, ?, ?)",
    ).run(userId, "dev-bright", "glass", 1, userId === 2 ? 1 : 0, 0);
    db.prepare(
      "INSERT OR IGNORE INTO desktop_state (user_id, dock_apps, opened_apps, recent_apps, wallpaper) VALUES (?, ?, ?, ?, ?)",
    ).run(
      userId,
      JSON.stringify(DEFAULT_DOCK_APPS),
      JSON.stringify(DEFAULT_SESSION_APPS),
      JSON.stringify(DEFAULT_SESSION_APPS),
      "dev-bright",
    );
    const row = db
      .query(
        "SELECT dock_apps AS dockApps FROM desktop_state WHERE user_id = ?",
      )
      .get(userId) as { dockApps: string } | null;
    const dockApps = row ? (JSON.parse(row.dockApps) as string[]) : [];
    for (const app of ["browser", "notes", "paint"]) {
      if (!dockApps.includes(app)) dockApps.push(app);
    }
    db.prepare("UPDATE desktop_state SET dock_apps = ? WHERE user_id = ?").run(
      JSON.stringify(dockApps),
      userId,
    );

    if (listNotes(userId).length === 0) {
      createNote(userId, {
        title: "Welcome Note",
        body: DEFAULT_NOTE_BODY,
      });
    }

    if (listDrawings(userId).length === 0) {
      createDrawing(userId, {
        name: "Starter Canvas",
        width: 16,
        height: 16,
        pixels: defaultPixels(16, 16),
      });
    }
  }
  const insertWorld = db.prepare(
    "INSERT INTO minecraft_worlds (user_id, name, mode, last_played) VALUES (?, ?, ?, ?)",
  );
  const worldCount = db
    .query("SELECT COUNT(*) AS count FROM minecraft_worlds WHERE user_id = 1")
    .get() as { count: number };
  if (worldCount.count === 0) {
    insertWorld.run(1, "Starter Island", "Survival", "Today");
    insertWorld.run(1, "Creative City", "Creative", "Yesterday");
    insertWorld.run(1, "Block Lab", "Dev Demo", "June 2026");
  }
}

export function settings(userId: number) {
  const row = db
    .query(
      "SELECT wallpaper, dock_style AS dockStyle, notifications, classic_sounds AS classicSounds, dark_mode AS darkMode FROM user_settings WHERE user_id = ?",
    )
    .get(userId) as SettingsRow | null;
  return {
    wallpaper: row?.wallpaper ?? "dev-bright",
    dockStyle: row?.dockStyle ?? "glass",
    notifications: Boolean(row?.notifications ?? 1),
    classicSounds: Boolean(row?.classicSounds ?? 0),
    darkMode: Boolean(row?.darkMode ?? 0),
  };
}

export function desktopState(userId: number) {
  const row = db
    .query(
      "SELECT dock_apps AS dockApps, opened_apps AS openedApps, recent_apps AS recentApps, wallpaper FROM desktop_state WHERE user_id = ?",
    )
    .get(userId) as DesktopStateRow | null;
  return {
    dockApps: row ? JSON.parse(row.dockApps) : DEFAULT_DOCK_APPS,
    openedApps: row ? JSON.parse(row.openedApps) : DEFAULT_SESSION_APPS,
    recentApps: row ? JSON.parse(row.recentApps) : DEFAULT_SESSION_APPS,
    wallpaper: row?.wallpaper ?? "dev-bright",
  };
}

function normalizePixels(
  pixels: unknown,
  width: number,
  height: number,
): string[] {
  const fallback = defaultPixels(width, height);
  if (!Array.isArray(pixels)) return fallback;
  const total = width * height;
  return Array.from({ length: total }, (_, index) => {
    const value = pixels[index];
    return typeof value === "string" ? value : "transparent";
  });
}

export function listNotes(userId: number) {
  return db
    .query(
      "SELECT id, title, body, updated_at AS updatedAt FROM notes WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
    )
    .all(userId) as NoteRow[];
}

export function createNote(
  userId: number,
  input: { title?: string; body?: string },
) {
  const result = db
    .prepare(
      `
      INSERT INTO notes (user_id, title, body, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
    )
    .run(
      userId,
      (input.title?.trim() || "Untitled Note").slice(0, 200),
      (input.body ?? "").slice(0, 10000),
    );
  return db
    .query(
      "SELECT id, title, body, updated_at AS updatedAt FROM notes WHERE id = ?",
    )
    .get(Number(result.lastInsertRowid)) as NoteRow;
}

export function updateNote(
  userId: number,
  noteId: number,
  input: { title?: string; body?: string },
) {
  const current = db
    .query("SELECT title, body FROM notes WHERE id = ? AND user_id = ?")
    .get(noteId, userId) as { title: string; body: string } | null;
  if (!current) return null;
  db.prepare(
    `
      UPDATE notes
      SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `,
  ).run(
    (input.title?.trim() || current.title).slice(0, 200),
    (input.body ?? current.body).slice(0, 10000),
    noteId,
    userId,
  );
  return db
    .query(
      "SELECT id, title, body, updated_at AS updatedAt FROM notes WHERE id = ?",
    )
    .get(noteId) as NoteRow;
}

export function deleteNote(userId: number, noteId: number) {
  return db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .run(noteId, userId).changes;
}

export function listDrawings(userId: number) {
  const rows = db
    .query(
      "SELECT id, name, width, height, pixels, updated_at AS updatedAt FROM paint_drawings WHERE user_id = ? ORDER BY updated_at DESC, id DESC",
    )
    .all(userId) as DrawingRow[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    width: row.width,
    height: row.height,
    pixels: normalizePixels(JSON.parse(row.pixels), row.width, row.height),
    updatedAt: row.updatedAt,
  }));
}

export function createDrawing(
  userId: number,
  input: { name?: string; width?: number; height?: number; pixels?: string[] },
) {
  const width = Math.max(8, Math.min(32, input.width ?? 16));
  const height = Math.max(8, Math.min(32, input.height ?? 16));
  const pixels = normalizePixels(
    input.pixels ?? defaultPixels(width, height),
    width,
    height,
  );
  const result = db
    .prepare(
      `
      INSERT INTO paint_drawings (user_id, name, width, height, pixels, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `,
    )
    .run(
      userId,
      (input.name?.trim() || "Untitled Canvas").slice(0, 100),
      width,
      height,
      JSON.stringify(pixels),
    );
  return listDrawings(userId).find(
    (drawing) => drawing.id === Number(result.lastInsertRowid),
  )!;
}

export function updateDrawing(
  userId: number,
  drawingId: number,
  input: { name?: string; width?: number; height?: number; pixels?: string[] },
) {
  const current = db
    .query(
      "SELECT name, width, height, pixels FROM paint_drawings WHERE id = ? AND user_id = ?",
    )
    .get(drawingId, userId) as {
    name: string;
    width: number;
    height: number;
    pixels: string;
  } | null;
  if (!current) return null;
  const width = Math.max(8, Math.min(32, input.width ?? current.width));
  const height = Math.max(8, Math.min(32, input.height ?? current.height));
  const basePixels = input.pixels ?? (JSON.parse(current.pixels) as string[]);
  const pixels = normalizePixels(basePixels, width, height);
  db.prepare(
    `
      UPDATE paint_drawings
      SET name = ?, width = ?, height = ?, pixels = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `,
  ).run(
    (input.name?.trim() || current.name).slice(0, 100),
    width,
    height,
    JSON.stringify(pixels),
    drawingId,
    userId,
  );
  return (
    listDrawings(userId).find((drawing) => drawing.id === drawingId) ?? null
  );
}

export function deleteDrawing(userId: number, drawingId: number) {
  return db
    .prepare("DELETE FROM paint_drawings WHERE id = ? AND user_id = ?")
    .run(drawingId, userId).changes;
}
