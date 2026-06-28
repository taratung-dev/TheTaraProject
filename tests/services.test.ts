import { beforeAll, describe, expect, test } from "bun:test";
import { migrate, resetForTests, seed } from "../src/server/db";
import {
  migrateAuth,
  createUser,
  userByUsername,
  sessionUserId,
  createSession,
  newToken,
} from "../services/auth/src/repo";
import {
  migrateSocial,
  postRows,
  commentsForPost,
  profile,
} from "../services/social/src/repo";
import {
  migrateRealtime,
  conversationRows,
  isMember,
  messageRows,
  sendMessage,
} from "../services/realtime/src/repo";
import {
  migratePlatform,
  seedPlatform,
  settings,
  desktopState,
} from "../services/platform/src/repo";

beforeAll(async () => {
  // Set up schema (legacy migrate covers most tables; service migrates add
  // any tables the legacy schema omits, e.g. desktop_state).
  migrate();
  migrateAuth();
  migrateSocial();
  migrateRealtime();
  migratePlatform();

  // Wipe all data and re-seed from a known state.
  resetForTests();
  await seed();

  // Seed desktop_state rows (not covered by the legacy seed).
  seedPlatform();
});

// ---------------------------------------------------------------------------
// Auth service
// ---------------------------------------------------------------------------

describe("auth service repo", () => {
  test("migrateAuth runs without error", () => {
    // Called in beforeAll — if we reach here the schema was created cleanly.
    expect(true).toBe(true);
  });

  test("createUser inserts and returns a numeric id", () => {
    const id = createUser("testuser_svc", "Test User", "hashed_pw");
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);
  });

  test("userByUsername finds the seeded demo user", () => {
    const user = userByUsername("demo") as any;
    expect(user).not.toBeNull();
    expect(user.username).toBe("demo");
    expect(user.displayName).toBe("Tara Games");
  });

  test("sessionUserId returns null for a garbage token", () => {
    expect(sessionUserId("not-a-real-token-xyz")).toBeNull();
    expect(sessionUserId(undefined)).toBeNull();
  });

  test("createSession + sessionUserId round-trip", () => {
    const user = userByUsername("demo") as any;
    const token = newToken();
    createSession(user.id, token);
    const resolved = sessionUserId(token);
    expect(resolved).toBe(user.id);
  });
});

// ---------------------------------------------------------------------------
// Social service
// ---------------------------------------------------------------------------

describe("social service repo", () => {
  test("postRows(null) returns all seeded posts", () => {
    const posts = postRows(null);
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);
  });

  test("postRows(userId) marks only the user's own posts as canEdit", () => {
    const demoUser = userByUsername("demo") as any;
    const posts = postRows(demoUser.id);
    const ownPosts = posts.filter((p) => p.author.id === demoUser.id);
    const otherPosts = posts.filter((p) => p.author.id !== demoUser.id);
    expect(ownPosts.every((p) => p.canEdit)).toBe(true);
    expect(otherPosts.every((p) => !p.canEdit)).toBe(true);
  });

  test("commentsForPost returns an array", () => {
    const posts = postRows(null);
    expect(posts.length).toBeGreaterThan(0);
    const comments = commentsForPost(posts[0].id);
    expect(Array.isArray(comments)).toBe(true);
  });

  test("profile('demo') returns a profile with postCount", () => {
    const p = profile("demo") as any;
    expect(p).not.toBeNull();
    expect(typeof p.postCount).toBe("number");
    expect(p.user.username).toBe("demo");
    expect(p.postCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Realtime service
// ---------------------------------------------------------------------------

describe("realtime service repo", () => {
  test("conversationRows returns conversations the user belongs to", () => {
    const demoUser = userByUsername("demo") as any;
    const rows = conversationRows(demoUser.id) as any[];
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].title).toBe("GOpost Friends");
  });

  test("isMember is true for a member, false for a non-member", () => {
    const demoUser = userByUsername("demo") as any;
    // User 1 (demo) is seeded as a member of conversation 1.
    expect(isMember(1, demoUser.id)).toBe(true);
    // A user ID that doesn't exist in the conversation.
    expect(isMember(1, 9999)).toBe(false);
  });

  test("messageRows returns messages with a sender object", () => {
    const messages = messageRows(1) as any[];
    expect(Array.isArray(messages)).toBe(true);
    expect(messages.length).toBeGreaterThan(0);
    const msg = messages[0];
    expect(msg).toHaveProperty("body");
    expect(msg).toHaveProperty("sender");
    expect(msg.sender).toHaveProperty("username");
  });

  test("sendMessage + messageRows round-trip", () => {
    const demoUser = userByUsername("demo") as any;
    const before = (messageRows(1) as any[]).length;
    sendMessage(1, demoUser.id, "Hello from integration test!");
    const after = messageRows(1) as any[];
    expect(after.length).toBe(before + 1);
    const last = after[after.length - 1];
    expect(last.body).toBe("Hello from integration test!");
    expect(last.sender.id).toBe(demoUser.id);
  });
});

// ---------------------------------------------------------------------------
// Platform service
// ---------------------------------------------------------------------------

describe("platform service repo", () => {
  test("settings(userId) returns an object with expected shape", () => {
    const demoUser = userByUsername("demo") as any;
    const s = settings(demoUser.id) as any;
    expect(s).toHaveProperty("wallpaper");
    expect(s).toHaveProperty("dockStyle");
    expect(typeof s.notifications).toBe("boolean");
    expect(typeof s.classicSounds).toBe("boolean");
    expect(s.wallpaper).toBe("dev-bright");
  });

  test("desktopState(userId) returns an object with a dockApps array", () => {
    const demoUser = userByUsername("demo") as any;
    const state = desktopState(demoUser.id) as any;
    expect(Array.isArray(state.dockApps)).toBe(true);
    expect(state.dockApps.length).toBeGreaterThan(0);
    expect(state).toHaveProperty("wallpaper");
  });
});
