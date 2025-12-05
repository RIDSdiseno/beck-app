import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, Text, TextInput, Button, Checkbox } from "react-native-paper";
import { router } from "expo-router";
import { BrandHeader } from "../components/BrandHeader";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [recordar, setRecordar] = useState(true);
  const [error, setError] = useState("");

  const onLogin = () => {
    if (!correo.trim() || !password.trim()) {
      setError("Ingresa usuario y contraseña");
      return;
    }
    setError("");
    router.replace("/(tabs)");
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 12 }]}
      edges={["top", "left", "right"]}
    >
      <Card style={styles.card} elevation={2}>
        <Card.Content>
          <BrandHeader subtitle="Acceso · CRM BECK" />
          <Text variant="headlineMedium" style={styles.title}>
            Iniciar sesión
          </Text>
          <Text style={styles.subtitle}>Usa tus credenciales para continuar.</Text>

          <TextInput
            label="Correo o usuario"
            value={correo}
            onChangeText={setCorreo}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
          />
          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />

          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Checkbox
                status={recordar ? "checked" : "unchecked"}
                onPress={() => setRecordar(!recordar)}
              />
              <Text style={styles.helper}>Recordar sesión</Text>
            </View>
            <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button mode="contained" onPress={onLogin} style={styles.button} icon="login">
            Entrar
          </Button>
        </Card.Content>
      </Card>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
    paddingHorizontal: 16,
  },
  card: {
    marginTop: 12,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderWidth: 1,
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 12,
  },
  input: {
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  helper: {
    color: "#475569",
  },
  link: {
    color: "#0ea5e9",
    fontWeight: "600",
  },
  error: {
    color: "#dc2626",
    marginBottom: 8,
  },
  button: {
    marginTop: 4,
    backgroundColor: "#f97316",
  },
});
