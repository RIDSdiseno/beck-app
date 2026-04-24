export type LoginResponse = {
  token: string;
  user: {
    id: string;
    nombre: string;
    email: string;
    rol: string;
  };
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

export async function loginWithMicrosoftIdToken(
  idToken: string,
): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/api/mobile/auth/microsoft`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || "No se pudo iniciar sesión con Microsoft");
  }

  return data;
}
