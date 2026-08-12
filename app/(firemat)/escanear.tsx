import { TextInput } from "@/components/AppTextInput";
import {
  associateFirematBarcode,
  createFirematScanReception,
  FirematProducto,
  getFirematProductoPorCodigo,
  getFirematProductos,
} from "@/services/api/firematApi";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BarcodeScanningResult, CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Searchbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type CartItem = {
  codigo: string;
  producto: FirematProducto;
  unidadesPorEscaneo: number;
  cantidadEscaneos: number;
};

type PendingAssociation = {
  codigo: string;
  candidate?: FirematProducto;
  unidadesSugeridas?: number | null;
};

function createReceptionId() {
  return `scan-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function FirematScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanEnabled, setScanEnabled] = React.useState(true);
  const [lookingUp, setLookingUp] = React.useState(false);
  const [torch, setTorch] = React.useState(false);
  const [lastMessage, setLastMessage] = React.useState("Apunta al código de barras de una caja");
  const [cart, setCart] = React.useState<Record<string, CartItem>>({});
  const [motivo, setMotivo] = React.useState("Recepción de mercadería");
  const [saving, setSaving] = React.useState(false);
  const receptionId = React.useRef(createReceptionId());

  const [pending, setPending] = React.useState<PendingAssociation | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<FirematProducto | null>(null);
  const [units, setUnits] = React.useState("1");
  const [showProductPicker, setShowProductPicker] = React.useState(false);
  const [productQuery, setProductQuery] = React.useState("");
  const [productOptions, setProductOptions] = React.useState<FirematProducto[]>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);
  const [associating, setAssociating] = React.useState(false);

  const cartItems = React.useMemo(() => Object.values(cart), [cart]);
  const totalUnits = React.useMemo(
    () => cartItems.reduce((sum, item) => sum + item.cantidadEscaneos * item.unidadesPorEscaneo, 0),
    [cartItems],
  );

  React.useEffect(() => {
    if (!pending || !showProductPicker) return;
    const timer = setTimeout(async () => {
      try {
        setLoadingProducts(true);
        setProductOptions(await getFirematProductos(productQuery));
      } catch (error) {
        Alert.alert("No se pudieron cargar los productos", error instanceof Error ? error.message : "Error desconocido");
      } finally {
        setLoadingProducts(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [pending, productQuery, showProductPicker]);

  const addToCart = React.useCallback(
    (codigo: string, producto: FirematProducto, unidadesPorEscaneo: number) => {
      setCart((current) => {
        const existing = current[codigo];
        return {
          ...current,
          [codigo]: {
            codigo,
            producto,
            unidadesPorEscaneo,
            cantidadEscaneos: (existing?.cantidadEscaneos ?? 0) + 1,
          },
        };
      });
      setLastMessage(`${producto.nombre}: caja agregada`);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [],
  );

  const handleBarcode = React.useCallback(
    async ({ data }: BarcodeScanningResult) => {
      if (!scanEnabled || lookingUp) return;
      setScanEnabled(false);
      setLookingUp(true);
      try {
        const result = await getFirematProductoPorCodigo(data);
        if (result.asociado && result.producto && result.unidadesPorEscaneo) {
          addToCart(result.codigo, result.producto, result.unidadesPorEscaneo);
          return;
        }

        const candidate = result.producto;
        setPending({
          codigo: result.codigo,
          candidate,
          unidadesSugeridas: result.unidadesSugeridas,
        });
        setSelectedProduct(candidate ?? null);
        setUnits(String(result.unidadesSugeridas ?? 1));
        setShowProductPicker(!candidate);
        setProductQuery("");
        setLastMessage(candidate ? "Confirma el producto y contenido de la caja" : "Código nuevo: selecciona su producto");
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (error) {
        setScanEnabled(true);
        Alert.alert("No se pudo leer la etiqueta", error instanceof Error ? error.message : "Error desconocido");
      } finally {
        setLookingUp(false);
      }
    },
    [addToCart, lookingUp, scanEnabled],
  );

  const closeAssociation = () => {
    setPending(null);
    setSelectedProduct(null);
    setShowProductPicker(false);
    setScanEnabled(true);
    setLastMessage("Apunta al código de barras de una caja");
  };

  const confirmAssociation = async () => {
    const unitsNumber = Number(units);
    if (!pending || !selectedProduct || !Number.isInteger(unitsNumber) || unitsNumber <= 0) {
      Alert.alert("Datos incompletos", "Selecciona un producto e indica cuántas unidades contiene la caja.");
      return;
    }
    try {
      setAssociating(true);
      const association = await associateFirematBarcode({
        codigo: pending.codigo,
        productoId: selectedProduct.id,
        unidadesPorEscaneo: unitsNumber,
        descripcion: `Caja de ${unitsNumber} unidad${unitsNumber === 1 ? "" : "es"}`,
      });
      addToCart(association.codigo, association.producto, association.unidadesPorEscaneo);
      setPending(null);
      setSelectedProduct(null);
      setShowProductPicker(false);
    } catch (error) {
      Alert.alert("No se pudo asociar", error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setAssociating(false);
    }
  };

  const changeScanCount = (codigo: string, delta: number) => {
    setCart((current) => {
      const item = current[codigo];
      if (!item) return current;
      const nextCount = item.cantidadEscaneos + delta;
      if (nextCount <= 0) {
        const next = { ...current };
        delete next[codigo];
        return next;
      }
      return { ...current, [codigo]: { ...item, cantidadEscaneos: nextCount } };
    });
  };

  const enableNextScan = () => {
    setScanEnabled(true);
    setLastMessage("Apunta a la siguiente caja");
  };

  const saveReception = () => {
    if (!cartItems.length) return;
    Alert.alert(
      "Confirmar recepción",
      `Se agregarán ${totalUnits} unidades distribuidas en ${cartItems.reduce((sum, item) => sum + item.cantidadEscaneos, 0)} cajas.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Agregar al stock",
          onPress: async () => {
            try {
              setSaving(true);
              await createFirematScanReception({
                recepcionId: receptionId.current,
                motivo: motivo.trim() || "Recepción de mercadería",
                items: cartItems.map((item) => ({
                  codigo: item.codigo,
                  cantidadEscaneos: item.cantidadEscaneos,
                })),
              });
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Recepción guardada", `Se agregaron ${totalUnits} unidades al inventario.`, [
                { text: "Aceptar", onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert("No se pudo guardar", error instanceof Error ? error.message : "Error desconocido");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color="#ef4444" /></View>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.permissionCard}>
          <MaterialCommunityIcons name="camera-off-outline" size={54} color="#ef4444" />
          <Text style={styles.permissionTitle}>Permiso de cámara</Text>
          <Text style={styles.muted}>Firemat necesita la cámara para leer las etiquetas de las cajas.</Text>
          <Button mode="contained" buttonColor="#dc2626" onPress={requestPermission}>Permitir cámara</Button>
          <Button textColor="#d4d4d4" onPress={() => router.back()}>Volver</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.brand}>FIREMAT</Text>
          <Text style={styles.title}>Recepción por escaneo</Text>
        </View>
        <TouchableOpacity onPress={() => setTorch((value) => !value)} style={styles.headerButton}>
          <MaterialCommunityIcons name={torch ? "flashlight" : "flashlight-off"} size={24} color={torch ? "#ef4444" : "#ffffff"} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.cameraShell}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            active={!pending}
            barcodeScannerSettings={{ barcodeTypes: ["itf14", "ean13", "ean8", "upc_a", "upc_e", "code128"] }}
            onBarcodeScanned={scanEnabled && !pending ? handleBarcode : undefined}
          />
          <View style={styles.scanFrame} />
          {lookingUp ? <View style={styles.cameraLoading}><ActivityIndicator color="#ffffff" /></View> : null}
        </View>

        <Text style={styles.scanMessage}>{lastMessage}</Text>
        {!scanEnabled && !pending && !lookingUp ? (
          <Button mode="contained" buttonColor="#dc2626" icon="barcode-scan" onPress={enableNextScan} style={styles.nextButton}>
            Escanear otra caja
          </Button>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recepción actual</Text>
          <Text style={styles.sectionTotal}>{totalUnits} unidades</Text>
        </View>

        {cartItems.length ? cartItems.map((item) => (
          <View key={item.codigo} style={styles.cartCard}>
            <View style={styles.cartInfo}>
              <Text style={styles.productName}>{item.producto.nombre}</Text>
              <Text style={styles.productMeta}>SKU {item.producto.sku} · {item.unidadesPorEscaneo} por caja</Text>
              <Text style={styles.productMeta}>Código {item.codigo}</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity onPress={() => changeScanCount(item.codigo, -1)} style={styles.counterButton}>
                <MaterialCommunityIcons name="minus" size={20} color="#ffffff" />
              </TouchableOpacity>
              <View style={styles.counterValue}>
                <Text style={styles.counterNumber}>{item.cantidadEscaneos}</Text>
                <Text style={styles.counterLabel}>cajas</Text>
              </View>
              <TouchableOpacity onPress={() => changeScanCount(item.codigo, 1)} style={styles.counterButton}>
                <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.lineTotal}>+{item.cantidadEscaneos * item.unidadesPorEscaneo} unidades</Text>
          </View>
        )) : <Text style={styles.empty}>Aún no has escaneado ninguna caja.</Text>}

        {cartItems.length ? (
          <>
            <TextInput
              label="Motivo de la entrada"
              value={motivo}
              onChangeText={setMotivo}
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <Button mode="contained" buttonColor="#dc2626" onPress={saveReception} loading={saving} disabled={saving} style={styles.saveButton}>
              Confirmar entrada de {totalUnits} unidades
            </Button>
          </>
        ) : null}
      </ScrollView>

      <Modal visible={Boolean(pending)} transparent animationType="slide" onRequestClose={closeAssociation}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalCard} edges={["bottom"]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Asociar etiqueta</Text>
                <Text style={styles.code}>{pending?.codigo}</Text>
              </View>
              <TouchableOpacity onPress={closeAssociation} hitSlop={12}>
                <MaterialCommunityIcons name="close" size={26} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {selectedProduct && !showProductPicker ? (
              <View style={styles.selectedProduct}>
                <Text style={styles.productName}>{selectedProduct.nombre}</Text>
                <Text style={styles.productMeta}>SKU {selectedProduct.sku}</Text>
                <Button compact textColor="#ef4444" onPress={() => setShowProductPicker(true)}>Elegir otro producto</Button>
              </View>
            ) : (
              <View style={styles.pickerArea}>
                <Searchbar
                  placeholder="Buscar por producto o SKU"
                  value={productQuery}
                  onChangeText={setProductQuery}
                  style={styles.search}
                  inputStyle={styles.searchInput}
                  iconColor="#ef4444"
                />
                {loadingProducts ? <ActivityIndicator color="#ef4444" style={styles.productLoader} /> : (
                  <FlatList
                    data={productOptions}
                    keyExtractor={(item) => String(item.id)}
                    style={styles.productList}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.productOption}
                        onPress={() => { setSelectedProduct(item); setShowProductPicker(false); }}
                      >
                        <Text style={styles.productName}>{item.nombre}</Text>
                        <Text style={styles.productMeta}>SKU {item.sku} · Stock {item.stockActual}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </View>
            )}

            <TextInput
              label="Unidades que contiene cada caja"
              value={units}
              onChangeText={setUnits}
              keyboardType="number-pad"
              mode="outlined"
              style={styles.input}
              outlineStyle={styles.inputOutline}
            />
            <Text style={styles.help}>Este valor se sumará al stock cada vez que registres una caja con esta etiqueta.</Text>
            <Button
              mode="contained"
              buttonColor="#dc2626"
              onPress={confirmAssociation}
              loading={associating}
              disabled={associating || !selectedProduct}
              style={styles.saveButton}
            >
              Asociar y agregar caja
            </Button>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#202020", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 }, brand: { color: "#ef4444", fontWeight: "900", letterSpacing: 2, fontSize: 12 },
  title: { color: "#ffffff", fontSize: 20, fontWeight: "800" },
  content: { paddingHorizontal: 16, paddingBottom: 38 },
  cameraShell: { height: 245, borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "#404040", backgroundColor: "#171717" },
  scanFrame: { position: "absolute", left: 28, right: 28, top: 78, height: 88, borderWidth: 2, borderColor: "#ef4444", borderRadius: 14 },
  cameraLoading: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  scanMessage: { color: "#d4d4d4", textAlign: "center", marginVertical: 12 },
  nextButton: { borderRadius: 16, marginBottom: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 10 },
  sectionTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" }, sectionTotal: { color: "#ef4444", fontWeight: "800" },
  cartCard: { backgroundColor: "#171717", borderWidth: 1, borderColor: "#303030", borderRadius: 18, padding: 14, marginBottom: 10 },
  cartInfo: { marginBottom: 12 }, productName: { color: "#ffffff", fontWeight: "800" }, productMeta: { color: "#a3a3a3", marginTop: 3, fontSize: 12 },
  counter: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
  counterButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#2d2d2d", alignItems: "center", justifyContent: "center" },
  counterValue: { minWidth: 64, alignItems: "center" }, counterNumber: { color: "#ffffff", fontSize: 22, fontWeight: "900" }, counterLabel: { color: "#a3a3a3", fontSize: 11 },
  lineTotal: { color: "#4ade80", fontWeight: "800", textAlign: "right", marginTop: 8 },
  empty: { color: "#737373", textAlign: "center", paddingVertical: 28 },
  input: { backgroundColor: "#202020", marginTop: 12 }, inputOutline: { borderRadius: 16 },
  saveButton: { borderRadius: 16, marginTop: 14 },
  permissionCard: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30, gap: 14 },
  permissionTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800" }, muted: { color: "#a3a3a3", textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.72)", justifyContent: "flex-end" },
  modalCard: { maxHeight: "88%", backgroundColor: "#171717", borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18 },
  modalHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { color: "#ffffff", fontSize: 21, fontWeight: "900" }, code: { color: "#ef4444", marginTop: 3 },
  selectedProduct: { backgroundColor: "#202020", borderRadius: 16, padding: 14 },
  pickerArea: { height: 300 }, search: { backgroundColor: "#202020", borderWidth: 1, borderColor: "#404040" }, searchInput: { color: "#ffffff" },
  productLoader: { marginTop: 30 }, productList: { marginTop: 8 }, productOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#303030" },
  help: { color: "#a3a3a3", fontSize: 12, marginTop: 8 },
});
