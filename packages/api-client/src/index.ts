export type ApiClientOptions = {
  fetcher?: typeof fetch;
};

export function createApiClient(baseUrl: string, options: ApiClientOptions = {}) {
  const base = baseUrl.replace(/\/$/, "");
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    if (init.body !== undefined && !isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetcher(`${base}${path}`, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const body = await response.json() as { detail?: unknown; error?: unknown; message?: unknown };
        const candidate = body?.detail ?? body?.error ?? body?.message;
        if (typeof candidate === "string" && candidate.trim()) message = candidate;
      } catch {
        // Keep the status message for non-JSON error responses.
      }
      throw Object.assign(new Error(message), { status: response.status });
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  return {
    get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
    post: <T>(path: string, body: unknown, signal?: AbortSignal) =>
      request<T>(path, {
        method: "POST",
        body: body instanceof FormData ? body : JSON.stringify(body),
        signal,
      }),
    delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
    request,
  };
}
