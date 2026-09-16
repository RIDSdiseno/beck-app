import {
  createFirematProducto,
  FirematCategoria,
  FirematProducto,
  getFirematCategorias,
  getFirematProductos,
  updateFirematProducto,
} from "@/services/api/firematApi";
import { getSession } from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Searchbar, Text } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { TextInput } from "@/components/AppTextInput";
import { SelectSheet } from "@/components/SelectSheet";
import { ExpandableImage } from "@/components/ExpandableImage";

const emptyForm = {
  nombre: "",
  sku: "",
  descripcion: "",
  categoriaId: "",
  precio: "0",
  stockInicial: "0",
  stockMinimo: "0",
  ubicacion: "",
  criticidad: "Media",
};

const formInputProps = {
  mode: "outlined" as const,
  textColor: "#fafafa",
  outlineColor: "#404040",
  activeOutlineColor: "#ef4444",
  selectionColor: "#f87171",
  theme: { colors: { onSurfaceVariant: "#b5b5b5" } },
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString("es-CL")}`;
}

export default function FirematProductosScreen() {
  const insets = useSafeAreaInsets();
  const [productos, setProductos] = React.useState<FirematProducto[]>([]);
  const [categorias, setCategorias] = React.useState<FirematCategoria[]>([]);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isBodeguero, setIsBodeguero] = React.useState(false);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FirematProducto | null>(null);
  const [form, setForm] = React.useState(emptyForm);

  const load = React.useCallback(async (search = query, refresh = false) => {
    try {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const [items, categories, session] = await Promise.all([
        getFirematProductos(search),
        getFirematCategorias(),
        getSession(),
      ]);
      setProductos(items);
      setCategorias(categories);
      setIsBodeguero(session.user?.rol === "bodeguero");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los productos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query]);

  React.useEffect(() => {
    const timer = setTimeout(() => void load(query), 300);
    return () => clearTimeout(timer);
  }, [query, load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, categoriaId: categorias[0]?.id ? String(categorias[0].id) : "" });
    setModalOpen(true);
  };

  const openEdit = (producto: FirematProducto) => {
    if (!isBodeguero) return;
    setEditing(producto);
    setForm({
      nombre: producto.nombre,
      sku: producto.sku || "",
      descripcion: producto.descripcion || "",
      categoriaId: String(producto.categoriaId),
      precio: String(producto.precio || 0),
      stockInicial: "0",
      stockMinimo: String(producto.stockMinimo || 0),
      ubicacion: producto.ubicacion || "",
      criticidad: producto.criticidad || "Media",
    });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.nombre.trim() || !form.sku.trim() || !form.categoriaId) {
      Alert.alert("Campos incompletos", "Nombre, SKU y categoría son obligatorios.");
      return;
    }
    try {
      setSaving(true);
      const common = {
        nombre: form.nombre.trim(),
        sku: form.sku.trim(),
        descripcion: form.descripcion.trim(),
        categoriaId: Number(form.categoriaId),
        precio: Number(form.precio || 0),
        stockMinimo: Number(form.stockMinimo || 0),
        ubicacion: form.ubicacion.trim(),
        criticidad: form.criticidad,
      };
      if (editing) await updateFirematProducto(editing.id, common);
      else await createFirematProducto({ ...common, stockInicial: Number(form.stockInicial || 0) });
      setModalOpen(false);
      await load(query, true);
    } catch (err) {
      Alert.alert("No se pudo guardar", err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  const renderProducto = ({ item }: { item: FirematProducto }) => (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={!isBodeguero}
      accessibilityRole={isBodeguero ? "button" : undefined}
      accessibilityLabel={isBodeguero ? `Editar ${item.nombre}` : undefined}
      onPress={() => openEdit(item)}
      style={styles.card}
    >
        <View style={styles.cardContent}>
          {item.imagen ? (
            <Image source={{ uri: item.imagen }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#ef4444" />
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.name} numberOfLines={2}>{item.nombre}</Text>
            </View>
            <Text style={styles.sku}>SKU {item.sku || "sin asignar"} · <Text style={styles.category}>{item.categoria || "Sin categoría"}</Text></Text>
            {item.formato ? <Text style={styles.detail}>{item.formato}</Text> : null}
          </View>
        </View>
        <View style={styles.metrics}>
          <View style={styles.metricCell}>
            <Text style={styles.price}>{money(item.precio)} <Text style={styles.unitsLabel}>CLP</Text></Text>
          </View>
          <View style={[styles.metricCell, styles.stockCell]}>
            <Text style={[styles.stock, item.alertaStockBajo && styles.stockAlert]}>
              <Text style={styles.unitsLabel}>Stock </Text>{item.stockDisponible} <Text style={styles.unitsLabel}>unid.</Text>
            </Text>
          </View>
        </View>
        {item.alertaStockBajo || isBodeguero ? <View style={styles.cardFooter}>
          {item.alertaStockBajo ? <View style={styles.stockWarning}><MaterialCommunityIcons name="alert-circle-outline" size={14} color="#f87171" /><Text style={styles.stockWarningText}>Stock bajo</Text></View> : null}
          {isBodeguero ? <View style={styles.editAction}><Text style={styles.editText}>Editar</Text><MaterialCommunityIcons name="chevron-right" size={18} color="#f87171" /></View> : null}
        </View> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.catalogIcon}><MaterialCommunityIcons name="package-variant-closed" size={28} color="#f87171" /></View>
        <View style={styles.cardBody}>
          <Text style={styles.brand}>FIREMAT · CATÁLOGO</Text>
          <Text style={styles.title}>Productos</Text>
          <Text style={styles.subtitle}>Consulta tus productos y existencias</Text>
        </View>
      </View>
      <Searchbar
        placeholder="Buscar por nombre o SKU"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        inputStyle={styles.searchInput}
        iconColor="#ef4444"
        placeholderTextColor="#a3a3a3"
      />
      <View style={styles.listToolbar}>
        <View style={styles.catalogCount}>
          <Text style={styles.listHeading}>{query.trim() ? "Resultados" : "Catálogo"}</Text>
          <Text style={styles.countBadge}>{loading || error ? "—" : productos.length}</Text>
        </View>
        {isBodeguero ? <Button mode="contained" buttonColor="#dc2626" textColor="#ffffff" icon="plus" compact onPress={openCreate} style={styles.createButton} contentStyle={styles.createContent}>Nuevo producto</Button> : null}
      </View>
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator color="#ef4444" /><Text style={styles.muted}>Cargando productos...</Text></View>
      ) : error ? (
        <View style={styles.center}><MaterialCommunityIcons name="cloud-alert-outline" size={42} color="#f87171" /><Text style={styles.error}>{error}</Text><Button mode="outlined" textColor="#f87171" onPress={() => load()}>Reintentar</Button></View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProducto}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(query, true)} tintColor="#ef4444" />}
          ListEmptyComponent={<View style={styles.emptyCard}><MaterialCommunityIcons name="package-variant" size={44} color="#f87171" /><Text style={styles.emptyTitle}>No hay productos para mostrar</Text><Text style={styles.empty}>{query.trim() ? "Prueba con otro nombre o SKU." : "Los productos del catálogo aparecerán aquí."}</Text></View>}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <SafeAreaView
          edges={["left", "right", "bottom"]}
          style={[styles.modalSafe, { paddingTop: Math.max(insets.top, 16) }]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="package-variant-closed" size={25} color="#f87171" />
            </View>
            <View style={styles.modalHeading}>
              <Text style={styles.formBrand}>FIREMAT · PRODUCTOS</Text>
              <Text style={styles.modalTitle}>
                {editing ? "Editar producto" : "Nuevo producto"}
              </Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Cerrar formulario"
              style={styles.closeButton}
              hitSlop={8}
              onPress={() => setModalOpen(false)}
            >
              <MaterialCommunityIcons name="close" size={23} color="#fafafa" />
            </TouchableOpacity>
          </View>
          <KeyboardAvoidingView style={styles.formContainer} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>
            <Text style={styles.formIntro}>
              {editing ? "Actualiza la información de tu producto." : "Completa la información para agregar un producto al catálogo."}
              {"\n"}<Text style={styles.requiredNote}>Los campos con * son obligatorios.</Text>
            </Text>

            {editing?.imagen?.trim() ? (
              <View style={styles.formSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIcon}><MaterialCommunityIcons name="image-outline" size={21} color="#f87171" /></View>
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Imagen del producto</Text>
                    <Text style={styles.sectionSubtitle}>Toca la imagen para ampliarla</Text>
                  </View>
                </View>
                <ExpandableImage
                  key={editing.id}
                  uri={editing.imagen.trim()}
                  accessibilityLabel={`Ampliar imagen de ${editing.nombre}`}
                  resizeMode="contain"
                  style={styles.productImagePreview}
                />
                <View style={styles.formHint}>
                  <MaterialCommunityIcons name="gesture-pinch" size={18} color="#f87171" />
                  <Text style={styles.formHintText}>En pantalla completa, pellizca para hacer zoom y usa la X para cerrar.</Text>
                </View>
              </View>
            ) : null}

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}><MaterialCommunityIcons name="text-box-outline" size={21} color="#f87171" /></View>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Información del producto</Text>
                  <Text style={styles.sectionSubtitle}>Nombre, código y categoría</Text>
                </View>
              </View>
            <TextInput {...formInputProps} label="Nombre *" value={form.nombre} onChangeText={(nombre) => setForm((v) => ({ ...v, nombre }))} style={styles.input} outlineStyle={styles.inputOutline} />
            <TextInput {...formInputProps} label="SKU *" value={form.sku} onChangeText={(sku) => setForm((v) => ({ ...v, sku }))} style={styles.input} outlineStyle={styles.inputOutline} autoCapitalize="characters" left={<TextInput.Icon icon="barcode" color="#a3a3a3" />} />
            <SelectSheet
              label="Categoría *"
              value={form.categoriaId || null}
              placeholder={categorias.length ? "Selecciona una categoría" : "No hay categorías disponibles"}
              options={categorias.map((categoria) => ({ value: String(categoria.id), label: categoria.nombre }))}
              onChange={(categoriaId) => { if (categoriaId !== null) setForm((v) => ({ ...v, categoriaId })); }}
              icon="shape-outline"
              variant="firemat"
            />
            <TextInput {...formInputProps} label="Descripción (opcional)" value={form.descripcion} onChangeText={(descripcion) => setForm((v) => ({ ...v, descripcion }))} style={[styles.input, styles.descriptionInput]} outlineStyle={styles.inputOutline} multiline textAlignVertical="top" />
            </View>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}><MaterialCommunityIcons name="warehouse" size={21} color="#f87171" /></View>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Precio y existencias</Text>
                  <Text style={styles.sectionSubtitle}>Valores del inventario</Text>
                </View>
              </View>
            <TextInput {...formInputProps} label="Precio en CLP" value={form.precio} onChangeText={(precio) => setForm((v) => ({ ...v, precio }))} keyboardType="decimal-pad" style={styles.input} outlineStyle={styles.inputOutline} left={<TextInput.Icon icon="currency-usd" color="#a3a3a3" />} />
            {!editing ? <TextInput {...formInputProps} label="Stock inicial" value={form.stockInicial} onChangeText={(stockInicial) => setForm((v) => ({ ...v, stockInicial }))} keyboardType="number-pad" style={styles.input} outlineStyle={styles.inputOutline} right={<TextInput.Affix text="unid." textStyle={styles.affix} />} /> : null}
            <TextInput {...formInputProps} label="Stock mínimo" value={form.stockMinimo} onChangeText={(stockMinimo) => setForm((v) => ({ ...v, stockMinimo }))} keyboardType="number-pad" style={styles.input} outlineStyle={styles.inputOutline} right={<TextInput.Affix text="unid." textStyle={styles.affix} />} />
              <View style={styles.formHint}>
                <MaterialCommunityIcons name="information-outline" size={18} color="#f87171" />
                <Text style={styles.formHintText}>El stock mínimo define el nivel de alerta de este producto.</Text>
              </View>
            </View>

            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}><MaterialCommunityIcons name="map-marker-outline" size={21} color="#f87171" /></View>
                <View style={styles.sectionHeading}>
                  <Text style={styles.sectionTitle}>Organización</Text>
                  <Text style={styles.sectionSubtitle}>Ubicación y criticidad</Text>
                </View>
              </View>
            <TextInput {...formInputProps} label="Ubicación (opcional)" value={form.ubicacion} onChangeText={(ubicacion) => setForm((v) => ({ ...v, ubicacion }))} style={styles.input} outlineStyle={styles.inputOutline} />
            <SelectSheet
              label="Criticidad"
              value={form.criticidad}
              placeholder="Selecciona la criticidad"
              options={["Baja", "Media", "Alta"].map((value) => ({ value, label: value }))}
              onChange={(criticidad) => { if (criticidad !== null) setForm((v) => ({ ...v, criticidad })); }}
              icon="alert-circle-outline"
              variant="firemat"
            />
            </View>
          </ScrollView>
            <View style={styles.formFooter}>
              <Button mode="contained" buttonColor="#dc2626" textColor="#ffffff" icon="content-save-outline" onPress={save} loading={saving} disabled={saving} style={styles.save} contentStyle={styles.saveContent} labelStyle={styles.saveLabel}>
                {editing ? "Guardar cambios" : "Guardar producto"}
              </Button>
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
  catalogIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#351719", borderWidth: 1, borderColor: "#652529", alignItems: "center", justifyContent: "center" },
  brand: { color: "#f87171", fontWeight: "800", letterSpacing: 1.5, fontSize: 10 },
  title: { color: "#ffffff", fontWeight: "800", fontSize: 28, marginTop: 3 },
  subtitle: { color: "#a3a3a3", marginTop: 3, fontSize: 12 },
  search: { margin: 16, backgroundColor: "#171717", borderRadius: 18, borderWidth: 1, borderColor: "#404040" },
  searchInput: { color: "#ffffff" },
  listToolbar: { paddingHorizontal: 18, paddingBottom: 14, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 },
  catalogCount: { flexDirection: "row", gap: 8, alignItems: "center" },
  listHeading: { color: "#fafafa", fontWeight: "800", fontSize: 15 },
  countBadge: { color: "#fca5a5", backgroundColor: "#351719", paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, fontWeight: "700", fontSize: 12 },
  createButton: { borderRadius: 13 }, createContent: { minHeight: 44 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10, flexGrow: 1 },
  card: { backgroundColor: "#151515", borderColor: "#353030", borderWidth: 1, borderRadius: 18, padding: 12, gap: 9 },
  cardContent: { flexDirection: "row", gap: 10 },
  image: { width: 46, height: 46, borderRadius: 12, backgroundColor: "#262626" },
  imagePlaceholder: { width: 46, height: 46, borderRadius: 12, backgroundColor: "#301719", borderWidth: 1, borderColor: "#582327", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1 }, rowBetween: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { color: "#ffffff", fontWeight: "800", flex: 1, fontSize: 15 },
  sku: { color: "#a3a3a3", fontSize: 12, marginTop: 3 },
  category: { color: "#fca5a5", fontSize: 12 },
  metrics: { flexDirection: "row", backgroundColor: "#202020", borderRadius: 10, paddingVertical: 8, alignItems: "center" },
  metricCell: { flex: 1, paddingHorizontal: 9 },
  stockCell: { borderLeftWidth: 1, borderLeftColor: "#383838" },
  price: { color: "#f8fafc", fontWeight: "800", fontSize: 15 }, stock: { color: "#4ade80", fontWeight: "800", fontSize: 15 }, stockAlert: { color: "#f87171" },
  unitsLabel: { color: "#a3a3a3", fontSize: 12, fontWeight: "500" },
  cardFooter: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
  stockWarning: { flexDirection: "row", gap: 4, alignItems: "center" },
  stockWarningText: { color: "#f87171", fontSize: 11, fontWeight: "700" },
  editAction: { marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 3 },
  editText: { color: "#f87171", fontWeight: "700", fontSize: 12 },
  detail: { color: "#a3a3a3", fontSize: 12, marginTop: 3 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  muted: { color: "#a3a3a3" }, error: { color: "#f87171", textAlign: "center" }, empty: { color: "#a3a3a3", textAlign: "center", lineHeight: 20 },
  emptyCard: { alignItems: "center", padding: 28, gap: 12, backgroundColor: "#151515", borderRadius: 22, borderWidth: 1, borderColor: "#303030", marginTop: 12 },
  emptyTitle: { color: "#fafafa", fontWeight: "800", textAlign: "center", fontSize: 16 },
  modalSafe: { flex: 1, backgroundColor: "#0a0a0a" },
  modalHeader: { width: "100%", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#292929" },
  headerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#351719", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#652529" },
  modalHeading: { flex: 1, minWidth: 0, gap: 4 },
  formBrand: { color: "#f87171", fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  modalTitle: { color: "#ffffff", fontSize: 22, fontWeight: "800" },
  closeButton: { width: 44, height: 44, flexShrink: 0, borderRadius: 22, backgroundColor: "#262626", alignItems: "center", justifyContent: "center" },
  formContainer: { flex: 1 },
  form: { padding: 16, paddingBottom: 24, gap: 18 },
  formIntro: { color: "#d4d4d4", fontSize: 14, lineHeight: 22, paddingHorizontal: 2 },
  requiredNote: { color: "#909090", fontSize: 12 },
  formSection: { backgroundColor: "#141414", borderRadius: 22, borderWidth: 1, borderColor: "#303030", padding: 14, gap: 14 },
  sectionHeader: { flexDirection: "row", gap: 11, alignItems: "center", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#2b2b2b" },
  sectionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: "#321719", alignItems: "center", justifyContent: "center" },
  sectionHeading: { flex: 1, gap: 3 },
  sectionTitle: { color: "#fafafa", fontSize: 15, fontWeight: "800" },
  sectionSubtitle: { color: "#a3a3a3", fontSize: 12 },
  input: { backgroundColor: "#1c1c1c", fontSize: 15 }, inputOutline: { borderRadius: 16 },
  descriptionInput: { minHeight: 105 },
  productImagePreview: { width: "100%", height: 200, borderRadius: 16, backgroundColor: "#202020" },
  affix: { color: "#a3a3a3", fontSize: 13 },
  formHint: { flexDirection: "row", gap: 8, paddingHorizontal: 4, alignItems: "flex-start" },
  formHintText: { flex: 1, color: "#a3a3a3", fontSize: 12, lineHeight: 18 },
  formFooter: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1, borderTopColor: "#292929", backgroundColor: "#111111" },
  save: { borderRadius: 16 },
  saveContent: { minHeight: 54 },
  saveLabel: { fontSize: 16, fontWeight: "800" },
});
