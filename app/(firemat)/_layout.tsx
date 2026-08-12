import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, MD3LightTheme, Provider as PaperProvider, Text } from "react-native-paper";
import { getSession } from "@/services/auth/session";

const firematTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#dc2626",
    secondary: "#111827",
    background: "#0a0a0a",
    surface: "#171717",
    surfaceVariant: "#262626",
    onSurface: "#f8fafc",
    onSurfaceVariant: "#d4d4d4",
    outline: "#525252",
  },
};

export default function FirematLayout() {
  const [loading, setLoading] = React.useState(true);
  const [authorized, setAuthorized] = React.useState(false);

  React.useEffect(() => {
    getSession()
      .then((session) => setAuthorized(Boolean(session.isAuthenticated && session.user?.empresa === "firemat")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PaperProvider theme={firematTheme}>
        <View style={styles.loader}>
          <ActivityIndicator color="#ef4444" size="large" />
          <Text style={styles.loaderText}>Cargando Firemat...</Text>
        </View>
      </PaperProvider>
    );
  }

  if (!authorized) return <Redirect href="/login" />;

  return (
    <PaperProvider theme={firematTheme}>
      <Tabs
        initialRouteName="productos"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#ef4444",
          tabBarInactiveTintColor: "#a3a3a3",
          tabBarStyle: { backgroundColor: "#111111", borderTopColor: "#292929" },
          sceneStyle: { backgroundColor: "#0a0a0a" },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="productos"
          options={{
            title: "Productos",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant-closed" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventario"
          options={{
            title: "Inventario",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="warehouse" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-circle-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  loaderText: { color: "#ffffff", marginTop: 12 },
});
