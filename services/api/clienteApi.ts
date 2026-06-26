import { API_BASE_URL } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";

export type ClienteObraResumen = {
  id: string;
  nombre: string;
  codigo?: string | null;
  cliente?: string | null;
  direccion?: string | null;
  estado?: string | null;
  totalRegistros: number;
  totalRegistrosValidados?: number;
  cantidadFinalTotal: number;
};

export type ClienteRegistroValidado = {
  id: string;
  fecha?: string | null;
  diaSemana?: string | null;
  tipoRegistro?: string | null;
  estado?: string | null;
  piso?: string | null;
  modulo?: string | null;
  recinto?: string | null;
  eje?: string | null;
  ejeAlfabetico?: string | null;
  ejeNumerico?: string | null;
  numeroSello?: string | null;
  cantidad?: number | null;
  cantidadSellos?: number | null;
  cantidadFinal?: number | null;
  material?: string | null;
  descripcionMaterial?: string | null;
  codigoBeck?: string | null;
  sellador?: string | null;
  nombreSellador?: string | null;
  itemizadoBeck?: string | null;
  itemizadoMandante?: string | null;
  holgura?: number | null;
  factorPorHolguras?: number | null;
  accesibilidad?: number | null;
  cantidadSellosConFactores?: number | null;
  aislacion?: number | null;
  cantidadSellosAislacion?: number | null;
  reparacionTabique?: number | null;
  folio?: string | null;
  metrosLineales?: number | null;
  observaciones?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  fotosUrls?: string[] | null;
  fotoUrl?: string | null;
  fotos?: { id: string; url: string; created_at?: string }[];
  fotos_registro?: { id?: string; url: string; created_at?: string }[];
};

export type ClienteDashboardData = {
  totalObras: number;
  totalRegistros: number;
  cantidadFinalTotal: number;
  registrosEsteMes: number;
  registrosPorObra: { nombre: string; total: number }[];
  registrosPorTipo: { tipo: string; total: number }[];
  registrosPorPiso: { piso: string; total: number }[];
  registrosPorFecha: { fecha: string; total: number }[];
  ultimosRegistrosValidados?: {
    id: string;
    fecha?: string | null;
    tipoRegistro?: string | null;
    obraId?: string | null;
    obraNombre?: string | null;
    modulo?: string | null;
    cantidadFinal?: number | null;
  }[];
};

const clienteCache = new Map<string, unknown>();

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

async function getWithAuth<T>(path: string, cacheKey: string, forceRefresh = false) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const userCacheKey = `${session.user?.id || session.token}:${cacheKey}`;
  const cached = clienteCache.get(userCacheKey) as T | undefined;
  if (cached && !forceRefresh) return cached;

  const response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudieron obtener los datos del cliente");
  }

  clienteCache.set(userCacheKey, result.data as T);
  return result.data as T;
}

export function clearClienteCache() {
  clienteCache.clear();
}

export function getClienteDashboard(forceRefresh = false) {
  return getWithAuth<ClienteDashboardData>(
    "/api/cliente/dashboard",
    "dashboard",
    forceRefresh,
  );
}

export function getClienteObras(forceRefresh = false) {
  return getWithAuth<ClienteObraResumen[]>("/api/cliente/obras", "obras", forceRefresh);
}

export function getClienteRegistrosObra(obraId: string, forceRefresh = false) {
  return getWithAuth<ClienteRegistroValidado[]>(
    `/api/cliente/obras/${obraId}/registros`,
    `obra:${obraId}:registros`,
    forceRefresh,
  );
}
