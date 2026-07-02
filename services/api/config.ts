const DEFAULT_API_BASE_URL = "https://beck-mobile-backend-production.up.railway.app";

function normalizeApiBaseUrl(value?: string | null) {
  const url = value?.trim() || DEFAULT_API_BASE_URL;
  return url.replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_API_BASE_URL,
);

export function ensureArray<T>(data: unknown, message: string): T[] {
  if (!Array.isArray(data)) {
    throw new Error(message);
  }

  return data as T[];
}

export async function readJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  const bodyText = await response.text();

  if (!bodyText) return null;

  if (!contentType.includes("application/json")) {
    throw new Error("El servidor no respondió correctamente.");
  }

  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error("El servidor no respondió correctamente.");
  }
}
