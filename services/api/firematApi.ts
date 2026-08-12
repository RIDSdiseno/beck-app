import { API_BASE_URL, ensureArray, readJsonResponse } from "@/services/api/config";
import { authenticatedFetch } from "@/services/api/authenticatedFetch";
import { getSession } from "@/services/auth/session";

export type FirematProducto = {
  id: number;
  nombre: string;
  sku: string | null;
  descripcion: string | null;
  categoria: string;
  categoriaId: number;
  precio: number;
  precioUsd: number | null;
  precioSugerido: number | null;
  stockActual: number;
  stockReservado: number;
  stockDisponible: number;
  stockMinimo: number;
  ubicacion: string | null;
  criticidad: string;
  activo: boolean;
  imagen: string | null;
  estadoStock: "SIN_STOCK" | "BAJO_STOCK" | "OK";
  alertaStockBajo: boolean;
  formato: string | null;
  cantidadCaja: string | null;
  disponibilidad: string | null;
};

export type FirematCategoria = { id: number; nombre: string };

export type FirematBarcodeLookup = {
  encontrado: boolean;
  asociado: boolean;
  codigo: string;
  producto?: FirematProducto;
  unidadesPorEscaneo?: number;
  unidadesSugeridas?: number | null;
  skuSugerido?: string;
  descripcion?: string | null;
};

export type FirematInventarioResumen = {
  totalProductos: number;
  productosActivos: number;
  productosInactivos: number;
  productosSinStock: number;
  productosBajoStock: number;
  stockTotal: number;
  stockReservadoTotal: number;
  stockDisponibleTotal: number;
};

async function request(path: string, init?: RequestInit) {
  const session = await getSession();
  if (!session.token) {
    throw new Error("No existe una sesión activa");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.token}`);

  const response = await authenticatedFetch(`${API_BASE_URL}/api/firemat${path}`, {
    ...init,
    headers,
  });
  const data = await readJsonResponse(response);
  if (!response.ok) throw new Error(data?.error || "No se pudo completar la operación Firemat");
  return data;
}

export async function getFirematProductos(q = "") {
  const data = await request(`/productos${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ""}`);
  return ensureArray(data?.data, "Respuesta de productos inválida") as FirematProducto[];
}

export async function getFirematCategorias() {
  const data = await request("/categorias");
  return ensureArray(data?.data, "Respuesta de categorías inválida") as FirematCategoria[];
}

export async function createFirematProducto(payload: Record<string, unknown>) {
  const data = await request("/productos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data as FirematProducto;
}

export async function updateFirematProducto(id: number, payload: Record<string, unknown>) {
  const data = await request(`/productos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data as FirematProducto;
}

export async function getFirematInventario(q = "", bajoStock = false) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (bajoStock) params.set("bajoStock", "true");
  const data = await request(`/inventario${params.toString() ? `?${params}` : ""}`);
  return {
    productos: ensureArray(data?.data, "Respuesta de inventario inválida") as FirematProducto[],
    resumen: data?.resumen as FirematInventarioResumen,
  };
}

export async function updateFirematInventario(
  productoId: number,
  payload: { stockNuevo: number; motivo: string; ubicacion?: string | null },
) {
  const data = await request(`/inventario/${productoId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data as FirematProducto;
}

export async function getFirematProductoPorCodigo(codigo: string) {
  const data = await request(`/inventario/codigo/${encodeURIComponent(codigo)}`);
  return data as FirematBarcodeLookup & { success: true };
}

export async function associateFirematBarcode(payload: {
  codigo: string;
  productoId: number;
  unidadesPorEscaneo: number;
  descripcion?: string;
}) {
  const data = await request("/inventario/codigos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return data.data as {
    codigo: string;
    unidadesPorEscaneo: number;
    producto: FirematProducto;
  };
}

export async function createFirematScanReception(payload: {
  recepcionId: string;
  motivo: string;
  items: Array<{ codigo: string; cantidadEscaneos: number }>;
}) {
  const data = await request("/inventario/recepciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return {
    duplicada: Boolean(data.duplicada),
    productos: ensureArray(data?.data, "Respuesta de recepción inválida") as FirematProducto[],
  };
}
