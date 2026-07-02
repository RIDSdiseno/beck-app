import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

export const STORAGE_KEYS = {
  token: "beck_token",
  user: "beck_user",
  obraSeleccionada: "beck_obra_seleccionada",
  codeVerifier: "beck_code_verifier",
  redirectUri: "beck_redirect_uri",
  hiddenValidatedRegistros: "beck_historial_registros_ocultos",
} as const;

export type SessionUser = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
};

export type SelectedObra = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let buffer = 0;
  let bits = 0;

  for (const char of padded) {
    if (char === "=") break;

    const index = chars.indexOf(char);
    if (index < 0) continue;

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  return output;
}

function isJwtExpired(token: string) {
  const [, payload] = token.split(".");

  // Token sin payload decodificable → fail-closed para no dejar pasar sesiones corruptas.
  if (!payload) return true;

  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: number };

    if (decoded.exp === undefined || decoded.exp === null) return false;

    const expirationMs = decoded.exp * 1000;
    return Date.now() >= expirationMs;
  } catch {
    return true;
  }
}

export async function saveSession(token: string, user: SessionUser) {
  await Promise.all([
    SecureStore.setItemAsync(STORAGE_KEYS.token, token),
    // Guardar en SecureStore (cifrado) en lugar de AsyncStorage (texto plano).
    SecureStore.setItemAsync(STORAGE_KEYS.user, JSON.stringify(user)),
    AsyncStorage.removeItem(STORAGE_KEYS.user), // limpia entrada legacy si existe
  ]);
}

export async function getSession(): Promise<{
  token: string | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
}> {
  const [token, userRawSecure] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.token),
    SecureStore.getItemAsync(STORAGE_KEYS.user),
  ]);

  let user: SessionUser | null = null;

  // Migración: si el usuario viene de una versión anterior (datos en AsyncStorage),
  // moverlos a SecureStore de forma transparente en este primer acceso.
  let userRaw = userRawSecure;
  if (!userRaw) {
    const legacy = await AsyncStorage.getItem(STORAGE_KEYS.user);
    if (legacy && token) {
      userRaw = legacy;
      await Promise.all([
        SecureStore.setItemAsync(STORAGE_KEYS.user, legacy),
        AsyncStorage.removeItem(STORAGE_KEYS.user),
      ]);
    }
  }

  try {
    user = userRaw ? (JSON.parse(userRaw) as SessionUser) : null;
  } catch {
    user = null;
    await SecureStore.deleteItemAsync(STORAGE_KEYS.user);
  }

  if (token && isJwtExpired(token)) {
    await clearSession();

    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  }

  return {
    token: token || null,
    user,
    isAuthenticated: Boolean(token && user),
  };
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(STORAGE_KEYS.token),
    SecureStore.deleteItemAsync(STORAGE_KEYS.user),
    clearMicrosoftAuthState(),
    AsyncStorage.multiRemove([
      STORAGE_KEYS.user,
      STORAGE_KEYS.obraSeleccionada,
      STORAGE_KEYS.hiddenValidatedRegistros,
    ]),
  ]);
}

export async function saveMicrosoftAuthState(
  codeVerifier: string,
  redirectUri: string,
) {
  await Promise.all([
    SecureStore.setItemAsync(STORAGE_KEYS.codeVerifier, codeVerifier),
    SecureStore.setItemAsync(STORAGE_KEYS.redirectUri, redirectUri),
  ]);
}

export async function getMicrosoftAuthState() {
  const [codeVerifier, redirectUri] = await Promise.all([
    SecureStore.getItemAsync(STORAGE_KEYS.codeVerifier),
    SecureStore.getItemAsync(STORAGE_KEYS.redirectUri),
  ]);

  return {
    codeVerifier,
    redirectUri,
  };
}

export async function clearMicrosoftAuthState() {
  await Promise.all([
    SecureStore.deleteItemAsync(STORAGE_KEYS.codeVerifier),
    SecureStore.deleteItemAsync(STORAGE_KEYS.redirectUri),
  ]);
}

export async function saveSelectedObra(obra: SelectedObra) {
  await AsyncStorage.setItem(
    STORAGE_KEYS.obraSeleccionada,
    JSON.stringify(obra),
  );
}

export async function getSelectedObra(): Promise<SelectedObra | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.obraSeleccionada);

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SelectedObra;
  } catch {
    return null;
  }
}

export async function clearSelectedObra() {
  await AsyncStorage.removeItem(STORAGE_KEYS.obraSeleccionada);
}
