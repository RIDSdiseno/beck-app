// Mocks deben ir antes de cualquier import del módulo bajo test
jest.mock("expo-secure-store", () => ({
  setItemAsync:    jest.fn().mockResolvedValue(undefined),
  getItemAsync:    jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem:      jest.fn().mockResolvedValue(null),
  setItem:      jest.fn().mockResolvedValue(undefined),
  removeItem:   jest.fn().mockResolvedValue(undefined),
  multiRemove:  jest.fn().mockResolvedValue(undefined),
}));

import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSession, saveSession, clearSession } from "../session";

const secureGet = SecureStore.getItemAsync as jest.Mock;
const secureSet = SecureStore.setItemAsync as jest.Mock;
const secureDel = SecureStore.deleteItemAsync as jest.Mock;
const asyncGet  = AsyncStorage.getItem as jest.Mock;

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeJwt(payload: object): string {
  const header  = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body    = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${header}.${body}.firma-falsa`;
}

const USER = { id: "u1", nombre: "Test", email: "test@beck.cl", rol: "terreno" };

// ── Tests: isJwtExpired (comportamiento observable via getSession) ─────────────

describe("getSession — expiración de JWT", () => {
  beforeEach(() => {
    secureGet.mockReset();
    asyncGet.mockResolvedValue(null);
  });

  it("retorna sesión válida con token vigente", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ id: "u1", exp: futureExp });

    secureGet
      .mockResolvedValueOnce(token)
      .mockResolvedValueOnce(JSON.stringify(USER));

    const session = await getSession();

    expect(session.isAuthenticated).toBe(true);
    expect(session.token).toBe(token);
    expect(session.user?.rol).toBe("terreno");
  });

  it("limpia y retorna sesión vacía cuando el token está expirado", async () => {
    const pastExp = Math.floor(Date.now() / 1000) - 1;
    const token = makeJwt({ id: "u1", exp: pastExp });

    secureGet
      .mockResolvedValueOnce(token)
      .mockResolvedValueOnce(JSON.stringify(USER));

    const session = await getSession();

    expect(session.isAuthenticated).toBe(false);
    expect(session.token).toBeNull();
    expect(secureDel).toHaveBeenCalled();
  });

  it("fail-closed: token con payload no decodificable se trata como expirado", async () => {
    const malformedToken = "header.!!!base64invalido!!!.signature";

    secureGet
      .mockResolvedValueOnce(malformedToken)
      .mockResolvedValueOnce(JSON.stringify(USER));

    const session = await getSession();

    expect(session.isAuthenticated).toBe(false);
    expect(session.token).toBeNull();
  });

  it("retorna sesión vacía si no hay token almacenado", async () => {
    secureGet.mockResolvedValue(null);

    const session = await getSession();

    expect(session.isAuthenticated).toBe(false);
    expect(session.token).toBeNull();
    expect(session.user).toBeNull();
  });

  it("retorna sesión no autenticada si hay token pero no hay usuario", async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt({ id: "u1", exp: futureExp });

    secureGet
      .mockResolvedValueOnce(token)
      .mockResolvedValueOnce(null);

    const session = await getSession();

    expect(session.isAuthenticated).toBe(false);
    expect(session.token).toBe(token);
  });
});

// ── Tests: saveSession ────────────────────────────────────────────────────────

describe("saveSession", () => {
  beforeEach(() => secureSet.mockClear());

  it("guarda token y usuario en SecureStore", async () => {
    const token = makeJwt({ id: "u1", exp: Date.now() / 1000 + 3600 });
    await saveSession(token, USER);

    expect(secureSet).toHaveBeenCalledWith("beck_token", token);
    expect(secureSet).toHaveBeenCalledWith("beck_user", JSON.stringify(USER));
  });
});

// ── Tests: clearSession ───────────────────────────────────────────────────────

describe("clearSession", () => {
  beforeEach(() => secureDel.mockClear());

  it("elimina token y usuario de SecureStore", async () => {
    await clearSession();

    expect(secureDel).toHaveBeenCalledWith("beck_token");
    expect(secureDel).toHaveBeenCalledWith("beck_user");
  });
});
