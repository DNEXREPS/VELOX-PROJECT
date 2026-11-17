import "server-only";

/**
 * Small fixed-window rate limiter for API routes (per client IP, per route), in memory.
 * Suitable for a single server instance; use a shared store (e.g. Redis / Upstash) behind a
 * load balancer. Supabase Auth applies its own limits to sign-in, sign-up and email sending.
 */
const windows = new Map<string, { start: number; count: number }>();

export function rateLimit(request: Request, route: string, limit: number, windowMs = 60_000): Response | null {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  const key = `${route}:${ip}`;
  const now = Date.now();
  const w = windows.get(key);
  if (!w || now - w.start > windowMs) { windows.set(key, { start: now, count: 1 }); return null; }
  w.count++;
  if (w.count <= limit) return null;
  const retry = Math.ceil((w.start + windowMs - now) / 1000);
  return Response.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429, headers: { "retry-after": String(retry) } });
}
