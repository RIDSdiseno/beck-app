import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { Text, IconButton, Button } from "react-native-paper";

type Props = {
  title?: string;
  subtitle?: string;
  onLogout?: () => void;
};

export const BrandHeader: React.FC<Props> = ({
  title = "BECK Soluciones",
  subtitle,
  onLogout,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.logoWrapper}>
          <Image
            source={require("../assets/images/logo_beck.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View>
          <Text variant="titleMedium" style={styles.title}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {onLogout ? (
        <View style={styles.logoutWrapper}>
          <Button
            mode="text"
            icon="logout"
            compact
            labelStyle={styles.logoutLabel}
            onPress={onLogout}
            accessibilityLabel="Cerrar sesión"
          >
            Salir
          </Button>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoWrapper: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#facc15",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  title: {
    color: "#0f172a",
    fontWeight: "700",
  },
  subtitle: {
    color: "#475569",
  },
  logoutButton: {
    margin: 0,
  },
  logoutWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoutLabel: {
    fontWeight: "700",
    color: "#0f172a",
  },
});
