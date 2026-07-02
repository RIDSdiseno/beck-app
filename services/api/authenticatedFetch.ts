import { router } from "expo-router";

import { clearSession } from "@/services/auth/session";

let isClosingExpiredSession = false;

export async function closeExpiredSession() {
  if (isClosingExpiredSession) return;

  isClosingExpiredSession = true;

  try {
    const { clearMisObrasCache } =
      require("@/services/api/obrasApi") as typeof import("@/services/api/obrasApi");
    const { clearMisRegistrosCache } =
      require("@/services/api/registrosApi") as typeof import("@/services/api/registrosApi");

    clearMisObrasCache();
    clearMisRegistrosCache();
    await clearSession();
    router.replace("/login");
  } finally {
    setTimeout(() => {
      isClosingExpiredSession = false;
    }, 800);
  }
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  const response = await fetch(input, init);

  if (response.status === 401) {
    await closeExpiredSession();
    throw new Error("Tu sesión ha expirado. Inicia sesión nuevamente.");
  } else if (response.status === 403) {
    console.warn("PERMISO DENEGADO (403) =>", input);
  }

  return response;
}
