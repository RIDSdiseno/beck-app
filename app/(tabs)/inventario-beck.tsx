import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandHeader } from "@/components/BrandHeader";
import { SelectSheet } from "@/components/SelectSheet";
import {
  asignarInventario,
  confirmarRecepcionInventario,
  devolverInventarioABodega,
  getHistorialMiEquipo,
  getInventarioDisponible,
  getInventarioEntregado,
  getMiEquipo,
  getObrasInventarioSupervisor,
  getOperariosInventario,
  getTrazabilidadInventario,
  getTrazabilidadItemInventario,
  recibirDevolucionInventario,
  solicitarDevolucionInventario,
  type EventoHistorialEquipo,
  type EventoTrazabilidad,
  type ItemDisponible,
  type ItemEntregado,
  type ItemMiEquipo,
  type ObraInventario,
  type PersonaInventario,
} from "@/services/api/inventarioBeckApi";
import { getSession } from "@/services/auth/session";

const COLORS = {
  navy: "#0f172a",
  orange: "#f97316",
  yellow: "#fbbf24",
  background: "#f5f7fb",
  muted: "#64748b",
  border: "#fed7aa",
  pale: "#fffaf0",
};

function tipoLabel(tipo: string) {
  if (tipo === "epp") return "EPP";
  if (tipo === "implemento") return "Implemento";
  return "Herramienta";
}

function tipoIcon(tipo: string): keyof typeof MaterialCommunityIcons.glyphMap {
  if (tipo === "epp") return "hard-hat";
  if (tipo === "implemento") return "shield-check-outline";
  return "tools";
}

function accionLabel(accion: string) {
  const labels: Record<string, string> = {
    ASIGNADO_SUPERVISOR: "Asignado al supervisor",
    ASIGNADO_OPERARIO: "Entregado al operario",
    RECEPCION_CONFIRMADA_OPERARIO: "Recepción confirmada",
    DEVOLUCION_SOLICITADA_OPERARIO: "Devolución solicitada",
    DEVOLUCION_RECIBIDA_SUPERVISOR: "Devolución recibida por supervisor",
    DEVUELTO_BODEGA: "Devuelto a bodega",
  };
  return labels[accion] ?? accion.replaceAll("_", " ").toLocaleLowerCase("es-CL");
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function ItemMeta({ sku, detalle, talla, color }: Pick<ItemDisponible, "sku" | "detalle" | "talla" | "color">) {
  const datos = [sku ? `SKU ${sku}` : null, detalle, talla ? `Talla ${talla}` : null, color].filter(Boolean);
  if (datos.length === 0) return null;
  return <Text style={styles.itemMeta}>{datos.join(" · ")}</Text>;
}

function EmptyState({ icon, title, message }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; title: string; message: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name={icon} size={30} color={COLORS.orange} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </View>
  );
}

export default function InventarioBeckScreen() {
  const router = useRouter();
  const [rol, setRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [obras, setObras] = useState<ObraInventario[]>([]);
  const [obraId, setObraId] = useState<string | null>(null);
  const obraIdRef = useRef<string | null>(null);
  const [disponibles, setDisponibles] = useState<ItemDisponible[]>([]);
  const [entregados, setEntregados] = useState<ItemEntregado[]>([]);
  const [operarios, setOperarios] = useState<PersonaInventario[]>([]);
  const [miEquipo, setMiEquipo] = useState<ItemMiEquipo[]>([]);
  const [historialEquipo, setHistorialEquipo] = useState<EventoHistorialEquipo[]>([]);
  const [vistaOperario, setVistaOperario] = useState<"activos" | "historial">("activos");
  const [vista, setVista] = useState<"disponible" | "entregado">("disponible");
  const [seleccion, setSeleccion] = useState<Record<string, number>>({});
  const [asignacionOpen, setAsignacionOpen] = useState(false);
  const [trabajadorId, setTrabajadorId] = useState<string | null>(null);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [devolucionItem, setDevolucionItem] = useState<ItemMiEquipo | null>(null);
  const [devolucionMotivo, setDevolucionMotivo] = useState("");
  const [bodegaItem, setBodegaItem] = useState<ItemDisponible | null>(null);
  const [bodegaCantidad, setBodegaCantidad] = useState(1);
  const [bodegaMotivo, setBodegaMotivo] = useState("");
  const [trazabilidadOpen, setTrazabilidadOpen] = useState(false);
  const [trazabilidadLoading, setTrazabilidadLoading] = useState(false);
  const [trazabilidad, setTrazabilidad] = useState<EventoTrazabilidad[]>([]);

  const loadSupervisorObra = useCallback(async (selectedObraId: string) => {
    const [items, entregas, personas] = await Promise.all([
      getInventarioDisponible(selectedObraId),
      getInventarioEntregado(selectedObraId),
      getOperariosInventario(selectedObraId),
    ]);
    setDisponibles(items);
    setEntregados(entregas);
    setOperarios(personas);
  }, []);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const session = await getSession();
      const currentRole = session.user?.rol ?? null;
      setRol(currentRole);
      if (currentRole === "jefeobra") {
        const data = await getObrasInventarioSupervisor();
        setObras(data);
        const currentObraId = obraIdRef.current;
        const selected = data.some((obra) => obra.id === currentObraId) ? currentObraId! : data[0]?.id;
        obraIdRef.current = selected ?? null;
        setObraId(selected ?? null);
        if (selected) await loadSupervisorObra(selected);
        else {
          setDisponibles([]);
          setEntregados([]);
          setOperarios([]);
        }
      } else if (currentRole === "terreno") {
        const [equipo, historial] = await Promise.all([getMiEquipo(), getHistorialMiEquipo()]);
        setMiEquipo(equipo);
        setHistorialEquipo(historial);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el inventario.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadSupervisorObra]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const changeObra = useCallback(async (nextObraId: string | null) => {
    if (!nextObraId || nextObraId === obraId) return;
    obraIdRef.current = nextObraId;
    setObraId(nextObraId);
    setSeleccion({});
    setLoading(true);
    setError(null);
    try {
      await loadSupervisorObra(nextObraId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar la obra.");
    } finally {
      setLoading(false);
    }
  }, [loadSupervisorObra, obraId]);

  const normalizedSearch = search.trim().toLocaleLowerCase("es-CL");
  const visibleDisponibles = useMemo(() => disponibles.filter((item) =>
    !normalizedSearch || [item.nombre, item.sku, item.detalle, item.tipoItem]
      .some((value) => value?.toLocaleLowerCase("es-CL").includes(normalizedSearch))),
  [disponibles, normalizedSearch]);
  const visibleEntregados = useMemo(() => entregados.filter((item) =>
    !normalizedSearch || [item.nombre, item.sku, item.detalle, item.trabajador.nombre]
      .some((value) => value?.toLocaleLowerCase("es-CL").includes(normalizedSearch))),
  [entregados, normalizedSearch]);
  const visibleMiEquipo = useMemo(() => miEquipo.filter((item) =>
    !normalizedSearch || [item.nombre, item.sku, item.detalle, item.obra.nombre, item.obra.codigo]
      .some((value) => value?.toLocaleLowerCase("es-CL").includes(normalizedSearch))),
  [miEquipo, normalizedSearch]);
  const visibleHistorialEquipo = useMemo(() => historialEquipo.filter((item) =>
    !normalizedSearch || [item.nombre, item.sku, item.obra.nombre, item.obra.codigo, item.actor.nombre]
      .some((value) => value?.toLocaleLowerCase("es-CL").includes(normalizedSearch))),
  [historialEquipo, normalizedSearch]);

  const totalSeleccionado = Object.values(seleccion).reduce((sum, cantidad) => sum + cantidad, 0);

  const setCantidad = (item: ItemDisponible, next: number) => {
    const cantidad = Math.max(0, Math.min(item.disponible, item.tipoItem === "herramienta" ? Math.min(1, next) : next));
    setSeleccion((current) => {
      const updated = { ...current };
      if (cantidad === 0) delete updated[`${item.tipoItem}:${item.itemId}`];
      else updated[`${item.tipoItem}:${item.itemId}`] = cantidad;
      return updated;
    });
  };

  const confirmAsignacion = async () => {
    if (!obraId || !trabajadorId || totalSeleccionado === 0) return;
    const lineas = disponibles.flatMap((item) => {
      const cantidad = seleccion[`${item.tipoItem}:${item.itemId}`] ?? 0;
      return cantidad > 0 ? [{ tipoItem: item.tipoItem, itemId: item.itemId, cantidad }] : [];
    });
    setSaving(true);
    try {
      await asignarInventario({ obraId, trabajadorId, observacion, lineas });
      await loadSupervisorObra(obraId);
      setSeleccion({});
      setTrabajadorId(null);
      setObservacion("");
      setAsignacionOpen(false);
      setVista("entregado");
      Alert.alert("Asignación registrada", "Los artículos quedaron asignados al operario.");
    } catch (err) {
      Alert.alert("No se pudo asignar", err instanceof Error ? err.message : "Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const recargarOperario = async () => {
    const [equipo, historial] = await Promise.all([getMiEquipo(), getHistorialMiEquipo()]);
    setMiEquipo(equipo);
    setHistorialEquipo(historial);
  };

  const confirmarRecepcion = (item: ItemMiEquipo) => {
    Alert.alert(
      "Confirmar recepción",
      `¿Confirmas que recibiste ${item.cantidad} ${item.cantidad === 1 ? "unidad" : "unidades"} de ${item.nombre}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, recibí",
          onPress: async () => {
            setActionId(item.id);
            try {
              await confirmarRecepcionInventario(item.id);
              await recargarOperario();
            } catch (err) {
              Alert.alert("No se pudo confirmar", err instanceof Error ? err.message : "Intenta nuevamente.");
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const solicitarDevolucion = async () => {
    if (!devolucionItem) return;
    setSaving(true);
    try {
      await solicitarDevolucionInventario(devolucionItem.id, devolucionMotivo);
      await recargarOperario();
      setDevolucionItem(null);
      setDevolucionMotivo("");
      Alert.alert("Devolución informada", "Tu supervisor verá el artículo como pendiente de recepción.");
    } catch (err) {
      Alert.alert("No se pudo solicitar", err instanceof Error ? err.message : "Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const recibirDevolucion = (item: ItemEntregado) => {
    Alert.alert(
      "Recibir devolución",
      `¿Confirmas que ${item.trabajador.nombre} devolvió ${item.cantidad} ${item.cantidad === 1 ? "unidad" : "unidades"} de ${item.nombre}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar recepción",
          onPress: async () => {
            setActionId(item.id);
            try {
              await recibirDevolucionInventario(item.id);
              if (obraId) await loadSupervisorObra(obraId);
              Alert.alert("Devolución recibida", "El artículo volvió a tu inventario disponible.");
            } catch (err) {
              Alert.alert("No se pudo recibir", err instanceof Error ? err.message : "Intenta nuevamente.");
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const devolverABodega = async () => {
    if (!bodegaItem || !obraId) return;
    setSaving(true);
    try {
      await devolverInventarioABodega({
        obraId,
        tipoItem: bodegaItem.tipoItem,
        itemId: bodegaItem.itemId,
        cantidad: bodegaCantidad,
        motivo: bodegaMotivo,
      });
      await loadSupervisorObra(obraId);
      setSeleccion({});
      setBodegaItem(null);
      setBodegaCantidad(1);
      setBodegaMotivo("");
      Alert.alert("Devolución registrada", "Las unidades fueron reintegradas al stock de bodega.");
    } catch (err) {
      Alert.alert("No se pudo devolver", err instanceof Error ? err.message : "Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  };

  const abrirTrazabilidad = async (input: { asignacionId?: string; item?: ItemDisponible }) => {
    setTrazabilidadOpen(true);
    setTrazabilidadLoading(true);
    setTrazabilidad([]);
    try {
      if (input.asignacionId) {
        setTrazabilidad(await getTrazabilidadInventario(input.asignacionId));
      } else if (input.item && obraId) {
        setTrazabilidad(await getTrazabilidadItemInventario({
          obraId,
          tipoItem: input.item.tipoItem,
          itemId: input.item.itemId,
        }));
      }
    } catch (err) {
      Alert.alert("No se pudo cargar", err instanceof Error ? err.message : "Intenta nuevamente.");
      setTrazabilidadOpen(false);
    } finally {
      setTrazabilidadLoading(false);
    }
  };

  if (rol !== "jefeobra" && rol !== "terreno" && !loading) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.headerArea}>
        <BrandHeader subtitle={rol === "jefeobra" ? "Inventario del supervisor" : "Mi equipo asignado"} />
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <MaterialCommunityIcons name={rol === "jefeobra" ? "toolbox-outline" : "account-hard-hat"} size={28} color={COLORS.navy} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>{rol === "jefeobra" ? "CONTROL DE ENTREGA" : "ELEMENTOS A MI CARGO"}</Text>
            <Text style={styles.heroTitle}>{rol === "jefeobra" ? "Inventario" : "Mi equipo"}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.orange} /><Text style={styles.loadingText}>Cargando inventario...</Text></View>
      ) : error ? (
        <View style={styles.center}>
          <MaterialCommunityIcons name="alert-circle-outline" size={36} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => void load()}><Text style={styles.retryText}>Reintentar</Text></Pressable>
        </View>
      ) : rol === "jefeobra" ? (
        <View style={styles.body}>
          <Pressable style={styles.scanInventoryButton} onPress={() => router.push("/inventario-beck/escanear")}>
            <View style={styles.scanInventoryIcon}><MaterialCommunityIcons name="barcode-scan" size={24} color={COLORS.navy} /></View>
            <View style={styles.scanInventoryText}><Text style={styles.scanInventoryTitle}>Escanear código de barra</Text><Text style={styles.scanInventoryHint}>Consulta el custodio o asigna el artículo</Text></View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#fff" />
          </Pressable>
          {obras.length === 0 ? (
            <EmptyState icon="package-variant-closed" title="Sin inventario asignado" message="Cuando bodega te entregue artículos para una obra, aparecerán aquí." />
          ) : (
            <>
              <SelectSheet
                label="Obra"
                value={obraId}
                placeholder="Selecciona una obra"
                options={obras.map((obra) => ({ value: obra.id, label: `${obra.nombre}${obra.codigo ? ` · ${obra.codigo}` : ""}` }))}
                onChange={(value) => void changeObra(value)}
                icon="office-building-outline"
              />
              <View style={styles.searchBox}>
                <MaterialCommunityIcons name="magnify" size={21} color={COLORS.muted} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Buscar artículo, SKU u operario" placeholderTextColor="#94a3b8" style={styles.searchInput} />
                {search ? <Pressable onPress={() => setSearch("")} hitSlop={10}><MaterialCommunityIcons name="close-circle" size={20} color="#94a3b8" /></Pressable> : null}
              </View>
              <View style={styles.segmented}>
                <Pressable style={[styles.segment, vista === "disponible" && styles.segmentActive]} onPress={() => setVista("disponible")}>
                  <Text style={[styles.segmentText, vista === "disponible" && styles.segmentTextActive]}>Disponibles ({disponibles.length})</Text>
                </Pressable>
                <Pressable style={[styles.segment, vista === "entregado" && styles.segmentActive]} onPress={() => setVista("entregado")}>
                  <Text style={[styles.segmentText, vista === "entregado" && styles.segmentTextActive]}>Entregados ({entregados.length})</Text>
                </Pressable>
              </View>
              <FlatList<ItemDisponible | ItemEntregado>
                data={vista === "disponible" ? visibleDisponibles : visibleEntregados}
                keyExtractor={(item) => "disponible" in item ? `${item.tipoItem}:${item.itemId}` : item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={COLORS.orange} />}
                ListEmptyComponent={<EmptyState icon={vista === "disponible" ? "package-variant" : "account-arrow-right-outline"} title={vista === "disponible" ? "Sin artículos disponibles" : "Sin entregas"} message={search ? "No hay resultados para la búsqueda." : vista === "disponible" ? "No tienes stock pendiente de entregar en esta obra." : "Todavía no has asignado artículos a operarios."} />}
                renderItem={({ item }) => "disponible" in item ? (() => {
                  const disponible = item;
                  const cantidad = seleccion[`${disponible.tipoItem}:${disponible.itemId}`] ?? 0;
                  return (
                    <View style={styles.itemCard}>
                      <View style={styles.cardTop}>
                        <View style={styles.typeIcon}><MaterialCommunityIcons name={tipoIcon(disponible.tipoItem)} size={22} color={COLORS.navy} /></View>
                        <View style={styles.itemText}><Text style={styles.typeText}>{tipoLabel(disponible.tipoItem)}</Text><Text style={styles.itemName}>{disponible.nombre}</Text><ItemMeta {...disponible} /></View>
                        <View style={styles.stockBadge}><Text style={styles.stockNumber}>{disponible.disponible}</Text><Text style={styles.stockLabel}>disponible</Text></View>
                      </View>
                      <View style={styles.quantityRow}>
                        <Text style={styles.quantityLabel}>Cantidad a entregar</Text>
                        <View style={styles.stepper}>
                          <Pressable style={styles.stepButton} onPress={() => setCantidad(disponible, cantidad - 1)}><MaterialCommunityIcons name="minus" size={20} color={COLORS.navy} /></Pressable>
                          <Text style={styles.quantityValue}>{cantidad}</Text>
                          <Pressable style={styles.stepButton} onPress={() => setCantidad(disponible, cantidad + 1)}><MaterialCommunityIcons name="plus" size={20} color={COLORS.navy} /></Pressable>
                        </View>
                      </View>
                      <View style={styles.cardActions}>
                        <Pressable style={styles.secondaryAction} onPress={() => void abrirTrazabilidad({ item: disponible })}>
                          <MaterialCommunityIcons name="timeline-clock-outline" size={17} color={COLORS.navy} />
                          <Text style={styles.secondaryActionText}>Trazabilidad</Text>
                        </Pressable>
                        <Pressable
                          style={styles.warehouseAction}
                          onPress={() => {
                            setBodegaItem(disponible);
                            setBodegaCantidad(1);
                            setBodegaMotivo("");
                          }}
                        >
                          <MaterialCommunityIcons name="warehouse" size={17} color="#b91c1c" />
                          <Text style={styles.warehouseActionText}>Devolver a bodega</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })() : (() => {
                  const entrega = item;
                  return (
                    <View style={styles.itemCard}>
                      <View style={styles.cardTop}>
                        <View style={styles.typeIcon}><MaterialCommunityIcons name={tipoIcon(entrega.tipoItem)} size={22} color={COLORS.navy} /></View>
                        <View style={styles.itemText}><Text style={styles.typeText}>{tipoLabel(entrega.tipoItem)}</Text><Text style={styles.itemName}>{entrega.nombre}</Text><ItemMeta {...entrega} /></View>
                        <View style={styles.quantityBadge}><Text style={styles.quantityBadgeText}>×{entrega.cantidad}</Text></View>
                      </View>
                      <View style={styles.deliveryInfo}><MaterialCommunityIcons name="account-outline" size={17} color={COLORS.orange} /><Text style={styles.deliveryStrong}>{entrega.trabajador.nombre}</Text></View>
                      <View style={styles.deliveryInfo}><MaterialCommunityIcons name="calendar-clock" size={16} color={COLORS.muted} /><Text style={styles.deliveryText}>{formatDate(entrega.entregadoAt)}</Text></View>
                      <View style={[styles.statusPill, entrega.devolucionSolicitadaAt ? styles.statusReturn : entrega.recepcionConfirmadaAt ? styles.statusConfirmed : styles.statusPending]}>
                        <MaterialCommunityIcons name={entrega.devolucionSolicitadaAt ? "keyboard-return" : entrega.recepcionConfirmadaAt ? "check-circle" : "clock-outline"} size={15} color={entrega.devolucionSolicitadaAt ? "#b91c1c" : entrega.recepcionConfirmadaAt ? "#047857" : "#92400e"} />
                        <Text style={[styles.statusText, entrega.devolucionSolicitadaAt ? styles.statusReturnText : entrega.recepcionConfirmadaAt ? styles.statusConfirmedText : styles.statusPendingText]}>
                          {entrega.devolucionSolicitadaAt ? "Devolución pendiente" : entrega.recepcionConfirmadaAt ? "Recepción confirmada" : "Esperando confirmación"}
                        </Text>
                      </View>
                      {entrega.devolucionMotivo ? <Text style={styles.observation}>Motivo: {entrega.devolucionMotivo}</Text> : null}
                      {entrega.observacion ? <Text style={styles.observation}>{entrega.observacion}</Text> : null}
                      <View style={styles.cardActions}>
                        <Pressable style={styles.secondaryAction} onPress={() => void abrirTrazabilidad({ asignacionId: entrega.id })}>
                          <MaterialCommunityIcons name="timeline-clock-outline" size={17} color={COLORS.navy} />
                          <Text style={styles.secondaryActionText}>Trazabilidad</Text>
                        </Pressable>
                        {entrega.devolucionSolicitadaAt ? (
                          <Pressable disabled={actionId === entrega.id} style={styles.receiveAction} onPress={() => recibirDevolucion(entrega)}>
                            {actionId === entrega.id ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="package-down" size={17} color="#fff" />}
                            <Text style={styles.receiveActionText}>Recibir devolución</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  );
                })()}
              />
              {vista === "disponible" && totalSeleccionado > 0 ? (
                <View style={styles.floatingArea}>
                  <Pressable style={styles.assignButton} onPress={() => setAsignacionOpen(true)}>
                    <MaterialCommunityIcons name="account-arrow-right" size={22} color="#fff" />
                    <Text style={styles.assignButtonText}>Asignar {totalSeleccionado} {totalSeleccionado === 1 ? "unidad" : "unidades"}</Text>
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </View>
      ) : (
        <View style={styles.body}>
          <View style={styles.searchBox}>
            <MaterialCommunityIcons name="magnify" size={21} color={COLORS.muted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Buscar artículo, SKU u obra" placeholderTextColor="#94a3b8" style={styles.searchInput} />
            {search ? <Pressable onPress={() => setSearch("")} hitSlop={10}><MaterialCommunityIcons name="close-circle" size={20} color="#94a3b8" /></Pressable> : null}
          </View>
          <View style={styles.segmented}>
            <Pressable style={[styles.segment, vistaOperario === "activos" && styles.segmentActive]} onPress={() => setVistaOperario("activos")}>
              <Text style={[styles.segmentText, vistaOperario === "activos" && styles.segmentTextActive]}>A mi cargo ({miEquipo.length})</Text>
            </Pressable>
            <Pressable style={[styles.segment, vistaOperario === "historial" && styles.segmentActive]} onPress={() => setVistaOperario("historial")}>
              <Text style={[styles.segmentText, vistaOperario === "historial" && styles.segmentTextActive]}>Historial</Text>
            </Pressable>
          </View>
          {vistaOperario === "activos" ? <FlatList
            data={visibleMiEquipo}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={COLORS.orange} />}
            ListEmptyComponent={<EmptyState icon="account-hard-hat" title="Sin elementos asignados" message={search ? "No hay resultados para la búsqueda." : "Los artículos que te entregue tu supervisor aparecerán aquí."} />}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.cardTop}>
                  <View style={styles.typeIcon}><MaterialCommunityIcons name={tipoIcon(item.tipoItem)} size={22} color={COLORS.navy} /></View>
                  <View style={styles.itemText}><Text style={styles.typeText}>{tipoLabel(item.tipoItem)}</Text><Text style={styles.itemName}>{item.nombre}</Text><ItemMeta {...item} /></View>
                  <View style={styles.quantityBadge}><Text style={styles.quantityBadgeText}>×{item.cantidad}</Text></View>
                </View>
                <View style={styles.contextBox}>
                  <View style={styles.deliveryInfo}><MaterialCommunityIcons name="office-building-outline" size={17} color={COLORS.orange} /><Text style={styles.deliveryStrong}>{item.obra.nombre}{item.obra.codigo ? ` · ${item.obra.codigo}` : ""}</Text></View>
                  <View style={styles.deliveryInfo}><MaterialCommunityIcons name="account-tie-outline" size={17} color={COLORS.muted} /><Text style={styles.deliveryText}>Supervisor: {item.supervisor.nombre}</Text></View>
                  <View style={styles.deliveryInfo}><MaterialCommunityIcons name="calendar-clock" size={16} color={COLORS.muted} /><Text style={styles.deliveryText}>{formatDate(item.entregadoAt)}</Text></View>
                </View>
                <View style={[styles.statusPill, item.devolucionSolicitadaAt ? styles.statusReturn : item.recepcionConfirmadaAt ? styles.statusConfirmed : styles.statusPending]}>
                  <MaterialCommunityIcons name={item.devolucionSolicitadaAt ? "keyboard-return" : item.recepcionConfirmadaAt ? "check-circle" : "clock-outline"} size={15} color={item.devolucionSolicitadaAt ? "#b91c1c" : item.recepcionConfirmadaAt ? "#047857" : "#92400e"} />
                  <Text style={[styles.statusText, item.devolucionSolicitadaAt ? styles.statusReturnText : item.recepcionConfirmadaAt ? styles.statusConfirmedText : styles.statusPendingText]}>
                    {item.devolucionSolicitadaAt ? "Esperando recepción del supervisor" : item.recepcionConfirmadaAt ? "Recepción confirmada" : "Debes confirmar la recepción"}
                  </Text>
                </View>
                {item.observacion ? <Text style={styles.observation}>{item.observacion}</Text> : null}
                <View style={styles.cardActions}>
                  <Pressable style={styles.secondaryAction} onPress={() => void abrirTrazabilidad({ asignacionId: item.id })}>
                    <MaterialCommunityIcons name="timeline-clock-outline" size={17} color={COLORS.navy} />
                    <Text style={styles.secondaryActionText}>Trazabilidad</Text>
                  </Pressable>
                  {!item.recepcionConfirmadaAt ? (
                    <Pressable disabled={actionId === item.id} style={styles.primarySmallAction} onPress={() => confirmarRecepcion(item)}>
                      {actionId === item.id ? <ActivityIndicator size="small" color="#fff" /> : <MaterialCommunityIcons name="check" size={17} color="#fff" />}
                      <Text style={styles.primarySmallActionText}>Confirmar recepción</Text>
                    </Pressable>
                  ) : !item.devolucionSolicitadaAt ? (
                    <Pressable style={styles.warehouseAction} onPress={() => { setDevolucionItem(item); setDevolucionMotivo(""); }}>
                      <MaterialCommunityIcons name="keyboard-return" size={17} color="#b91c1c" />
                      <Text style={styles.warehouseActionText}>Solicitar devolución</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          /> : <FlatList
            data={visibleHistorialEquipo}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={COLORS.orange} />}
            ListEmptyComponent={<EmptyState icon="history" title="Sin movimientos" message={search ? "No hay resultados para la búsqueda." : "Tus confirmaciones y devoluciones aparecerán aquí."} />}
            renderItem={({ item }) => (
              <Pressable style={styles.itemCard} onPress={() => void abrirTrazabilidad({ asignacionId: item.asignacionId })}>
                <View style={styles.cardTop}>
                  <View style={styles.typeIcon}><MaterialCommunityIcons name={tipoIcon(item.tipoItem)} size={22} color={COLORS.navy} /></View>
                  <View style={styles.itemText}><Text style={styles.typeText}>{accionLabel(item.accion)}</Text><Text style={styles.itemName}>{item.nombre}</Text><Text style={styles.itemMeta}>{item.obra.nombre}{item.obra.codigo ? ` · ${item.obra.codigo}` : ""}</Text></View>
                  <View style={styles.quantityBadge}><Text style={styles.quantityBadgeText}>×{item.cantidad}</Text></View>
                </View>
                <View style={styles.deliveryInfo}><MaterialCommunityIcons name="account-outline" size={16} color={COLORS.muted} /><Text style={styles.deliveryText}>{item.actor.nombre}</Text></View>
                <View style={styles.deliveryInfo}><MaterialCommunityIcons name="calendar-clock" size={16} color={COLORS.muted} /><Text style={styles.deliveryText}>{formatDate(item.fecha)}</Text></View>
                {item.detalleEvento ? <Text style={styles.observation}>{item.detalleEvento}</Text> : null}
                <View style={styles.historyLink}><Text style={styles.historyLinkText}>Ver trazabilidad completa</Text><MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.orange} /></View>
              </Pressable>
            )}
          />}
        </View>
      )}

      <Modal visible={asignacionOpen} animationType="slide" transparent onRequestClose={() => !saving && setAsignacionOpen(false)}>
        <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => !saving && setAsignacionOpen(false)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
              <View style={styles.modalTitleRow}>
                <View><Text style={styles.modalEyebrow}>NUEVA ENTREGA</Text><Text style={styles.modalTitle}>Asignar a operario</Text></View>
                <Pressable style={styles.closeButton} onPress={() => !saving && setAsignacionOpen(false)}><MaterialCommunityIcons name="close" size={22} color={COLORS.navy} /></Pressable>
              </View>
              <View style={styles.summaryBox}><MaterialCommunityIcons name="package-variant" size={22} color={COLORS.orange} /><Text style={styles.summaryText}>{totalSeleccionado} {totalSeleccionado === 1 ? "unidad seleccionada" : "unidades seleccionadas"}</Text></View>
              <SelectSheet label="Operario" value={trabajadorId} placeholder={operarios.length ? "Selecciona un operario" : "No hay operarios vinculados a la obra"} options={operarios.map((persona) => ({ value: persona.id, label: `${persona.nombre} · ${persona.email}` }))} onChange={setTrabajadorId} icon="account-hard-hat" />
              <Text style={styles.inputLabel}>Observación opcional</Text>
              <TextInput style={styles.observationInput} value={observacion} onChangeText={setObservacion} placeholder="Ej.: Entrega para trabajos del piso 2" placeholderTextColor="#94a3b8" multiline maxLength={1000} />
              <Pressable disabled={!trabajadorId || saving} style={[styles.confirmButton, (!trabajadorId || saving) && styles.disabledButton]} onPress={() => void confirmAsignacion()}>
                {saving ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="check-circle-outline" size={21} color="#fff" /><Text style={styles.confirmButtonText}>Confirmar entrega</Text></>}
              </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(devolucionItem)} animationType="slide" transparent onRequestClose={() => !saving && setDevolucionItem(null)}>
        <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => !saving && setDevolucionItem(null)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
                <View style={styles.modalTitleRow}>
                  <View><Text style={styles.modalEyebrow}>DEVOLUCIÓN</Text><Text style={styles.modalTitle}>Informar al supervisor</Text></View>
                  <Pressable style={styles.closeButton} onPress={() => !saving && setDevolucionItem(null)}><MaterialCommunityIcons name="close" size={22} color={COLORS.navy} /></Pressable>
                </View>
                {devolucionItem ? <View style={styles.summaryBox}><MaterialCommunityIcons name={tipoIcon(devolucionItem.tipoItem)} size={22} color={COLORS.orange} /><Text style={styles.summaryText}>{devolucionItem.nombre} · {devolucionItem.cantidad} {devolucionItem.cantidad === 1 ? "unidad" : "unidades"}</Text></View> : null}
                <Text style={styles.inputLabel}>Motivo u observación opcional</Text>
                <TextInput style={styles.observationInput} value={devolucionMotivo} onChangeText={setDevolucionMotivo} placeholder="Ej.: Trabajo terminado o cambio de talla" placeholderTextColor="#94a3b8" multiline maxLength={1000} />
                <Pressable disabled={saving} style={[styles.confirmButton, saving && styles.disabledButton]} onPress={() => void solicitarDevolucion()}>
                  {saving ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="keyboard-return" size={21} color="#fff" /><Text style={styles.confirmButtonText}>Solicitar devolución</Text></>}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={Boolean(bodegaItem)} animationType="slide" transparent onRequestClose={() => !saving && setBodegaItem(null)}>
        <KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <Pressable style={styles.modalOverlay} onPress={() => !saving && setBodegaItem(null)}>
            <Pressable style={styles.modalSheet} onPress={() => {}}>
              <View style={styles.modalHandle} />
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}>
                <View style={styles.modalTitleRow}>
                  <View><Text style={styles.modalEyebrow}>DEVOLUCIÓN A BODEGA</Text><Text style={styles.modalTitle}>Reintegrar stock</Text></View>
                  <Pressable style={styles.closeButton} onPress={() => !saving && setBodegaItem(null)}><MaterialCommunityIcons name="close" size={22} color={COLORS.navy} /></Pressable>
                </View>
                {bodegaItem ? <>
                  <View style={styles.summaryBox}><MaterialCommunityIcons name={tipoIcon(bodegaItem.tipoItem)} size={22} color={COLORS.orange} /><Text style={styles.summaryText}>{bodegaItem.nombre} · {bodegaItem.disponible} disponibles</Text></View>
                  <View style={styles.returnQuantityBox}>
                    <Text style={styles.inputLabel}>Cantidad a devolver</Text>
                    <View style={styles.stepper}>
                      <Pressable style={styles.stepButton} onPress={() => setBodegaCantidad((value) => Math.max(1, value - 1))}><MaterialCommunityIcons name="minus" size={20} color={COLORS.navy} /></Pressable>
                      <Text style={styles.quantityValue}>{bodegaCantidad}</Text>
                      <Pressable style={styles.stepButton} onPress={() => setBodegaCantidad((value) => Math.min(bodegaItem.disponible, bodegaItem.tipoItem === "herramienta" ? 1 : value + 1))}><MaterialCommunityIcons name="plus" size={20} color={COLORS.navy} /></Pressable>
                    </View>
                  </View>
                </> : null}
                <Text style={styles.inputLabel}>Motivo u observación opcional</Text>
                <TextInput style={styles.observationInput} value={bodegaMotivo} onChangeText={setBodegaMotivo} placeholder="Ej.: Sobrante de obra" placeholderTextColor="#94a3b8" multiline maxLength={1000} />
                <Pressable disabled={saving} style={[styles.dangerButton, saving && styles.disabledButton]} onPress={() => void devolverABodega()}>
                  {saving ? <ActivityIndicator color="#fff" /> : <><MaterialCommunityIcons name="warehouse" size={21} color="#fff" /><Text style={styles.confirmButtonText}>Confirmar devolución a bodega</Text></>}
                </Pressable>
              </ScrollView>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={trazabilidadOpen} animationType="slide" transparent onRequestClose={() => setTrazabilidadOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTrazabilidadOpen(false)}>
          <Pressable style={[styles.modalSheet, styles.traceSheet]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <View style={styles.modalTitleRow}>
              <View><Text style={styles.modalEyebrow}>HISTORIAL INMUTABLE</Text><Text style={styles.modalTitle}>Trazabilidad</Text></View>
              <Pressable style={styles.closeButton} onPress={() => setTrazabilidadOpen(false)}><MaterialCommunityIcons name="close" size={22} color={COLORS.navy} /></Pressable>
            </View>
            {trazabilidadLoading ? <View style={styles.traceLoading}><ActivityIndicator color={COLORS.orange} /><Text style={styles.loadingText}>Cargando movimientos...</Text></View> : (
              <FlatList
                data={trazabilidad}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.traceList}
                ListEmptyComponent={<EmptyState icon="timeline-clock-outline" title="Sin movimientos" message="Todavía no existe trazabilidad para este artículo." />}
                renderItem={({ item, index }) => (
                  <View style={styles.traceRow}>
                    <View style={styles.traceRail}>
                      <View style={styles.traceDot} />
                      {index < trazabilidad.length - 1 ? <View style={styles.traceLine} /> : null}
                    </View>
                    <View style={styles.traceContent}>
                      <Text style={styles.traceAction}>{accionLabel(item.accion)}</Text>
                      <Text style={styles.traceMeta}>{formatDate(item.created_at)} · {item.usuarios_trazabilidad_inventario_beck_actor_idTousuarios.nombre}</Text>
                      <Text style={styles.traceQuantity}>{item.cantidad} {item.cantidad === 1 ? "unidad" : "unidades"}</Text>
                      {item.detalle ? <Text style={styles.traceDetail}>{item.detalle}</Text> : null}
                    </View>
                  </View>
                )}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  headerArea: { paddingHorizontal: 14, paddingTop: 8 },
  hero: { alignItems: "center", backgroundColor: COLORS.navy, borderColor: COLORS.yellow, borderRadius: 20, borderWidth: 1, flexDirection: "row", gap: 13, padding: 16 },
  heroIcon: { alignItems: "center", backgroundColor: COLORS.yellow, borderRadius: 14, height: 50, justifyContent: "center", width: 50 },
  heroText: { flex: 1 },
  heroEyebrow: { color: COLORS.yellow, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  heroTitle: { color: "#fff", fontSize: 24, fontWeight: "900", marginTop: 2 },
  body: { flex: 1, paddingHorizontal: 14, paddingTop: 12 },
  center: { alignItems: "center", flex: 1, justifyContent: "center", padding: 30 },
  loadingText: { color: COLORS.muted, fontWeight: "700", marginTop: 10 },
  errorText: { color: "#991b1b", fontWeight: "700", marginTop: 10, textAlign: "center" },
  retryButton: { backgroundColor: COLORS.navy, borderRadius: 14, marginTop: 16, paddingHorizontal: 22, paddingVertical: 12 },
  retryText: { color: "#fff", fontWeight: "800" },
  searchBox: { alignItems: "center", backgroundColor: "#fff", borderColor: "#cbd5e1", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 9, minHeight: 50, paddingHorizontal: 14 },
  scanInventoryButton: { alignItems: "center", backgroundColor: COLORS.navy, borderRadius: 16, flexDirection: "row", gap: 10, marginBottom: 12, padding: 11 },
  scanInventoryIcon: { alignItems: "center", backgroundColor: COLORS.yellow, borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  scanInventoryText: { flex: 1 },
  scanInventoryTitle: { color: "#fff", fontSize: 13, fontWeight: "900" },
  scanInventoryHint: { color: "#cbd5e1", fontSize: 10, marginTop: 2 },
  searchInput: { color: COLORS.navy, flex: 1, fontSize: 14, paddingVertical: 11 },
  segmented: { backgroundColor: "#e2e8f0", borderRadius: 14, flexDirection: "row", gap: 4, marginTop: 10, padding: 4 },
  segment: { alignItems: "center", borderRadius: 11, flex: 1, paddingHorizontal: 7, paddingVertical: 10 },
  segmentActive: { backgroundColor: COLORS.navy },
  segmentText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  segmentTextActive: { color: "#fff" },
  listContent: { gap: 10, paddingBottom: 110, paddingTop: 12 },
  itemCard: { backgroundColor: "#fffdf8", borderColor: COLORS.border, borderRadius: 18, borderWidth: 1, padding: 13, shadowColor: "#0f172a", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  cardTop: { alignItems: "flex-start", flexDirection: "row", gap: 10 },
  typeIcon: { alignItems: "center", backgroundColor: "#fef3c7", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  itemText: { flex: 1, minWidth: 0 },
  typeText: { color: COLORS.orange, fontSize: 10, fontWeight: "900", letterSpacing: 0.7, textTransform: "uppercase" },
  itemName: { color: COLORS.navy, fontSize: 15, fontWeight: "900", marginTop: 1 },
  itemMeta: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  stockBadge: { alignItems: "center", backgroundColor: "#ecfdf5", borderRadius: 11, minWidth: 56, paddingHorizontal: 8, paddingVertical: 5 },
  stockNumber: { color: "#047857", fontSize: 17, fontWeight: "900" },
  stockLabel: { color: "#047857", fontSize: 8, fontWeight: "800", textTransform: "uppercase" },
  quantityBadge: { backgroundColor: COLORS.navy, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  quantityBadgeText: { color: "#fff", fontWeight: "900" },
  quantityRow: { alignItems: "center", borderTopColor: "#ffedd5", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 11, paddingTop: 10 },
  quantityLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  stepper: { alignItems: "center", flexDirection: "row", gap: 13 },
  stepButton: { alignItems: "center", backgroundColor: "#fef3c7", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  quantityValue: { color: COLORS.navy, fontSize: 18, fontWeight: "900", minWidth: 22, textAlign: "center" },
  deliveryInfo: { alignItems: "center", flexDirection: "row", gap: 7, marginTop: 8 },
  deliveryStrong: { color: COLORS.navy, flex: 1, fontSize: 12, fontWeight: "800" },
  deliveryText: { color: COLORS.muted, flex: 1, fontSize: 12, fontWeight: "600" },
  observation: { backgroundColor: "#f8fafc", borderRadius: 10, color: COLORS.muted, fontSize: 11, marginTop: 9, padding: 9 },
  statusPill: { alignItems: "center", alignSelf: "flex-start", borderRadius: 12, flexDirection: "row", gap: 6, marginTop: 10, paddingHorizontal: 9, paddingVertical: 6 },
  statusPending: { backgroundColor: "#fffbeb" },
  statusConfirmed: { backgroundColor: "#ecfdf5" },
  statusReturn: { backgroundColor: "#fef2f2" },
  statusText: { fontSize: 10, fontWeight: "900" },
  statusPendingText: { color: "#92400e" },
  statusConfirmedText: { color: "#047857" },
  statusReturnText: { color: "#b91c1c" },
  cardActions: { alignItems: "center", borderTopColor: "#ffedd5", borderTopWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 11, paddingTop: 10 },
  secondaryAction: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 11, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  secondaryActionText: { color: COLORS.navy, fontSize: 11, fontWeight: "800" },
  warehouseAction: { alignItems: "center", backgroundColor: "#fef2f2", borderRadius: 11, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  warehouseActionText: { color: "#b91c1c", fontSize: 11, fontWeight: "800" },
  primarySmallAction: { alignItems: "center", backgroundColor: COLORS.orange, borderRadius: 11, flexDirection: "row", gap: 5, minHeight: 34, paddingHorizontal: 10, paddingVertical: 8 },
  primarySmallActionText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  receiveAction: { alignItems: "center", backgroundColor: "#15803d", borderRadius: 11, flexDirection: "row", gap: 5, minHeight: 34, paddingHorizontal: 10, paddingVertical: 8 },
  receiveActionText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  historyLink: { alignItems: "center", borderTopColor: "#ffedd5", borderTopWidth: 1, flexDirection: "row", justifyContent: "space-between", marginTop: 10, paddingTop: 9 },
  historyLinkText: { color: COLORS.orange, fontSize: 11, fontWeight: "900" },
  contextBox: { backgroundColor: COLORS.pale, borderColor: "#ffedd5", borderRadius: 12, borderWidth: 1, marginTop: 10, paddingBottom: 8, paddingHorizontal: 10 },
  emptyState: { alignItems: "center", paddingHorizontal: 26, paddingVertical: 42 },
  emptyIcon: { alignItems: "center", backgroundColor: "#ffedd5", borderRadius: 22, height: 58, justifyContent: "center", width: 58 },
  emptyTitle: { color: COLORS.navy, fontSize: 17, fontWeight: "900", marginTop: 12 },
  emptyMessage: { color: COLORS.muted, lineHeight: 19, marginTop: 5, textAlign: "center" },
  floatingArea: { bottom: 10, left: 14, position: "absolute", right: 14 },
  assignButton: { alignItems: "center", backgroundColor: COLORS.orange, borderRadius: 16, flexDirection: "row", gap: 9, justifyContent: "center", paddingVertical: 15, shadowColor: "#0f172a", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 },
  assignButtonText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  keyboardAvoider: { flex: 1 },
  modalOverlay: { backgroundColor: "rgba(15,23,42,0.55)", flex: 1, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: COLORS.background, borderTopLeftRadius: 26, borderTopRightRadius: 26, maxHeight: "85%", paddingBottom: 30, paddingHorizontal: 16, paddingTop: 10 },
  modalHandle: { alignSelf: "center", backgroundColor: "#cbd5e1", borderRadius: 2, height: 4, marginBottom: 14, width: 42 },
  modalTitleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  modalEyebrow: { color: COLORS.orange, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  modalTitle: { color: COLORS.navy, fontSize: 22, fontWeight: "900" },
  closeButton: { alignItems: "center", backgroundColor: "#e2e8f0", borderRadius: 19, height: 38, justifyContent: "center", width: 38 },
  summaryBox: { alignItems: "center", backgroundColor: COLORS.pale, borderColor: COLORS.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 9, marginBottom: 12, padding: 12 },
  summaryText: { color: COLORS.navy, fontWeight: "800" },
  inputLabel: { color: COLORS.navy, fontSize: 12, fontWeight: "800", marginBottom: 6 },
  observationInput: { backgroundColor: "#fff", borderColor: "#cbd5e1", borderRadius: 16, borderWidth: 1, color: COLORS.navy, minHeight: 90, padding: 13, textAlignVertical: "top" },
  confirmButton: { alignItems: "center", backgroundColor: COLORS.orange, borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16, minHeight: 52 },
  confirmButtonText: { color: "#fff", fontSize: 15, fontWeight: "900" },
  dangerButton: { alignItems: "center", backgroundColor: "#dc2626", borderRadius: 16, flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 16, minHeight: 52 },
  returnQuantityBox: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  traceSheet: { height: "78%" },
  traceLoading: { alignItems: "center", flex: 1, justifyContent: "center" },
  traceList: { paddingBottom: 20 },
  traceRow: { flexDirection: "row", minHeight: 82 },
  traceRail: { alignItems: "center", width: 28 },
  traceDot: { backgroundColor: COLORS.yellow, borderColor: COLORS.navy, borderRadius: 7, borderWidth: 2, height: 14, marginTop: 4, width: 14 },
  traceLine: { backgroundColor: "#cbd5e1", flex: 1, marginVertical: 3, width: 2 },
  traceContent: { flex: 1, paddingBottom: 16, paddingLeft: 5 },
  traceAction: { color: COLORS.navy, fontSize: 14, fontWeight: "900" },
  traceMeta: { color: COLORS.muted, fontSize: 10, marginTop: 3 },
  traceQuantity: { color: COLORS.orange, fontSize: 11, fontWeight: "900", marginTop: 4 },
  traceDetail: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  disabledButton: { opacity: 0.45 },
});
