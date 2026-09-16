import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import {
  BodegaInventoryCard,
  type BodegaInventoryAction,
} from "@/components/BodegaInventoryCard";
import { BodegaArticleFields } from "@/components/BodegaArticleFields";
import { SelectSheet } from "@/components/SelectSheet";
import {
  BodegaButton,
  BodegaHeader,
  BodegaInput,
  BodegaListFooter,
  BodegaModal,
  bodegaStyles as s,
  useBodegaList,
  useBodegaMutation,
} from "@/components/BodegaBeckUI";
import {
  bodegaRequest,
  compartirEtiquetasBodega,
  type ArticuloBodega,
  type OpcionesBodega,
  type TipoBodega,
} from "@/services/api/bodegaBeckApi";

export default function BodegaInventario() {
  const [tipo, setTipo] = useState<TipoBodega>("epp"),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [estado, setEstado] = useState("true");
  const [modal, setModal] = useState<"editar" | "stock" | "asignar" | null>(
      null,
    ),
    [item, setItem] = useState<ArticuloBodega | null>(null);
  const [form, setForm] = useState<Record<string, string>>({}),
    [cantidad, setCantidad] = useState("1"),
    [motivo, setMotivo] = useState("");
  const [opciones, setOpciones] = useState<OpcionesBodega>({
      obras: [],
      supervisores: [],
    }),
    [obra, setObra] = useState<string | null>(null),
    [supervisor, setSupervisor] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false),
    [optionsError, setOptionsError] = useState("");
  const { mutate, saving } = useBodegaMutation();
  useEffect(() => {
    const id = setTimeout(() => setSearch(query), 300);
    return () => clearTimeout(id);
  }, [query]);
  const list = useBodegaList<ArticuloBodega>(
    `/articulos/${tipo}?q=${encodeURIComponent(search)}&activo=${estado}`,
  );
  const fields =
    tipo === "herramienta"
      ? [
          ["marca", "Marca"],
          ["modelo", "Modelo"],
          ["categoria", "Categoría"],
          ["ubicacion", "Ubicación"],
          ["fecha_compra", "Fecha de compra (AAAA-MM-DD)"],
          ["fecha_mantencion", "Fecha de mantención (AAAA-MM-DD)"],
        ]
      : [
          ["modelo_marca", "Modelo / marca"],
          ["unidad_medida", "Unidad de medida"],
          [tipo === "epp" ? "talla" : "talla_medida", "Talla / medida"],
          ["color", "Color"],
          ...(tipo === "implemento"
            ? [
                ["ubicacion", "Ubicación"],
                ["fecha", "Fecha (AAAA-MM-DD)"],
              ]
            : []),
        ];
  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setOptionsError("");
    try {
      setOpciones(await bodegaRequest("/opciones"));
    } catch (e) {
      setOptionsError(
        e instanceof Error ? e.message : "No se pudieron obtener las opciones",
      );
    } finally {
      setLoadingOptions(false);
    }
  }, []);
  const open = useCallback(
    (action: typeof modal, selected: ArticuloBodega | null) => {
      setItem(selected);
      setForm(
        Object.fromEntries(
          Object.entries(selected || { nombre: "", stock: "0" }).map(
            ([k, v]) => [
              k,
              k.startsWith("fecha")
                ? String(v ?? "").slice(0, 10)
                : String(v ?? ""),
            ],
          ),
        ),
      );
      setCantidad("1");
      setMotivo("");
      setObra(null);
      setSupervisor(null);
      setModal(action);
      if (action === "asignar") void loadOptions();
    },
    [loadOptions],
  );
  const { refresh } = list;
  const handleAction = useCallback(
    (action: BodegaInventoryAction, row: ArticuloBodega) => {
      if (action === "editar" || action === "stock" || action === "asignar") {
        open(action, row);
      } else if (action === "sku") {
        void mutate(`/articulos/${tipo}/${row.id}/sku`, {}).then((ok) => {
          if (ok) void refresh();
        });
      } else if (action === "etiqueta") {
        void compartirEtiquetasBodega({ tipo, id: row.id }).catch((e) =>
          Alert.alert("Etiquetas", e.message),
        );
      } else {
        Alert.alert(
          "Cambiar estado",
          `${row.activo ? "Desactivar" : "Activar"} ${row.nombre}?`,
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Confirmar",
              onPress: () => {
                void mutate(
                  `/articulos/${tipo}/${row.id}`,
                  {
                    nombre: row.nombre,
                    activo: !row.activo,
                  },
                  "PUT",
                ).then((ok) => {
                  if (ok) void refresh();
                });
              },
            },
          ],
        );
      }
    },
    [mutate, open, refresh, tipo],
  );
  const renderItem = useCallback(
    ({ item: row }: { item: ArticuloBodega }) => (
      <BodegaInventoryCard
        item={row}
        tipo={tipo}
        busy={saving}
        onAction={handleAction}
      />
    ),
    [handleAction, saving, tipo],
  );
  const save = async () => {
    if (modal === "editar") {
      const data: Record<string, unknown> = {
        nombre: form.nombre,
        ...Object.fromEntries(fields.map(([k]) => [k, form[k] || ""])),
        activo: item?.activo ?? true,
        ...(!item ? { stock: form.stock || "0" } : {}),
      };
      if (
        await mutate(
          `/articulos/${tipo}${item ? `/${item.id}` : ""}`,
          data,
          item ? "PUT" : "POST",
        )
      ) {
        setModal(null);
        void list.refresh();
      }
    } else if (modal === "stock" && item) {
      if (
        await mutate(`/articulos/${tipo}/${item.id}/stock`, {
          cantidad,
          motivo,
        })
      ) {
        setModal(null);
        void list.refresh();
      }
    } else if (modal === "asignar" && item) {
      if (!obra || !supervisor)
        return Alert.alert("Faltan datos", "Selecciona obra y supervisor.");
      if (
        await mutate("/asignaciones", {
          obraId: obra,
          supervisorId: supervisor,
          observacion: motivo,
          lineas: [
            { tipoItem: tipo, itemId: item.id, cantidad: Number(cantidad) },
          ],
        })
      ) {
        setModal(null);
        void list.refresh();
        Alert.alert(
          "Entrega registrada",
          "El supervisor ya puede consultar los artículos en la app.",
        );
      }
    }
  };
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <BodegaHeader title="Inventario" />
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <SelectSheet
              label="Tipo"
              value={tipo}
              placeholder="Tipo"
              options={[
                { value: "epp", label: "EPP" },
                { value: "implemento", label: "Implementos" },
                { value: "herramienta", label: "Herramientas" },
              ]}
              onChange={(v) => setTipo(v as TipoBodega)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <SelectSheet
              label="Estado"
              value={estado}
              placeholder="Estado"
              options={[
                { value: "true", label: "Activos" },
                { value: "false", label: "Inactivos" },
                { value: "todos", label: "Todos" },
              ]}
              onChange={(v) => setEstado(v || "true")}
            />
          </View>
        </View>
        <BeckSearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre o SKU"
        />
        <View style={s.row}>
          <BodegaButton
            title="+ Nuevo artículo"
            secondary
            onPress={() => open("editar", null)}
          />
          <BodegaButton
            title="Escanear"
            onPress={() => router.push("/bodega-beck/escanear")}
          />
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
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          !list.loading && !list.error ? (
            <Text style={s.text}>No hay artículos para estos filtros.</Text>
          ) : null
        }
        ListFooterComponent={
          <BodegaListFooter
            loading={list.loading}
            error={list.error}
            retry={list.refresh}
          />
        }
        renderItem={renderItem}
      />
      <BodegaModal
        title={
          modal === "editar"
            ? item
              ? "Editar artículo"
              : "Nuevo artículo"
            : modal === "stock"
              ? "Ajustar stock"
              : "Asignar al supervisor"
        }
        open={!!modal}
        onClose={() => setModal(null)}
        busy={saving}
        footer={
          <BodegaButton
            title={
              saving
                ? "Guardando…"
                : modal === "editar"
                  ? item
                    ? "Guardar cambios"
                    : "Crear artículo"
                  : "Confirmar"
            }
            disabled={
              saving ||
              (modal === "asignar" && (loadingOptions || !!optionsError))
            }
            secondary
            onPress={() => void save()}
          />
        }
      >
        {item && (
          <View style={s.card}>
            <Text style={s.name}>{item.nombre}</Text>
            <Text style={s.text}>Disponible: {item.disponible}</Text>
          </View>
        )}
        {modal === "editar" ? (
          <BodegaArticleFields
            tipo={tipo}
            fields={fields}
            form={form}
            editing={!!item}
            onChange={(key, value) => setForm((p) => ({ ...p, [key]: value }))}
          />
        ) : (
          <>
            {modal === "asignar" && (
              <>
                <SelectSheet
                  label="Obra"
                  value={obra}
                  placeholder="Selecciona una obra"
                  options={opciones.obras.map((o) => ({
                    value: o.id,
                    label: `${o.codigo} · ${o.nombre}`,
                  }))}
                  onChange={setObra}
                />
                <SelectSheet
                  label="Supervisor"
                  value={supervisor}
                  placeholder="Selecciona un supervisor"
                  options={opciones.supervisores.map((u) => ({
                    value: u.id,
                    label: u.nombre,
                  }))}
                  onChange={setSupervisor}
                />
                <BodegaListFooter
                  loading={loadingOptions}
                  error={optionsError}
                  retry={() => void loadOptions()}
                />
              </>
            )}
            <BodegaInput
              numeric
              label={
                modal === "stock"
                  ? "Unidades (+ entrada / − salida)"
                  : "Cantidad a entregar"
              }
              value={cantidad}
              onChangeText={setCantidad}
            />
            <BodegaInput
              label={
                modal === "stock"
                  ? "Motivo obligatorio"
                  : "Observación opcional"
              }
              value={motivo}
              onChangeText={setMotivo}
            />
          </>
        )}
      </BodegaModal>
    </SafeAreaView>
  );
}
