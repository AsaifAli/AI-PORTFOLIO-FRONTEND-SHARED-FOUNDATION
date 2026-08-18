const KEY = "portfolio_llm_session";

export function bootstrapSession(): string {
  const query = new URLSearchParams(window.location.search);
  const incoming = query.get(KEY);
  if (incoming) {
    sessionStorage.setItem(KEY, incoming);
    query.delete(KEY);
    const clean = `${window.location.pathname}${query.toString() ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, document.title, clean);
  }
  return sessionStorage.getItem(KEY) ?? "";
}

export function getSessionToken(): string {
  return sessionStorage.getItem(KEY) ?? "";
}
export function clearSession(): void {
  sessionStorage.removeItem(KEY);
}
export function hasSession(): boolean {
  return Boolean(getSessionToken());
}
