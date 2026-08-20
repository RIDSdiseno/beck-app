import { API_BASE_URL, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";
import { ResultadoParametro } from "@/services/api/ingenieriaApi";

export type FotoCorreccionParametro = {
  id: string;
  url: string;
  created_at: string;
};

export type ParametroCorreccion = {
  id: string;
  orden: number;
  parametro: string;
  resultado: ResultadoParametro;
  observacion?: string | null;
  correccion_observacion?: string | null;
  corregido_at?: string | null;
  corregido_por_id?: string | null;
  fotos_correccion_parametro?: FotoCorreccionParametro[];
};

export type ControlCorreccion = {
  id: string;
  registro_terreno_id: string;
  ingeniero_id: string;
  fecha: string;
  ensayo: string;
  observacion?: string | null;
  conformidad?: "conforme" | "no_conforme" | null;
  correccion_enviada_at?: string | null;
  correccion_enviada_por_id?: string | null;
  created_at: string;
  controles_inspeccion_parametros?: ParametroCorreccion[];
  usuarios?: { id: string; nombre: string; email: string } | null;
  registros_terreno?: {
    id: string;
    codigo_beck?: string | null;
    fecha: string;
    piso?: string | null;
    numero_sello?: string | null;
    inspeccion_revision_estado?: "pendiente" | "validado" | "rechazado" | null;
    motivo_rechazo_inspeccion?: string | null;
    obras?: { id: string; nombre: string; codigo: string } | null;
  };
};

async function getToken() {
  const session = await getSession();
  if (!session.token) throw new Error("No hay sesión activa");
  return {
    token: session.token,
    userId: session.user?.id || session.token,
  };
}

const controlesPendientesCache = new Map<
  string,
  { data: ControlCorreccion[]; expiresAt: number }
>();
const CONTROLES_PENDIENTES_CACHE_MS = 30_000;

export function clearControlesPendientesCache() {
  controlesPendientesCache.clear();
}

export async function getControlesPendientesCorreccion(
  forceRefresh = false,
): Promise<ControlCorreccion[]> {
  const { token, userId } = await getToken();
  const cached = controlesPendientesCache.get(userId);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/jefeobra/control-inspeccion/pendientes`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudieron obtener los controles pendientes de corrección");
  }
  const data = result.data as ControlCorreccion[];
  controlesPendientesCache.set(userId, {
    data,
    expiresAt: Date.now() + CONTROLES_PENDIENTES_CACHE_MS,
  });
  return data;
}

export async function getControlCorreccionDetalle(registroId: string): Promise<ControlCorreccion> {
  const { token } = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/jefeobra/control-inspeccion/${registroId}`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo obtener el control de inspección");
  }
  return result.data as ControlCorreccion;
}

export async function enviarCorreccionControlInspeccion(
  controlId: string,
  parametros: { parametroId: string; correccionObservacion?: string }[],
): Promise<ControlCorreccion> {
  const { token } = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/jefeobra/control-inspeccion/${controlId}/correccion`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ parametros }),
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo enviar la corrección");
  }
  clearControlesPendientesCache();
  return result.data as ControlCorreccion;
}

export async function uploadCorreccionParametroFotos(
  parametroId: string,
  fotos: { uri: string; name: string; type: string }[],
): Promise<FotoCorreccionParametro[]> {
  const { token } = await getToken();
  const formData = new FormData();

  fotos.forEach((foto) => {
    formData.append("fotos", {
      uri: foto.uri,
      name: foto.name,
      type: foto.type,
    } as any);
  });

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/jefeobra/control-inspeccion/parametro/${parametroId}/fotos`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudieron subir las fotografías");
  }
  return result.data as FotoCorreccionParametro[];
}
