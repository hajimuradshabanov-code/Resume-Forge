import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (msg = "Resume not found.") => new ApiError(404, msg);
export const forbidden = (msg = "You do not have permission to access this resource.") => new ApiError(403, msg);
export const badRequest = (msg = "Invalid request.", details?: unknown) => new ApiError(400, msg, details);

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/**
 * Wraps a route handler with consistent error handling.
 * Internal errors are logged server-side and never leaked to the client.
 */
export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message, details: err.details }, { status: err.status });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first?.path?.join(".");
    return NextResponse.json(
      {
        error: `${path ? path + ": " : ""}${first?.message ?? "Invalid input"}`,
        details: err.issues.slice(0, 10).map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 400 },
    );
  }
  if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 401) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }
  console.error("[api] Unhandled error:", err);
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}

export async function readJson(req: Request, maxBytes = 5_000_000): Promise<unknown> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > maxBytes) throw new ApiError(413, "Request body too large.");
  try {
    return await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON.");
  }
}

// ---------------------------------------------------------------------------
// Simple in-memory rate limiter (per-process). Suitable for single-instance
// deployments; swap for Redis/Upstash in multi-instance production.
// ---------------------------------------------------------------------------
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  b.count += 1;
  if (b.count > limit) return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, remaining: limit - b.count };
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "local";
}

export function assertRateLimit(req: Request, scope: string, limit: number, windowMs: number) {
  const r = rateLimit(`${scope}:${clientIp(req)}`, limit, windowMs);
  if (!r.ok) throw new ApiError(429, `Too many requests. Try again in ${r.retryAfter}s.`);
}

/** Basic CSRF defence: mutating requests must originate from our own origin. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // non-browser clients (tests, curl) - cookies are not auto-sent anyway
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    const o = new URL(origin);
    if (host && o.host !== host) throw new ApiError(403, "Cross-origin request blocked.");
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(403, "Invalid origin.");
  }
}
