export type User = {
  id: number;
  username: string;
  displayName: string;
  avatarColor: string;
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
  dockStyle: string;
  notifications: boolean;
  classicSounds: boolean;
};

export type Conversation = {
  id: number;
  title: string;
  type: string;
};

export type Message = {
  id: number;
  conversationId: number;
  body: string;
  createdAt: string;
  sender: User;
};

export type MinecraftWorld = {
  id: number;
  name: string;
  mode: string;
  lastPlayed: string;
};
