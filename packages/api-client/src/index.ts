import { getSessionToken } from "@portfolio/session";

export function createApiClient(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = getSessionToken();
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${base}${path}`, { ...init, headers });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;

      try {
        const body = await response.json();
        message = body?.detail ?? body?.message ?? message;
      } catch {
        // Ignore non-JSON error bodies and retain the status-based message.
      }

      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    request,
  };
}
