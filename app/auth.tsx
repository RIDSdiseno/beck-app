import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

const tenantId = process.env.EXPO_PUBLIC_AZURE_TENANT_ID!;
const clientId = process.env.EXPO_PUBLIC_AZURE_CLIENT_ID!;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL!;

const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
};

type CallbackStep =
  | "Preparando autenticación..."
  | "Validando respuesta de Microsoft..."
  | "Intercambiando credenciales..."
  | "Validando acceso con Beck..."
  | "Cargando tu sesión...";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const handledRef = useRef(false);

  const [step, setStep] = useState<CallbackStep>("Preparando autenticación...");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleAuth = async () => {
      if (handledRef.current) return;
      handledRef.current = true;

      try {
        setError("");
        setStep("Validando respuesta de Microsoft...");

        const code = typeof params.code === "string" ? params.code : "";
        const authError = typeof params.error === "string" ? params.error : "";

        if (authError) {
          throw new Error(`Microsoft devolvió un error: ${authError}`);
        }

        if (!code) {
          throw new Error("Microsoft no devolvió un code válido.");
        }

        const [[, codeVerifier], [, redirectUri]] = await AsyncStorage.multiGet(
          ["beck_code_verifier", "beck_redirect_uri"],
        );

        if (!codeVerifier || !redirectUri) {
          throw new Error("No se encontró la información temporal del login.");
        }

        setStep("Intercambiando credenciales...");

        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            code,
            redirectUri,
            extraParams: {
              code_verifier: codeVerifier,
            },
          },
          discovery,
        );

        const idToken = tokenResult.idToken;

        if (!idToken) {
          throw new Error("No se recibió id_token desde Microsoft.");
        }

        setStep("Validando acceso con Beck...");

        const apiResponse = await fetch(
          `${API_BASE_URL}/api/mobile/auth/microsoft`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ idToken }),
          },
        );

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          throw new Error(data?.message || "No se pudo iniciar sesión.");
        }

        setStep("Cargando tu sesión...");

        await AsyncStorage.multiSet([
          ["beck_token", data.token],
          ["beck_user", JSON.stringify(data.user)],
        ]);

        await AsyncStorage.multiRemove([
          "beck_code_verifier",
          "beck_redirect_uri",
        ]);

        router.replace("/");
      } catch (err: any) {
        console.log("AUTH CALLBACK ERROR", err);

        await AsyncStorage.multiRemove([
          "beck_code_verifier",
          "beck_redirect_uri",
        ]);

        setError(err?.message || "No se pudo completar el inicio de sesión.");
      }
    };

    handleAuth();
  }, [params]);

  const volverAlLogin = () => {
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../assets/images/logo_beck.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {!error ? (
        <>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.title}>Conectando con Microsoft</Text>
          <Text style={styles.subtitle}>
            Estamos validando tu acceso a la plataforma Beck.
          </Text>
          <Text style={styles.step}>{step}</Text>
        </>
      ) : (
        <>
          <Text style={styles.errorTitle}>No se pudo iniciar sesión</Text>
          <Text style={styles.errorText}>{error}</Text>

          <Button
            mode="contained"
            onPress={volverAlLogin}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            Volver al login
          </Button>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  logo: {
    width: 280,
    height: 150,
    marginBottom: 28,
  },
  title: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
  step: {
    marginTop: 16,
    color: "#f97316",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    marginTop: 10,
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },
  button: {
    marginTop: 22,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  buttonContent: {
    minHeight: 48,
    paddingHorizontal: 10,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
});
