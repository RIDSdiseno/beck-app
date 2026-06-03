const DEFAULT_API_BASE_URL = "https://beck-mobile-backend-production.up.railway.app";

function normalizeApiBaseUrl(value?: string | null) {
  const url = value?.trim() || DEFAULT_API_BASE_URL;
  return url.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);
