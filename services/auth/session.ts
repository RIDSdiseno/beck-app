import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  token: "beck_token",
  user: "beck_user",
  obraSeleccionada: "beck_obra_seleccionada",
  codeVerifier: "beck_code_verifier",
  redirectUri: "beck_redirect_uri",
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

export async function saveSession(token: string, user: SessionUser) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.token, token],
    [STORAGE_KEYS.user, JSON.stringify(user)],
  ]);
}

export async function getSession(): Promise<{
  token: string | null;
  user: SessionUser | null;
  isAuthenticated: boolean;
}> {
  const [[, token], [, userRaw]] = await AsyncStorage.multiGet([
    STORAGE_KEYS.token,
    STORAGE_KEYS.user,
  ]);

  let user: SessionUser | null = null;

  try {
    user = userRaw ? (JSON.parse(userRaw) as SessionUser) : null;
  } catch {
    user = null;
  }

  return {
    token: token || null,
    user,
    isAuthenticated: Boolean(token && user),
  };
}

export async function clearSession() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.token,
    STORAGE_KEYS.user,
    STORAGE_KEYS.obraSeleccionada,
    STORAGE_KEYS.codeVerifier,
    STORAGE_KEYS.redirectUri,
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
