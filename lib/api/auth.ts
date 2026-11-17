// auth.ts
import { request } from "./http";
import type { Me } from "./types";

export const getMe = () => request<{ user: Me }>("/api/auth").then((r) => r.user);