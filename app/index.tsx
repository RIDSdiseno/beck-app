import { getSession } from "@/services/auth/session";
import { getInitialRouteForRole } from "@/services/auth/roles";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

export default function AppEntryScreen() {
  const [loading, setLoading] = useState(true);
  const [redirectTo, setRedirectTo] = useState<"/login" | "/(tabs)">("/login");

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await getSession();
        setRedirectTo(
          session.isAuthenticated
            ? (getInitialRouteForRole(session.user?.rol) as "/(tabs)")
            : "/login",
        );
      } catch (error) {
        if (__DEV__) console.warn("APP ENTRY ERROR", error);
        setRedirectTo("/login");
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#f97316" />
        <Text style={styles.text}>Cargando aplicación...</Text>
      </View>
    );
  }

  return <Redirect href={redirectTo} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0b0f",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  text: {
    marginTop: 14,
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
