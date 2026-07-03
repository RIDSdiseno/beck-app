import { API_BASE_URL, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";

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
  itemizadoMandante: string | null;
  holgura: number | null;
  factorPorHolguras: number | null;
  accesibilidad: number | null;
  cantidadSellosConFactores: number | null;
  aislacion: number | null;
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
  pdfFirmadoUrl: string | null;
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
