import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Comment, Post, Profile, User } from "../../lib/types";
import type { OpenApp } from "../../lib/desktop-state";
import { api } from "../../lib/api";
import { ErrorNotice, QueryErrorCard } from "../../lib/feedback";
import { useDebounce } from "../../lib/useDebounce";
import { Skeleton, SkeletonPost } from "../../lib/Skeleton";
import { useRouter } from "../../lib/router";

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

function menuButtonClass(active: boolean) {
  return active ? "gp-menu-button active" : "gp-menu-button";
}

export function GOpostClassic({
  user,
  embedded = false,
  onOpenApp,
}: {
  user: User | null;
  embedded?: boolean;
  onOpenApp?: (app: OpenApp) => void;
}) {
  const { navigate } = useRouter();
  const [body, setBody] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"feed" | "profile" | "photos" | "people">(
    "feed",
  );
  const [selectedUsername, setSelectedUsername] = useState<string | null>(
    user?.username ?? null,
  );
  const debouncedSearch = useDebounce(search, 300);
  const queryClient = useQueryClient();

  // Read initial profile deep link from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlView = params.get("view");
    const urlUser = params.get("user");
    if (urlView === "profile" && urlUser) {
      setSelectedUsername(urlUser);
      setView("profile");
    }
  }, []);

  const activeProfileUsername =
    view === "profile"
      ? (selectedUsername ?? user?.username ?? null)
      : (user?.username ?? null);

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
    queryKey: ["profile", activeProfileUsername],
    queryFn: () =>
      activeProfileUsername
        ? api<{ profile: Profile }>(`/api/users/${activeProfileUsername}`)
        : Promise.resolve({ profile: null as unknown as Profile }),
    enabled: Boolean(activeProfileUsername),
  });

  const people = useQuery({
    queryKey: ["people", debouncedSearch],
    queryFn: () =>
      api<{ users: Profile[] }>(
        debouncedSearch
          ? `/api/users?q=${encodeURIComponent(debouncedSearch)}`
          : "/api/users",
      ),
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

  const follow = useMutation({
    mutationFn: ({
      username,
      following,
    }: {
      username: string;
      following: boolean;
    }) =>
      api<{ profile: Profile }>(`/api/users/${username}/follow`, {
        method: following ? "DELETE" : "POST",
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["profile", variables.username],
      });
      queryClient.invalidateQueries({ queryKey: ["people"] });
    },
  });

  const shownProfile = profile.data?.profile ?? null;
  const sidebarUser = shownProfile?.user ?? user;
  const postCount = shownProfile?.postCount ?? posts.data?.posts.length ?? 13;
  const fanCount = shownProfile?.fanCount ?? 0;
  const followingCount = shownProfile?.followingCount ?? 0;

  const visiblePosts = useMemo(() => {
    const all = posts.data?.posts ?? [];
    if (view === "profile" && activeProfileUsername) {
      return all.filter((p) => p.author.username === activeProfileUsername);
    }
    if (view === "photos") return all.filter((p) => p.imageStyle);
    return all;
  }, [activeProfileUsername, posts.data, view]);

  const openDesktopApp = (app: OpenApp) => {
    if (onOpenApp) onOpenApp(app);
    else navigate("/");
  };

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
            placeholder={view === "people" ? "Search people" : "Search GOpost!"}
          />
          <nav className="gp-nav" aria-label="Main navigation">
            <button type="button" onClick={() => setView("feed")}>
              Home
            </button>
            <button type="button" onClick={() => setView("people")}>
              People
            </button>
            <button type="button" onClick={() => openDesktopApp("messenger")}>
              Messages
            </button>
            <button type="button" onClick={() => openDesktopApp("settings")}>
              Settings
            </button>
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
                  sidebarUser?.avatarColor ??
                  "linear-gradient(135deg, #ffd166, #f25f8c)",
              }}
            >
              {initials(sidebarUser)}
            </div>
            <h1>{shownProfile?.user.displayName ?? "GOpost!"}</h1>
            <p>
              {shownProfile
                ? shownProfile.user.bio ||
                  `@${shownProfile.user.username} is sharing quick updates, throwback moods, and little internet treasures.`
                : user
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
                <b>{followingCount}</b>Following
              </div>
            </div>
            {shownProfile && !shownProfile.isMe && user && (
              <button
                type="button"
                className="gp-post-button mt-3"
                onClick={() =>
                  follow.mutate({
                    username: shownProfile.user.username,
                    following: shownProfile.isFollowing,
                  })
                }
                disabled={follow.isPending}
              >
                {follow.isPending
                  ? "Saving..."
                  : shownProfile.isFollowing
                    ? "Following"
                    : "Follow"}
              </button>
            )}
            <div className="gp-menu">
              <button
                type="button"
                className={menuButtonClass(view === "feed")}
                onClick={() => {
                  setView("feed");
                  setSearch("");
                }}
              >
                News Feed
              </button>
              <button
                type="button"
                className={menuButtonClass(view === "profile")}
                onClick={() => {
                  setSelectedUsername(user?.username ?? null);
                  setView("profile");
                }}
              >
                My Profile
              </button>
              <button
                type="button"
                className={menuButtonClass(view === "photos")}
                onClick={() => setView("photos")}
              >
                Photo Wall
              </button>
              <button
                type="button"
                className={menuButtonClass(view === "people")}
                onClick={() => setView("people")}
              >
                People Finder
              </button>
              <button
                type="button"
                className="gp-menu-button"
                onClick={() => openDesktopApp("messenger")}
              >
                Messages
              </button>
              <button
                type="button"
                className="gp-menu-button"
                onClick={() => openDesktopApp("settings")}
              >
                Account Settings
              </button>
            </div>
          </section>
        </aside>

        <section className="gp-center-col" aria-label="GOpost feed">
          {view !== "people" && (
            <form
              className="gp-composer"
              onSubmit={(event) => {
                event.preventDefault();
                if (body.trim()) create.mutate();
              }}
            >
              <div className="gp-composer-title">
                {view === "profile"
                  ? "Post to your profile"
                  : "Create a GOpost"}
              </div>
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
          )}

          {view === "people" ? (
            <section className="gp-panel">
              <h2>People Finder</h2>
              <div className="gp-feed">
                {people.isLoading && (
                  <>
                    <SkeletonPost />
                    <SkeletonPost />
                  </>
                )}
                {people.isError && (
                  <QueryErrorCard
                    title="People failed to load"
                    error={people.error}
                    onRetry={() => void people.refetch()}
                  />
                )}
                {people.data?.users.map((person) => (
                  <article key={person.user.id} className="gp-post">
                    <div className="gp-post-head">
                      <div
                        className="gp-avatar"
                        style={{ background: person.user.avatarColor }}
                      >
                        {initials(person.user)}
                      </div>
                      <div>
                        <div className="gp-name">{person.user.displayName}</div>
                        <div className="gp-meta">@{person.user.username}</div>
                      </div>
                    </div>
                    <p>
                      {person.postCount} posts · {person.fanCount} fans ·{" "}
                      {person.followingCount} following
                    </p>
                    <div className="gp-post-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUsername(person.user.username);
                          setView("profile");
                        }}
                      >
                        View Profile
                      </button>
                      {!person.isMe && user && (
                        <button
                          type="button"
                          disabled={follow.isPending}
                          onClick={() =>
                            follow.mutate({
                              username: person.user.username,
                              following: person.isFollowing,
                            })
                          }
                        >
                          {person.isFollowing ? "Following" : "Follow"}
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : (
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
                  onViewProfile={(username) => {
                    setSelectedUsername(username);
                    setView("profile");
                  }}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="gp-right-col">
          <section className="gp-panel">
            <h2>{view === "people" ? "People Tips" : "Trending 2017"}</h2>
            {view === "people" ? (
              <ul className="gp-trend-list">
                <li>
                  <b>Search by name</b>
                  <span>Find GOpost friends fast</span>
                </li>
                <li>
                  <b>Follow fans</b>
                  <span>Keep tabs on favorite profiles</span>
                </li>
                <li>
                  <b>Open Messenger</b>
                  <span>Jump straight into chats</span>
                </li>
              </ul>
            ) : (
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
            )}
          </section>
          <section className="gp-panel gp-friends-panel">
            <h2>Online Friends</h2>
            <ul className="gp-friend-list">
              {(people.data?.users ?? []).slice(0, 4).map((friend) => (
                <li key={friend.user.id}>
                  <span className="gp-mini"></span>
                  <button
                    type="button"
                    className="gp-inline-link"
                    onClick={() => {
                      setSelectedUsername(friend.user.username);
                      setView("profile");
                    }}
                  >
                    {friend.user.displayName}
                  </button>
                </li>
              ))}
            </ul>
            <div className="gp-ad">
              GOpost! Classic
              <br />
              Now with real profile follows.
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
  onViewProfile,
}: {
  post: Post;
  canWrite: boolean;
  index: number;
  onViewProfile: (username: string) => void;
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
          <button
            type="button"
            className="gp-inline-link gp-name-button"
            onClick={() => onViewProfile(post.author.username)}
          >
            {post.author.displayName}
          </button>
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
