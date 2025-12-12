import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { BeckLogo } from "../assets/BeckLogo";

export const BeckSplash: React.FC = () => {
  return (
    <View style={styles.container}>
      <BeckLogo width={220} height={180} />
      <Text style={styles.tagline}>CRM COMERCIAL · PROTECCIÓN PASIVA</Text>
      <ActivityIndicator style={styles.spinner} color="#E0E0E0" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: {
    marginTop: 16,
    color: "#E0E0E0",
    fontSize: 16,
    letterSpacing: 2,
  },
  spinner: {
    marginTop: 24,
  },
});
