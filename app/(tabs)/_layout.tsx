import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  MD3LightTheme,
  Provider as PaperProvider,
  Text,
} from "react-native-paper";
import { HistorialProvider } from "../../context/HistorialContext";
import { RegistrosProvider } from "../../context/RegistrosContext";
import { getSession } from "../../services/auth/session";

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
  const [loading, setLoading] = React.useState(true);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  React.useEffect(() => {
    const checkSession = async () => {
      try {
        const session = await getSession();
        setIsAuthenticated(session.isAuthenticated);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) {
    return (
      <PaperProvider theme={theme}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loaderText}>Cargando sesión...</Text>
        </View>
      </PaperProvider>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

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
                name="mis-obras"
                options={{
                  title: "Mis Obras",
                  tabBarIcon: ({ color, size }) => (
                    <MaterialCommunityIcons
                      name="office-building"
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
  loaderContainer: {
    flex: 1,
    backgroundColor: "#0b0b0f",
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 12,
    color: "#ffffff",
    fontWeight: "600",
  },
});
