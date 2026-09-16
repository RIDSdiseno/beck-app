import { authenticatedFetch } from "./authenticatedFetch";
import { API_BASE_URL, readJsonResponse } from "./config";
import { getSession, type SessionUser } from "../auth/session";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

export type TipoBodega = "epp" | "implemento" | "herramienta";
export type ArticuloBodega = {
  id: string;
  nombre: string;
  sku: string | null;
  disponible: number;
  activo: boolean;
  [key: string]: unknown;
};
export type AsignacionBodega = {
  id: string;
  nombre: string;
  cantidad: number;
  estado: string;
  pendienteBodega: boolean;
  obra: string;
  supervisor: string;
  operario?: string;
  subSkus: string[];
  fecha: string;
  motivo?: string;
};
export type PaginaBodega<T> = { items: T[]; page: number; hasMore: boolean };
export type OpcionesBodega = {
  obras: { id: string; nombre: string; codigo: string }[];
  supervisores: { id: string; nombre: string }[];
};
export const puedeAccederBodegaBeck = (user: SessionUser | null) =>
  user?.empresa === "firemat" &&
  user.rol === "bodeguero" &&
  user.email.toLowerCase().endsWith("@firemat.cl");
let revision = 0;
export const revisionBodega = () => revision;
export const notificarCambioBodega = () => {
  revision += 1;
};
export async function bodegaRequest<T>(
  path: string,
  body?: Record<string, unknown>,
  method = "POST",
): Promise<T> {
  const session = await getSession();
  if (!session.token || !puedeAccederBodegaBeck(session.user))
    throw new Error("Acceso exclusivo para el bodeguero de Firemat.");
  const response = await authenticatedFetch(
    `${API_BASE_URL}/api/bodega-beck${path}`,
    {
      method: body ? method : "GET",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const data = await readJsonResponse(response);
  if (!response.ok || !data?.success)
    throw new Error(
      data?.error || "No se pudo completar la operación de bodega.",
    );
  return data.data as T;
}
// Identificador de reintento, no es una credencial ni un token de seguridad.
export const nuevaOperacionBodega = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });

export async function compartirEtiquetasBodega(params: Record<string, string>) {
  const session = await getSession();
  if (!session.token || !puedeAccederBodegaBeck(session.user))
    throw new Error("Acceso no autorizado.");
  const uri = `${FileSystem.cacheDirectory}etiquetas-beck-${Date.now()}.pdf`;
  try {
    const response = await FileSystem.downloadAsync(
      `${API_BASE_URL}/api/bodega-beck/etiquetas?${new URLSearchParams(params)}`,
      uri,
      { headers: { Authorization: `Bearer ${session.token}` } },
    );
    if (response.status !== 200)
      throw new Error(
        "No se pudieron descargar las etiquetas. Verifica que el artículo tenga SKU.",
      );
    if (!(await Sharing.isAvailableAsync()))
      throw new Error("Este dispositivo no permite compartir archivos.");
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: "Etiquetas BECK",
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
