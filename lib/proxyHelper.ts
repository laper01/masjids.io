/**
 * lib/proxyHelper.ts
 * BFF (Backend for Frontend) — Proxy / Mock Helper
 *
 * Detects USE_MOCK_API env flag and either:
 *   1. Returns mock data directly (USE_MOCK_API=true)
 *   2. Forwards the request to the real backend (USE_MOCK_API=false / unset)
 *
 * Usage inside a Next.js Route Handler:
 *
 *   import { proxyRequest } from "@/lib/proxyHelper";
 *   import type { GetRoleTemplatesResponse } from "@/types/api";
 *
 *   export async function GET(req: Request) {
 *     return proxyRequest<GetRoleTemplatesResponse>(req, {
 *       path: "/masjids/123/permissions/role-templates",
 *       mockData: { success: true, message: "ok", data: [], metadata: { ... } },
 *     });
 *   }
 *
 * FIX: the body-forwarding logic used to exclude DELETE entirely (on the
 * REST convention that "DELETE has no body"), so any DELETE route that
 * validated a JSON body (e.g. { reason }) locally never actually forwarded
 * it upstream — the backend received a bodyless DELETE and rejected/
 * silently ignored it, even though the exact same request sent directly
 * with a body succeeds. DELETE is no longer excluded from body forwarding.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { ApiResponse, ApiPaginatedResponse } from "@/types/api";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const BACKEND_BASE_URL =
  process.env.BACKEND_BASE_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8080/api/v2";

const USE_MOCK =
  process.env.USE_MOCK_API === "true" ||
  process.env.USE_MOCK_API === "1";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ApiData<T> = T extends ApiPaginatedResponse<infer U>
  ? ApiPaginatedResponse<U>
  : T extends ApiResponse<infer U>
  ? ApiResponse<U>
  : T;

export interface ProxyOptions<T> {
  /**
   * The backend path relative to BACKEND_BASE_URL.
   * Example: "/masjids/abc-123/permissions/role-templates"
   * Query parameters should already be appended to the incoming `req.url`
   * and will be forwarded automatically.
   */
  path: string;

  /**
   * Mock payload returned when USE_MOCK_API=true.
   * Must match the full response shape (including success/message/data/metadata).
   */
  mockData: ApiData<T>;

  /**
   * Override the HTTP method. Defaults to the method of the incoming request.
   */
  method?: string;

  /**
   * Additional headers to forward or inject.
   */
  extraHeaders?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts headers that should be forwarded to the backend.
 * Strips hop-by-hop headers automatically.
 * Automatically injects Authorization: Bearer <token> from NextAuth session
 * if not already present in the incoming request headers.
 */
async function buildForwardHeaders(
  req: Request,
  extra: Record<string, string> = {}
): Promise<HeadersInit> {
  const hopByHop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade",
    // Next.js internal header — never forward upstream
    "x-middleware-subrequest",
  ]);

  const forwarded: Record<string, string> = {};

  req.headers.forEach((value, key) => {
    if (!hopByHop.has(key.toLowerCase())) {
      forwarded[key] = value;
    }
  });

  // ✅ Inject Bearer token from NextAuth session if not already present
  if (!forwarded["authorization"]) {
    const session = await getServerSession(authOptions);
    if (session?.accessToken) {
      forwarded["authorization"] = `Bearer ${session.accessToken}`;
    }
  }

  // Ensure Content-Type is set for mutation requests when missing.
  // IMPORTANT: Never inject for multipart/form-data — the browser sets
  // the boundary automatically and overwriting it breaks file uploads.
  // Includes DELETE now too, since some backend routes (e.g. membership
  // cancel) expect a JSON body like { reason } on DELETE requests.
  if (
    !forwarded["content-type"] &&
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)
  ) {
    const incoming = req.headers.get("content-type") ?? "";
    if (!incoming.includes("multipart/form-data")) {
      forwarded["content-type"] = "application/json";
    }
  }

  return { ...forwarded, ...extra };
}

/**
 * Extracts query string from the incoming Next.js Request URL
 * and returns it ready to be appended to the backend path.
 */
function extractQueryString(req: Request): string {
  try {
    const url = new URL(req.url);
    return url.search; // includes leading "?" or empty string
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core BFF proxy function.
 *
 * - In mock mode  → returns `mockData` immediately as JSON.
 * - In proxy mode → forwards the request to `BACKEND_BASE_URL + path + queryString`.
 *
 * Authorization header is automatically injected from the NextAuth session
 * (via getServerSession) if not already present on the incoming request.
 *
 * All response headers from the backend (including Set-Cookie) are forwarded
 * back to the client automatically.
 */
export async function proxyRequest<T>(
  req: Request,
  options: ProxyOptions<T>
): Promise<NextResponse> {
  const { path, mockData, extraHeaders = {} } = options;
  const method = options.method ?? req.method;

  // ── MOCK MODE ───────────────────────────────────────────────────────────────
  if (USE_MOCK) {
    return NextResponse.json(mockData, { status: 200 });
  }

  // ── PROXY MODE ──────────────────────────────────────────────────────────────
  const queryString = extractQueryString(req);
  const targetUrl = `${BACKEND_BASE_URL}${path}${queryString}`;
console.log("[proxyHelper] →", method, targetUrl);
  // ✅ await because buildForwardHeaders is now async (calls getServerSession)
  const headers = await buildForwardHeaders(req, extraHeaders);

  let body: BodyInit | null = null;
  // FIX: DELETE removed from this exclusion list. Only GET/HEAD are
  // guaranteed bodyless by spec — some of our own DELETE routes (e.g.
  // membership cancel) intentionally send a JSON body like { reason } and
  // that needs to reach the upstream backend, not get silently dropped.
  if (!["GET", "HEAD"].includes(method.toUpperCase())) {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      // ✅ Stream raw body — NEVER call req.text() or req.json() on multipart.
      // req.text() decodes bytes as UTF-8, corrupting binary file data and
      // mangling the multipart boundary, which causes UND_ERR_SOCKET on the
      // backend. Pass the raw ReadableStream directly so Node forwards bytes
      // untouched.
      body = req.body;
    } else {
      // For DELETE with no body at all, req.text() safely resolves to "".
      body = await req.text();
    }
  }

  let backendRes: Response;

  try {
    backendRes = await fetch(targetUrl, {
      method,
      headers,
      body,
      // "duplex: half" is required by Node's native fetch whenever body is a
      // ReadableStream (i.e. multipart file uploads). It's harmless for string
      // bodies and ignored in browser environments.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(body instanceof ReadableStream ? { duplex: "half" } as any : {}),
      // Prevent Node from following redirects automatically —
      // let the client handle them.
      redirect: "manual",
    });
  } catch (err) {
    console.error("[proxyHelper] fetch error →", targetUrl, err);
    return NextResponse.json(
      {
        success: false,
        message: "Upstream service unavailable. Please try again later.",
      },
      { status: 502 }
    );
  }

  // ── Backend 401 detection ─────────────────────────────────────────────────
  // If backend returns 401, it means the JWT token is expired or revoked
  // even though NextAuth session still appears valid on the frontend.
  // We forward the 401 with a special header so the client-side interceptor
  // can redirect the user to /login and clear the session.
  if (backendRes.status === 401) {
    console.warn("[proxyHelper] backend 401 →", method, targetUrl, "— token may be expired");
    const nextRes401 = NextResponse.json(
      {
        success: false,
        message:  "Your session has expired. Please sign in again.",
        code:     "AUTH_TOKEN_EXPIRED",
      },
      { status: 401 }
    );
    // Signal to client-side interceptor to redirect to /login
    nextRes401.headers.set("X-Auth-Action", "redirect-login");
    return nextRes401;
  }

  // Build response — forward status + body
  const responseBody = await backendRes.text();

  const nextRes = new NextResponse(responseBody, {
    status: backendRes.status,
    statusText: backendRes.statusText,
  });

  // Forward all response headers from backend (e.g. Set-Cookie, ETag …)
  const skipResponseHeaders = new Set(["content-encoding", "transfer-encoding"]);
  backendRes.headers.forEach((value, key) => {
    if (!skipResponseHeaders.has(key.toLowerCase())) {
      nextRes.headers.set(key, value);
    }
  });

  // Ensure JSON content-type is preserved
  if (!nextRes.headers.get("content-type")) {
    nextRes.headers.set("content-type", "application/json");
  }

  return nextRes;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONVENIENCE WRAPPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shorthand for GET proxy calls (no body forwarded).
 */
export function proxyGET<T>(
  req: Request,
  path: string,
  mockData: ApiData<T>,
  extraHeaders?: Record<string, string>
): Promise<NextResponse> {
  return proxyRequest<T>(req, { path, mockData, method: "GET", extraHeaders });
}

/**
 * Shorthand for POST proxy calls.
 */
export function proxyPOST<T>(
  req: Request,
  path: string,
  mockData: ApiData<T>,
  extraHeaders?: Record<string, string>
): Promise<NextResponse> {
  return proxyRequest<T>(req, { path, mockData, method: "POST", extraHeaders });
}

/**
 * Shorthand for PUT proxy calls.
 */
export function proxyPUT<T>(
  req: Request,
  path: string,
  mockData: ApiData<T>,
  extraHeaders?: Record<string, string>
): Promise<NextResponse> {
  return proxyRequest<T>(req, { path, mockData, method: "PUT", extraHeaders });
}

/**
 * Shorthand for PATCH proxy calls.
 */
export function proxyPATCH<T>(
  req: Request,
  path: string,
  mockData: ApiData<T>,
  extraHeaders?: Record<string, string>
): Promise<NextResponse> {
  return proxyRequest<T>(req, { path, mockData, method: "PATCH", extraHeaders });
}

/**
 * Shorthand for DELETE proxy calls.
 */
export function proxyDELETE<T>(
  req: Request,
  path: string,
  mockData: ApiData<T>,
  extraHeaders?: Record<string, string>
): Promise<NextResponse> {
  return proxyRequest<T>(req, {
    path,
    mockData,
    method: "DELETE",
    extraHeaders,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT CONFIG SNAPSHOT (useful for debugging)
// ─────────────────────────────────────────────────────────────────────────────

export const proxyConfig = {
  useMock: USE_MOCK,
  backendBaseUrl: BACKEND_BASE_URL,
} as const;