/**
 * src/lib/apiFetch.ts
 *
 * Single shared fetch wrapper for all hooks.
 * Intercepts 401 from BFF (proxyHelper) and redirects to /login.
 *
 * HOW TO MIGRATE A HOOK:
 *   1. Delete the local `apiFetch` function inside the hook file
 *   2. Add this import at the top:
 *        import { apiFetch } from "@/lib/apiFetch";
 *   3. Done — no other changes needed. Signature is identical.
 *
 * PUBLIC ENDPOINTS (this revision):
 *   Some BFF routes are documented as PUBLIC (no auth required) but the
 *   backend may still occasionally return 401 (misconfiguration, stale
 *   token forwarded, etc). For those calls, pass
 *   { skipAuthRedirect: true } as the 3rd argument — apiFetch will throw
 *   a normal Error instead of redirecting the whole page to /login. This
 *   lets the calling hook treat it like any other fetch failure and let
 *   the component's existing error UI handle it, instead of yanking an
 *   anonymous visitor to a login page they were never supposed to see.
 *   Default behavior (no 3rd argument) is unchanged.
 *
 * ERROR MESSAGE SHAPES (this revision):
 *   The backend uses more than one error body shape depending on the
 *   endpoint:
 *     1. Field validation:  { success, message: "Validation failed.",
 *                              errors: { fieldName: ["reason", ...] } }
 *     2. Problem-detail:    { success, error: { type, title, status,
 *                              detail } }  (e.g. 403 voter_not_eligible)
 *   Previously apiFetch only ever read `json.message`, so shape (2) fell
 *   through to a useless generic "Request failed with status 403" and
 *   the real reason (`error.detail`) was silently dropped. extractErrorMessage()
 *   below checks both shapes (plus a couple of other common ones) before
 *   falling back to the generic message. The thrown Error also carries a
 *   `.type` property (e.g. "voter_not_eligible") when the API provides
 *   one, so callers can branch on a stable machine-readable code instead
 *   of pattern-matching the human-readable text.
 */

"use client";

import { signOut } from "next-auth/react";
import type { ApiErrorResponse } from "@/types/api";

// Prevent multiple simultaneous redirects
let isRedirecting = false;

function redirectToLogin(): void {
  if (isRedirecting || typeof window === "undefined") return;
  isRedirecting = true;
  signOut({ redirect: false }).finally(() => {
    const url = new URL("/login", window.location.origin);
    url.searchParams.set("reason", "session_expired");
    url.searchParams.set("callbackUrl", window.location.pathname);
    window.location.href = url.toString();
  });
}

export interface ApiFetchOptions {
  /**
   * When true, a 401 / X-Auth-Action: redirect-login response will NOT
   * trigger a redirect to /login. Instead, apiFetch throws a normal
   * Error (status 401) that the caller can catch and handle locally.
   * Use this for BFF routes documented as PUBLIC, where a 401 means
   * something is misconfigured rather than "this user needs to log in".
   */
  skipAuthRedirect?: boolean;
}

/** Shape of the "problem detail" style error body, e.g. 403 voter_not_eligible. */
interface ProblemDetailErrorBody {
  error?: {
    type?: string;
    title?: string;
    status?: number;
    detail?: string;
    message?: string;
  } | string;
}

/** Shape of the field-validation style error body, e.g. facility "Validation failed." */
interface ValidationErrorBody {
  message?: string;
  errors?: Record<string, string[] | string>;
}

export interface ApiError extends Error {
  status?: number;
  /** Machine-readable error code from the API, e.g. "voter_not_eligible". */
  type?: string;
  /** The full parsed error body, in case a caller needs more than the message/type. */
  body?: unknown;
}

/**
 * Pulls the most specific human-readable message out of whatever error
 * body shape the backend sent, trying each known shape in order before
 * falling back to a generic "Request failed with status N".
 */
function extractErrorMessage(
  json: (ApiErrorResponse & ProblemDetailErrorBody & ValidationErrorBody) | null | undefined,
  status: number
): string {
  // Shape 2: { error: { detail, title, message } } — problem-detail style
  if (json?.error && typeof json.error === "object") {
    if (json.error.detail) return json.error.detail;
    if (json.error.message) return json.error.message;
    if (json.error.title) return json.error.title;
  }
  // error as a plain string
  if (typeof json?.error === "string" && json.error) return json.error;

  // Shape 1: { message, errors: { field: ["reason", ...] } } — field validation
  if (json?.errors && typeof json.errors === "object") {
    const firstField = Object.keys(json.errors)[0];
    const fieldValue = firstField ? json.errors[firstField] : undefined;
    const firstMessage = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue;
    if (firstMessage) return firstMessage;
  }

  // Generic top-level message
  if (json?.message) return json.message;

  return `Request failed with status ${status}`;
}

function extractErrorType(
  json: (ProblemDetailErrorBody) | null | undefined
): string | undefined {
  if (json?.error && typeof json.error === "object" && json.error.type) {
    return json.error.type;
  }
  return undefined;
}

export async function apiFetch<T>(
  url: string,
  options?: RequestInit,
  fetchOptions?: ApiFetchOptions
): Promise<T> {
  // FormData bodies must NOT get Content-Type: application/json — the
  // browser needs to set its own multipart/form-data; boundary=... header.
  const isFormData = options?.body instanceof FormData;

  const headers: HeadersInit = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...options?.headers,
  };

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers, // placed last so ...options can never silently overwrite it
  });

  // ── 401 from backend (via proxyHelper X-Auth-Action header) ──────────────
  if (
    res.status === 401 ||
    res.headers.get("X-Auth-Action") === "redirect-login"
  ) {
    if (fetchOptions?.skipAuthRedirect) {
      // Public endpoint — don't hijack navigation. Let the caller's
      // existing error handling (e.g. isNotFoundError-style checks,
      // generic error state) take over instead.
      const err = new Error("Request failed with status 401") as ApiError;
      err.status = 401;
      throw err;
    }
    redirectToLogin();
    throw new Error("Session expired. Redirecting to login.");
  }

  const json = await res.json();

  if (!res.ok) {
    const message = extractErrorMessage(json, res.status);
    const error = new Error(message) as ApiError;
    error.status = res.status;
    error.type = extractErrorType(json);
    error.body = json;
    throw error;
  }

  return json as T;
}