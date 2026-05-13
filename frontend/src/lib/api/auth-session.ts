const ACCESS_TOKEN_KEY = "nexus_access_token";

export function getAccessToken(): string | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAccessToken(token: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAccessToken(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
