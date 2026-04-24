import { getSession } from "@/services/auth/session";
import { Redirect } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";

export default function AppEntryScreen() {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const session = await getSession();
        setIsAuthenticated(session.isAuthenticated);
      } catch (error) {
        console.log("APP ENTRY ERROR", error);
        setIsAuthenticated(false);
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

  if (isAuthenticated) {
    return <Redirect href="/mis-obras" />;
  }

  return <Redirect href="/login" />;
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
