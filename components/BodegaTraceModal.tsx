import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function BodegaTraceModal({
  open,
  onClose,
  children,
}: React.PropsWithChildren<{ open: boolean; onClose: () => void }>) {
  // Se toman los márgenes desde la pantalla de origen, fuera de la ventana nativa.
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const top = Math.max(insets.top, 16) + 12;
  const bottom = Math.max(insets.bottom, 16) + 12;
  const maxHeight = Math.min(620, Math.max(0, height - top - bottom));

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: top,
            paddingBottom: bottom,
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Cerrar trazabilidad"
        />
        <View accessibilityViewIsModal style={[styles.sheet, { maxHeight }]}>
          <View style={styles.header}>
            <View style={styles.headingIcon}>
              <MaterialCommunityIcons
                name="timeline-clock-outline"
                size={22}
                color="#0f172a"
              />
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              Trazabilidad
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar trazabilidad"
              onPress={onClose}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <MaterialCommunityIcons name="close" size={24} color="#0f172a" />
            </Pressable>
          </View>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.closeText}>Cerrar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  sheet: {
    width: "100%",
    maxWidth: 560,
    flexShrink: 1,
    borderRadius: 24,
    backgroundColor: "#f5f7fb",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    flexShrink: 0,
  },
  headingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#ffc400",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 19, fontWeight: "800", color: "#0f172a" },
  close: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { padding: 14, gap: 10 },
  footer: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexShrink: 0,
  },
  closeButton: {
    minHeight: 44,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
