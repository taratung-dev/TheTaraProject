import { beforeEach, describe, expect, test } from "bun:test";
import { migrate, resetForTests, seed } from "../src/server/db";
import { db, commentsForPost, postRows, profile } from "../services/social/src/repo";

async function resetAndSeed() {
  migrate();
  resetForTests();
  await seed();
}

beforeEach(async () => {
  await resetAndSeed();
});

describe("social service", () => {
  test("creates posts that become editable for the author", () => {
    db.prepare("INSERT INTO posts (author_id, body, image_style) VALUES (?, ?, ?)").run(
      1,
      "Integration test post",
      null,
    );

    const latest = postRows(1)[0];
    expect(latest.body).toBe("Integration test post");
    expect(latest.author.id).toBe(1);
    expect(latest.canEdit).toBe(true);
  });

  test("updates only the author visibility flags on mixed timelines", () => {
    const posts = postRows(1);
    expect(posts.some((post) => post.author.id === 1 && post.canEdit)).toBe(true);
    expect(posts.some((post) => post.author.id !== 1 && !post.canEdit)).toBe(true);
  });

  test("toggles likes and reflects count plus likedByMe", () => {
    const target = postRows(1).find((post) => post.author.id !== 1);
    expect(target).toBeDefined();

    db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)").run(target!.id, 1);
    const liked = postRows(1, "WHERE p.id = ?", [target!.id])[0];
    expect(liked.likedByMe).toBe(true);
    expect(liked.likeCount).toBe(1);

    db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(target!.id, 1);
    const unliked = postRows(1, "WHERE p.id = ?", [target!.id])[0];
    expect(unliked.likedByMe).toBe(false);
    expect(unliked.likeCount).toBe(0);
  });

  test("creates comments that appear in comment rows and increment post counts", () => {
    const target = postRows(1)[0];
    db.prepare("INSERT INTO comments (post_id, author_id, body) VALUES (?, ?, ?)").run(
      target.id,
      2,
      "Nice update!",
    );

    const comments = commentsForPost(target.id);
    expect(comments.at(-1)?.body).toBe("Nice update!");
    expect(comments.at(-1)?.author.username).toBe("alya");

    const refreshed = postRows(1, "WHERE p.id = ?", [target.id])[0];
    expect(refreshed.commentCount).toBe(1);
  });

  test("search-style post filtering works through postRows where clauses", () => {
    const results = postRows(1, "WHERE p.body LIKE ? OR u.display_name LIKE ?", [
      "%noodles%",
      "%noodles%",
    ]);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((post) => post.body.includes("noodles") || post.author.displayName.includes("noodles"))).toBe(true);
  });

  test("profile returns null for unknown users", () => {
    expect(profile("does-not-exist")).toBeNull();
  });
});
