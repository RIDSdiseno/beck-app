import React, { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Tabs, router, useFocusEffect } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { bodegaRequest } from "@/services/api/bodegaBeckApi";
import { BodegaButton } from "@/components/BodegaBeckUI";

export default function BodegaLayout() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      bodegaRequest("/acceso")
        .then(() => {
          if (active) setStatus("ok");
        })
        .catch((e) => {
          if (active) {
            setError(e.message);
            setStatus("error");
          }
        });
      return () => {
        active = false;
      };
    }, []),
  );
  if (status !== "ok")
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#f5f7fb",
          justifyContent: "center",
          padding: 24,
        }}
      >
        {status === "loading" ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text>{error}</Text>
            <BodegaButton
              title="Volver a Firemat"
              onPress={() => router.replace("/(firemat)/perfil")}
            />
          </>
        )}
      </View>
    );
  return (
    <PaperProvider theme={MD3LightTheme}>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: "#fff" },
          tabBarActiveTintColor: "#0f172a",
          tabBarInactiveTintColor: "#64748b",
          sceneStyle: { backgroundColor: "#f5f7fb" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Inicio",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="view-dashboard-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="inventario"
          options={{
            title: "Inventario",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="warehouse"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="asignaciones"
          options={{
            title: "Asignaciones",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="account-hard-hat"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons
                name="account-outline"
                color={color}
                size={size}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="escanear"
          options={{ href: null, tabBarStyle: { display: "none" } }}
        />
      </Tabs>
    </PaperProvider>
  );
}
