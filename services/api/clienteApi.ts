import { API_BASE_URL, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type ObraCliente = {
  id: string;
  nombre: string;
  codigo: string;
  cliente: string | null;
  direccion: string | null;
  estado: string | null;
  registrosPendientes: number;
  registrosValidados: number;
};

export type FotoCliente = {
  id: string;
  url: string;
  nombre: string | null;
  created_at: string;
};

export type RegistroCliente = {
  id: string;
  fecha: string;
  diaSemana: string | null;
  tipoRegistro: string;
  estado: string;
  piso: string;
  modulo: string;
  recinto: string | null;
  eje: string;
  ejeAlfabetico: string;
  ejeNumerico: string;
  numeroSello: string;
  cantidad: number;
  cantidadSellos: number;
  cantidadFinal: number | null;
  material: string | null;
  descripcionMaterial: string | null;
  codigoBeck: string | null;
  sellador: string;
  nombreSellador: string;
  itemizadoBeck: string | null;
  dimensiones: string | null;
  itemizadoMandante: string | null;
  holgura: number | null;
  factorPorHolguras: number | null;
  accesibilidad: number | null;
  cantidadSellosConFactores: number | null;
  aislacion: number | null;
  aislacionAplica?: boolean | null;
  cantidadSellosAislacion: number | null;
  reparacionTabique: number | null;
  folio: string | null;
  metrosLineales: number | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
  fotos: FotoCliente[];
  validadoCliente: boolean;
  validadoClienteAt: string | null;
  firmaClienteUrl: string | null;
  pdfDisponible: boolean;
  obraNombre: string | null;
  obraCodigo: string | null;
  obraId: string;
};

async function getToken() {
  const session = await getSession();
  if (!session.token) throw new Error("No hay sesión activa");
  return session.token;
}

export async function getClienteObras(): Promise<ObraCliente[]> {
  const token = await getToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/cliente/obras`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) throw new Error(result?.error || "No se pudieron obtener las obras");
  return result.data as ObraCliente[];
}

export async function getClienteRegistrosObra(obraId: string): Promise<RegistroCliente[]> {
  const token = await getToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/cliente/obras/${obraId}/registros`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) throw new Error(result?.error || "No se pudieron obtener los registros");
  return result.data as RegistroCliente[];
}

export async function getClienteHistorial(): Promise<RegistroCliente[]> {
  const token = await getToken();
  const response = await authenticatedFetch(`${API_BASE_URL}/api/cliente/registros/historial`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) throw new Error(result?.error || "No se pudo obtener el historial");
  return result.data as RegistroCliente[];
}

export type ClienteHistorialPage = {
  items: RegistroCliente[];
  total: number;
  nextCursor: string | null;
  obras?: { id: string; nombre: string }[];
};

export async function getClienteHistorialPage(params: {
  cursor?: string | null;
  limit?: number;
  search?: string;
  fecha?: string;
  obraId?: string;
} = {}): Promise<ClienteHistorialPage> {
  const token = await getToken();
  const query = new URLSearchParams({ paginated: "true" });
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.fecha) query.set("fecha", params.fecha);
  if (params.obraId && params.obraId !== "todas") query.set("obraId", params.obraId);
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/cliente/registros/historial?${query.toString()}`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) throw new Error(result?.error || "No se pudo obtener el historial");
  return result.data as ClienteHistorialPage;
}

export async function getClienteRegistroDetalle(registroId: string): Promise<RegistroCliente> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/cliente/registros/${registroId}`,
    { method: "GET", headers: { Authorization: `Bearer ${token}` } },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) throw new Error(result?.error || "No se pudo obtener el detalle del registro");
  return result.data as RegistroCliente;
}

export async function validarRegistroCliente(
  registroId: string,
  params: { pathData: string; canvasWidth: number; canvasHeight: number },
): Promise<RegistroCliente> {
  const token = await getToken();
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/cliente/registros/${registroId}/validar`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(params),
    },
  );
  const result = await readJsonResponse(response);
  if (!response.ok || !result?.success) throw new Error(result?.error || "No se pudo validar el registro");
  return result.data as RegistroCliente;
}

export async function compartirPdfCliente(
  registroId: string,
  codigoBeck?: string | null,
) {
  const token = await getToken();
  const safeName = (codigoBeck || `registro-${registroId.slice(0, 8)}`).replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const fileUri = `${FileSystem.cacheDirectory}beck-${safeName}-${Date.now()}.pdf`;

  try {
    const result = await FileSystem.downloadAsync(
      `${API_BASE_URL}/api/cliente/registros/${registroId}/pdf`,
      fileUri,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (result.status !== 200) {
      throw new Error("No se pudo descargar el PDF firmado");
    }

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new Error(
        "Compartir archivos no está disponible en este dispositivo",
      );
    }

    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Compartir PDF firmado",
      UTI: "com.adobe.pdf",
    });
  } finally {
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
  }
}
