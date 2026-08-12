import { clearMisObrasCache } from "@/services/api/obrasApi";
import { clearMisRegistrosCache } from "@/services/api/registrosApi";
import { clearSession, getSession, SessionUser } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FirematPerfilScreen() {
  const [user, setUser] = React.useState<SessionUser | null>(null);

  React.useEffect(() => {
    getSession().then((session) => setUser(session.user));
  }, []);

  const logout = async () => {
    clearMisObrasCache();
    clearMisRegistrosCache();
    await clearSession();
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Image source={require("../../assets/images/Firemat_logo.png")} style={styles.logo} resizeMode="contain" />
        <Card style={styles.card}>
          <Card.Content>
            <MaterialCommunityIcons name="account-circle" size={54} color="#ef4444" style={styles.icon} />
            <Text variant="titleLarge" style={styles.name}>{user?.nombre || "Usuario Firemat"}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <Text style={styles.role}>{user?.rol?.replaceAll("_", " ").toUpperCase()}</Text>
            <Button mode="contained" buttonColor="#dc2626" icon="logout" onPress={logout} style={styles.button}>
              Cerrar sesión
            </Button>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  container: { flex: 1, padding: 20, justifyContent: "center" },
  logo: { width: "100%", height: 180, marginBottom: 22 },
  card: { backgroundColor: "#171717", borderColor: "#3f3f46", borderWidth: 1 },
  icon: { alignSelf: "center" },
  name: { color: "#ffffff", textAlign: "center", fontWeight: "700", marginTop: 8 },
  email: { color: "#d4d4d4", textAlign: "center", marginTop: 6 },
  role: { color: "#ef4444", textAlign: "center", fontWeight: "700", marginTop: 8 },
  button: { marginTop: 28 },
});
