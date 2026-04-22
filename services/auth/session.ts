import AsyncStorage from "@react-native-async-storage/async-storage";

export const STORAGE_KEYS = {
  token: "beck_token",
  user: "beck_user",
  obraSeleccionada: "beck_obra_seleccionada",
} as const;

export type SessionUser = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
};

export async function saveSession(token: string, user: SessionUser) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.token, token],
    [STORAGE_KEYS.user, JSON.stringify(user)],
  ]);
}

export async function getSession() {
  const [[, token], [, userRaw]] = await AsyncStorage.multiGet([
    STORAGE_KEYS.token,
    STORAGE_KEYS.user,
  ]);

  let user: SessionUser | null = null;

  try {
    user = userRaw ? JSON.parse(userRaw) : null;
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
  ]);
}

export async function getCurrentUser() {
  const { user } = await getSession();
  return user;
}

export async function getToken() {
  const { token } = await getSession();
  return token;
}
