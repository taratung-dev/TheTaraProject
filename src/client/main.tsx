import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { AppRecord, Conversation, Message, MinecraftWorld, Post, User, UserSettings } from "../shared/types";

type Session = { user: User | null };
type OpenApp = "gopost" | "store" | "settings" | "minecraft" | "messenger";

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function initials(user?: User | null) {
  return user?.displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() ?? "GO";
}

function App() {
  const [session, setSession] = useState<Session>({ user: null });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api<Session>("/api/auth/me").then(setSession).finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="boot">Starting macOS Dev 3.4.6...</div>;
  if (!session.user) return <LoginScreen onLogin={setSession} />;
  return <Desktop user={session.user} onLogout={() => setSession({ user: null })} />;
}

function LoginScreen({ onLogin }: { onLogin: (session: Session) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("demo");
  const [displayName, setDisplayName] = useState("Tara Games");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const payload = mode === "login" ? { username, password } : { username, displayName, password };
      onLogin(await api<Session>(path, { method: "POST", body: JSON.stringify(payload) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-badge">macOS Dev 3.4.6</div>
        <h1>GOpost! Platform</h1>
        <p>Sign in to open the glossy desktop, social feed, Store, Messenger, and Minecraft Launcher.</p>
        <div className="mode-row">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Signup</button>
        </div>
        <label>Username<input value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        {mode === "signup" && <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="error">{error}</div>}
        <button className="primary" type="submit">{mode === "login" ? "Enter Desktop" : "Create Account"}</button>
      </form>
    </main>
  );
}

function Desktop({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [openApps, setOpenApps] = useState<OpenApp[]>(["gopost", "store"]);
  const [startOpen, setStartOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [clock, setClock] = useState(new Date());
  const apps: OpenApp[] = ["gopost", "store", "settings", "minecraft", "messenger"];

  useEffect(() => {
    api<{ settings: UserSettings }>("/api/settings").then((data) => setSettings(data.settings));
    const timer = setInterval(() => setClock(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  function open(app: OpenApp) {
    setOpenApps((current) => current.includes(app) ? current : [...current, app]);
    setStartOpen(false);
  }

  function close(app: OpenApp) {
    setOpenApps((current) => current.filter((item) => item !== app));
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  return (
    <main className={`desktop ${settings?.classicSounds ? "classic" : ""}`}>
      <TopMenuBar user={user} clock={clock} startOpen={startOpen} onStart={() => setStartOpen(!startOpen)} onLogout={logout} />
      <StartMenu open={startOpen} apps={apps} onOpen={open} />
      <section className="welcome">
        <h1>macOS Dev 3.4.6</h1>
        <p>Welcome back, {user.displayName}. GOpost and your apps are running from a Bun + SQLite platform.</p>
      </section>
      <section className="desktop-icons">
        {apps.map((app) => <DesktopIcon key={app} app={app} onOpen={open} />)}
      </section>
      <section className="window-layer">
        {openApps.includes("gopost") && <AppWindow app="gopost" title="GOpost!" onClose={close}><GOpostApp user={user} /></AppWindow>}
        {openApps.includes("store") && <AppWindow app="store" title="Store" onClose={close}><StoreApp onOpen={open} /></AppWindow>}
        {openApps.includes("settings") && <AppWindow app="settings" title="Settings" onClose={close}><SettingsApp settings={settings} onChange={setSettings} /></AppWindow>}
        {openApps.includes("minecraft") && <AppWindow app="minecraft" title="Minecraft" onClose={close}><MinecraftLauncher /></AppWindow>}
        {openApps.includes("messenger") && <AppWindow app="messenger" title="Messenger" onClose={close}><MessengerApp /></AppWindow>}
      </section>
      <Dock apps={apps} onOpen={open} />
    </main>
  );
}

function TopMenuBar({ user, clock, startOpen, onStart, onLogout }: { user: User; clock: Date; startOpen: boolean; onStart: () => void; onLogout: () => void }) {
  return (
    <header className="menu-bar">
      <div className="menu-left">
        <button className={startOpen ? "start-button active" : "start-button"} onClick={onStart}>Start</button>
        <span>macOS Dev</span><span className="wide">File</span><span className="wide">Edit</span><span className="wide">Window</span>
      </div>
      <div className="menu-right">
        <span>{user.displayName}</span><span>Wi-Fi</span><span>100%</span>
        <span>{clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <button onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}

function StartMenu({ open, apps, onOpen }: { open: boolean; apps: OpenApp[]; onOpen: (app: OpenApp) => void }) {
  return (
    <div className={open ? "start-menu open" : "start-menu"}>
      <b>macOS Dev 3.4.6</b>
      {apps.map((app) => <button key={app} onClick={() => onOpen(app)}><AppIcon app={app} />Open {label(app)}</button>)}
    </div>
  );
}

function Dock({ apps, onOpen }: { apps: OpenApp[]; onOpen: (app: OpenApp) => void }) {
  return <nav className="dock">{apps.map((app) => <button className={app} key={app} onClick={() => onOpen(app)}>{short(app)}</button>)}</nav>;
}

function DesktopIcon({ app, onOpen }: { app: OpenApp; onOpen: (app: OpenApp) => void }) {
  return <button className="desktop-icon" onClick={() => onOpen(app)}><AppIcon app={app} />{label(app)}</button>;
}

function AppIcon({ app }: { app: OpenApp }) {
  return <span className={`app-icon ${app}`}>{short(app)}</span>;
}

function label(app: OpenApp) {
  return ({ gopost: "GOpost!", store: "Store", settings: "Settings", minecraft: "Minecraft", messenger: "Messenger" })[app];
}

function short(app: OpenApp) {
  return ({ gopost: "GO", store: "Store", settings: "Set", minecraft: "MC", messenger: "Msg" })[app];
}

function AppWindow({ app, title, children, onClose }: { app: OpenApp; title: string; children: React.ReactNode; onClose: (app: OpenApp) => void }) {
  return (
    <article className={`window ${app}`}>
      <div className="window-bar">
        <span className="lights"><i /><i /><i /></span>
        <b>{title}</b>
        <button onClick={() => onClose(app)}>x</button>
      </div>
      <div className="window-body">{children}</div>
    </article>
  );
}

function GOpostApp({ user }: { user: User }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");

  async function load() {
    const data = await api<{ posts: Post[] }>("/api/posts");
    setPosts(data.posts);
  }

  useEffect(() => {
    load();
    const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/live`);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "post.created") setPosts((current) => [message.post, ...current.filter((post) => post.id !== message.post.id)]);
    };
    return () => socket.close();
  }, []);

  async function createPost(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    const data = await api<{ post: Post }>("/api/posts", { method: "POST", body: JSON.stringify({ body }) });
    setBody("");
    setPosts((current) => [data.post, ...current]);
  }

  async function like(id: number) {
    const data = await api<{ post: Post }>(`/api/posts/${id}/like`, { method: "POST" });
    setPosts((current) => current.map((post) => post.id === id ? data.post : post));
  }

  return (
    <div className="gopost-layout">
      <aside className="gopost-panel">
        <div className="big-avatar" style={{ background: user.avatarColor }}>{initials(user)}</div>
        <h2>GOpost!</h2>
        <p>2017 social feed, now persistent.</p>
        <div className="stats"><b>{posts.length}</b><span>Posts</span><b>248</b><span>Fans</span></div>
      </aside>
      <section className="feed-col">
        <form className="composer" onSubmit={createPost}>
          <b>Create a GOpost</b>
          <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What's happening today?" />
          <button>Post</button>
        </form>
        <div className="feed">{posts.map((post) => <PostCard key={post.id} post={post} onLike={like} />)}</div>
      </section>
    </div>
  );
}

function PostCard({ post, onLike }: { post: Post; onLike: (id: number) => void }) {
  return (
    <article className="post-card">
      <div className="post-head">
        <span className="avatar" style={{ background: post.author.avatarColor }}>{initials(post.author)}</span>
        <div><b>{post.author.displayName}</b><small>{new Date(post.createdAt).toLocaleString()}</small></div>
      </div>
      <p>{post.body}</p>
      {post.imageStyle && <div className="photo" style={{ background: post.imageStyle }}>PHOTO DROP</div>}
      <div className="post-actions">
        <button onClick={() => onLike(post.id)}>{post.likedByMe ? "Liked" : "Like"}</button>
        <span>{post.likeCount} likes</span><span>{post.commentCount} comments</span><span>Share</span>
      </div>
    </article>
  );
}

function StoreApp({ onOpen }: { onOpen: (app: OpenApp) => void }) {
  const [apps, setApps] = useState<AppRecord[]>([]);
  useEffect(() => { api<{ apps: AppRecord[] }>("/api/apps").then((data) => setApps(data.apps)); }, []);

  async function install(id: string) {
    const data = await api<{ apps: AppRecord[] }>(`/api/apps/${id}/install`, { method: "POST" });
    setApps(data.apps);
    if (["gopost", "settings", "minecraft", "messenger"].includes(id)) onOpen(id as OpenApp);
  }

  return (
    <>
      <h2>Dev Store</h2>
      <div className="store-grid">{apps.map((app) => <div className="store-card" key={app.id}><b>{app.name}</b><p>{app.description}</p><button onClick={() => install(app.id)}>{app.installed ? "Open" : "Install"}</button></div>)}</div>
    </>
  );
}

function SettingsApp({ settings, onChange }: { settings: UserSettings | null; onChange: (settings: UserSettings) => void }) {
  async function patch(next: Partial<UserSettings>) {
    const data = await api<{ settings: UserSettings }>("/api/settings", { method: "PATCH", body: JSON.stringify(next) });
    onChange(data.settings);
  }

  if (!settings) return <p>Loading settings...</p>;
  return (
    <div>
      <h2>System Settings</h2>
      <Setting label="Glass Dock" on={settings.dockStyle === "glass"} onClick={() => patch({ dockStyle: settings.dockStyle === "glass" ? "solid" : "glass" })} />
      <Setting label="Notifications" on={settings.notifications} onClick={() => patch({ notifications: !settings.notifications })} />
      <Setting label="Classic Sounds" on={settings.classicSounds} onClick={() => patch({ classicSounds: !settings.classicSounds })} />
    </div>
  );
}

function Setting({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return <button className="setting-row" onClick={onClick}><span>{label}</span><span className={on ? "switch on" : "switch"} /></button>;
}

function MinecraftLauncher() {
  const [worlds, setWorlds] = useState<MinecraftWorld[]>([]);
  const [status, setStatus] = useState("Ready");
  useEffect(() => { api<{ worlds: MinecraftWorld[] }>("/api/minecraft/worlds").then((data) => setWorlds(data.worlds)); }, []);

  async function launch() {
    const data = await api<{ launch: { message: string } }>("/api/minecraft/launch", { method: "POST" });
    setStatus(data.launch.message);
  }

  return (
    <div>
      <h2>Minecraft Launcher</h2>
      <div className="game-screen">{status}</div>
      <button className="play" onClick={launch}>Play Demo</button>
      <div className="worlds">{worlds.map((world) => <div key={world.id}><b>{world.name}</b><span>{world.mode} - {world.lastPlayed}</span></div>)}</div>
    </div>
  );
}

function MessengerApp() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const active = conversations[0]?.id;

  useEffect(() => {
    api<{ conversations: Conversation[] }>("/api/conversations").then((data) => setConversations(data.conversations));
    const socket = new WebSocket(`${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/live`);
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === "message.created") setMessages((current) => [...current, message.message]);
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    if (active) api<{ messages: Message[] }>(`/api/conversations/${active}/messages`).then((data) => setMessages(data.messages));
  }, [active]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!active || !text.trim()) return;
    await api(`/api/conversations/${active}/messages`, { method: "POST", body: JSON.stringify({ body: text }) });
    setText("");
  }

  return (
    <div className="messenger-app">
      <h2>{conversations[0]?.title ?? "Messenger"}</h2>
      <div className="messages">{messages.map((message) => <div className="message" key={message.id}><b>{message.sender.displayName}:</b> {message.body}</div>)}</div>
      <form onSubmit={send}><input value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message..." /></form>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
