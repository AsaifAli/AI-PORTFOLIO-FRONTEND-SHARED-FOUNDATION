export type ApiStreamEvent = { event: string; data: unknown };

export type ApiClientOptions = {
  fetcher?: typeof fetch;
};

function hasUnsafePathCharacters(value: string): boolean {
  for (const character of value) {
    const code = character.charCodeAt(0);
    if (character === "\\" || code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function createApiClient(baseUrl: string, options: ApiClientOptions = {}) {
  if (
    typeof baseUrl !== "string" ||
    !baseUrl.startsWith("/") ||
    baseUrl.startsWith("//") ||
    hasUnsafePathCharacters(baseUrl) ||
    baseUrl.includes("?") ||
    baseUrl.includes("#")
  ) {
    throw new TypeError("API base URL must be a same-origin path.");
  }
  const base = baseUrl.replace(/\/$/, "");
  const fetcher = options.fetcher ?? fetch;

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (
      typeof path !== "string" ||
      !path.startsWith("/") ||
      path.startsWith("//") ||
      hasUnsafePathCharacters(path)
    ) {
      throw new TypeError("API request path must be a same-origin path.");
    }

    const headers = new Headers(init.headers);
    // Product components must not bypass the Studio BFF and send reusable
    // Gateway credentials from browser JavaScript. The Studio proxy resolves
    // the opaque HttpOnly session and injects upstream credentials server-side.
    headers.delete("Authorization");
    headers.delete("X-LLM-Gateway-Token");
    headers.delete("Proxy-Authorization");
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


  async function stream<T>(
    path: string,
    body: BodyInit,
    onEvent: (event: ApiStreamEvent) => void,
    signal?: AbortSignal,
  ): Promise<T> {
    if (
      typeof path !== "string" ||
      !path.startsWith("/") ||
      path.startsWith("//") ||
      hasUnsafePathCharacters(path)
    ) {
      throw new TypeError("API request path must be a same-origin path.");
    }

    const headers = new Headers({ Accept: "text/event-stream" });
    headers.delete("Authorization");
    headers.delete("X-LLM-Gateway-Token");
    headers.delete("Proxy-Authorization");
    const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
    if (!isFormData && !(body instanceof Blob) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/octet-stream");
    }

    const response = await fetcher(`${base}${path}`, {
      method: "POST",
      body,
      headers,
      signal,
      credentials: "include",
      cache: "no-store",
    });

    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const payload = await response.json() as { detail?: unknown; error?: unknown; message?: unknown };
        const candidate = payload?.detail ?? payload?.error ?? payload?.message;
        if (typeof candidate === "string" && candidate.trim()) message = candidate;
      } catch {
        // Keep the HTTP status message for non-JSON failures.
      }
      throw Object.assign(new Error(message), { status: response.status });
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("text/event-stream")) {
      throw new Error("The QuoteSense server did not return a processing event stream.");
    }
    if (!response.body) throw new Error("The processing stream ended before it could be read.");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: T | undefined;
    let hasResult = false;

    const dispatch = (frame: string) => {
      let eventName = "message";
      const dataLines: string[] = [];
      for (const line of frame.split(/\\r?\\n/)) {
        if (!line || line.startsWith(":")) continue;
        const separator = line.indexOf(":");
        const field = separator < 0 ? line : line.slice(0, separator);
        const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
        if (field === "event") eventName = value || "message";
        if (field === "data") dataLines.push(value);
      }
      if (!dataLines.length) return;
      const raw = dataLines.join("\\n");
      let data: unknown = raw;
      try { data = JSON.parse(raw); } catch { /* Event data may be plain text. */ }
      const event = { event: eventName, data };
      onEvent(event);

      if (eventName === "result") {
        result = data as T;
        hasResult = true;
      } else if (eventName === "error") {
        const detail = typeof data === "object" && data !== null && "detail" in data
          ? String((data as { detail: unknown }).detail)
          : "Quotation analysis failed.";
        throw new Error(detail);
      }
    };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.search(/\\r?\\n\\r?\\n/);
        while (boundary >= 0) {
          const frame = buffer.slice(0, boundary);
          const match = buffer.slice(boundary).match(/^\\r?\\n\\r?\\n/);
          buffer = buffer.slice(boundary + (match?.[0].length ?? 2));
          dispatch(frame);
          boundary = buffer.search(/\\r?\\n\\r?\\n/);
        }
      }
      buffer += decoder.decode();
      if (buffer.trim()) dispatch(buffer);
    } finally {
      try { await reader.cancel(); } catch { /* Stream already closed. */ }
    }

    if (!hasResult) throw new Error("The processing stream ended without a completed analysis result.");
    return result as T;
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
    stream,
  };
}
