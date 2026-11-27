import assert from "node:assert/strict";
import test from "node:test";
import { resolveEffectiveAppTheme, resolveWorkspaceThemeChoice } from "../src/theme.ts";

test("system theme follows the operating system dark preference", () => {
  assert.equal(resolveEffectiveAppTheme("system", true), "dark");
  assert.equal(resolveEffectiveAppTheme("system", false), "light");
});

test("explicit light and dark choices override the operating system", () => {
  assert.equal(resolveEffectiveAppTheme("light", true), "light");
  assert.equal(resolveEffectiveAppTheme("dark", false), "dark");
});

test("workspace theme preference takes precedence over the legacy key", () => {
  assert.equal(resolveWorkspaceThemeChoice("light", "dark"), "light");
  assert.equal(resolveWorkspaceThemeChoice(null, "dark"), "dark");
  assert.equal(resolveWorkspaceThemeChoice("unknown", "sepia"), "system");
});
