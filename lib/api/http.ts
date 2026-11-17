export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError(0, "network_error", "Could not reach the server.");
  }
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error;
    if (typeof e === "string") throw new ApiError(res.status, "error", e);
    throw new ApiError(
      res.status,
      e?.code ?? "error",
      e?.message ?? "Something went wrong.",
    );
  }
  return body as T;
}

export const jsonInit = (method: string, data: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export function errorMessage(e: unknown, fallback = "Something went wrong.") {
  return e instanceof Error ? e.message : fallback;
}