import { type CSSProperties, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Comment, Post, Profile, User } from "../../lib/types";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { useDebounce } from "../../lib/useDebounce";
import { Skeleton, SkeletonPost } from "../../lib/Skeleton";

function initials(user?: User | null) {
  return (
    user?.displayName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "GO"
  );
}

function postMeta(index: number) {
  const times = [
    "Today at 8:04 AM via GOpost Mobile",
    "Today at 9:17 AM from Web",
    "Today at 10:02 AM near Bandung",
    "Today at 11:25 AM",
    "Today at 12:11 PM using GOpost Classic",
    "Today at 1:40 PM",
  ];
  return times[index % times.length];
}

export function GOpostClassic({
  user,
  embedded = false,
}: {
  user: User | null;
  embedded?: boolean;
}) {
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"feed" | "profile" | "photos">("feed");
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();
  const posts = useQuery({
    queryKey: ["posts", debouncedSearch],
    queryFn: () =>
      api<{ posts: Post[] }>(
        debouncedSearch
          ? `/api/search?q=${encodeURIComponent(debouncedSearch)}`
          : "/api/posts",
      ),
  });
  const profile = useQuery({
    queryKey: ["profile", user?.username],
    queryFn: () =>
      user
        ? api<{ profile: Profile }>(`/api/users/${user.username}`)
        : Promise.resolve({ profile: null as unknown as Profile }),
    enabled: Boolean(user),
  });
  const create = useMutation({
    mutationFn: () =>
      api<{ post: Post }>("/api/posts", {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const postCount =
    profile.data?.profile.postCount ?? posts.data?.posts.length ?? 13;
  const fanCount = profile.data?.profile.fanCount ?? 248;

  const visiblePosts = useMemo(() => {
    const all = posts.data?.posts ?? [];
    if (view === "profile" && user)
      return all.filter((p) => p.author.username === user.username);
    if (view === "photos") return all.filter((p) => p.imageStyle);
    return all;
  }, [posts.data, view, user]);

  return (
    <div className={embedded ? "gp-page gp-embedded" : "gp-page"}>
      <header className="gp-topbar">
        <div className="gp-topbar-inner">
          <div className="gp-logo">GOpost!</div>
          <input
            className="gp-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search GOpost!"
          />
          <nav className="gp-nav" aria-label="Main navigation">
            <span>Home</span>
            <span>People</span>
            <span>Messages</span>
            <span>Settings</span>
          </nav>
        </div>
      </header>

      <main className="gp-layout">
        <aside className="gp-left-col">
          <section className="gp-panel gp-profile">
            <div
              className="gp-avatar gp-big"
              style={{
                background:
                  user?.avatarColor ??
                  "linear-gradient(135deg, #ffd166, #f25f8c)",
              }}
            >
              {initials(user)}
            </div>
            <h1>GOpost!</h1>
            <p>
              {user
                ? `Signed in as ${user.displayName}`
                : "Share quick updates, big moods, and tiny internet treasures."}
            </p>
            {profile.isError && (
              <ErrorNotice
                error={profile.error}
                message="Profile details are temporarily unavailable."
                className="mt-3"
              />
            )}
            <div className="gp-stat-grid">
              <div className="gp-stat">
                <b>{postCount}</b>Posts
              </div>
              <div className="gp-stat">
                <b>{fanCount}</b>Fans
              </div>
              <div className="gp-stat">
                <b>17</b>Clubs
              </div>
            </div>
            <div className="gp-menu">
              <button
                type="button"
                onClick={() => {
                  setView("feed");
                  setSearch("");
                }}
              >
                News Feed
              </button>
              <button type="button" onClick={() => setView("profile")}>
                My Profile
              </button>
              <button type="button" onClick={() => setView("photos")}>
                Photo Wall
              </button>
              <span>Games &amp; Apps</span>
              <span>Top Friends</span>
            </div>
          </section>
        </aside>

        <section className="gp-center-col" aria-label="GOpost feed">
          <form
            className="gp-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (body.trim()) create.mutate();
            }}
          >
            <div className="gp-composer-title">Create a GOpost</div>
            {user ? (
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder="What's happening today?"
              />
            ) : (
              <div className="gp-readonly">
                Login from macOS Dev to create posts, comment, and like.
              </div>
            )}
            {create.isError && (
              <ErrorNotice error={create.error} className="mt-3" />
            )}
            <div className="gp-composer-actions">
              <div className="gp-tool-row">
                <span>Photo</span>
                <span>Mood</span>
                <span>Sticker</span>
              </div>
              <button
                className="gp-post-button"
                type="submit"
                disabled={!user || !body.trim() || create.isPending}
              >
                {create.isPending ? "Posting..." : "Post"}
              </button>
            </div>
          </form>

          <div className="gp-feed">
            {posts.isLoading && (
              <>
                <SkeletonPost />
                <SkeletonPost />
                <SkeletonPost />
              </>
            )}
            {posts.isError && !posts.data?.posts.length && (
              <QueryErrorCard
                title="GOpost feed failed to load"
                error={posts.error}
                onRetry={() => void posts.refetch()}
              />
            )}
            {posts.isError && posts.data?.posts.length ? (
              <ErrorNotice error={posts.error} className="mb-3" />
            ) : null}
            {posts.data?.posts.length === 0 && (
              <div className="gp-post">No posts found.</div>
            )}
            {visiblePosts.map((post, index) => (
              <ClassicPost
                key={post.id}
                post={post}
                canWrite={Boolean(user)}
                index={index}
              />
            ))}
          </div>
        </section>

        <aside className="gp-right-col">
          <section className="gp-panel">
            <h2>Trending 2017</h2>
            <ul className="gp-trend-list">
              <li>
                <b>#ProfileSong</b>
                <span>1,204 posts</span>
              </li>
              <li>
                <b>#StickerMood</b>
                <span>842 posts</span>
              </li>
              <li>
                <b>#PhotoWall</b>
                <span>511 posts</span>
              </li>
              <li>
                <b>#LunchPoll</b>
                <span>306 posts</span>
              </li>
            </ul>
          </section>
          <section className="gp-panel gp-friends-panel">
            <h2>Online Friends</h2>
            <ul className="gp-friend-list">
              <li>
                <span className="gp-mini"></span>Alya Star
              </li>
              <li>
                <span className="gp-mini"></span>Joko Byte
              </li>
              <li>
                <span className="gp-mini"></span>Nina Orbit
              </li>
              <li>
                <span className="gp-mini"></span>Tara Games
              </li>
            </ul>
            <div className="gp-ad">
              GOpost! Classic
              <br />
              Now with more shine.
            </div>
          </section>
        </aside>
      </main>

      {!embedded && (
        <footer className="gp-footer">
          (c) 2017 GOpost! | Built for desktop, still works on mobile.
        </footer>
      )}
    </div>
  );
}

function ClassicPost({
  post,
  canWrite,
  index,
}: {
  post: Post;
  canWrite: boolean;
  index: number;
}) {
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body);
  const queryClient = useQueryClient();
  const comments = useQuery({
    queryKey: ["comments", post.id],
    queryFn: () =>
      api<{ comments: Comment[] }>(`/api/posts/${post.id}/comments`),
  });
  const like = useMutation({
    mutationFn: () => api(`/api/posts/${post.id}/like`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });
  const addComment = useMutation({
    mutationFn: () =>
      api(`/api/posts/${post.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment }),
      }),
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["comments", post.id] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/api/posts/${post.id}`, {
        method: "PATCH",
        body: JSON.stringify({ body: draft }),
      }),
    onSuccess: () => {
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/posts/${post.id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  return (
    <article className="gp-post">
      <div className="gp-post-head">
        <div
          className="gp-avatar"
          style={{ background: post.author.avatarColor }}
        >
          {initials(post.author)}
        </div>
        <div>
          <div className="gp-name">{post.author.displayName}</div>
          <div className="gp-meta">{postMeta(index)}</div>
        </div>
      </div>
      {editing ? (
        <div className="gp-edit-box">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button
            className="gp-post-button"
            type="button"
            onClick={() => save.mutate()}
            disabled={!draft.trim() || save.isPending}
          >
            {save.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      ) : (
        <p>{post.body}</p>
      )}
      {save.isError && editing && (
        <ErrorNotice error={save.error} className="mt-2" />
      )}
      {post.imageStyle && (
        <div
          className="gp-photo"
          style={{ "--accent": post.imageStyle } as CSSProperties}
        >
          PHOTO DROP
        </div>
      )}
      <div className="gp-post-actions">
        <button
          type="button"
          disabled={!canWrite || like.isPending}
          onClick={() => like.mutate()}
        >
          {post.likedByMe ? "Liked" : "Like"}
        </button>
        <span>Comment</span>
        <span>Share</span>
        <span className="gp-tag">{post.likeCount} likes</span>
        <span className="gp-tag">{post.commentCount} comments</span>
        {post.canEdit && (
          <button type="button" onClick={() => setEditing(!editing)}>
            Edit
          </button>
        )}
        {post.canEdit && (
          <button
            type="button"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            Delete
          </button>
        )}
      </div>
      {like.isError && <ErrorNotice error={like.error} className="mt-2" />}
      {remove.isError && <ErrorNotice error={remove.error} className="mt-2" />}
      {comments.isLoading && (
        <div className="gp-comments">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-1 h-3 w-4/5" />
        </div>
      )}
      {comments.isError && (
        <ErrorNotice error={comments.error} className="mt-2" />
      )}
      {comments.data?.comments.length ? (
        <div className="gp-comments">
          {comments.data.comments.map((item) => (
            <div key={item.id}>
              <b>{item.author.displayName}:</b> {item.body}
            </div>
          ))}
        </div>
      ) : null}
      {canWrite && (
        <div className="gp-comment-box">
          <input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Write a comment..."
          />
          <button
            type="button"
            onClick={() => comment.trim() && addComment.mutate()}
            disabled={!comment.trim() || addComment.isPending}
          >
            {addComment.isPending ? "Sending..." : "Comment"}
          </button>
        </div>
      )}
      {addComment.isError && (
        <ErrorNotice error={addComment.error} className="mt-2" />
      )}
    </article>
  );
}
