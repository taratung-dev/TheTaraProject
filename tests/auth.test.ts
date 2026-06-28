import { beforeEach, describe, expect, test } from "bun:test";
import { migrate, resetForTests, seed } from "../src/server/db";
import {
  createSession,
  createUser,
  db,
  deleteSession,
  hash,
  newToken,
  sessionUserId,
  userById,
  userByUsername,
} from "../services/auth/src/repo";

async function resetAndSeed() {
  migrate();
  resetForTests();
  await seed();
}

beforeEach(async () => {
  await resetAndSeed();
});

describe("auth service", () => {
  test("signup-style user creation lowercases usernames and persists the profile", async () => {
    const passwordHash = await Bun.password.hash("secret123");
    const userId = createUser("NewUser", "New User", passwordHash);

    const created = userByUsername("newuser");
    expect(userId).toBeGreaterThan(0);
    expect(created).not.toBeNull();
    expect(created!.username).toBe("newuser");
    expect(created!.displayName).toBe("New User");
    expect(await Bun.password.verify("secret123", created!.passwordHash)).toBe(
      true,
    );
    expect(userById(userId)?.username).toBe("newuser");
  });

  test("signup rejects duplicate usernames regardless of case", async () => {
    const passwordHash = await Bun.password.hash("secret123");
    createUser("CaseTest", "Case Test", passwordHash);

    expect(() => createUser("casetest", "Duplicate", passwordHash)).toThrow();
  });

  test("login-style password verification succeeds for seeded users and fails for wrong passwords", async () => {
    const demo = userByUsername("demo");
    expect(demo).not.toBeNull();

    expect(await Bun.password.verify("demo123", demo!.passwordHash)).toBe(true);
    expect(
      await Bun.password.verify("wrong-password", demo!.passwordHash),
    ).toBe(false);
  });

  test("session creation resolves back to the user id", () => {
    const token = newToken();
    createSession(1, token);

    expect(sessionUserId(token)).toBe(1);
    expect(sessionUserId("garbage-token")).toBeNull();
  });

  test("logout-style session deletion invalidates the token", () => {
    const token = newToken();
    createSession(1, token);
    expect(sessionUserId(token)).toBe(1);

    deleteSession(token);
    expect(sessionUserId(token)).toBeNull();
  });

  test("session lookup ignores expired sessions", () => {
    const token = newToken();
    createSession(1, token);
    const tokenHash = hash(token);

    db.prepare(
      "UPDATE sessions SET expires_at = datetime('now', '-1 day') WHERE token_hash = ?",
    ).run(tokenHash);

    expect(sessionUserId(token)).toBeNull();
  });
});
