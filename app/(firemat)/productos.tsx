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
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, FAB, Searchbar, Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "@/components/AppTextInput";

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

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString("es-CL")}`;
}

export default function FirematProductosScreen() {
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
      refresh ? setRefreshing(true) : setLoading(true);
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
    <TouchableOpacity activeOpacity={isBodeguero ? 0.75 : 1} onPress={() => openEdit(item)}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          {item.imagen ? (
            <Image source={{ uri: item.imagen }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <MaterialCommunityIcons name="package-variant" size={30} color="#ef4444" />
            </View>
          )}
          <View style={styles.cardBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.name} numberOfLines={2}>{item.nombre}</Text>
              <View style={[styles.stateDot, { backgroundColor: item.activo ? "#22c55e" : "#737373" }]} />
            </View>
            <Text style={styles.sku}>{item.sku || "Sin SKU"} · {item.categoria}</Text>
            <View style={styles.metrics}>
              <Text style={styles.price}>{money(item.precio)}</Text>
              <Text style={[styles.stock, item.alertaStockBajo && styles.stockAlert]}>
                Stock {item.stockDisponible}
              </Text>
            </View>
            {item.formato ? <Text style={styles.detail}>{item.formato}</Text> : null}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>FIREMAT</Text>
        <Text variant="headlineSmall" style={styles.title}>Productos</Text>
        <Text style={styles.subtitle}>{productos.length} productos disponibles</Text>
      </View>
      <Searchbar
        placeholder="Buscar por nombre o SKU"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        inputStyle={styles.searchInput}
        iconColor="#ef4444"
      />
      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator color="#ef4444" /><Text style={styles.muted}>Cargando productos...</Text></View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.error}>{error}</Text><Button onPress={() => load()}>Reintentar</Button></View>
      ) : (
        <FlatList
          data={productos}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProducto}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(query, true)} tintColor="#ef4444" />}
          ListEmptyComponent={<Text style={styles.empty}>No se encontraron productos.</Text>}
        />
      )}
      {isBodeguero ? <FAB icon="plus" color="#ffffff" style={styles.fab} onPress={openCreate} /> : null}

      <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text variant="titleLarge" style={styles.modalTitle}>{editing ? "Editar producto" : "Nuevo producto"}</Text>
            <Button textColor="#ef4444" onPress={() => setModalOpen(false)}>Cerrar</Button>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
            <TextInput label="Nombre" value={form.nombre} onChangeText={(nombre) => setForm((v) => ({ ...v, nombre }))} mode="outlined" style={styles.input} />
            <TextInput label="SKU" value={form.sku} onChangeText={(sku) => setForm((v) => ({ ...v, sku }))} mode="outlined" style={styles.input} autoCapitalize="characters" />
            <TextInput label="Descripción" value={form.descripcion} onChangeText={(descripcion) => setForm((v) => ({ ...v, descripcion }))} mode="outlined" style={styles.input} multiline />
            <Text style={styles.fieldLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categorias.map((categoria) => (
                <Button
                  key={categoria.id}
                  compact
                  mode={form.categoriaId === String(categoria.id) ? "contained" : "outlined"}
                  buttonColor={form.categoriaId === String(categoria.id) ? "#dc2626" : undefined}
                  textColor={form.categoriaId === String(categoria.id) ? "#ffffff" : "#d4d4d4"}
                  onPress={() => setForm((v) => ({ ...v, categoriaId: String(categoria.id) }))}
                >{categoria.nombre}</Button>
              ))}
            </ScrollView>
            <TextInput label="Precio CLP" value={form.precio} onChangeText={(precio) => setForm((v) => ({ ...v, precio }))} mode="outlined" keyboardType="decimal-pad" style={styles.input} />
            {!editing ? <TextInput label="Stock inicial" value={form.stockInicial} onChangeText={(stockInicial) => setForm((v) => ({ ...v, stockInicial }))} mode="outlined" keyboardType="number-pad" style={styles.input} /> : null}
            <TextInput label="Stock mínimo" value={form.stockMinimo} onChangeText={(stockMinimo) => setForm((v) => ({ ...v, stockMinimo }))} mode="outlined" keyboardType="number-pad" style={styles.input} />
            <TextInput label="Ubicación" value={form.ubicacion} onChangeText={(ubicacion) => setForm((v) => ({ ...v, ubicacion }))} mode="outlined" style={styles.input} />
            <Text style={styles.fieldLabel}>Criticidad</Text>
            <View style={styles.chips}>
              {["Baja", "Media", "Alta"].map((criticidad) => (
                <Button key={criticidad} compact mode={form.criticidad === criticidad ? "contained" : "outlined"} buttonColor={form.criticidad === criticidad ? "#dc2626" : undefined} textColor={form.criticidad === criticidad ? "#ffffff" : "#d4d4d4"} onPress={() => setForm((v) => ({ ...v, criticidad }))}>{criticidad}</Button>
              ))}
            </View>
            <Button mode="contained" buttonColor="#dc2626" onPress={save} loading={saving} disabled={saving} style={styles.save}>Guardar producto</Button>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { paddingHorizontal: 18, paddingTop: 10 },
  brand: { color: "#ef4444", fontWeight: "900", letterSpacing: 2 },
  title: { color: "#ffffff", fontWeight: "800" },
  subtitle: { color: "#a3a3a3", marginTop: 2 },
  search: { margin: 16, backgroundColor: "#202020", borderWidth: 1, borderColor: "#404040" },
  searchInput: { color: "#ffffff" },
  list: { paddingHorizontal: 16, paddingBottom: 100, gap: 10 },
  card: { backgroundColor: "#171717", borderColor: "#303030", borderWidth: 1 },
  cardContent: { flexDirection: "row", gap: 12 },
  image: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#262626" },
  imagePlaceholder: { width: 72, height: 72, borderRadius: 10, backgroundColor: "#262626", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1 }, rowBetween: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  name: { color: "#ffffff", fontWeight: "700", flex: 1 },
  sku: { color: "#a3a3a3", fontSize: 12, marginTop: 3 },
  metrics: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  price: { color: "#f8fafc", fontWeight: "700" }, stock: { color: "#4ade80", fontWeight: "700" }, stockAlert: { color: "#f87171" },
  detail: { color: "#a3a3a3", fontSize: 12, marginTop: 3 },
  stateDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  muted: { color: "#a3a3a3" }, error: { color: "#f87171", textAlign: "center" }, empty: { color: "#a3a3a3", textAlign: "center", marginTop: 50 },
  fab: { position: "absolute", right: 18, bottom: 84, backgroundColor: "#dc2626" },
  modalSafe: { flex: 1, backgroundColor: "#0a0a0a" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#292929" },
  modalTitle: { color: "#ffffff", fontWeight: "800" }, form: { padding: 18, paddingBottom: 48, gap: 12 },
  input: { backgroundColor: "#171717" }, fieldLabel: { color: "#d4d4d4", fontWeight: "700", marginTop: 4 },
  chips: { flexDirection: "row", gap: 8 }, save: { marginTop: 14 },
});
