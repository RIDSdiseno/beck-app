import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useState } from "react";
import { Image, ImageBackground, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

WebBrowser.maybeCompleteAuthSession();

const tenantId = "9b1d2116-2dff-4efa-89a3-465b62215224";
const clientId = "7bcbc920-c3d3-4d9f-811f-7cf3013361be";

const discovery = {
  authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
  tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
};

const API_BASE_URL = "http://192.168.10.178:3001";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectUri = useMemo(
    () =>
      AuthSession.makeRedirectUri({
        scheme: "beckcrmapp",
        path: "auth",
      }),
    [],
  );

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: ["openid", "profile", "email", "offline_access"],
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: {
        prompt: "select_account",
      },
    },
    discovery,
  );

  useEffect(() => {
    const handleResponse = async () => {
      if (!response) return;

      if (response.type === "error") {
        console.log("MICROSOFT RESPONSE ERROR", response);
        setError("Microsoft devolvió un error de autenticación.");
        return;
      }

      if (response.type !== "success") return;

      try {
        setIsLoading(true);
        setError("");

        const code = response.params.code;

        if (!code) {
          throw new Error("Microsoft no devolvió un code válido.");
        }

        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId,
            code,
            redirectUri,
            extraParams: {
              code_verifier: request?.codeVerifier || "",
            },
          },
          discovery,
        );

        const idToken = tokenResult.idToken;

        if (!idToken) {
          throw new Error("No se recibió id_token desde Microsoft.");
        }

        const apiResponse = await fetch(
          `${API_BASE_URL}/api/mobile/auth/microsoft`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idToken,
            }),
          },
        );

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
          throw new Error(data?.message || "No se pudo iniciar sesión.");
        }

        await AsyncStorage.multiSet([
          ["beck_token", data.token],
          ["beck_user", JSON.stringify(data.user)],
        ]);

        router.replace("/(tabs)");
      } catch (err: any) {
        console.log("LOGIN MICROSOFT ERROR", err);
        setError(err?.message || "No se pudo iniciar sesión.");
      } finally {
        setIsLoading(false);
      }
    };

    handleResponse();
  }, [response, request, redirectUri]);

  const onMicrosoftLogin = async () => {
    try {
      setError("");
      await promptAsync();
    } catch (err) {
      console.log("PROMPT MICROSOFT ERROR", err);
      setError("No se pudo abrir el login de Microsoft.");
    }
  };

  return (
    <ImageBackground
      source={require("../assets/images/login-fire-bg.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      <SafeAreaView
        style={[styles.safeArea, { paddingTop: insets.top + 12 }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/images/logo_beck.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Card style={styles.card} elevation={3}>
            <Card.Content>
              <Text style={styles.eyebrow}>CRM BECK</Text>

              <Text variant="headlineMedium" style={styles.title}>
                Iniciar sesión
              </Text>

              <Text style={styles.subtitle}>
                Accede con tu cuenta corporativa Microsoft
              </Text>

              <Button
                mode="contained"
                icon="microsoft-windows"
                onPress={onMicrosoftLogin}
                loading={isLoading}
                disabled={!request || isLoading}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {isLoading ? "Conectando..." : "Continuar con Microsoft"}
              </Button>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </Card.Content>
          </Card>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.48)",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 20,
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 60,
    marginTop: -60,
  },
  logo: {
    width: 400,
    height: 220,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.93)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingVertical: 6,
  },
  eyebrow: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: "#f97316",
    marginBottom: 8,
  },
  title: {
    textAlign: "center",
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  buttonContent: {
    minHeight: 52,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 14,
    textAlign: "center",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: "600",
  },
});
