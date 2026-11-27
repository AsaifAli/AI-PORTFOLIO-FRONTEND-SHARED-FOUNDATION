export const HANDOFF_PARAM = "portfolio_llm_handoff";
const LEGACY_PARAM = "portfolio_llm_session";
const CODE_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

export type SessionMetadata = {
  active: boolean;
  project?: string;
  provider?: string;
  model?: string;
  expires_at?: string | number;
};

export type HandoffLocation = {
  code: string;
  legacyLink: boolean;
  invalidCode: boolean;
  changed: boolean;
  cleanUrl: string;
};

export function parseHandoffLocation(
  pathname: string,
  search: string,
  hash = "",
): HandoffLocation {
  const params = new URLSearchParams(search);
  const handoffValues = params.getAll(HANDOFF_PARAM);
  const hasHandoff = handoffValues.length > 0;
  const rawCode = handoffValues[0] ?? "";
  const legacyLink = params.has(LEGACY_PARAM);
  const changed = hasHandoff || legacyLink;
  params.delete(HANDOFF_PARAM);
  params.delete(LEGACY_PARAM);
  const query = params.toString();
  return {
    code: handoffValues.length === 1 && CODE_PATTERN.test(rawCode) && !legacyLink ? rawCode : "",
    legacyLink,
    invalidCode: hasHandoff && (handoffValues.length !== 1 || !CODE_PATTERN.test(rawCode)),
    changed,
    cleanUrl: `${pathname}${query ? `?${query}` : ""}${hash}`,
  };
}

export function isValidHandoffCode(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}

export type SessionBootstrapOptions = {
  exchangePath: string;
  sessionPath: string;
  fetcher?: typeof fetch;
};

export async function bootstrapSession({
  exchangePath,
  sessionPath,
  fetcher = fetch,
}: SessionBootstrapOptions): Promise<SessionMetadata & { error?: string }> {
  const handoff = parseHandoffLocation(
    window.location.pathname,
    window.location.search,
    window.location.hash,
  );

  // Remove single-use codes before making any network request. Legacy bearer
  // query links are stripped and rejected; credentials are never persisted.
  if (handoff.changed) {
    window.history.replaceState({}, document.title, handoff.cleanUrl);
  }
  if (handoff.legacyLink) {
    return { active: false, error: "This older session link is no longer supported. Return to the Studio and launch again." };
  }
  if (handoff.invalidCode) {
    return { active: false, error: "The secure launch link is invalid. Return to the Studio and launch again." };
  }

  try {
    if (handoff.code) {
      const response = await fetcher(exchangePath, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code: handoff.code }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { detail?: string; error?: string } | null;
        throw new Error(payload?.detail || payload?.error || "The secure app session could not be established. Launch again from the Studio.");
      }
    }

    const status = await fetcher(sessionPath, {
      method: "GET",
      credentials: "include",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!status.ok) {
      const payload = await status.json().catch(() => null) as { detail?: string; error?: string } | null;
      throw new Error(payload?.detail || payload?.error || "The app session could not be verified. Launch again from the Studio.");
    }
    const metadata = await status.json() as SessionMetadata;
    if (metadata.active !== true) {
      return { ...metadata, active: false, error: "Your secure session is not active. Return to the Studio and launch this app again." };
    }
    return metadata;
  } catch (error) {
    return {
      active: false,
      error: error instanceof Error ? error.message : "Unable to verify the secure app session.",
    };
  }
}

export async function revokeSession(path: string, fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher(path, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json", "X-Requested-With": "fetch" },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string; error?: string } | null;
    throw new Error(payload?.detail || payload?.error || "The app session could not be revoked.");
  }
}
