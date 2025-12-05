import React from "react";
import { View, StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Provider as PaperProvider, MD3LightTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { RegistrosProvider } from "../../context/RegistrosContext";
import { HistorialProvider } from "../../context/HistorialContext";

const theme = {
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

export default function TabLayout() {
  return (
    <PaperProvider theme={theme}>
      <HistorialProvider>
        <RegistrosProvider>
          <View style={styles.container}>
            <StatusBar style="dark" backgroundColor="#f5f7fb" />
            <Tabs
              screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#0f172a",
              }}
            >
              <Tabs.Screen
                name="index"
                options={{
                  title: "Dashboard",
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
                name="registros"
                options={{
                  title: "Registros",
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons
                      name="clipboard-text-outline"
                      color={color}
                      size={size}
                    />
                  ),
                }}
              />
              <Tabs.Screen
                name="cotizaciones"
                options={{
                  title: "Cotizaciones",
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons
                      name="file-document-edit-outline"
                      color={color}
                      size={size}
                    />
                  ),
                }}
              />
              <Tabs.Screen
                name="reportes"
                options={{
                  title: "Reportes",
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons
                      name="chart-bar-stacked"
                      color={color}
                      size={size}
                    />
                  ),
                }}
              />
              <Tabs.Screen
                name="historial"
                options={{
                  title: "Historial",
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons
                      name="history"
                      color={color}
                      size={size}
                    />
                  ),
                }}
              />
            </Tabs>
          </View>
        </RegistrosProvider>
      </HistorialProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
});
