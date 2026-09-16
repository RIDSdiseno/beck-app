import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { reconcileBodegaItems } from "@/utils/reconcileBodegaItems";
import {
  bodegaRequest,
  notificarCambioBodega,
  nuevaOperacionBodega,
  revisionBodega,
  type PaginaBodega,
} from "@/services/api/bodegaBeckApi";

export const coloresBodega = {
  navy: "#0f172a",
  yellow: "#ffc400",
  orange: "#f97316",
  bg: "#f5f7fb",
  muted: "#64748b",
};
export function BodegaHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={bodegaStyles.header}>
      <Text style={bodegaStyles.brand}>BECK · BODEGA CENTRAL</Text>
      <Text style={[bodegaStyles.title, { color: "#fff" }]}>{title}</Text>
      {subtitle && <Text style={bodegaStyles.subtitle}>{subtitle}</Text>}
    </View>
  );
}
export function BodegaButton({
  title,
  onPress,
  disabled,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        bodegaStyles.button,
        secondary && bodegaStyles.secondary,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={{
          color: secondary ? coloresBodega.navy : "#fff",
          fontWeight: "800",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function BodegaInput({
  label,
  value,
  onChangeText,
  numeric = false,
  placeholder,
  icon,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  numeric?: boolean;
  placeholder?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <Text style={bodegaStyles.label}>{label}</Text>
      <View
        style={[bodegaStyles.fieldFrame, focused && bodegaStyles.fieldFocused]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={focused ? "#9a7100" : "#64748b"}
          />
        )}
        <TextInput
          accessibilityLabel={label}
          style={bodegaStyles.input}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          value={value}
          onChangeText={onChangeText}
          keyboardType={numeric ? "numbers-and-punctuation" : "default"}
          placeholderTextColor="#64748b"
        />
      </View>
    </View>
  );
}
export function BodegaModal({
  title,
  open,
  onClose,
  children,
  busy,
  footer,
}: React.PropsWithChildren<{
  title: string;
  open: boolean;
  onClose: () => void;
  busy?: boolean;
  footer?: React.ReactNode;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={open}
      animationType="slide"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => !busy && onClose()}
    >
      <View
        style={[
          bodegaStyles.safe,
          {
            paddingTop: Math.max(insets.top, 12),
            paddingBottom: Math.max(insets.bottom, 12),
            paddingLeft: insets.left,
            paddingRight: insets.right,
          },
        ]}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={bodegaStyles.modalHeader}>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={bodegaStyles.modalBrand}>BECK · BODEGA CENTRAL</Text>
              <Text style={bodegaStyles.title}>{title}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={12}
              disabled={busy}
              onPress={onClose}
              style={bodegaStyles.modalClose}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={coloresBodega.navy}
              />
            </Pressable>
          </View>
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={bodegaStyles.content}
          >
            {children}
          </ScrollView>
          {footer && <View style={bodegaStyles.modalFooter}>{footer}</View>}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
export function useBodegaMutation() {
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const last = useRef({ signature: "", requestId: "" });
  const mutate = useCallback(
    async (path: string, data: Record<string, unknown>, method = "POST") => {
      if (lock.current) return false;
      lock.current = true;
      setSaving(true);
      const signature = JSON.stringify([path, method, data]);
      if (last.current.signature !== signature)
        last.current = { signature, requestId: nuevaOperacionBodega() };
      try {
        await bodegaRequest(
          path,
          { ...data, requestId: last.current.requestId },
          method,
        );
        last.current = { signature: "", requestId: "" };
        notificarCambioBodega();
        return true;
      } catch (error) {
        Alert.alert(
          "No se pudo guardar",
          error instanceof Error ? error.message : "Intenta nuevamente.",
        );
        return false;
      } finally {
        lock.current = false;
        setSaving(false);
      }
    },
    [],
  );
  return { mutate, saving };
}
export function useBodegaList<T extends { id: string }>(path: string) {
  const [items, setItems] = useState<T[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const loadedPath = useRef<string | null>(null);
  const page = useRef(0),
    generation = useRef(0),
    busy = useRef(false),
    revision = useRef(-1);
  const load = useCallback(
    async (reset = true) => {
      if (!reset && busy.current) return;
      const ticket = ++generation.current;
      busy.current = true;
      setLoading(true);
      setRefreshing(reset);
      setError("");
      const requestRevision = revisionBodega();
      // Conservar las tarjetas durante un refresh, pero nunca mezclar filtros.
      if (loadedPath.current !== path) {
        loadedPath.current = path;
        page.current = 0;
        setItems([]);
        setHasMore(false);
      }
      const next = reset ? 1 : page.current + 1;
      try {
        const result = await bodegaRequest<PaginaBodega<T>>(
          `${path}${path.includes("?") ? "&" : "?"}page=${next}`,
        );
        if (ticket !== generation.current) return;
        setItems((prev) => reconcileBodegaItems(prev, result.items, !reset));
        page.current = next;
        setHasMore(result.hasMore);
        revision.current = requestRevision;
      } catch (e) {
        if (ticket === generation.current)
          setError(e instanceof Error ? e.message : "No se pudo cargar.");
      } finally {
        if (ticket === generation.current) {
          busy.current = false;
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path],
  );
  // Sincroniza la lista y su indicador de carga con la consulta al servidor al cambiar filtros.
  useEffect(() => {
    void load();
    return () => {
      generation.current += 1;
      busy.current = false;
    };
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      if (
        !busy.current &&
        revision.current !== -1 &&
        revision.current !== revisionBodega()
      )
        void load();
    }, [load]),
  );
  const refresh = useCallback(() => load(), [load]);
  const more = useCallback(() => {
    if (hasMore) void load(false);
  }, [hasMore, load]);
  return {
    items,
    loading,
    refreshing,
    error,
    refresh,
    more,
    hasMore,
  };
}
export function BodegaListFooter({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
}) {
  return (
    <View style={{ padding: 16 }}>
      {loading && <ActivityIndicator color={coloresBodega.orange} />}
      {!!error && (
        <>
          <Text style={{ color: "#b91c1c" }}>{error}</Text>
          <BodegaButton title="Reintentar" onPress={retry} />
        </>
      )}
    </View>
  );
}
export const bodegaStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: coloresBodega.bg },
  content: { padding: 18, gap: 14, paddingBottom: 32 },
  header: {
    backgroundColor: coloresBodega.navy,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: coloresBodega.yellow,
    padding: 20,
    gap: 6,
    margin: 16,
  },
  brand: {
    fontSize: 11,
    color: coloresBodega.yellow,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: { fontSize: 23, fontWeight: "800", color: coloresBodega.navy },
  subtitle: { color: "#cbd5e1", fontSize: 13 },
  card: {
    backgroundColor: "#fffdf5",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#f2d270",
    borderLeftWidth: 5,
    padding: 16,
    gap: 8,
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "800", color: coloresBodega.navy },
  text: { color: coloresBodega.muted, fontSize: 13, lineHeight: 20 },
  button: {
    backgroundColor: coloresBodega.navy,
    padding: 15,
    borderRadius: 24,
    marginTop: 5,
  },
  secondary: { backgroundColor: coloresBodega.yellow },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    color: coloresBodega.navy,
    fontSize: 16,
  },
  fieldFrame: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe2ea",
    borderRadius: 18,
    paddingHorizontal: 14,
  },
  fieldFocused: { borderColor: "#dca900", backgroundColor: "#fffdf5" },
  label: { color: coloresBodega.navy, fontWeight: "700", fontSize: 13 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 64,
  },
  modalBrand: {
    color: "#8a6500",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  modalClose: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
