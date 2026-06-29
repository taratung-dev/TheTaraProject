export type User = {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string;
  bio: string;
};

export type Session = {
  user: User | null;
};

export type Comment = {
  id: number;
  postId: number;
  body: string;
  createdAt: string;
  author: User;
};

export type Post = {
  id: number;
  body: string;
  imageStyle: string | null;
  createdAt: string;
  author: User;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  canEdit: boolean;
};

export type Profile = {
  user: User;
  postCount: number;
  fanCount: number;
  followingCount: number;
  isFollowing: boolean;
  isMe: boolean;
};

export type AppRecord = {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: string;
  installed: boolean;
};

export type UserSettings = {
  wallpaper: string;
  dockStyle: "glass" | "solid";
  notifications: boolean;
  classicSounds: boolean;
  darkMode: boolean;
};

export type DesktopState = {
  dockApps: string[];
  openedApps: string[];
  wallpaper: string;
};

export type Conversation = {
  id: number;
  title: string;
  type: string;
  unreadCount: number;
};

export type Message = {
  id: number;
  conversationId: number;
  body: string;
  createdAt: string;
  sender: User;
};

export type Notification = {
  id: number;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type MinecraftProfile = {
  playerName: string;
  version: string;
  status: string;
};

export type MinecraftWorld = {
  id: number;
  name: string;
  mode: string;
  lastPlayed: string;
};

export type BrowserHistoryItem = {
  id: number;
  url: string;
  title: string;
  createdAt: string;
};

export type BrowserBookmark = {
  id: number;
  url: string;
  title: string;
  createdAt: string;
};

export type BrowserSettings = {
  homepage: string;
};

export type BrowserMetadata = {
  url: string;
  title: string;
  description: string;
  embeddable: boolean;
  reason?: string;
};

export type Note = {
  id: number;
  title: string;
  body: string;
  updatedAt: string;
};

export type PaintDrawing = {
  id: number;
  name: string;
  width: number;
  height: number;
  pixels: string[];
  updatedAt: string;
};
