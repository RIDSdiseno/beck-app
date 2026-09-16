import { clearMisObrasCache } from "@/services/api/obrasApi";
import { puedeAccederBodegaBeck } from "@/services/api/bodegaBeckApi";
import { clearMisRegistrosCache } from "@/services/api/registrosApi";
import { clearSession, getSession, SessionUser } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FirematPerfilScreen() {
  const [user, setUser] = React.useState<SessionUser | null>(null);
  const [loggingOut, setLoggingOut] = React.useState(false);

  React.useEffect(() => {
    getSession().then((session) => setUser(session.user)).catch(() => {
      Alert.alert("No se pudo cargar el perfil", "Vuelve a abrir la aplicación para consultar tu cuenta.");
    });
  }, []);

  const logout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      clearMisObrasCache();
      clearMisRegistrosCache();
      await clearSession();
      router.replace("/login");
    } catch {
      Alert.alert("No se pudo cerrar sesión", "Inténtalo nuevamente.");
    } finally {
      setLoggingOut(false);
    }
  };

  const initials = (user?.nombre || "Usuario Firemat").trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const role = user?.rol ? user.rol.replaceAll("_", " ") : "Sin información";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}><MaterialCommunityIcons name="account-outline" size={28} color="#f87171" /></View>
          <View style={styles.headerText}>
            <Text style={styles.brand}>FIREMAT · MI CUENTA</Text>
            <Text style={styles.title}>Perfil</Text>
            <Text style={styles.subtitle}>Tu información y acceso</Text>
          </View>
        </View>

        <View style={styles.identityCard}>
          <View style={styles.avatar}><Text style={styles.initials}>{initials}</Text></View>
          <View style={styles.identityInfo}>
            <Text style={styles.name}>{user?.nombre || "Usuario Firemat"}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="card-account-details-outline" size={21} color="#f87171" />
            <Text style={styles.sectionTitle}>Datos de la cuenta</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><MaterialCommunityIcons name="email-outline" size={20} color="#a3a3a3" /></View>
            <View style={styles.infoText}><Text style={styles.label}>CORREO ELECTRÓNICO</Text><Text selectable style={styles.value}>{user?.email || "—"}</Text></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><MaterialCommunityIcons name="domain" size={20} color="#a3a3a3" /></View>
            <View style={styles.infoText}><Text style={styles.label}>EMPRESA</Text><Text style={styles.value}>Firemat</Text></View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}><MaterialCommunityIcons name="account-key-outline" size={20} color="#a3a3a3" /></View>
            <View style={styles.infoText}><Text style={styles.label}>ROL ASIGNADO</Text><Text style={[styles.value, styles.roleValue]}>{role}</Text></View>
          </View>
        </View>

        <View style={styles.accountNote}>
          <MaterialCommunityIcons name="information-outline" size={19} color="#f87171" />
          <Text style={styles.noteText}>Para actualizar tus datos o permisos, contacta al administrador del CRM Firemat.</Text>
        </View>
        {puedeAccederBodegaBeck(user) && <Button mode="contained" buttonColor="#ffc400" textColor="#0f172a" icon="warehouse" style={styles.button} contentStyle={styles.buttonContent} onPress={() => router.push("/bodega-beck")}>
          Ir a Bodega BECK
        </Button>}
        <View style={styles.logoutCard}>
          <Button mode="contained" buttonColor="#dc2626" textColor="#ffffff" icon="logout" onPress={logout} loading={loggingOut} disabled={loggingOut} style={styles.button} contentStyle={styles.buttonContent} labelStyle={styles.buttonLabel}>
            Cerrar sesión
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  container: { flexGrow: 1, padding: 18, paddingBottom: 32, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 14 },
  headerIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#351719", borderWidth: 1, borderColor: "#652529", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  brand: { color: "#f87171", fontWeight: "800", fontSize: 10, letterSpacing: 1.5 },
  title: { color: "#ffffff", fontWeight: "800", fontSize: 28, marginTop: 3 },
  subtitle: { color: "#a3a3a3", fontSize: 12, marginTop: 3 },
  identityCard: { backgroundColor: "#201214", borderColor: "#63262c", borderWidth: 1, borderTopWidth: 3, borderTopColor: "#ef4444", borderRadius: 20, padding: 16, gap: 14, flexDirection: "row", alignItems: "center" },
  identityInfo: { flex: 1, minWidth: 0, gap: 6 },
  avatar: { width: 58, height: 58, borderRadius: 19, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" },
  initials: { color: "#ffffff", fontSize: 23, fontWeight: "900" },
  name: { color: "#ffffff", fontSize: 20, fontWeight: "800" },
  card: { backgroundColor: "#151515", borderColor: "#303030", borderWidth: 1, borderRadius: 22, padding: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 9, paddingBottom: 16 },
  sectionTitle: { color: "#fafafa", fontSize: 15, fontWeight: "800", flex: 1 },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 10 },
  infoIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#242424", justifyContent: "center", alignItems: "center" },
  infoText: { flex: 1, gap: 5 },
  label: { color: "#a3a3a3", fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },
  value: { color: "#f5f5f5", fontSize: 14, lineHeight: 21 },
  roleValue: { textTransform: "capitalize" },
  divider: { height: 1, backgroundColor: "#292929", marginLeft: 50 },
  accountNote: { flexDirection: "row", gap: 9, paddingHorizontal: 4, alignItems: "flex-start" },
  noteText: { flex: 1, color: "#a3a3a3", fontSize: 12, lineHeight: 19 },
  logoutCard: { marginTop: "auto", paddingTop: 4 },
  button: { borderRadius: 16 },
  buttonContent: { minHeight: 54 },
  buttonLabel: { fontSize: 16, fontWeight: "800" },
});
