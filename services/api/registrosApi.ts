import { getSession } from "@/services/auth/session";

export type CreateRegistroPayload = {
  obraId: string;
  fecha: string;
  descripcionMaterial: string;
  modulo: string;
  piso: string;
  ejeNumerico: number;
  ejeAlfabetico: string;
  numeroSello: string;
  cantidadSellos: number;
  nombreSellador: string;
  holgura: number;
  accesibilidad: number;
  observaciones?: string;
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
  modulo: string;
  piso: string;
  eje_numerico: number;
  eje_alfabetico: string;
  numero_sello: string;
  cantidad_sellos: number;
  nombre_sellador: string;
  holgura: string | number;
  accesibilidad: number;
  observaciones?: string | null;
  estado: EstadoRegistroApi;
  created_at: string;
  updated_at: string;
  obras?: {
    id: string;
    nombre: string;
    codigo: string;
    cliente?: string | null;
    direccion?: string | null;
  } | null;
  fotos?: {
    id: string;
    url: string;
    created_at: string;
  }[];
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

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

export async function createRegistro(payload: CreateRegistroPayload) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch(`${API_BASE_URL}/api/registros`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result?.error || "No se pudo crear el registro");
  }

  return result.data;
}

export async function getMisRegistros(): Promise<RegistroHistorialApi[]> {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch(`${API_BASE_URL}/api/registros/mis-registros`, {
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

  return result.data as RegistroHistorialApi[];
}

export async function uploadRegistroFotos(
  registroId: string,
  fotos: {
    uri: string;
    name: string;
    type: string;
  }[],
) {
  const session = await getSession();

  if (!session.token) {
    throw new Error("No hay sesión activa");
  }

  const formData = new FormData();

  fotos.forEach((foto) => {
    formData.append("fotos", {
      uri: foto.uri,
      name: foto.name,
      type: foto.type,
    } as any);
  });

  const response = await fetch(
    `${API_BASE_URL}/api/registros/${registroId}/fotos`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.token}`,
      },
      body: formData,
    },
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result?.error || "No se pudieron subir las fotos");
  }

  return result.data;
}
