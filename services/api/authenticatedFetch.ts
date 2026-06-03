import { router } from "expo-router";

import { clearSession } from "@/services/auth/session";

let isClosingExpiredSession = false;

export async function closeExpiredSession() {
  if (isClosingExpiredSession) return;

  isClosingExpiredSession = true;

  try {
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
  }

  return response;
}
