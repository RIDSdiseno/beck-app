import AsyncStorage from "@react-native-async-storage/async-storage";

export type Obra = {
  id: string;
  nombre: string;
  direccion: string;
  estado: "PLANIFICADA" | "EN_EJECUCION" | "PAUSADA" | "FINALIZADA";
  supervisor: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

export async function getMisObras(): Promise<Obra[]> {
  const token = await AsyncStorage.getItem("beck_token");

  if (!token) {
    throw new Error("No hay sesión activa");
  }

  const response = await fetch(`${API_BASE_URL}/api/obras/mis-obras`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "No se pudieron obtener las obras");
  }

  return data;
}
