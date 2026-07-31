import { API_BASE_URL, ensureArray, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";

export type CreateRegistroPayload = {
  obraId: string;
  fecha: string;
  descripcionMaterial: string;
  codigoBeck?: string;
  itemizadoBeck?: string;
  recinto?: string;
  moduloEdificio?: string;
  modulo?: string;
  piso: string;
  ejeNumerico?: string;
  ejeAlfabetico?: string;
  numeroSello: string;
  cantidadSellos: number;
  nombreSellador: string;
  holgura?: number;
  accesibilidad?: number;
  cieloModular?: number;
  aislacion?: number;
  reparacionTabique?: number;
  folio?: string;
  observaciones?: string;
  itemizadoSacyr?: string;
  tipoRegistro?: "sello_cortafuego" | "junta_lineal_espuma";
  metrosLineales?: number;
};

export type EstadoRegistroApi =
  | "pendiente"
  | "en_revision"
  | "validado"
  | "rechazado";

export type RegistroHistorialApi = {
  id: string;
  fecha: string;
  dia_semana: string;
  descripcion_material: string;
  itemizado_beck?: string | null;
  itemizado_mandante?: string | null;
  codigo_beck?: string | null;
  recinto?: string | null;
  foto_url?: string | null;
  fotos_urls?: string[] | null;
  modulo: string;
  piso: string;
  eje_numerico: string;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  nombre_sellador: string;
  holgura: string | number;
  factor_por_holguras?: string | number | null;
  accesibilidad: number;
  cielo_modular?: number | null;
  cantidad_sellos_con_factores?: string | number | null;
  aislacion?: string | number | null;
  cantidad_sellos_aislacion?: string | number | null;
  reparacion_tabique?: string | number | null;
  cantidad_final?: string | number | null;
  folio?: string | null;
  observaciones?: string | null;
  estado: EstadoRegistroApi;
  devuelto_a_tecnico?: boolean;
  corregido_at?: string | null;
  fecha_rechazo?: string | null;
  motivo_rechazo?: string | null;
  rechazado_por_id?: string | null;
  reenviado_revision_at?: string | null;
  es_correccion?: boolean;
  registro_origen_id?: string | null;
  itemizado_sacyr?: string | null;
  metros_lineales?: number | null;
  tipo_registro: "sello_cortafuego" | "junta_lineal_espuma" | string;
  created_at: string;
  updated_at: string;
  obras?: {
    id: string;
    nombre: string;
    codigo: string;
    cliente?: string | null;
    direccion?: string | null;
  } | null;
  usuarios?: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  } | null;
  rechazado_por?: {
    id: string;
    nombre: string;
    email?: string | null;
    rol?: string | null;
  } | null;
  registro_origen?: {
    id: string;
    estado?: EstadoRegistroApi | string;
    numero_sello?: string | null;
    descripcion_material?: string | null;
    motivo_rechazo?: string | null;
    fecha_rechazo?: string | null;
    foto_url?: string | null;
    fotos_urls?: string[] | null;
    fotos?: {
      id: string;
      url: string;
      created_at: string;
    }[];
  } | null;
  fotos?: {
    id: string;
    url: string;
    created_at: string;
  }[];
};

const registrosCache = new Map<string, RegistroHistorialApi[]>();

type GetMisRegistrosParams = {
  obraId?: string;
  estado?: EstadoRegistroApi;
  scope?: "registro" | "historial";
};

function getRegistrosCacheKey(userId: string, params?: GetMisRegistrosParams) {
  return JSON.stringify({
    userId,
    obraId: params?.obraId ?? "",
    estado: params?.estado ?? "",
    scope: params?.scope ?? "",
  });
}


export async function createRegistro(payload: CreateRegistroPayload) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/api/registros`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo crear el registro");
  }

  clearMisRegistrosCache();
  return result.data;
}

export async function deleteRegistroPendiente(registroId: string) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await authenticatedFetch(`${API_BASE_URL}/api/registros/${registroId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo eliminar el registro");
  }

  clearMisRegistrosCache();
  return result.data;
}

export function clearMisRegistrosCache() {
  registrosCache.clear();
}

export async function getMisRegistros(
  forceRefresh = false,
  params?: GetMisRegistrosParams,
): Promise<RegistroHistorialApi[]> {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const cacheKey = getRegistrosCacheKey(session.user?.id || session.token, params);
  const cached = registrosCache.get(cacheKey);

  if (cached && !forceRefresh) {
    return cached;
  }

  const query = new URLSearchParams();
  if (params?.obraId) query.set("obraId", params.obraId);
  if (params?.estado) query.set("estado", params.estado);
  if (params?.scope) query.set("scope", params.scope);
  const queryString = query.toString();

  const response = await authenticatedFetch(`${API_BASE_URL}/api/registros/mis-registros${queryString ? `?${queryString}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
  });

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudieron obtener los registros");
  }

  const data = ensureArray<RegistroHistorialApi>(
    result.data,
    "Respuesta inválida del servidor al obtener los registros.",
  );
  registrosCache.set(cacheKey, data);
  return data;
}

export async function uploadRegistroFotos(
  registroId: string,
  fotos: {
    uri: string;
    name: string;
    type: string;
  }[],
  options?: {
    replaceExisting?: boolean;
  },
) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const result = await uploadRegistroFotosRequest(
    session.token,
    registroId,
    fotos,
    Boolean(options?.replaceExisting),
  );

  clearMisRegistrosCache();
  return result;
}

async function uploadRegistroFotosRequest(
  token: string,
  registroId: string,
  fotos: {
    uri: string;
    name: string;
    type: string;
  }[],
  replaceExisting: boolean,
) {
  const formData = new FormData();

  fotos.forEach((foto) => {
    formData.append("fotos", {
      uri: foto.uri,
      name: foto.name,
      type: foto.type,
    } as any);
  });

  const replaceQuery = replaceExisting ? "?replace=true" : "";
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/registros/${registroId}/fotos${replaceQuery}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    },
  );

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudieron subir las fotos");
  }

  return result.data;
}

export async function enviarRegistroAIngenieria(
  registroId: string,
  payload: CreateRegistroPayload,
) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/registros/${registroId}/enviar-ingenieria`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo enviar el registro a ingeniería");
  }

  clearMisRegistrosCache();
  return result.data as RegistroHistorialApi;
}

export async function reenviarRegistroComoTecnico(
  registroId: string,
  payload: CreateRegistroPayload,
) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/registros/${registroId}/reenviar-tecnico`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo reenviar el registro");
  }

  clearMisRegistrosCache();
  return result.data as RegistroHistorialApi;
}

export async function enviarRegistroATecnico(registroId: string) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/registros/${registroId}/enviar-tecnico`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
    },
  );

  const result = await readJsonResponse(response);

  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo enviar el registro al técnico");
  }

  clearMisRegistrosCache();
  return result.data as RegistroHistorialApi;
}
