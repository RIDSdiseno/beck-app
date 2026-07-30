import { API_BASE_URL, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type EstadoRegistroIngenieria =
  | "pendiente"
  | "en_revision"
  | "validado"
  | "rechazado";

export type ResultadoParametro = "cumple" | "no_cumple" | "no_aplica";
export type Conformidad = "conforme" | "no_conforme";

export type FotoRegistro = {
  id: string;
  url: string;
  created_at: string;
};

export type RegistroIngenieriaApi = {
  id: string;
  obra_id: string;
  usuario_id: string;
  estado: EstadoRegistroIngenieria;
  fecha: string;
  dia_semana?: string | null;
  descripcion_material?: string | null;
  codigo_beck?: string | null;
  itemizado_beck?: string | null;
  itemizado_mandante?: string | null;
  recinto?: string | null;
  modulo: string;
  piso: string;
  eje_numerico: string;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  nombre_sellador: string;
  holgura: string | number;
  factor_por_holguras?: string | number | null;
  cantidad_sellos_con_factores?: string | number | null;
  accesibilidad?: number | null;
  cielo_modular?: number | null;
  aislacion?: string | number | null;
  cantidad_sellos_aislacion?: string | number | null;
  reparacion_tabique?: string | number | null;
  cantidad_final?: string | number | null;
  folio?: string | null;
  observaciones?: string | null;
  tipo_registro: "sello_cortafuego" | "junta_lineal_espuma" | string;
  metros_lineales?: number | null;
  devuelto_a_tecnico?: boolean;
  es_correccion?: boolean;
  registro_origen_id?: string | null;
  motivo_rechazo?: string | null;
  fecha_rechazo?: string | null;
  rechazado_por_id?: string | null;
  seleccionado_para_inspeccion?: boolean;
  fecha_seleccion_inspeccion?: string | null;
  created_at: string;
  updated_at: string;
  fotos?: FotoRegistro[];
  obra?: {
    id: string;
    nombre: string;
    codigo: string;
    cliente?: string | null;
    direccion?: string | null;
  } | null;
  usuario?: {
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
  procesamiento?: {
    id: string;
    registro_terreno_id: string;
    usuario_id: string;
    codigo?: string | null;
    total_sellos_calculado?: string | number | null;
    notas?: string | null;
    procesado_at: string;
  } | null;
};

export type IngenieriaResumen = {
  pendientes: number;
  enRevision: number;
  validados: number;
  rechazados: number;
  total: number;
};

export type ParametroInspeccion = {
  orden: number;
  parametro: string;
  resultado: ResultadoParametro;
  observacion?: string;
};

export type ControlInspeccion = {
  id: string;
  registro_terreno_id: string;
  ingeniero_id: string;
  fecha: string;
  ensayo: string;
  observacion?: string | null;
  conformidad?: Conformidad | null;
  created_at: string;
  controles_inspeccion_parametros?: {
    id: string;
    orden: number;
    parametro: string;
    resultado: ResultadoParametro;
    observacion?: string | null;
  }[];
  usuarios?: {
    id: string;
    nombre: string;
    email: string;
  } | null;
  fotos_control_inspeccion?: FotoRegistro[];
};

export type UpdateRegistroIngenieriaPayload = {
  codigoBeck?: string;
  itemizadoBeck?: string;
  recinto?: string;
  modulo?: string;
  piso?: string;
  ejeNumerico?: string;
  ejeAlfabetico?: string;
  numeroSello?: string;
  cantidadSellos?: number;
  nombreSellador?: string;
  holgura?: number;
  accesibilidad?: number;
  aislacion?: number | null;
  reparacionTabique?: number | null;
  folio?: string;
  observaciones?: string;
  itemizadoMandante?: string;
};

async function getToken() {
  const session = await getSession();
  if (!session.token) throw new Error("No hay sesión activa");
  return session.token;
}

export async function getIngenieriaResumen(): Promise<IngenieriaResumen> {
  const token = await getToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/ingenieria/resumen`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo obtener el resumen");
  }
  return result.data as IngenieriaResumen;
}

export async function getIngenieriaRegistros(params?: {
  estado?: EstadoRegistroIngenieria;
  obraId?: string;
  search?: string;
  limit?: number;
}): Promise<RegistroIngenieriaApi[]> {
  const token = await getToken();
  const query = new URLSearchParams();
  if (params?.estado) query.set("estado", params.estado);
  if (params?.obraId) query.set("obraId", params.obraId);
  if (params?.search) query.set("search", params.search);
  if (params?.limit) query.set("limit", String(params.limit));
  const qs = query.toString();

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros${qs ? `?${qs}` : ""}`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudieron obtener los registros");
  }
  return result.data as RegistroIngenieriaApi[];
}

export async function getIngenieriaRegistroById(
  registroId: string,
): Promise<RegistroIngenieriaApi> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo obtener el registro");
  }
  return result.data as RegistroIngenieriaApi;
}

export async function updateRegistroIngenieria(
  registroId: string,
  payload: UpdateRegistroIngenieriaPayload,
): Promise<RegistroIngenieriaApi> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo actualizar el registro");
  }
  return result.data as RegistroIngenieriaApi;
}

export async function validarRegistroIngenieria(
  registroId: string,
  notas?: string,
): Promise<RegistroIngenieriaApi> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}/validar`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ notas }),
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo validar el registro");
  }
  return result.data as RegistroIngenieriaApi;
}

export async function rechazarRegistroIngenieria(
  registroId: string,
  motivoRechazo: string,
): Promise<{ registro: RegistroIngenieriaApi; correccionId: string }> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}/rechazar`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ motivoRechazo }),
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo rechazar el registro");
  }
  return result.data as { registro: RegistroIngenieriaApi; correccionId: string };
}

export async function marcarInspeccion(
  registroId: string,
  seleccionado: boolean,
): Promise<RegistroIngenieriaApi> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}/inspeccion`,
    {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ seleccionadoParaInspeccion: seleccionado }),
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo actualizar la inspección");
  }
  return result.data as RegistroIngenieriaApi;
}

export async function getControlInspeccion(
  registroId: string,
): Promise<ControlInspeccion | null> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}/control-inspeccion`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );
  if (response.status === 404) return null;
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo obtener el control de inspección");
  }
  return result.data as ControlInspeccion;
}

export async function createControlInspeccion(
  registroId: string,
  payload: {
    fecha: string;
    ensayo: string;
    observacion?: string;
    conformidad?: Conformidad;
    parametros: ParametroInspeccion[];
  },
): Promise<ControlInspeccion> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}/control-inspeccion`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) {
    throw new Error(result?.error || "No se pudo crear el control de inspección");
  }
  return result.data as ControlInspeccion;
}

export async function uploadControlInspeccionFotos(
  registroId: string,
  controlId: string,
  fotos: { uri: string; name: string; type: string }[],
): Promise<FotoRegistro[]> {
  const token = await getToken();
  const formData = new FormData();

  fotos.forEach((foto) => {
    formData.append("fotos", {
      uri: foto.uri,
      name: foto.name,
      type: foto.type,
    } as any);
  });

  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/ingenieria/registros/${registroId}/control-inspeccion/${controlId}/fotos`,
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
  return result.data as FotoRegistro[];
}

export async function descargarRegistroPdf(registroId: string, codigoBeck?: string | null): Promise<void> {
  const token = await getToken();
  const safeName = (codigoBeck ?? `registro-${registroId.slice(0, 6)}`).replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const fileName = `${safeName}-${Date.now()}.pdf`;
  const fileUri  = `${FileSystem.cacheDirectory}${fileName}`;

  try {
    const result = await FileSystem.downloadAsync(
      `${API_BASE_URL}/api/ingenieria/registros/${registroId}/pdf`,
      fileUri,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (result.status !== 200) {
      throw new Error("No se pudo descargar el PDF del registro");
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error("La función de compartir no está disponible en este dispositivo");
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: `Registro ${fileName}`,
      UTI: "com.adobe.pdf",
    });
  } finally {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
  }
}
