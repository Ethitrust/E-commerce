import { fetchJson } from "@/lib/api/client";
import type { Role } from "@/lib/mock-data";

export type AuthUserResponse = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar: string;
};

export type AuthSuccessResponse = {
  accessToken: string;
  user: AuthUserResponse;
};

export type RegisterRequest = {
  name: string;
  email: string;
  password: string;
  becomeSeller?: boolean;
  sellerHandle?: string;
};

export function postLogin(email: string, password: string): Promise<AuthSuccessResponse> {
  return fetchJson<AuthSuccessResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export function postRegister(body: RegisterRequest): Promise<AuthSuccessResponse> {
  return fetchJson<AuthSuccessResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
