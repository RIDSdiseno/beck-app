import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { bodegaRequest } from "@/services/api/bodegaBeckApi";
import type { ResultadoEscaneoInventario } from "@/services/api/inventarioBeckApi";
import {
  BodegaButton,
  BodegaInput,
  bodegaStyles as s,
} from "@/components/BodegaBeckUI";
export default function EscanearBodega() {
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [enabled, setEnabled] = useState(true),
    [focused, setFocused] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [codigo, setCodigo] = useState("");
  const [items, setItems] = useState<ResultadoEscaneoInventario[]>([]);
  const lock = useRef(false),
    generation = useRef(0);
  useEffect(() => {
    if (!focused) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void getPermission().catch(() =>
          setError("No se pudo verificar el permiso de cámara."),
        );
    });
    return () => subscription.remove();
  }, [focused, getPermission]);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      lock.current = false;
      setEnabled(true);
      setLoading(false);
      setItems([]);
      setError("");
      setCodigo("");
      return () => {
        setFocused(false);
        generation.current += 1;
      };
    }, []),
  );
  const scan = async (value: string) => {
    if (lock.current || !value.trim()) return;
    lock.current = true;
    setEnabled(false);
    setLoading(true);
    setError("");
    setItems([]);
    const ticket = ++generation.current;
    try {
      const result = await bodegaRequest<{
        resultados: ResultadoEscaneoInventario[];
      }>(`/codigo/${encodeURIComponent(value.trim())}`);
      if (ticket === generation.current) {
        setItems(result.resultados);
        setCodigo(value);
        if (!result.resultados.length)
          setError("Código no encontrado en el inventario BECK.");
      }
    } catch (e) {
      if (ticket === generation.current)
        setError(e instanceof Error ? e.message : "No se pudo consultar");
    } finally {
      if (ticket === generation.current) setLoading(false);
    }
  };
  return (
    <SafeAreaView style={s.safe}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Volver a inventario"
          onPress={() => router.replace("/bodega-beck/inventario")}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="arrow-left" size={25} color="#0f172a" />
        </Pressable>
        <View style={styles.grow}>
          <Text style={styles.eyebrow}>BECK · BODEGA CENTRAL</Text>
          <Text style={styles.title}>Escanear código</Text>
        </View>
        <MaterialCommunityIcons name="barcode-scan" size={29} color="#9a7100" />
      </View>
      <ScrollView
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="on-drag"
      >
        <View style={styles.cameraCard}>
          <View style={styles.cameraHeading}>
            <MaterialCommunityIcons
              name={enabled ? "camera-outline" : "pause-circle-outline"}
              size={18}
              color="#ffc400"
            />
            <Text style={styles.cameraTitle}>
              {loading
                ? "Consultando artículo…"
                : enabled
                  ? "Lector de códigos"
                  : "Lectura pausada"}
            </Text>
          </View>
          {permission?.granted && focused ? (
            <View style={styles.camera}>
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "code128",
                    "code39",
                    "ean13",
                    "ean8",
                    "upc_a",
                    "upc_e",
                    "itf14",
                  ],
                }}
                onBarcodeScanned={
                  enabled ? ({ data }) => void scan(data) : undefined
                }
              />
              <View pointerEvents="none" style={styles.cameraOverlay}>
                <View
                  style={[styles.scanFrame, !enabled && styles.pausedFrame]}
                />
                <Text style={styles.cameraHint}>
                  {enabled
                    ? "Centra el código de barras en el recuadro"
                    : "Presiona «Escanear otro código» para continuar"}
                </Text>
              </View>
            </View>
          ) : !permission ? (
            <View style={styles.permission}>
              <ActivityIndicator color="#ffc400" />
              <Text style={styles.permissionText}>Preparando cámara…</Text>
            </View>
          ) : (
            <View style={styles.permission}>
              <MaterialCommunityIcons
                name="camera-lock-outline"
                size={38}
                color="#ffc400"
              />
              <Text style={styles.permissionText}>
                Permite el acceso a la cámara o consulta el código manualmente.
              </Text>
              <BodegaButton
                secondary
                title={
                  permission.canAskAgain
                    ? "Permitir cámara"
                    : "Abrir ajustes de cámara"
                }
                onPress={() => {
                  void (
                    permission.canAskAgain
                      ? requestPermission()
                      : Linking.openSettings()
                  ).catch(() =>
                    setError(
                      "No se pudieron abrir los permisos de cámara. Revisa los ajustes del teléfono.",
                    ),
                  );
                }}
              />
            </View>
          )}
        </View>
        <View style={styles.readOnly}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={18}
            color="#64748b"
          />
          <Text style={styles.readOnlyText}>
            Solo consulta: escanear no modifica el stock ni las asignaciones.
          </Text>
        </View>
        {!enabled && (
          <BodegaButton
            title="Escanear otro código"
            secondary
            disabled={loading}
            onPress={() => {
              lock.current = false;
              setEnabled(true);
              setItems([]);
              setCodigo("");
              setError("");
            }}
          />
        )}
        <View style={styles.manualCard}>
          <View style={styles.sectionHeading}>
            <MaterialCommunityIcons
              name="keyboard-outline"
              size={21}
              color="#9a7100"
            />
            <Text style={styles.sectionTitle}>Consulta manual</Text>
          </View>
          <BodegaInput
            label="SKU o código unitario"
            icon="barcode"
            placeholder="Ej.: 900001 o 900001-1"
            value={codigo}
            onChangeText={setCodigo}
          />
          <BodegaButton
            title="Buscar artículo"
            disabled={loading || !codigo.trim()}
            onPress={() => {
              lock.current = false;
              void scan(codigo);
            }}
          />
        </View>
        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator color="#9a7100" />
            <Text style={styles.readOnlyText}>
              Buscando en el inventario BECK…
            </Text>
          </View>
        )}
        {!!error && (
          <View style={styles.error}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={20}
              color="#b91c1c"
            />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {!!items.length && (
          <Text style={styles.sectionTitle}>Resultado de la consulta</Text>
        )}
        {items.map((item) => (
          <View key={`${item.tipoItem}-${item.itemId}`} style={styles.result}>
            <View style={styles.resultHeading}>
              <View style={styles.resultIcon}>
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={24}
                  color="#0f172a"
                />
              </View>
              <Text style={[s.name, styles.grow]}>{item.nombre}</Text>
            </View>
            <Text selectable style={styles.code}>
              SKU: {item.sku} {item.subSku ? `· Unidad ${item.subSku}` : ""}
            </Text>
            {item.saldoBodega != null && (
              <View style={styles.stock}>
                <MaterialCommunityIcons
                  name="warehouse"
                  size={21}
                  color="#9a7100"
                />
                <Text style={styles.stockText}>
                  Stock en bodega:{" "}
                  <Text style={styles.stockValue}>{item.saldoBodega}</Text>
                </Text>
              </View>
            )}
            {!item.custodios.length && (
              <Text style={styles.readOnlyText}>
                Sin asignación activa para este código.
              </Text>
            )}
            {item.custodios.map((c) => (
              <View key={c.asignacionId} style={styles.custodian}>
                <View style={styles.sectionHeading}>
                  <MaterialCommunityIcons
                    name="account-hard-hat"
                    size={20}
                    color="#9a7100"
                  />
                  <Text style={styles.custodianRole}>
                    {c.custodio.rol === "operario" ? "OPERARIO" : "SUPERVISOR"}{" "}
                    · {c.cantidad} {c.cantidad === 1 ? "unidad" : "unidades"}
                  </Text>
                </View>
                <Text style={s.name}>{c.custodio.nombre}</Text>
                <View style={styles.sectionHeading}>
                  <MaterialCommunityIcons
                    name="office-building-outline"
                    size={17}
                    color="#64748b"
                  />
                  <Text style={[styles.readOnlyText, styles.grow]}>
                    {c.obra.nombre}
                  </Text>
                </View>
                {c.custodio.rol === "operario" && (
                  <Text style={s.text}>Supervisor: {c.supervisor.nombre}</Text>
                )}
                {c.pendienteBodega && (
                  <Text style={styles.pending}>
                    Pendiente de recepción en bodega
                  </Text>
                )}
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
  },
  eyebrow: {
    color: "#8a6500",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  title: { color: "#0f172a", fontSize: 22, fontWeight: "800", marginTop: 3 },
  cameraCard: {
    borderRadius: 22,
    backgroundColor: "#0f172a",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e4b600",
  },
  cameraHeading: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 8,
  },
  cameraTitle: { color: "#fff", fontSize: 13, fontWeight: "700", flex: 1 },
  camera: { height: 230 },
  cameraOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    gap: 18,
  },
  scanFrame: {
    width: "100%",
    height: 105,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "#ffc400",
    backgroundColor: "#ffffff08",
  },
  pausedFrame: { borderColor: "#cbd5e1" },
  cameraHint: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    backgroundColor: "#0f172acc",
    borderRadius: 8,
    padding: 8,
  },
  permission: { padding: 22, alignItems: "center", gap: 12 },
  permissionText: {
    color: "#cbd5e1",
    textAlign: "center",
    fontSize: 13,
    lineHeight: 19,
  },
  readOnly: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 2,
  },
  readOnlyText: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    flexShrink: 1,
  },
  manualCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  loading: { flexDirection: "row", gap: 8, alignItems: "center", padding: 10 },
  error: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#fff1f2",
    borderRadius: 14,
    padding: 12,
  },
  errorText: { flex: 1, fontSize: 12, color: "#b91c1c", lineHeight: 18 },
  result: {
    padding: 14,
    gap: 10,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e6dfc5",
    borderLeftWidth: 4,
    borderLeftColor: "#ffc400",
  },
  resultHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#ffc400",
    alignItems: "center",
    justifyContent: "center",
  },
  code: { fontSize: 12, color: "#64748b", lineHeight: 18 },
  stock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    backgroundColor: "#fffbef",
    padding: 10,
  },
  stockText: { color: "#475569", fontSize: 13, flexShrink: 1 },
  stockValue: { fontWeight: "800", color: "#0f172a" },
  custodian: {
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 6,
  },
  custodianRole: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    flexShrink: 1,
  },
  pending: {
    color: "#9a3412",
    backgroundColor: "#fff1e6",
    borderRadius: 8,
    padding: 7,
    fontSize: 11,
    fontWeight: "700",
  },
  pressed: { opacity: 0.7 },
});
