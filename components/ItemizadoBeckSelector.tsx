import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Text } from "react-native-paper";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import {
  getItemizadoOpciones,
  type ItemizadoOpcionApi,
} from "@/services/api/itemizadoOpcionesApi";
import {
  filtrarItemizados,
  opcionesFiltroItemizado,
} from "@/utils/itemizadoFiltros";

// Selector de Itemizado BECK al editar un registro (supervisor e ingeniería). Carga una
// vez los itemizados visibles de la obra del registro y filtra en el teléfono por texto,
// elemento atravesado y materialidad, con opciones que salen solo de esa obra.

type Props = {
  visible: boolean;
  obraId?: string | null;
  onClose: () => void;
  onSelect: (opcion: ItemizadoOpcionApi) => void;
};

type OpcionFiltro = { value: string; label: string };
type FiltroAbierto = "tipo" | "elemento" | "materialidad" | null;

// Botón del desplegable, con el estilo de los filtros de la app. Las opciones se abren
// debajo, dentro de la misma ventana: abrir otra ventana encima falla en iPhone.
function BotonDesplegable({
  titulo,
  opciones,
  valor,
  abierto,
  onToggle,
  onLimpiar,
}: {
  titulo: string;
  opciones: OpcionFiltro[];
  valor: string;
  abierto: boolean;
  onToggle: () => void;
  onLimpiar: () => void;
}) {
  const etiqueta = opciones.find((o) => o.value === valor)?.label ?? "Todos";
  const deshabilitado = opciones.length === 0;
  return (
    <View
      style={[
        styles.desplegable,
        abierto && styles.desplegableAbierto,
        deshabilitado && styles.desplegableDeshabilitado,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${titulo}: ${etiqueta}`}
        accessibilityState={{ expanded: abierto, disabled: deshabilitado }}
        disabled={deshabilitado}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.desplegableBoton,
          pressed && styles.presionado,
        ]}
      >
        <View style={styles.desplegableTextos}>
          <Text
            style={styles.desplegableTitulo}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {titulo}
          </Text>
          <Text
            style={[
              styles.desplegableValor,
              valor ? styles.desplegableValorActivo : null,
            ]}
            numberOfLines={1}
          >
            {deshabilitado ? "Sin datos" : etiqueta}
          </Text>
        </View>
        {valor ? null : (
          <MaterialCommunityIcons
            name={abierto ? "chevron-up" : "chevron-down"}
            size={20}
            color="#64748b"
          />
        )}
      </Pressable>
      {valor ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar filtro ${titulo.toLowerCase()}`}
          onPress={onLimpiar}
          hitSlop={8}
          style={styles.desplegableQuitar}
        >
          <MaterialCommunityIcons name="close" size={17} color="#64748b" />
        </Pressable>
      ) : null}
    </View>
  );
}

function ListaDesplegable({
  opciones,
  valor,
  onElegir,
}: {
  opciones: OpcionFiltro[];
  valor: string;
  onElegir: (valor: string) => void;
}) {
  const todas = [{ value: "", label: "Todos" }, ...opciones];
  return (
    <View style={styles.lista}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {todas.map((opcion) => {
          const elegida = opcion.value === valor;
          return (
            <Pressable
              key={opcion.value || "todos"}
              accessibilityRole="button"
              accessibilityState={{ selected: elegida }}
              onPress={() => onElegir(opcion.value)}
              style={({ pressed }) => [
                styles.listaOpcion,
                elegida && styles.listaOpcionElegida,
                pressed && styles.presionado,
              ]}
            >
              <Text
                style={[styles.listaTexto, elegida && styles.listaTextoElegido]}
                numberOfLines={2}
              >
                {opcion.label}
              </Text>
              {elegida ? (
                <MaterialCommunityIcons
                  name="check"
                  size={18}
                  color="#ea580c"
                />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function ItemizadoBeckSelector({
  visible,
  obraId,
  onClose,
  onSelect,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Se monta en cada apertura: carga la obra y parte sin filtros. */}
      {visible ? (
        <ContenidoSelector
          obraId={obraId}
          onClose={onClose}
          onSelect={onSelect}
        />
      ) : null}
    </Modal>
  );
}

function ContenidoSelector({
  obraId,
  onClose,
  onSelect,
}: Omit<Props, "visible">) {
  const [itemizados, setItemizados] = useState<ItemizadoOpcionApi[]>([]);
  const [cargando, setCargando] = useState(Boolean(obraId));
  const [errorCarga, setErrorCarga] = useState("");
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState("");
  const [elementoPenetra, setElementoPenetra] = useState("");
  const [materialidad, setMaterialidad] = useState("");
  const [abierto, setAbierto] = useState<FiltroAbierto>(null);
  const error = obraId
    ? errorCarga
    : "No se pudo determinar la obra del registro.";

  useEffect(() => {
    if (!obraId) return;
    let cancelado = false;
    getItemizadoOpciones({ obraId, visible: true, limit: 1000 })
      .then((data) => {
        if (!cancelado) setItemizados(data);
      })
      .catch((err: unknown) => {
        if (!cancelado)
          setErrorCarga(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los itemizados.",
          );
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [obraId]);

  const { tipos, elementosPenetra, materialidades } = useMemo(
    () => opcionesFiltroItemizado(itemizados, { tipo, elementoPenetra }),
    [itemizados, tipo, elementoPenetra],
  );
  const filtrados = useMemo(
    () =>
      filtrarItemizados(itemizados, {
        texto,
        tipo,
        elementoPenetra,
        materialidad,
      }),
    [itemizados, texto, tipo, elementoPenetra, materialidad],
  );
  const hayFiltros = Boolean(
    texto.trim() || tipo || elementoPenetra || materialidad,
  );

  // Al cambiar un filtro de arriba, se quitan los de abajo que ya no tengan resultados.
  const ajustarCascada = (nuevoTipo: string, nuevoElemento: string) => {
    const opciones = opcionesFiltroItemizado(itemizados, {
      tipo: nuevoTipo,
      elementoPenetra: "",
    });
    const elemento = opciones.elementosPenetra.some(
      (e) => e.value === nuevoElemento,
    )
      ? nuevoElemento
      : "";
    const materialidadesValidas = opcionesFiltroItemizado(itemizados, {
      tipo: nuevoTipo,
      elementoPenetra: elemento,
    }).materialidades;
    setTipo(nuevoTipo);
    setElementoPenetra(elemento);
    if (
      materialidad &&
      !materialidadesValidas.some((m) => m.value === materialidad)
    ) {
      setMaterialidad("");
    }
  };
  const cambiarTipo = (valor: string) => ajustarCascada(valor, elementoPenetra);
  const cambiarElemento = (valor: string) => ajustarCascada(tipo, valor);

  const limpiar = () => {
    setTexto("");
    setTipo("");
    setElementoPenetra("");
    setMaterialidad("");
    setAbierto(null);
  };

  const alternar = (filtro: Exclude<FiltroAbierto, null>) =>
    setAbierto((actual) => (actual === filtro ? null : filtro));

  return (
    <Pressable style={styles.fondo} onPress={onClose}>
      <Pressable style={styles.hoja}>
        <View style={styles.asa} />
        <View style={styles.encabezado}>
          <View style={styles.encabezadoTexto}>
            <Text style={styles.titulo}>Seleccionar Itemizado BECK</Text>
            <Text style={styles.subtitulo}>
              Solo se muestran los itemizados habilitados para esta obra.
            </Text>
          </View>
          <Button mode="text" compact onPress={onClose}>
            Cerrar
          </Button>
        </View>

        <BeckSearchInput
          placeholder="Buscar por itemizado, código o tipo"
          value={texto}
          onChangeText={setTexto}
        />
        <View style={styles.filtros}>
          <BotonDesplegable
            titulo="Tipo"
            opciones={tipos}
            valor={tipo}
            abierto={abierto === "tipo"}
            onToggle={() => alternar("tipo")}
            onLimpiar={() => cambiarTipo("")}
          />
        </View>
        {abierto === "tipo" ? (
          <ListaDesplegable
            opciones={tipos}
            valor={tipo}
            onElegir={(valor) => {
              cambiarTipo(valor);
              setAbierto(null);
            }}
          />
        ) : null}
        <View style={styles.filtros}>
          <BotonDesplegable
            titulo="Elemento atravesado"
            opciones={elementosPenetra}
            valor={elementoPenetra}
            abierto={abierto === "elemento"}
            onToggle={() => alternar("elemento")}
            onLimpiar={() => cambiarElemento("")}
          />
          <BotonDesplegable
            titulo="Materialidad"
            opciones={materialidades}
            valor={materialidad}
            abierto={abierto === "materialidad"}
            onToggle={() => alternar("materialidad")}
            onLimpiar={() => setMaterialidad("")}
          />
        </View>
        {abierto === "elemento" ? (
          <ListaDesplegable
            opciones={elementosPenetra}
            valor={elementoPenetra}
            onElegir={(valor) => {
              cambiarElemento(valor);
              setAbierto(null);
            }}
          />
        ) : null}
        {abierto === "materialidad" ? (
          <ListaDesplegable
            opciones={materialidades}
            valor={materialidad}
            onElegir={(valor) => {
              setMaterialidad(valor);
              setAbierto(null);
            }}
          />
        ) : null}

        {!cargando && !error ? (
          <View style={styles.resumen}>
            <Text style={styles.resumenTexto}>
              {filtrados.length} de {itemizados.length} itemizados
            </Text>
            {hayFiltros ? (
              <Button mode="text" compact onPress={limpiar}>
                Limpiar filtros
              </Button>
            ) : null}
          </View>
        ) : null}

        <ScrollView
          style={styles.resultados}
          keyboardShouldPersistTaps="handled"
        >
          {cargando ? (
            <View style={styles.cargando}>
              <ActivityIndicator color="#f97316" />
              <Text style={styles.vacio}>Cargando itemizados...</Text>
            </View>
          ) : null}
          {!cargando && error ? (
            <Text style={styles.vacio}>{error}</Text>
          ) : null}
          {!cargando && !error && filtrados.length === 0 ? (
            <Text style={styles.vacio}>
              {itemizados.length === 0
                ? "Esta obra no tiene itemizados habilitados."
                : "Ningún itemizado coincide con la búsqueda o los filtros."}
            </Text>
          ) : null}
          {!cargando
            ? filtrados.map((opcion) => (
                <Pressable
                  key={opcion.id}
                  style={styles.opcion}
                  onPress={() => onSelect(opcion)}
                >
                  {/* Código BECK en naranjo Beck, al inicio: es lo que más se busca. */}
                  <View style={styles.opcionCabecera}>
                    <Text
                      style={styles.codigo}
                      accessibilityLabel={`Código BECK ${opcion.codigo_beck || "sin código"}`}
                    >
                      {opcion.codigo_beck || "Sin código"}
                    </Text>
                    <Text style={styles.opcionTitulo}>
                      {opcion.elemento_pasante || "Sin itemizado"}
                    </Text>
                  </View>
                  {/* Atravesado en azul y materialidad en verde, para distinguirlos rápido. */}
                  <View style={styles.etiquetas}>
                    <Text style={[styles.etiqueta, styles.etiquetaAtravesado]}>
                      Atravesado: {opcion.elemento_penetra || "Sin dato"}
                    </Text>
                    <Text
                      style={[styles.etiqueta, styles.etiquetaMaterialidad]}
                    >
                      Materialidad: {opcion.materialidad || "Sin dato"}
                    </Text>
                  </View>
                  {opcion.tipo ? (
                    <View style={styles.etiquetas}>
                      <Text style={[styles.etiqueta, styles.etiquetaTipo]}>
                        Tipo: {opcion.tipo}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              ))
            : null}
        </ScrollView>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  hoja: {
    backgroundColor: "#fffaf0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    width: "100%",
  },
  asa: {
    alignSelf: "center",
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  encabezado: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  encabezadoTexto: { flex: 1 },
  titulo: { color: "#0f172a", fontSize: 18, fontWeight: "900" },
  subtitulo: { color: "#64748b", fontSize: 12, lineHeight: 17, marginTop: 3 },
  filtros: { flexDirection: "row", gap: 8, marginTop: 8 },
  desplegable: {
    alignItems: "center",
    backgroundColor: "#fffdf8",
    borderColor: "#fbbf24",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flex: 1,
    minHeight: 44,
    minWidth: 0,
  },
  desplegableAbierto: { borderColor: "#f97316", borderWidth: 1.5 },
  desplegableDeshabilitado: { opacity: 0.55 },
  desplegableBoton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 4,
    minWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  desplegableTextos: { flex: 1, minWidth: 0 },
  desplegableTitulo: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  desplegableValor: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  desplegableValorActivo: { color: "#0f172a", fontWeight: "900" },
  desplegableQuitar: {
    alignItems: "center",
    borderLeftColor: "#fed7aa",
    borderLeftWidth: 1,
    height: 28,
    justifyContent: "center",
    width: 30,
  },
  presionado: { opacity: 0.75 },
  lista: {
    backgroundColor: "#ffffff",
    borderColor: "#fed7aa",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    maxHeight: 220,
    padding: 6,
  },
  listaOpcion: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  listaOpcionElegida: { backgroundColor: "#fff7ed" },
  listaTexto: { color: "#475569", flex: 1, fontSize: 14, fontWeight: "600" },
  listaTextoElegido: { color: "#0f172a", fontWeight: "900" },
  resumen: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    minHeight: 32,
  },
  resumenTexto: { color: "#64748b", fontSize: 12 },
  resultados: { marginTop: 4, maxHeight: 360 },
  cargando: { alignItems: "center", padding: 18 },
  vacio: {
    color: "#475569",
    lineHeight: 20,
    marginTop: 10,
    textAlign: "center",
  },
  opcion: {
    backgroundColor: "#ffffff",
    borderColor: "#fed7aa",
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 52,
    padding: 11,
  },
  opcionCabecera: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  codigo: {
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
    borderRadius: 8,
    borderWidth: 1,
    color: "#c2410c",
    fontFamily: Platform.select({ ios: "Menlo", default: "monospace" }),
    fontSize: 13,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  opcionTitulo: { color: "#0f172a", flex: 1, fontSize: 15, fontWeight: "800" },
  etiquetas: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  etiqueta: {
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: "400",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  etiquetaAtravesado: {
    backgroundColor: "#eff6ff",
    borderColor: "#93c5fd",
    color: "#1d4ed8",
  },
  etiquetaMaterialidad: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
    color: "#15803d",
  },
  etiquetaTipo: {
    backgroundColor: "#fdf2f4",
    borderColor: "#e5a3b1",
    color: "#800020",
  },
});
