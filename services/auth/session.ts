import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "beck_token";
const USER_KEY = "beck_user";

export async function saveSession(token: string, user: unknown) {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function getSessionToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getSessionUser() {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearSession() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
