import { clearMisObrasCache } from "@/services/api/obrasApi";
import { clearMisRegistrosCache } from "@/services/api/registrosApi";
import { clearSession, getSession } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Text } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

type ProfileUser = {
  id: string;
  nombre: string;
  email: string;
  rol: string;
};

function getRoleLabel(role?: string) {
  switch (role) {
    case "administrador":
      return "Administrador";
    case "terreno":
      return "Terreno";
    case "jefeobra":
      return "Jefe de obra";
    case "ingenieria":
      return "Ingenieria";
    case "visualizador":
      return "Visualizador";
    case "vendedor":
      return "Vendedor";
    default:
      return "Usuario";
  }
}

function getInitials(name?: string) {
  const parts = String(name || "Usuario Beck")
    .trim()
    .split(/\s+/)
    .slice(0, 2);

  return parts.map((part) => part[0]?.toUpperCase()).join("") || "B";
}

type ProfileActionProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
};

function ProfileAction({ icon, label, onPress }: ProfileActionProps) {
  return (
    <Pressable style={styles.actionCard} onPress={onPress}>
      <View style={styles.actionIcon}>
        <MaterialCommunityIcons name={icon} size={28} color="#f97316" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={32} color="#64748b" />
    </Pressable>
  );
}

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<ProfileUser | null>(null);

  useFocusEffect(
    useCallback(() => {
      const loadUser = async () => {
        const session = await getSession();
        setUser(session.user);
      };

      loadUser();
    }, []),
  );

  const handleLogout = async () => {
    try {
      clearMisObrasCache();
      clearMisRegistrosCache();
      await clearSession();
      router.replace("/login");
    } catch (error) {
      console.log("LOGOUT ERROR", error);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <BrandHeader subtitle="Perfil · BECK" />
        <Text variant="titleLarge" style={styles.title}>
          Perfil
        </Text>
        <Text style={styles.subtitle}>Sesion activa del tecnico.</Text>

        <View style={styles.profileCard}>
          <Avatar.Text
            size={82}
            label={getInitials(user?.nombre)}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />

          <Text style={styles.name}>{user?.nombre || "Usuario Beck"}</Text>
          <Text style={styles.email}>{user?.email || "Sin correo"}</Text>

          <View style={styles.rolePill}>
            <MaterialCommunityIcons
              name="badge-account-outline"
              size={16}
              color="#ffffff"
            />
            <Text style={styles.roleText}>{getRoleLabel(user?.rol)}</Text>
          </View>

          <View style={styles.divider} />

          <Button
            mode="contained"
            onPress={handleLogout}
            buttonColor="#dc2626"
            textColor="#ffffff"
            style={styles.logoutButton}
            contentStyle={styles.logoutButtonContent}
            labelStyle={styles.logoutLabel}
          >
            Cerrar sesion
          </Button>
        </View>

        <View style={styles.actions}>
          <ProfileAction
            icon="clipboard-text-clock-outline"
            label="Historial de Registro"
            onPress={() => router.push("/historial")}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 88,
    paddingTop: 0,
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#0f172a",
    fontWeight: "500",
    marginBottom: 14,
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingBottom: 22,
    paddingTop: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  avatar: {
    backgroundColor: "#fff7ed",
  },
  avatarLabel: {
    color: "#f97316",
    fontSize: 24,
    fontWeight: "900",
  },
  name: {
    color: "#0f172a",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 16,
    textAlign: "center",
  },
  email: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 5,
    textAlign: "center",
  },
  rolePill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#0f172a",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  roleText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
  },
  divider: {
    alignSelf: "stretch",
    backgroundColor: "#e2e8f0",
    height: 1,
    marginBottom: 18,
    marginTop: 22,
  },
  logoutButton: {
    borderRadius: 14,
    minWidth: 144,
  },
  logoutButtonContent: {
    minHeight: 46,
    paddingHorizontal: 8,
  },
  logoutLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },
  actions: {
    gap: 10,
  },
  actionCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#eef2f7",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    paddingHorizontal: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  actionIcon: {
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  actionLabel: {
    color: "#0f172a",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
  },
});
