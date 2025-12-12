import React from "react";
import { StyleSheet } from "react-native";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BeckSplash } from "@/components/BeckSplash";
import { useColorScheme } from "@/hooks/use-color-scheme";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [splashDone, setSplashDone] = React.useState(false);
  const progress = useSharedValue(0);

  React.useEffect(() => {
    const start = async () => {
      // Hide native splash and run overlay exit animation
      await SplashScreen.hideAsync();
      progress.value = withTiming(
        1,
        { duration: 800 },
        () => runOnJS(setSplashDone)(true)
      );
    };
    start();
  }, [progress]);

  const splashStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ scale: 1 + 0.06 * progress.value }],
  }));

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="login">
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>

      {!splashDone && (
        <Animated.View style={[StyleSheet.absoluteFillObject, splashStyle]}>
          <BeckSplash />
        </Animated.View>
      )}
    </SafeAreaProvider>
  );
}
