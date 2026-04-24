import {
  getMicrosoftAuthRequestConfig,
  getMicrosoftRedirectUri,
  microsoftDiscovery,
} from "@/services/auth/microsoft";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import React, { useMemo, useState } from "react";
import { Image, ImageBackground, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const redirectUri = useMemo(() => getMicrosoftRedirectUri(), []);

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    getMicrosoftAuthRequestConfig(redirectUri),
    microsoftDiscovery,
  );

  const onMicrosoftLogin = async () => {
    try {
      setError("");
      setIsLoading(true);

      const codeVerifier =
        (request as any)?.codeVerifier || (request as any)?.code_verifier || "";

      if (!codeVerifier) {
        throw new Error("No se pudo obtener el code_verifier.");
      }

      await AsyncStorage.multiSet([
        ["beck_code_verifier", codeVerifier],
        ["beck_redirect_uri", redirectUri],
      ]);

      const result = await promptAsync();

      if (result.type !== "success") {
        setIsLoading(false);
      }
    } catch (err: any) {
      console.log("PROMPT MICROSOFT ERROR", err);
      setError(err?.message || "No se pudo abrir el login de Microsoft.");
      setIsLoading(false);
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
  background: { flex: 1 },
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
