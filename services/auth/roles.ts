import type { Href } from "expo-router";

export const LIMITED_MODULE_ROLES = new Set(["terreno", "jefeobra"]);

export function canViewAllModules(rol?: string | null) {
  return Boolean(rol && !LIMITED_MODULE_ROLES.has(rol));
}

export function getInitialRouteForRole(rol?: string | null): Href {
  return "/(tabs)";
}
