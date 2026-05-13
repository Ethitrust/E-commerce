import { apiBaseUrl } from "@/lib/api/config";
import { getAccessToken } from "@/lib/api/auth-session";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function resolveApiUrl(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl.replace(/\/$/, "")}${trimmed}`;
}

export async function fetchJson<T>(
  path: string,
  init?: Omit<RequestInit, "credentials"> & { credentials?: RequestCredentials },
): Promise<T> {
  const res = await fetch(resolveApiUrl(path), {
    ...init,
    credentials: init?.credentials ?? "include",
  });

  let body: unknown;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    body = await res.json();
  } else {
    body = await res.text();
  }

  if (!res.ok) {
    const payload = typeof body === "object" && body !== null ? body : {};
    const errPayload = payload as { error?: { code?: string; message?: string } };
    const message = errPayload.error?.message ?? (typeof body === "string" ? body : res.statusText);
    const code = errPayload.error?.code;
    throw new ApiError(message, res.status, code);
  }

  return body as T;
}

export async function fetchJsonAuthed<T>(
  path: string,
  init?: Omit<RequestInit, "credentials"> & { credentials?: RequestCredentials },
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }
  return fetchJson<T>(path, { ...init, headers });
}
