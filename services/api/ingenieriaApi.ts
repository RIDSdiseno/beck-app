import { API_BASE_URL } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";
import type { EstadoRegistroApi, RegistroHistorialApi } from "@/services/api/registrosApi";

export type IngenieriaResumenApi = {
  pendientes: number;
  enRevision: number;
  validados: number;
  rechazados: number;
  total: number;
};

export type IngenieriaRegistroApi = RegistroHistorialApi & {
  obra?: RegistroHistorialApi["obras"] | null;
  usuario?: RegistroHistorialApi["usuarios"] | null;
  procesamiento?: {
    id: string;
    codigo?: string | null;
    notas?: string | null;
    procesado_at?: string | null;
  } | null;
};

export type IngenieriaRegistroUpdatePayload = {
  codigoBeck?: string | null;
  itemizadoBeck?: string | null;
  itemizadoMandante?: string | null;
  recinto?: string | null;
  modulo?: string | null;
  piso?: string | null;
  ejeNumerico?: string | null;
  ejeAlfabetico?: string | null;
  numeroSello?: string | null;
  cantidadSellos?: number | string | null;
  nombreSellador?: string | null;
  holgura?: number | string | null;
  accesibilidad?: number | string | null;
  aislacion?: number | string | null;
  reparacionTabique?: number | string | null;
  folio?: string | null;
  observaciones?: string | null;
};

const ingenieriaCache = new Map<string, unknown>();

type GetIngenieriaRegistrosParams = {
  estado?: EstadoRegistroApi | "todos";
  search?: string;
};

function getCacheKey(userId: string, path: string) {
  return `${userId}:${path}`;
}

function clearIngenieriaCache() {
  ingenieriaCache.clear();
}

async function readJsonResponse(response: Response) {
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

async function requestIngenieria<T>(
  path: string,
  options?: RequestInit,
  forceRefresh = false,
) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const method = String(options?.method || "GET").toUpperCase();
  const cacheKey = getCacheKey(session.user?.id || session.token, path);
  const cached = ingenieriaCache.get(cacheKey) as T | undefined;

  if (method === "GET" && cached && !forceRefresh) {
    return cached;
  }

  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${session.token}`,
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo completar la solicitud");
  }

  if (method !== "GET") {
    clearIngenieriaCache();
  }

  if (method === "GET") {
    ingenieriaCache.set(cacheKey, result.data as T);
  }

  return result.data as T;
}

export async function getIngenieriaResumen(forceRefresh = false) {
  return requestIngenieria<IngenieriaResumenApi>(
    "/api/ingenieria/resumen",
    undefined,
    forceRefresh,
  );
}

export async function getIngenieriaRegistros(
  forceRefresh = false,
  params?: GetIngenieriaRegistrosParams,
) {
  const query = new URLSearchParams();
  if (params?.estado && params.estado !== "todos") query.set("estado", params.estado);
  if (params?.search?.trim()) query.set("search", params.search.trim());
  const queryString = query.toString();

  return requestIngenieria<IngenieriaRegistroApi[]>(
    `/api/ingenieria/registros${queryString ? `?${queryString}` : ""}`,
    undefined,
    forceRefresh,
  );
}

export async function iniciarRevisionIngenieria(registroId: string) {
  return requestIngenieria<IngenieriaRegistroApi>(
    `/api/ingenieria/registros/${registroId}/iniciar-revision`,
    { method: "PUT" },
  );
}

export async function updateRegistroIngenieria(
  registroId: string,
  payload: IngenieriaRegistroUpdatePayload,
) {
  return requestIngenieria<IngenieriaRegistroApi>(
    `/api/ingenieria/registros/${registroId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
  );
}

export async function validarRegistroIngenieria(registroId: string, notas?: string) {
  return requestIngenieria<IngenieriaRegistroApi>(
    `/api/ingenieria/registros/${registroId}/validar`,
    {
      method: "PUT",
      body: JSON.stringify({ notas: notas?.trim() || undefined }),
    },
  );
}

export async function rechazarRegistroIngenieria(
  registroId: string,
  motivoRechazo: string,
) {
  return requestIngenieria<{ registro: IngenieriaRegistroApi; correccionId: string }>(
    `/api/ingenieria/registros/${registroId}/rechazar`,
    {
      method: "PUT",
      body: JSON.stringify({ motivoRechazo }),
    },
  );
}
