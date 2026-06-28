export type Handler = (context: {
  request: Request;
  params: Record<string, string>;
  userId: number | null;
}) => Response | Promise<Response>;

export type Route = [
  method: string,
  pattern: RegExp,
  keys: string[],
  handler: Handler,
];

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers });
}

export async function body<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function requireUser(userId: number | null) {
  if (!userId) return json({ error: "Authentication required" }, 401);
  return null;
}

export async function route(
  request: Request,
  routes: Route[],
  userId: number | null = null,
) {
  const url = new URL(request.url);
  for (const [method, pattern, keys, handler] of routes) {
    const match = url.pathname.match(pattern);
    if (request.method === method && match) {
      const params = Object.fromEntries(
        keys.map((key, index) => [key, match[index + 1]]),
      );
      return await handler({ request, params, userId });
    }
  }
  return json({ error: "Not found" }, 404);
}

export function userIdFromHeader(request: Request) {
  const value = request.headers.get("x-user-id");
  return value ? Number(value) : null;
}

export function servicePort(defaultPort: number) {
  return Number(process.env.PORT ?? defaultPort);
}
