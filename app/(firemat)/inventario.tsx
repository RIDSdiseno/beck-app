import {
  FirematInventarioResumen,
  FirematProducto,
  getFirematInventario,
  updateFirematInventario,
} from "@/services/api/firematApi";
import { getSession } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Searchbar, Switch, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "@/components/AppTextInput";
import { ExpandableImage } from "@/components/ExpandableImage";
import { getFirematInventoryRevision, subscribeFirematInventoryChanges } from "@/services/api/firematInventoryChanges";
import { reconcileFirematProducts } from "@/utils/reconcileFirematProducts";

const InventoryProductCard = React.memo(function InventoryProductCard({
  item, isBodeguero, onAdjust,
}: {
  item: FirematProducto;
  isBodeguero: boolean;
  onAdjust: (producto: FirematProducto) => void;
}) {
    const stateColor = item.estadoStock === "SIN_STOCK" ? "#ef4444" : item.estadoStock === "BAJO_STOCK" ? "#f59e0b" : "#22c55e";
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.75} disabled={!isBodeguero} accessibilityRole={isBodeguero ? "button" : undefined} accessibilityLabel={isBodeguero ? `Ajustar inventario de ${item.nombre}` : undefined} onPress={() => onAdjust(item)}>
            <View style={styles.rowBetween}>
              <View style={styles.productIcon}><MaterialCommunityIcons name="package-variant" size={24} color="#f87171" /></View>
              <View style={styles.flex}>
                <Text style={styles.name} numberOfLines={2}>{item.nombre}</Text>
                <Text style={styles.sku}>SKU {item.sku || "sin asignar"} · {item.categoria}</Text>
              </View>
            </View>
            <View style={styles.stockRow}>
              <View style={styles.metric}><Text style={styles.metricLabel}>Actual</Text><Text style={styles.metricValue}>{item.stockActual}</Text></View>
              <View style={styles.metric}><Text style={styles.metricLabel}>Reservado</Text><Text style={styles.metricValue}>{item.stockReservado}</Text></View>
              <View style={styles.metric}><Text style={styles.metricLabel}>Disponible</Text><Text style={[styles.metricValue, { color: stateColor }]}>{item.stockDisponible}</Text></View>
              <View style={styles.metric}><Text style={styles.metricLabel}>Mínimo</Text><Text style={styles.metricValue}>{item.stockMinimo}</Text></View>
            </View>
            {item.ubicacion ? <View style={styles.locationRow}><MaterialCommunityIcons name="map-marker-outline" size={15} color="#a3a3a3" /><Text style={styles.location}>{item.ubicacion}</Text></View> : null}
            <View style={styles.cardFooter}>
              <View style={[styles.badge, { borderColor: stateColor }]}>
                <Text style={[styles.badgeText, { color: stateColor }]}>{item.estadoStock.replaceAll("_", " ")}</Text>
              </View>
              {isBodeguero ? <View style={styles.adjustAction}><Text style={styles.adjustText}>Ajustar inventario</Text><MaterialCommunityIcons name="chevron-right" size={18} color="#f87171" /></View> : null}
            </View>
      </TouchableOpacity>
    );
});

const productKey = (item: FirematProducto) => String(item.id);

export default function FirematInventarioScreen() {
  const router = useRouter();
  const [productos, setProductos] = React.useState<FirematProducto[]>([]);
  const [resumen, setResumen] = React.useState<FirematInventarioResumen | null>(null);
  const [query, setQuery] = React.useState("");
  const [bajoStock, setBajoStock] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isBodeguero, setIsBodeguero] = React.useState(false);
  const [selected, setSelected] = React.useState<FirematProducto | null>(null);
  const [stockNuevo, setStockNuevo] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [ubicacion, setUbicacion] = React.useState("");
  const loadedRef = React.useRef<{ key: string; revision: number } | null>(null);
  const requestIdRef = React.useRef(0);
  const filterKey = JSON.stringify([query.trim(), bajoStock]);

  const load = React.useCallback(async (refresh = false) => {
    const requestId = ++requestIdRef.current;
    const revision = getFirematInventoryRevision();
    try {
      if (refresh) setRefreshing(true);
      else { setLoading(true); setRefreshing(false); }
      setError("");
      const [data, session] = await Promise.all([
        getFirematInventario(query, bajoStock),
        getSession(),
      ]);
      if (requestId !== requestIdRef.current) return;
      setProductos((current) => reconcileFirematProducts(current, data.productos));
      setResumen(data.resumen);
      setIsBodeguero(session.user?.rol === "bodeguero");
      loadedRef.current = { key: filterKey, revision };
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : "No se pudo cargar el inventario");
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [bajoStock, query, filterKey]);

  useFocusEffect(
    React.useCallback(() => {
      const cached = loadedRef.current;
      const needsLoad = !cached || cached.key !== filterKey || cached.revision !== getFirematInventoryRevision();
      const timer = needsLoad
        ? setTimeout(() => void load(Boolean(cached && cached.key === filterKey)), 300)
        : undefined;
      if (!needsLoad) { setLoading(false); setRefreshing(false); }
      const unsubscribe = subscribeFirematInventoryChanges(() => {
        clearTimeout(timer);
        void load(true);
      });
      return () => {
        clearTimeout(timer);
        unsubscribe();
        // Una respuesta anterior no debe sobrescribir otra búsqueda o sesión de pantalla.
        requestIdRef.current += 1;
      };
    }, [filterKey, load]),
  );

  const onRefresh = React.useCallback(() => { void load(true); }, [load]);

  const openAdjust = React.useCallback((producto: FirematProducto) => {
    if (!isBodeguero) return;
    setSelected(producto);
    setStockNuevo(String(producto.stockActual));
    setUbicacion(producto.ubicacion || "");
    setMotivo("");
  }, [isBodeguero]);

  const saveAdjust = async () => {
    if (!selected || !Number.isInteger(Number(stockNuevo)) || Number(stockNuevo) < 0) {
      Alert.alert("Stock inválido", "Ingresa un número entero mayor o igual a cero.");
      return;
    }
    if (!motivo.trim()) {
      Alert.alert("Falta el motivo", "Describe por qué se realiza el ajuste.");
      return;
    }
    try {
      setSaving(true);
      await updateFirematInventario(selected.id, {
        stockNuevo: Number(stockNuevo),
        motivo: motivo.trim(),
        ubicacion: ubicacion.trim() || null,
      });
      setSelected(null);
      // La API notifica el cambio y la suscripción actualiza la lista una sola vez.
    } catch (err) {
      Alert.alert("No se pudo ajustar", err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = React.useCallback(({ item }: { item: FirematProducto }) => (
    <InventoryProductCard item={item} isBodeguero={isBodeguero} onAdjust={openAdjust} />
  ), [isBodeguero, openAdjust]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.headerIcon}><MaterialCommunityIcons name="warehouse" size={28} color="#f87171" /></View>
        <View style={styles.flex}>
          <Text style={styles.brand}>FIREMAT · EXISTENCIAS</Text>
          <Text style={styles.title}>Inventario</Text>
          <Text style={styles.subtitle}>Control de stock y recepción</Text>
        </View>
      </View>
      {resumen ? (
        <View style={styles.summary}>
          <View style={styles.summaryItem}><MaterialCommunityIcons name="package-variant-closed" size={19} color="#4ade80" /><Text style={styles.summaryValue}>{resumen.stockDisponibleTotal}</Text><Text style={styles.summaryLabel}>Unid. disponibles</Text></View>
          <View style={[styles.summaryItem, styles.summaryWarning]}><MaterialCommunityIcons name="alert-outline" size={19} color="#fbbf24" /><Text style={[styles.summaryValue, styles.warning]}>{resumen.productosBajoStock}</Text><Text style={styles.summaryLabel}>Stock bajo</Text></View>
          <View style={[styles.summaryItem, styles.summaryDanger]}><MaterialCommunityIcons name="package-variant-remove" size={19} color="#f87171" /><Text style={[styles.summaryValue, styles.danger]}>{resumen.productosSinStock}</Text><Text style={styles.summaryLabel}>Sin stock</Text></View>
        </View>
      ) : null}
      <Searchbar placeholder="Buscar producto o SKU" value={query} onChangeText={setQuery} style={styles.search} inputStyle={styles.searchInput} iconColor="#ef4444" placeholderTextColor="#a3a3a3" />
      <View style={styles.filterRow}>
        <View style={styles.filterCaption}><MaterialCommunityIcons name="filter-variant" size={19} color="#f87171" /><Text style={styles.filterLabel}>Sólo alertas de stock</Text></View>
        <Switch value={bajoStock} onValueChange={setBajoStock} color="#dc2626" />
      </View>
      {isBodeguero ? (
        <Button
          mode="contained"
          buttonColor="#dc2626"
          textColor="#ffffff"
          icon="barcode-scan"
          onPress={() => router.push("/(firemat)/escanear")}
          style={styles.scanButton}
          contentStyle={styles.scanContent}
          labelStyle={styles.scanLabel}
        >
          Recibir stock con cámara
        </Button>
      ) : null}
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator color="#ef4444" /><Text style={styles.muted}>Cargando inventario...</Text></View>
      ) : error && !resumen ? (
        <View style={styles.center}><MaterialCommunityIcons name="cloud-alert-outline" size={42} color="#f87171" /><Text style={styles.error}>{error}</Text><Button mode="outlined" textColor="#f87171" onPress={() => load()}>Reintentar</Button></View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={productKey}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ef4444" />}
          ListHeaderComponent={error ? <View style={styles.refreshError}><Text style={styles.error}>{error}</Text><Button textColor="#f87171" onPress={onRefresh}>Reintentar</Button></View> : null}
          ListEmptyComponent={<View style={styles.emptyCard}><MaterialCommunityIcons name="package-variant" size={40} color="#f87171" /><Text style={styles.emptyTitle}>Sin resultados</Text><Text style={styles.empty}>No hay productos para este filtro. Prueba otra búsqueda o desactiva las alertas.</Text></View>}
        />
      )}

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}><Text style={styles.brand}>FIREMAT · INVENTARIO</Text><Text style={styles.modalTitle}>Ajustar inventario</Text></View>
                <TouchableOpacity disabled={saving} accessibilityRole="button" accessibilityLabel="Cerrar ajuste" onPress={() => setSelected(null)} style={styles.closeButton}><MaterialCommunityIcons name="close" size={22} color="#ffffff" /></TouchableOpacity>
              </View>
              <View style={styles.productSummary}><MaterialCommunityIcons name="package-variant" size={22} color="#f87171" /><View style={styles.flex}><Text style={styles.modalProduct}>{selected?.nombre}</Text><Text style={styles.sku}>SKU {selected?.sku || "sin asignar"} · Actual: {selected?.stockActual} unid.</Text></View></View>
              {selected?.imagen?.trim() ? (
                <View style={styles.photoSection}>
                  <ExpandableImage
                    key={selected.id}
                    uri={selected.imagen.trim()}
                    accessibilityLabel={`Ampliar imagen de ${selected.nombre}`}
                    resizeMode="contain"
                    style={styles.photoPreview}
                  />
                  <View style={styles.locationRow}>
                    <MaterialCommunityIcons name="gesture-pinch" size={18} color="#f87171" />
                    <Text style={styles.photoHint}>Toca para ampliar y hacer zoom. Usa la X para cerrar.</Text>
                  </View>
                </View>
              ) : null}
              <Text style={styles.adjustHint}>Ingresa el stock total que debe quedar después del ajuste.</Text>
              <TextInput label="Stock nuevo" value={stockNuevo} onChangeText={setStockNuevo} keyboardType="number-pad" mode="outlined" textColor="#fafafa" outlineColor="#525252" activeOutlineColor="#ef4444" style={styles.input} outlineStyle={styles.inputOutline} />
              <TextInput label="Ubicación" value={ubicacion} onChangeText={setUbicacion} mode="outlined" textColor="#fafafa" outlineColor="#525252" activeOutlineColor="#ef4444" style={styles.input} outlineStyle={styles.inputOutline} />
              <TextInput label="Motivo del ajuste *" value={motivo} onChangeText={setMotivo} mode="outlined" textColor="#fafafa" outlineColor="#525252" activeOutlineColor="#ef4444" multiline style={[styles.input, styles.reasonInput]} outlineStyle={styles.inputOutline} />
              <View style={styles.actions}>
                <Button textColor="#d4d4d4" onPress={() => setSelected(null)} disabled={saving}>Cancelar</Button>
                <Button mode="contained" buttonColor="#dc2626" textColor="#ffffff" icon="content-save-outline" onPress={saveAdjust} loading={saving} disabled={saving} style={styles.saveButton} contentStyle={styles.scanContent}>Guardar</Button>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4, flexDirection: "row", gap: 14, alignItems: "center" },
  headerIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#351719", borderWidth: 1, borderColor: "#652529", alignItems: "center", justifyContent: "center" },
  brand: { color: "#f87171", fontWeight: "800", fontSize: 10, letterSpacing: 1.5 },
  title: { color: "#ffffff", fontWeight: "800", fontSize: 28, marginTop: 3 },
  subtitle: { color: "#a3a3a3", fontSize: 12, marginTop: 3 },
  summary: { flexDirection: "row", margin: 16, gap: 8 },
  summaryItem: { flex: 1, backgroundColor: "#152019", borderRadius: 16, padding: 10, gap: 4, borderWidth: 1, borderColor: "#294a34" },
  summaryWarning: { backgroundColor: "#241e12", borderColor: "#58451c" },
  summaryDanger: { backgroundColor: "#281517", borderColor: "#63262c" },
  summaryValue: { color: "#ffffff", fontWeight: "900", fontSize: 22 },
  summaryLabel: { color: "#d4d4d4", fontSize: 10 },
  warning: { color: "#fbbf24" }, danger: { color: "#f87171" },
  search: { marginHorizontal: 16, backgroundColor: "#171717", borderRadius: 18, borderWidth: 1, borderColor: "#404040" },
  searchInput: { color: "#ffffff" },
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingVertical: 6, gap: 8 },
  filterCaption: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  filterLabel: { color: "#d4d4d4", fontSize: 13, flex: 1 },
  scanButton: { marginHorizontal: 16, marginBottom: 14, borderRadius: 16 },
  scanContent: { minHeight: 48 }, scanLabel: { fontWeight: "800", fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10, flexGrow: 1 },
  card: { backgroundColor: "#151515", borderColor: "#353030", borderWidth: 1, borderRadius: 18, padding: 12, gap: 10 },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: 10 },
  productIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#301719", borderWidth: 1, borderColor: "#582327", alignItems: "center", justifyContent: "center" },
  flex: { flex: 1 },
  name: { color: "#ffffff", fontWeight: "800", fontSize: 14 },
  sku: { color: "#a3a3a3", fontSize: 11, marginTop: 4 },
  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, alignSelf: "flex-start" },
  badgeText: { fontSize: 9, fontWeight: "800" },
  stockRow: { flexDirection: "row", flexWrap: "wrap", backgroundColor: "#202020", borderRadius: 12, paddingVertical: 9, rowGap: 8 },
  metric: { flexGrow: 1, flexBasis: "25%", minWidth: 60, paddingHorizontal: 7 },
  metricLabel: { color: "#a3a3a3", fontSize: 10 },
  metricValue: { color: "#f5f5f5", fontSize: 17, fontWeight: "800", marginTop: 3 },
  locationRow: { flexDirection: "row", alignItems: "flex-start", gap: 4 },
  location: { color: "#a3a3a3", fontSize: 12, flex: 1 },
  cardFooter: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  adjustAction: { flexDirection: "row", marginLeft: "auto", alignItems: "center", gap: 3 },
  adjustText: { color: "#f87171", fontWeight: "700", fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  muted: { color: "#a3a3a3" }, error: { color: "#f87171", textAlign: "center" },
  emptyCard: { backgroundColor: "#151515", borderRadius: 22, borderWidth: 1, borderColor: "#303030", padding: 24, alignItems: "center", gap: 10 },
  emptyTitle: { color: "#fafafa", fontSize: 16, fontWeight: "800" },
  refreshError: { padding: 12, marginBottom: 10, backgroundColor: "#281517", borderRadius: 14 },
  empty: { color: "#a3a3a3", textAlign: "center", lineHeight: 20, fontSize: 13 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)" },
  modalKeyboard: { flex: 1, justifyContent: "center", padding: 16 },
  modalCard: { maxHeight: "100%", width: "100%", maxWidth: 560, alignSelf: "center", backgroundColor: "#151515", borderColor: "#493034", borderWidth: 1, borderTopWidth: 3, borderTopColor: "#dc2626", borderRadius: 24 },
  modalContent: { padding: 18, gap: 14 },
  modalTitle: { color: "#ffffff", fontWeight: "800", fontSize: 22, marginTop: 5 },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#262626", alignItems: "center", justifyContent: "center" },
  productSummary: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#301719", borderRadius: 14, padding: 12 },
  modalProduct: { color: "#fafafa", fontWeight: "700", fontSize: 14 },
  adjustHint: { color: "#a3a3a3", fontSize: 12, lineHeight: 18 },
  input: { backgroundColor: "#202020", fontSize: 15 },
  inputOutline: { borderRadius: 16 },
  reasonInput: { minHeight: 90 },
  photoSection: { gap: 8 },
  photoPreview: { width: "100%", height: 180, borderRadius: 16, backgroundColor: "#202020" },
  photoHint: { flex: 1, color: "#a3a3a3", fontSize: 12, lineHeight: 18 },
  actions: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  saveButton: { borderRadius: 14 },
});
