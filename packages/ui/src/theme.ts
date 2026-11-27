export type AppThemeChoice = "system" | "light" | "dark";
export type EffectiveAppTheme = "light" | "dark";

export const WORKSPACE_THEME_STORAGE_KEY = "studio-workspace-theme";
export const LEGACY_THEME_STORAGE_KEY = "evidenceflow.theme";

function isThemeChoice(value: unknown): value is AppThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

export function resolveWorkspaceThemeChoice(
  primary: unknown,
  legacy: unknown,
): AppThemeChoice {
  if (isThemeChoice(primary)) return primary;
  if (isThemeChoice(legacy)) return legacy;
  return "system";
}

export function resolveEffectiveAppTheme(
  choice: AppThemeChoice,
  prefersDark: boolean,
): EffectiveAppTheme {
  if (choice === "system") return prefersDark ? "dark" : "light";
  return choice;
}

/**
 * Synchronise an embedded product with the Studio workspace's theme choice.
 * Same-origin product iframes receive the StorageEvent when the parent changes
 * its preference; system mode additionally tracks OS appearance changes.
 */
export function initializeSharedAppTheme(): () => void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => undefined;
  }

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const root = document.documentElement;

  const readChoice = (): AppThemeChoice => {
    try {
      return resolveWorkspaceThemeChoice(
        window.localStorage.getItem(WORKSPACE_THEME_STORAGE_KEY),
        window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY),
      );
    } catch {
      return "system";
    }
  };

  const apply = () => {
    const choice = readChoice();
    const theme = resolveEffectiveAppTheme(choice, media.matches);
    root.dataset.theme = theme;
    root.dataset.themeChoice = choice;
    root.style.colorScheme = theme;
  };

  const onStorage = (event: StorageEvent) => {
    if (
      event.key !== WORKSPACE_THEME_STORAGE_KEY &&
      event.key !== LEGACY_THEME_STORAGE_KEY &&
      event.key !== null
    ) return;
    apply();
  };

  const onSystemThemeChange = () => {
    if (readChoice() === "system") apply();
  };

  apply();
  window.addEventListener("storage", onStorage);
  media.addEventListener("change", onSystemThemeChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onSystemThemeChange);
  };
}
