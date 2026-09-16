import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SelectSheet } from "@/components/SelectSheet";
import { BodegaAssignmentCard } from "@/components/BodegaAssignmentCard";
import { BodegaTraceModal } from "@/components/BodegaTraceModal";
import {
  BodegaButton,
  BodegaHeader,
  BodegaListFooter,
  bodegaStyles as s,
  useBodegaList,
  useBodegaMutation,
} from "@/components/BodegaBeckUI";
import {
  bodegaRequest,
  compartirEtiquetasBodega,
  type AsignacionBodega,
  type OpcionesBodega,
} from "@/services/api/bodegaBeckApi";
type Evento = {
  id: string;
  accion: string;
  detalle: string;
  cantidad: number;
  created_at: string;
  usuarios_trazabilidad_inventario_beck_actor_idTousuarios: { nombre: string };
};
function Trazabilidad({ id }: { id: string }) {
  const list = useBodegaList<Evento>(`/asignaciones/${id}/trazabilidad`);
  return (
    <>
      {list.items.map((e) => (
        <View key={e.id} style={traceStyles.event}>
          <Text style={traceStyles.title}>{e.detalle || e.accion}</Text>
          <Text style={traceStyles.text}>
            {e.usuarios_trazabilidad_inventario_beck_actor_idTousuarios.nombre}{" "}
            · {e.cantidad} {e.cantidad === 1 ? "unidad" : "unidades"}
          </Text>
          <Text style={traceStyles.date}>
            {new Date(e.created_at).toLocaleString("es-CL")}
          </Text>
        </View>
      ))}
      {(list.loading || !!list.error) && (
        <BodegaListFooter
          loading={list.loading}
          error={list.error}
          retry={list.refresh}
        />
      )}
      {list.hasMore && (
        <BodegaButton
          title="Ver movimientos anteriores"
          onPress={list.more}
          disabled={list.loading}
        />
      )}
      {!list.loading && !list.error && !list.items.length && (
        <Text style={s.text}>
          No hay movimientos registrados para esta asignación.
        </Text>
      )}
    </>
  );
}
export default function AsignacionesBodega() {
  const [estado, setEstado] = useState<string | null>("asignado"),
    [obra, setObra] = useState<string | null>(null),
    [supervisor, setSupervisor] = useState<string | null>(null);
  const [opciones, setOpciones] = useState<OpcionesBodega>({
    obras: [],
    supervisores: [],
  });
  const [historialId, setHistorialId] = useState<string | null>(null);
  const { mutate, saving } = useBodegaMutation();
  const list = useBodegaList<AsignacionBodega>(
    `/asignaciones?estado=${estado || "todos"}${obra ? `&obraId=${obra}` : ""}${supervisor ? `&supervisorId=${supervisor}` : ""}`,
  );
  useEffect(() => {
    bodegaRequest<OpcionesBodega>("/opciones")
      .then(setOpciones)
      .catch((e) => Alert.alert("Filtros no disponibles", e.message));
  }, []);
  const { refresh } = list;
  const onTrace = useCallback(
    (item: AsignacionBodega) => setHistorialId(item.id),
    [],
  );
  const onLabels = useCallback((item: AsignacionBodega) => {
    void compartirEtiquetasBodega({ asignacionId: item.id }).catch((e) =>
      Alert.alert("Etiquetas", e.message),
    );
  }, []);
  const onReceive = useCallback(
    (item: AsignacionBodega) => {
      Alert.alert(
        "Recibir devolución",
        `¿Recibiste físicamente ${item.cantidad} unidades de ${item.nombre}? Se reintegrarán al stock una sola vez.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Confirmar",
            onPress: () => {
              void mutate(`/asignaciones/${item.id}/recibir`, {}).then((ok) => {
                if (ok) void refresh();
              });
            },
          },
        ],
      );
    },
    [mutate, refresh],
  );
  const renderItem = useCallback(
    ({ item }: { item: AsignacionBodega }) => (
      <BodegaAssignmentCard
        item={item}
        busy={saving}
        onTrace={onTrace}
        onLabels={onLabels}
        onReceive={onReceive}
      />
    ),
    [saving, onTrace, onLabels, onReceive],
  );
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <BodegaHeader title="Asignaciones" />
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <SelectSheet
          label="Estado"
          value={estado}
          placeholder="Estado"
          options={[
            { value: "asignado", label: "Asignaciones activas" },
            { value: "por_recibir", label: "Por recibir en bodega" },
            { value: "devuelto", label: "Devueltas a bodega" },
            { value: "todos", label: "Todas" },
          ]}
          onChange={setEstado}
        />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <SelectSheet
              label="Obra"
              value={obra}
              placeholder="Todas las obras"
              options={opciones.obras.map((o) => ({
                value: o.id,
                label: `${o.codigo} · ${o.nombre}`,
              }))}
              includeAllOption={{ label: "Todas las obras" }}
              onChange={setObra}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectSheet
              label="Supervisor"
              value={supervisor}
              placeholder="Todos"
              options={opciones.supervisores.map((u) => ({
                value: u.id,
                label: u.nombre,
              }))}
              includeAllOption={{ label: "Todos" }}
              onChange={setSupervisor}
            />
          </View>
        </View>
      </View>
      <FlatList
        data={list.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.content}
        refreshing={list.refreshing}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        onRefresh={list.refresh}
        onEndReached={list.more}
        ListFooterComponent={
          <BodegaListFooter
            loading={list.loading}
            error={list.error}
            retry={list.refresh}
          />
        }
        ListEmptyComponent={
          !list.loading && !list.error ? (
            <Text style={s.text}>No hay asignaciones para estos filtros.</Text>
          ) : null
        }
        renderItem={renderItem}
      />
      <BodegaTraceModal
        open={historialId !== null}
        onClose={() => setHistorialId(null)}
      >
        {historialId && <Trazabilidad key={historialId} id={historialId} />}
      </BodegaTraceModal>
    </SafeAreaView>
  );
}

const traceStyles = StyleSheet.create({
  event: {
    backgroundColor: "#fffdf5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#f1dfa0",
    borderLeftWidth: 3,
    borderLeftColor: "#ffc400",
    padding: 11,
    gap: 5,
  },
  title: { color: "#0f172a", fontSize: 14, fontWeight: "700", lineHeight: 19 },
  text: { color: "#475569", fontSize: 12, lineHeight: 17 },
  date: { color: "#64748b", fontSize: 11, lineHeight: 16 },
});
