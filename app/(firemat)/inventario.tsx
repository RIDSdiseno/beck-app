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
  Modal,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Searchbar, Switch, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "@/components/AppTextInput";

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

  const load = React.useCallback(async (refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const [data, session] = await Promise.all([
        getFirematInventario(query, bajoStock),
        getSession(),
      ]);
      setProductos(data.productos);
      setResumen(data.resumen);
      setIsBodeguero(session.user?.rol === "bodeguero");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el inventario");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bajoStock, query]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => void load(), 300);
      return () => clearTimeout(timer);
    }, [load]),
  );

  const openAdjust = (producto: FirematProducto) => {
    if (!isBodeguero) return;
    setSelected(producto);
    setStockNuevo(String(producto.stockActual));
    setUbicacion(producto.ubicacion || "");
    setMotivo("");
  };

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
      await load(true);
    } catch (err) {
      Alert.alert("No se pudo ajustar", err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: FirematProducto }) => {
    const stateColor = item.estadoStock === "SIN_STOCK" ? "#ef4444" : item.estadoStock === "BAJO_STOCK" ? "#f59e0b" : "#22c55e";
    return (
      <TouchableOpacity activeOpacity={isBodeguero ? 0.75 : 1} onPress={() => openAdjust(item)}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text style={styles.name}>{item.nombre}</Text>
                <Text style={styles.sku}>{item.sku || "Sin SKU"} · {item.categoria}</Text>
              </View>
              <View style={[styles.badge, { borderColor: stateColor }]}>
                <Text style={[styles.badgeText, { color: stateColor }]}>{item.estadoStock.replaceAll("_", " ")}</Text>
              </View>
            </View>
            <View style={styles.stockRow}>
              <View><Text style={styles.metricLabel}>Actual</Text><Text style={styles.metricValue}>{item.stockActual}</Text></View>
              <View><Text style={styles.metricLabel}>Reservado</Text><Text style={styles.metricValue}>{item.stockReservado}</Text></View>
              <View><Text style={styles.metricLabel}>Disponible</Text><Text style={[styles.metricValue, { color: stateColor }]}>{item.stockDisponible}</Text></View>
              <View><Text style={styles.metricLabel}>Mínimo</Text><Text style={styles.metricValue}>{item.stockMinimo}</Text></View>
            </View>
            {item.ubicacion ? <Text style={styles.location}><MaterialCommunityIcons name="map-marker" /> {item.ubicacion}</Text> : null}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>FIREMAT</Text>
        <Text variant="headlineSmall" style={styles.title}>Inventario</Text>
      </View>
      {resumen ? (
        <View style={styles.summary}>
          <View style={styles.summaryItem}><Text style={styles.summaryValue}>{resumen.stockDisponibleTotal}</Text><Text style={styles.summaryLabel}>Disponible</Text></View>
          <View style={styles.summaryItem}><Text style={[styles.summaryValue, styles.warning]}>{resumen.productosBajoStock}</Text><Text style={styles.summaryLabel}>Stock bajo</Text></View>
          <View style={styles.summaryItem}><Text style={[styles.summaryValue, styles.danger]}>{resumen.productosSinStock}</Text><Text style={styles.summaryLabel}>Sin stock</Text></View>
        </View>
      ) : null}
      <Searchbar placeholder="Buscar producto o SKU" value={query} onChangeText={setQuery} style={styles.search} inputStyle={styles.searchInput} iconColor="#ef4444" />
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Sólo alertas de stock</Text>
        <Switch value={bajoStock} onValueChange={setBajoStock} color="#dc2626" />
      </View>
      {isBodeguero ? (
        <Button
          mode="contained"
          buttonColor="#dc2626"
          icon="barcode-scan"
          onPress={() => router.push("/(firemat)/escanear")}
          style={styles.scanButton}
        >
          Recibir stock con cámara
        </Button>
      ) : null}
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator color="#ef4444" /><Text style={styles.muted}>Cargando inventario...</Text></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text><Button onPress={() => load()}>Reintentar</Button></View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor="#ef4444" />}
          ListEmptyComponent={<Text style={styles.empty}>No hay productos para este filtro.</Text>}
        />
      )}

      <Modal visible={Boolean(selected)} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <Card.Content>
              <Text variant="titleLarge" style={styles.modalTitle}>Ajustar inventario</Text>
              <Text style={styles.modalProduct}>{selected?.nombre}</Text>
              <TextInput label="Stock nuevo" value={stockNuevo} onChangeText={setStockNuevo} keyboardType="number-pad" mode="outlined" style={styles.input} outlineStyle={styles.inputOutline} />
              <TextInput label="Ubicación" value={ubicacion} onChangeText={setUbicacion} mode="outlined" style={styles.input} outlineStyle={styles.inputOutline} />
              <TextInput label="Motivo del ajuste" value={motivo} onChangeText={setMotivo} mode="outlined" multiline style={styles.input} outlineStyle={styles.inputOutline} />
              <View style={styles.actions}>
                <Button textColor="#d4d4d4" onPress={() => setSelected(null)} disabled={saving}>Cancelar</Button>
                <Button mode="contained" buttonColor="#dc2626" onPress={saveAdjust} loading={saving} disabled={saving}>Guardar</Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" }, header: { paddingHorizontal: 18, paddingTop: 10 },
  brand: { color: "#ef4444", fontWeight: "900", letterSpacing: 2 }, title: { color: "#ffffff", fontWeight: "800" },
  summary: { flexDirection: "row", margin: 16, gap: 8 }, summaryItem: { flex: 1, backgroundColor: "#171717", borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: "#303030" },
  summaryValue: { color: "#ffffff", fontWeight: "900", fontSize: 20 }, summaryLabel: { color: "#a3a3a3", fontSize: 11, marginTop: 2 }, warning: { color: "#f59e0b" }, danger: { color: "#ef4444" },
  search: { marginHorizontal: 16, backgroundColor: "#202020", borderWidth: 1, borderColor: "#404040" }, searchInput: { color: "#ffffff" },
  filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 10 }, filterLabel: { color: "#d4d4d4" },
  scanButton: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 90, gap: 10 }, card: { backgroundColor: "#171717", borderColor: "#303030", borderWidth: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, flex: { flex: 1 }, name: { color: "#ffffff", fontWeight: "700" }, sku: { color: "#a3a3a3", fontSize: 12, marginTop: 3 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }, badgeText: { fontSize: 9, fontWeight: "800" },
  stockRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 }, metricLabel: { color: "#737373", fontSize: 10 }, metricValue: { color: "#f5f5f5", fontSize: 17, fontWeight: "800", marginTop: 2 }, location: { color: "#a3a3a3", fontSize: 12, marginTop: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 }, muted: { color: "#a3a3a3" }, error: { color: "#f87171", textAlign: "center" }, empty: { color: "#a3a3a3", textAlign: "center", marginTop: 50 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.82)", justifyContent: "center", padding: 20 }, modalCard: { backgroundColor: "#171717", borderColor: "#404040", borderWidth: 1 }, modalTitle: { color: "#ffffff", fontWeight: "800" }, modalProduct: { color: "#ef4444", marginTop: 4, marginBottom: 14 }, input: { backgroundColor: "#202020", marginBottom: 12 }, inputOutline: { borderRadius: 14 }, actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 },
});
