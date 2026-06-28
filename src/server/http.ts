import { createHash, randomBytes } from "crypto";

export type RouteContext = {
  request: Request;
  params: Record<string, string>;
  userId: number | null;
};

export type RouteHandler = (context: RouteContext) => Response | Promise<Response>;

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers });
}

export async function body<T>(request: Request): Promise<T> {
  return await request.json() as T;
}

export function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("base64url");
}

export function parseCookies(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return Object.fromEntries(cookie.split(";").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, decodeURIComponent(rest.join("=") || "")];
  }).filter(([key]) => key));
}

export function sessionCookie(token: string) {
  return `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export function clearSessionCookie() {
  return "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
}

export function requireUser(userId: number | null) {
  if (!userId) return json({ error: "Authentication required" }, 401);
  return null;
}
