import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { MD3LightTheme, Provider as PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { HistorialProvider } from "@/context/HistorialContext";
import { RegistrosProvider } from "@/context/RegistrosContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

SplashScreen.preventAutoHideAsync().catch(() => {});

const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#f97316",
    secondary: "#0ea5e9",
    background: "#f5f7fb",
    surface: "#ffffff",
    surfaceVariant: "#e2e8f0",
    onSurface: "#0f172a",
    outline: "#cbd5e1",
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  React.useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <PaperProvider theme={paperTheme}>
          <HistorialProvider>
            <RegistrosProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="login" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal" }}
                />
              </Stack>
              <StatusBar style="auto" />
            </RegistrosProvider>
          </HistorialProvider>
        </PaperProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
