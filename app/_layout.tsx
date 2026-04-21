import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet } from "react-native";
import { MD3LightTheme, Provider as PaperProvider } from "react-native-paper";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BeckSplash } from "@/components/BeckSplash";
import { HistorialProvider } from "@/context/HistorialContext";
import { RegistrosProvider } from "@/context/RegistrosContext";
import { useColorScheme } from "@/hooks/use-color-scheme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

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
  const [splashDone, setSplashDone] = React.useState(false);
  const splashOpacity = useSharedValue(1);

  React.useEffect(() => {
    const start = async () => {
      await SplashScreen.hideAsync();

      setTimeout(() => {
        splashOpacity.value = withTiming(0, { duration: 450 }, () => {
          runOnJS(setSplashDone)(true);
        });
      }, 3000);
    };

    start();
  }, [splashOpacity]);

  const splashStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <PaperProvider theme={paperTheme}>
          <HistorialProvider>
            <RegistrosProvider>
              <Stack
                initialRouteName="login"
                screenOptions={{ headerShown: false }}
              >
                <Stack.Screen name="login" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: "modal", title: "Modal" }}
                />
              </Stack>
              <StatusBar style="auto" />
            </RegistrosProvider>
          </HistorialProvider>
        </PaperProvider>
      </ThemeProvider>

      {!splashDone && (
        <Animated.View style={[StyleSheet.absoluteFillObject, splashStyle]}>
          <BeckSplash />
        </Animated.View>
      )}
    </SafeAreaProvider>
  );
}
