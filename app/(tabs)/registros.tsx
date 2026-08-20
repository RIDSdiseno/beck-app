import {
  createRegistro,
  deleteRegistroPendiente,
  enviarRegistroATecnico,
  enviarRegistroAIngenieria,
  getMisRegistros,
  reenviarRegistroComoTecnico,
  RegistroHistorialApi,
  uploadRegistroFotos,
} from "@/services/api/registrosApi";
import {
  CampoConfiguracionRegistro,
  getConfiguracionRegistro,
  getMisObras,
  ObraApi,
} from "@/services/api/obrasApi";
import {
  getItemizadoOpciones,
  ItemizadoOpcionApi,
} from "@/services/api/itemizadoOpcionesApi";
import {
  clearSelectedObra,
  getSelectedObra,
  getSession,
} from "@/services/auth/session";
import {
  isCorreccionEditable,
  shouldShowRejectionContext,
} from "@/utils/registroEstado";
import { HOLGURA_OPTIONS } from "@/utils/holgura";
import { formatTime24WithPeriod } from "@/utils/dateTime";
import {
  ACCESIBILIDAD_OPTIONS,
  getAislacionOption,
} from "@/utils/factoresRegistro";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Checkbox,
  SegmentedButtons,
  Text,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { TextInput } from "@/components/AppTextInput";
import { BeckSearchInput } from "@/components/BeckSearchInput";
import { BeckFilterPanel } from "@/components/BeckFilterPanel";
import { ExpandableImage } from "@/components/ExpandableImage";
import { SelectSheet } from "@/components/SelectSheet";
import { BrandHeader } from "../../components/BrandHeader";

type TipoRegistro = "sello_cortafuego" | "junta_lineal_espuma";
type RegistroEstadoFiltro = "todos" | "pendiente" | "rechazado";

const REGISTRO_ESTADO_FILTERS: {
  value: RegistroEstadoFiltro;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
  { value: "todos", label: "Todos", icon: "view-grid-outline" },
  { value: "pendiente", label: "Pendientes", icon: "clock-outline" },
  { value: "rechazado", label: "Rechazados", icon: "alert-circle-outline" },
];

type ObraSeleccionada = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  estado?: string | null;
};

type FotoLocal = {
  uri: string;
  name: string;
  type: string;
};

const MAX_REGISTRO_FOTOS = 10;
const FALLBACK_IMAGE_TYPE = "image/jpeg";
const UPLOAD_IMAGE_MAX_SIZE = 1600;
const UPLOAD_IMAGE_QUALITY = 0.65;
async function normalizeFotoAsset(
  asset: ImagePicker.ImagePickerAsset,
  index: number,
  prefix: string,
): Promise<FotoLocal> {
  const maxDimension = Math.max(asset.width || 0, asset.height || 0);
  const resizeAction =
    maxDimension > UPLOAD_IMAGE_MAX_SIZE
      ? asset.width && asset.width >= (asset.height || 0)
        ? { resize: { width: UPLOAD_IMAGE_MAX_SIZE } }
        : { resize: { height: UPLOAD_IMAGE_MAX_SIZE } }
      : null;

  const processed = await ImageManipulator.manipulateAsync(
    asset.uri,
    resizeAction ? [resizeAction] : [],
    {
      compress: UPLOAD_IMAGE_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return {
    uri: processed.uri,
    name: `${prefix}-${Date.now()}-${index}.jpg`,
    type: FALLBACK_IMAGE_TYPE,
  };
}

const DEFAULT_CAMPOS_CONFIGURABLES_REGISTRO: Record<
  CampoConfiguracionRegistro,
  boolean
> = {
  tipoRegistro: true,
  codigoBeck: false,
  itemizadoBeck: true,
  dimensiones: true,
  itemizadoMandante: false,
  fechaEjecucionSello: true,
  diaSemana: true,
  piso: true,
  ejeAlfabetico: true,
  ejeNumerico: true,
  nombreSellador: true,
  foto: true,
  recinto: true,
  modulo: true,
  numeroSello: true,
  cantidadSellos: true,
  metrosLineales: true,
  holgura: true,
  factorPorHolguras: false,
  cieloModular: true,
  cantidadSellosConFactores: false,
  aislacion: true,
  cantidadSellosAislacion: false,
  reparacionTabique: true,
  cantidadFinal: false,
  observaciones: true,
  folio: false,
  eje: true,
  rendimientoSellosEsperadoDiario: false,
  rendimientoReparacionEsperadoDiario: true,
  rendimientoIndividual: true,
};

const ITEMIZADO_BECK_OPTIONS = [
  "Tubería metálica SIN Aislación",
  "Tubería metálica CON Aislación",
  "Tubería NO metálica",
  "Ducto de clima Circular SIN Aislación",
  "Ducto de clima Circular CON Aislación",
  "Ducto de clima Rectangular SIN Aislación",
  "Ducto de clima Rectangular CON Aislación",
  "Bandeja eléctrica o escalerilla",
];

const APLICA_OPTIONS = [
  { value: "1", label: "Aplica" },
  { value: "0", label: "No aplica" },
];

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH_NAMES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const FULL_WEEK_DAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const formattedDate = date.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${formattedDate} ${formatTime24WithPeriod(value)}`;
}

function formatExecutionDate(value?: string | null) {
  if (!value) return "Sin fecha";

  const datePart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!match) return value;

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getRegistroEstadoLabel(estado: RegistroHistorialApi["estado"]) {
  return estado.replace("_", " ");
}


function preferirCopiasCorreccion(registros: RegistroHistorialApi[]) {
  const originalesConCopia = new Set(
    registros
      .map((registro) => registro.registro_origen_id)
      .filter((id): id is string => Boolean(id)),
  );

  return registros.filter(
    (registro) =>
      !(registro.estado === "rechazado" && originalesConCopia.has(registro.id)),
  );
}

function getRegistroFotos(registro?: RegistroHistorialApi | null) {
  if (!registro) return [];

  const relationFotos = registro.fotos || [];
  const originFotos = registro.registro_origen?.fotos || [];
  const ownFallbackUrls = [
    ...(Array.isArray(registro.fotos_urls) ? registro.fotos_urls : []),
    registro.foto_url,
  ].filter((url): url is string => Boolean(url));
  const originFallbackUrls = [
    ...(Array.isArray(registro.registro_origen?.fotos_urls)
      ? registro.registro_origen.fotos_urls
      : []),
    registro.registro_origen?.foto_url,
  ].filter((url): url is string => Boolean(url));

  const preferredFotos = relationFotos.length
    ? relationFotos
    : originFotos.length
      ? originFotos
      : (ownFallbackUrls.length ? ownFallbackUrls : originFallbackUrls).map(
          (url, index) => ({
            id: `${registro.id}-fallback-${index}`,
            url,
            created_at: registro.created_at,
          }),
        );

  const seen = new Set<string>();

  return preferredFotos.filter((foto) => {
    if (!foto.url || seen.has(foto.url)) return false;
    seen.add(foto.url);
    return true;
  });
}

function RegistroContextBox({ registro }: { registro: RegistroHistorialApi }) {
  if (!shouldShowRejectionContext(registro)) return null;

  const hasRechazo = Boolean(
    registro.motivo_rechazo ||
      registro.fecha_rechazo ||
      registro.rechazado_por ||
      registro.registro_origen?.motivo_rechazo,
  );
  const isCorreccion = Boolean(registro.es_correccion || registro.registro_origen_id);
  const motivo =
    registro.motivo_rechazo || registro.registro_origen?.motivo_rechazo;
  const fecha =
    formatDisplayDate(registro.fecha_rechazo) ||
    formatDisplayDate(registro.registro_origen?.fecha_rechazo);

  if (!hasRechazo && !isCorreccion) return null;

  return (
    <View style={styles.contextBox}>
      <View style={styles.contextHeader}>
        <MaterialCommunityIcons
          name={hasRechazo ? "alert-circle-outline" : "file-refresh-outline"}
          size={18}
          color={hasRechazo ? "#dc2626" : "#2563eb"}
        />
        <Text
          style={[
            styles.contextTitle,
            hasRechazo ? styles.contextTitleDanger : styles.contextTitleInfo,
          ]}
        >
          {hasRechazo ? "Contexto de rechazo" : "Registro de corrección"}
        </Text>
      </View>
      {isCorreccion ? (
        <Text style={styles.contextText}>
          Corrección enlazada al registro original
          {registro.registro_origen?.numero_sello
            ? ` N° ${registro.registro_origen.numero_sello}`
            : ""}.
        </Text>
      ) : null}
      {motivo ? (
        <Text style={styles.contextText}>Motivo: {motivo}</Text>
      ) : null}
      {registro.rechazado_por?.nombre ? (
        <Text style={styles.contextText}>
          Rechazado por: {registro.rechazado_por.nombre}
        </Text>
      ) : null}
      {fecha ? <Text style={styles.contextText}>Fecha: {fecha}</Text> : null}
    </View>
  );
}

function RegistroDetailField({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;

  return (
    <View style={styles.terrenoDetailField}>
      <Text style={styles.terrenoDetailFieldLabel}>{label}</Text>
      <Text style={styles.terrenoDetailFieldValue}>{String(value)}</Text>
    </View>
  );
}

function getDiaSemana(fecha: string) {
  const date = new Date(`${fecha}T00:00:00`);

  return Number.isNaN(date.getTime()) ? "" : FULL_WEEK_DAYS[date.getDay()];
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}


function toApiNumber(value: string) {
  return Number(value.replace(",", "."));
}

function buildCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - mondayFirstOffset + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
}

type RegistrosScreenProps = {
  mode?: "list" | "form";
  initialObra?: ObraSeleccionada | null;
  onChangeObra?: () => void;
};

export default function RegistrosScreen({
  mode = "list",
  initialObra = null,
  onChangeObra,
}: RegistrosScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const [obra, setObra] = useState<ObraSeleccionada | null>(initialObra);
  const [currentUserName, setCurrentUserName] = useState("");
  const [userRole, setUserRole] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshingTecnicoRegistros, setRefreshingTecnicoRegistros] =
    useState(false);
  const [refreshingConfiguracionRegistro, setRefreshingConfiguracionRegistro] =
    useState(false);
  const [refreshingJefeRegistros, setRefreshingJefeRegistros] =
    useState(false);
  const [loadingJefeRegistros, setLoadingJefeRegistros] = useState(false);
  const hasLoadedJefeRegistrosRef = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [jefeRegistros, setJefeRegistros] = useState<RegistroHistorialApi[]>([]);
  const [jefeObras, setJefeObras] = useState<ObraApi[]>([]);
  const [jefeObraSearch, setJefeObraSearch] = useState("");
  const [jefeRegistroSearch, setJefeRegistroSearch] = useState("");
  const [jefeEstadoFiltro, setJefeEstadoFiltro] =
    useState<RegistroEstadoFiltro>("todos");
  const [tecnicoRegistroSearch, setTecnicoRegistroSearch] = useState("");
  const [tecnicoEstadoFiltro, setTecnicoEstadoFiltro] =
    useState<RegistroEstadoFiltro>("todos");
  const [selectedJefeObraId, setSelectedJefeObraId] = useState<string | null>(null);
  const [tecnicoRegistros, setTecnicoRegistros] = useState<RegistroHistorialApi[]>([]);
  const [selectedTecnicoRegistro, setSelectedTecnicoRegistro] =
    useState<RegistroHistorialApi | null>(null);
  const [editingRegistro, setEditingRegistro] =
    useState<RegistroHistorialApi | null>(null);

  const [tipoRegistro, setTipoRegistro] =
    useState<TipoRegistro>("sello_cortafuego");
  const [fecha, setFecha] = useState(formatDate(new Date()));
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [itemizadoBeck, setItemizadoBeck] = useState("");
  const [dimensiones, setDimensiones] = useState("");
  const [itemizadoCodigoBeck, setItemizadoCodigoBeck] = useState("");
  const [itemizadoSelectorVisible, setItemizadoSelectorVisible] = useState(false);
  const [itemizadoSearch, setItemizadoSearch] = useState("");
  const [itemizadoElementoPenetra, setItemizadoElementoPenetra] = useState("");
  const [itemizadoMaterialidad, setItemizadoMaterialidad] = useState("");
  const [itemizadoOpciones, setItemizadoOpciones] = useState<ItemizadoOpcionApi[]>([]);
  const [loadingItemizadoOpciones, setLoadingItemizadoOpciones] = useState(false);
  const [otroItemizado, setOtroItemizado] = useState(false);
  const [recinto, setRecinto] = useState("");
  const [modulo, setModulo] = useState("");
  const [piso, setPiso] = useState("");
  const [ejeNumerico, setEjeNumerico] = useState("");
  const [ejeAlfabetico, setEjeAlfabetico] = useState("");
  const [numeroSello, setNumeroSello] = useState("");
  const [cantidadSellos, setCantidadSellos] = useState("");
  const [nombreSellador, setNombreSellador] = useState("");
  const [holgura, setHolgura] = useState("");
  const [accesibilidad, setAccesibilidad] = useState("");
  const [itemizadoSacyr, setItemizadoSacyr] = useState("");
  const [metrosLineales, setMetrosLineales] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [folio, setFolio] = useState("");
  const [fotos, setFotos] = useState<FotoLocal[]>([]);
  const [aislacion, setAislacion] = useState("");
  const [reparacionTabique, setReparacionTabique] = useState("");
  const [camposConfigurablesRegistro, setCamposConfigurablesRegistro] = useState(
    DEFAULT_CAMPOS_CONFIGURABLES_REGISTRO,
  );
  const [loadingConfiguracionRegistro, setLoadingConfiguracionRegistro] =
    useState(Boolean(initialObra && mode === "form"));

  const clearSuccessMessage = useCallback(() => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }

    setSuccess("");
  }, []);

  const showSuccessMessage = useCallback(
    (message: string) => {
      clearSuccessMessage();
      setSuccess(message);
      successTimerRef.current = setTimeout(() => {
        setSuccess("");
        successTimerRef.current = null;
      }, 3500);
    },
    [clearSuccessMessage],
  );

  useEffect(
    () => () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

  const isJuntaLineal = tipoRegistro === "junta_lineal_espuma";
  const isFormMode = mode === "form";
  const campoConfiguradoVisible = (campo: CampoConfiguracionRegistro) =>
    camposConfigurablesRegistro[campo];

  const tipoRegistroLabel = useMemo(
    () =>
      isJuntaLineal ? "Junta Lineal Espuma" : "Sello Cortafuego",
    [isJuntaLineal],
  );
  const isTerrenoRegistroList =
    userRole === "terreno" && !isFormMode && !editingRegistro;

  const selectedJefeObra = useMemo(
    () => jefeObras.find((item) => item.id === selectedJefeObraId) ?? null,
    [jefeObras, selectedJefeObraId],
  );
  const isJefeObraObrasList =
    userRole === "jefeobra" && !editingRegistro && !selectedJefeObra;
  const isJefeObraRegistrosList =
    userRole === "jefeobra" && !editingRegistro && Boolean(selectedJefeObra);

  const filteredJefeObras = useMemo(() => {
    const term = jefeObraSearch.trim().toLowerCase();
    if (!term) return jefeObras;

    return jefeObras.filter((item) =>
      `${item.nombre} ${item.codigo || ""}`.toLowerCase().includes(term),
    );
  }, [jefeObras, jefeObraSearch]);

  const jefeRegistrosPorObra = useMemo(
    () =>
      selectedJefeObraId
        ? jefeRegistros.filter((registro) => registro.obras?.id === selectedJefeObraId)
        : [],
    [jefeRegistros, selectedJefeObraId],
  );

  const filteredJefeRegistros = useMemo(() => {
    const term = jefeRegistroSearch.trim().toLowerCase();
    const registrosSinDuplicar = preferirCopiasCorreccion(jefeRegistrosPorObra);
    const visibles = registrosSinDuplicar.filter((registro) => {
      const isCorreccion = Boolean(
        registro.es_correccion || registro.registro_origen_id,
      );
      const correccionEnManosDelOperario =
        isCorreccion &&
        registro.estado === "pendiente" &&
        registro.devuelto_a_tecnico === true;
      if (correccionEnManosDelOperario) return false;

      const estadoVisual =
        isCorreccion && !registro.corregido_at
          ? "rechazado"
          : registro.estado;
      const esEstadoVisible =
        registro.estado === "pendiente" ||
        registro.estado === "rechazado";
      const pasaFiltro =
        jefeEstadoFiltro === "todos" ||
        estadoVisual === jefeEstadoFiltro;

      return esEstadoVisible && pasaFiltro;
    });

    if (!term) return visibles;

    return visibles.filter((registro) =>
      `${registro.usuarios?.nombre || registro.nombre_sellador} ${registro.piso} ${registro.eje_alfabetico}-${registro.eje_numerico} ${registro.numero_sello || ""} ${registro.tipo_registro}`
        .toLowerCase()
        .includes(term),
    );
  }, [jefeEstadoFiltro, jefeRegistroSearch, jefeRegistrosPorObra]);

  const jefeFilterCounts = useMemo(() => {
    const term = jefeRegistroSearch.trim().toLowerCase();
    const registrosSinDuplicar = preferirCopiasCorreccion(jefeRegistrosPorObra);
    const matchingSearch = registrosSinDuplicar.filter((registro) => {
      const isCorreccion = Boolean(
        registro.es_correccion || registro.registro_origen_id,
      );
      const correccionEnManosDelOperario =
        isCorreccion &&
        registro.estado === "pendiente" &&
        registro.devuelto_a_tecnico === true;
      if (correccionEnManosDelOperario) return false;

      const esEstadoVisible =
        registro.estado === "pendiente" || registro.estado === "rechazado";
      if (!esEstadoVisible) return false;

      return (
        !term ||
        `${registro.usuarios?.nombre || registro.nombre_sellador} ${registro.piso} ${registro.eje_alfabetico}-${registro.eje_numerico} ${registro.numero_sello || ""} ${registro.tipo_registro}`
          .toLowerCase()
          .includes(term)
      );
    });

    const estadoVisual = (registro: RegistroHistorialApi) =>
      (registro.es_correccion || registro.registro_origen_id) &&
      !registro.corregido_at
        ? "rechazado"
        : registro.estado;

    return {
      todos: matchingSearch.length,
      pendiente: matchingSearch.filter(
        (registro) => estadoVisual(registro) === "pendiente",
      ).length,
      rechazado: matchingSearch.filter(
        (registro) => estadoVisual(registro) === "rechazado",
      ).length,
    };
  }, [jefeRegistroSearch, jefeRegistrosPorObra]);

  const tecnicoRegistrosSinDuplicar = useMemo(
    () => preferirCopiasCorreccion(tecnicoRegistros),
    [tecnicoRegistros],
  );

  const tecnicoRechazados = useMemo(
    () => tecnicoRegistrosSinDuplicar.filter((registro) => registro.estado === "rechazado"),
    [tecnicoRegistrosSinDuplicar],
  );

  const tecnicoPendientes = useMemo(
    () => tecnicoRegistrosSinDuplicar.filter((registro) => registro.estado === "pendiente"),
    [tecnicoRegistrosSinDuplicar],
  );

  const filteredTecnicoRegistros = useMemo(() => {
    const term = tecnicoRegistroSearch.trim().toLowerCase();
    const visibles = [...tecnicoRechazados, ...tecnicoPendientes].filter((registro) => {
      const isCorreccion = isCorreccionEditable(registro);

      return (
        tecnicoEstadoFiltro === "todos" ||
        registro.estado === tecnicoEstadoFiltro ||
        (tecnicoEstadoFiltro === "rechazado" && isCorreccion)
      );
    });
    if (!term) return visibles;

    return visibles.filter((registro) =>
      `${registro.obras?.nombre || ""} ${registro.obras?.codigo || ""} ${registro.piso || ""} ${registro.numero_sello || ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [
    tecnicoEstadoFiltro,
    tecnicoPendientes,
    tecnicoRechazados,
    tecnicoRegistroSearch,
  ]);

  const tecnicoFilterCounts = useMemo(() => {
    const term = tecnicoRegistroSearch.trim().toLowerCase();
    const visibles = [...tecnicoRechazados, ...tecnicoPendientes];
    const matchingSearch = term
      ? visibles.filter((registro) =>
          `${registro.obras?.nombre || ""} ${registro.obras?.codigo || ""} ${registro.piso || ""} ${registro.numero_sello || ""}`
            .toLowerCase()
            .includes(term),
        )
      : visibles;

    return {
      todos: matchingSearch.length,
      pendiente: matchingSearch.filter(
        (registro) => registro.estado === "pendiente",
      ).length,
      rechazado: matchingSearch.filter(
        (registro) =>
          registro.estado === "rechazado" || isCorreccionEditable(registro),
      ).length,
    };
  }, [tecnicoPendientes, tecnicoRechazados, tecnicoRegistroSearch]);

  const refreshTecnicoRegistros = useCallback(async () => {
    try {
      setRefreshingTecnicoRegistros(true);
      setError("");
      clearSuccessMessage();
      const registros = await getMisRegistros(true, { scope: "registro" });
      setTecnicoRegistros(registros);
    } catch (err: any) {
      setError(err?.message || "No se pudieron obtener los registros");
    } finally {
      setRefreshingTecnicoRegistros(false);
    }
  }, [clearSuccessMessage]);

  const refreshJefeObraData = useCallback(async () => {
    try {
      setRefreshingJefeRegistros(true);
      setError("");
      clearSuccessMessage();
      const [obrasDisponibles, registros] = await Promise.all([
        getMisObras(true),
        getMisRegistros(true),
      ]);
      setJefeObras(obrasDisponibles);
      setJefeRegistros(registros);
    } catch (err: any) {
      setError(err?.message || "No se pudieron obtener los registros");
    } finally {
      setRefreshingJefeRegistros(false);
    }
  }, [clearSuccessMessage]);

  const refreshConfiguracionFormulario = useCallback(async () => {
    const obraId =
      userRole === "jefeobra" ? editingRegistro?.obras?.id : obra?.id;
    const rolConfiguracion =
      userRole === "jefeobra" ? "jefeobra" : "trabajador";

    if (!obraId || (userRole !== "terreno" && userRole !== "jefeobra")) return;

    try {
      setRefreshingConfiguracionRegistro(true);
      setError("");
      clearSuccessMessage();
      const configuracion = await getConfiguracionRegistro(
        obraId,
        rolConfiguracion,
        true,
      );
      setCamposConfigurablesRegistro({
        ...DEFAULT_CAMPOS_CONFIGURABLES_REGISTRO,
        ...Object.fromEntries(
          configuracion.map((campo) => [campo.campo, campo.visible]),
        ),
      });
    } catch (err: any) {
      setError(
        err?.message || "No se pudo actualizar la configuracion del registro.",
      );
    } finally {
      setRefreshingConfiguracionRegistro(false);
    }
  }, [clearSuccessMessage, editingRegistro?.obras?.id, obra?.id, userRole]);

  useEffect(() => {
    const obraIdConfiguracion =
      userRole === "terreno"
        ? isFormMode
          ? obra?.id
          : editingRegistro?.obras?.id
        : userRole === "jefeobra" && editingRegistro
          ? editingRegistro.obras?.id
          : undefined;
    const rolConfiguracion =
      userRole === "jefeobra" ? "jefeobra" : "trabajador";

    if (!obraIdConfiguracion) {
      return;
    }

    let active = true;

    const loadConfiguracionRegistro = async () => {
      try {
        setLoadingConfiguracionRegistro(true);
        const configuracion = await getConfiguracionRegistro(
          obraIdConfiguracion,
          rolConfiguracion,
        );
        if (!active) return;

        setCamposConfigurablesRegistro({
          ...DEFAULT_CAMPOS_CONFIGURABLES_REGISTRO,
          ...Object.fromEntries(
            configuracion.map((campo) => [campo.campo, campo.visible]),
          ),
        });
      } catch (err: any) {
        if (!active) return;
        setError(
          err?.message || "No se pudo cargar la configuracion del registro.",
        );
      } finally {
        if (active) {
          setLoadingConfiguracionRegistro(false);
        }
      }
    };

    loadConfiguracionRegistro();

    return () => {
      active = false;
    };
  }, [editingRegistro, isFormMode, obra?.id, userRole]);

  useFocusEffect(
    useCallback(() => {
      const loadInitialData = async () => {
        try {
        clearSuccessMessage();
        const session = await getSession();
        const userName = session.user?.nombre || "";
        const role = session.user?.rol || "";

        setCurrentUserName(userName);
        setUserRole(role);
        setNombreSellador(userName);

        if (role === "jefeobra") {
          const shouldBlockScreen = !hasLoadedJefeRegistrosRef.current;
          if (shouldBlockScreen) setLoadingJefeRegistros(true);
          try {
            const [obrasDisponibles, registros] = await Promise.all([
              getMisObras(),
              getMisRegistros(),
            ]);

            setJefeObras(obrasDisponibles);
            setJefeRegistros(registros);
            hasLoadedJefeRegistrosRef.current = true;
          } finally {
            if (shouldBlockScreen) setLoadingJefeRegistros(false);
          }

          return;
        }

        if (role === "terreno") {
          const registros = await getMisRegistros(false, { scope: "registro" });
          setTecnicoRegistros(registros);
        }

        const currentObra = initialObra ?? (await getSelectedObra());

        if (currentObra) {
          const obrasDisponibles = initialObra ? [] : await getMisObras();
          const obraActualizada = initialObra
            ? initialObra
            : obrasDisponibles.find((item) => item.id === currentObra.id);

          if (!obraActualizada) {
            await clearSelectedObra();
            setObra(null);
            setError(
              "La obra seleccionada ya no esta disponible porque esta inactiva o finalizada.",
            );
          } else {
            setObra(obraActualizada);
            setError("");
          }
        } else {
          setObra(null);
        }

        } catch (err: any) {
          if (__DEV__) console.warn("LOAD REGISTROS ERROR =>", err);
          setError(err?.message || "No se pudieron obtener los registros");
        } finally {
          setLoadingJefeRegistros(false);
        }
      };

      loadInitialData();
    }, [clearSuccessMessage, initialObra]),
  );

  const resetForm = () => {
    setTipoRegistro("sello_cortafuego");
    setFecha(formatDate(new Date()));
    setCalendarMonth(new Date());
    setItemizadoBeck("");
    setDimensiones("");
    setItemizadoCodigoBeck("");
    setItemizadoSelectorVisible(false);
    setItemizadoSearch("");
    setItemizadoElementoPenetra("");
    setItemizadoMaterialidad("");
    setItemizadoOpciones([]);
    setOtroItemizado(false);
    setRecinto("");
    setModulo("");
    setPiso("");
    setEjeNumerico("");
    setEjeAlfabetico("");
    setNumeroSello("");
    setCantidadSellos("");
    setNombreSellador(currentUserName);
    setHolgura("");
    setAccesibilidad("");
    setItemizadoSacyr("");
    setMetrosLineales("");
    setObservaciones("");
    setFolio("");
    setFotos([]);
    setAislacion("");
    setReparacionTabique("");
  };

  const changeCalendarMonth = (offset: number) => {
    setCalendarMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const selectCalendarDay = (day: number) => {
    const selectedDate = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      day,
    );

    setFecha(formatDate(selectedDate));
    setCalendarVisible(false);
  };

  const selectItemizadoBeck = (itemizado: string) => {
    setItemizadoBeck(itemizado);
    setOtroItemizado(false);
  };

  const itemizadoObraId =
    userRole === "jefeobra" ? editingRegistro?.obras?.id : obra?.id;

  const loadItemizadoOpciones = async () => {
    if (!itemizadoObraId) {
      setItemizadoOpciones([]);
      setError("No se pudo determinar la obra para filtrar los itemizados.");
      return;
    }

    try {
      setLoadingItemizadoOpciones(true);
      const opciones = await getItemizadoOpciones({
        search: itemizadoSearch,
        elementoPenetra: itemizadoElementoPenetra,
        materialidad: itemizadoMaterialidad,
        limit: 80,
        obraId: itemizadoObraId,
        visible: true,
      });
      setItemizadoOpciones(opciones);
    } catch (err: any) {
      setError(err?.message || "No se pudieron cargar los itemizados.");
    } finally {
      setLoadingItemizadoOpciones(false);
    }
  };

  const openItemizadoSelector = () => {
    setItemizadoSelectorVisible(true);
    void loadItemizadoOpciones();
  };

  const selectItemizadoOpcion = (opcion: ItemizadoOpcionApi) => {
    setItemizadoBeck(opcion.elemento_pasante || "");
    setItemizadoCodigoBeck(opcion.codigo_beck || "");
    setItemizadoSacyr(opcion.nombre_personalizado || opcion.elemento_pasante || "");
    setItemizadoSelectorVisible(false);
    setError("");
  };

  const toggleOtroItemizado = () => {
    setOtroItemizado((current) => {
      const next = !current;
      setItemizadoBeck(next ? "" : itemizadoBeck);
      return next;
    });
  };

  const addFotos = (nuevasFotos: FotoLocal[]) => {
    const disponibles = MAX_REGISTRO_FOTOS - fotos.length;

    if (disponibles <= 0) {
      setError(`Puedes subir hasta ${MAX_REGISTRO_FOTOS} fotografias por registro.`);
      return;
    }

    const fotosPermitidas = nuevasFotos.slice(0, disponibles);
    setFotos((prev) => [...prev, ...fotosPermitidas]);
    setError(
      fotosPermitidas.length < nuevasFotos.length
        ? `Se agregaron ${fotosPermitidas.length} fotografias. Puedes subir hasta ${MAX_REGISTRO_FOTOS} por registro.`
        : "",
    );
  };

  const pickFromLibrary = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setError("Debes otorgar permiso para acceder a tus fotos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, MAX_REGISTRO_FOTOS - fotos.length),
        quality: 0.8,
      });

      if (result.canceled) return;

      const nuevasFotos = await Promise.all(
        result.assets.map((asset, index) =>
          normalizeFotoAsset(asset, index, "foto"),
        ),
      );

      addFotos(nuevasFotos);
    } catch (err) {
      if (__DEV__) console.warn("PICK IMAGE ERROR =>", err);
      setError("No se pudo seleccionar la imagen.");
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        setError("Debes otorgar permiso para usar la cámara.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];

      const nuevaFoto = await normalizeFotoAsset(asset, 0, "camara");

      addFotos([nuevaFoto]);
    } catch (err) {
      if (__DEV__) console.warn("TAKE PHOTO ERROR =>", err);
      setError("No se pudo tomar la foto.");
    }
  };

  const removeFoto = (index: number) => {
    setFotos((prev) => prev.filter((_, i) => i !== index));
  };

  const fillFormFromRegistro = (registro: RegistroHistorialApi) => {
    const nextTipo =
      registro.tipo_registro === "junta_lineal_espuma"
        ? "junta_lineal_espuma"
        : "sello_cortafuego";

    setEditingRegistro(registro);
    if (userRole === "jefeobra" || userRole === "terreno") {
      setLoadingConfiguracionRegistro(true);
    }
    if (registro.obras) {
      setObra({
        id: registro.obras.id,
        nombre: registro.obras.nombre,
        codigo: registro.obras.codigo,
        descripcion: null,
        estado: "activa",
      });
    }
    setTipoRegistro(nextTipo);
    setFecha(String(registro.fecha || "").slice(0, 10));
    setCalendarMonth(new Date(registro.fecha || new Date()));
    setItemizadoBeck(registro.itemizado_beck || registro.descripcion_material || "");
    setDimensiones(registro.dimensiones || "");
    setItemizadoCodigoBeck(registro.codigo_beck || "");
    setOtroItemizado(false);
    setRecinto(registro.recinto || "");
    setModulo(registro.modulo || "");
    setPiso(registro.piso || "");
    setEjeNumerico(registro.eje_numerico || "");
    setEjeAlfabetico(registro.eje_alfabetico || "");
    setNumeroSello(registro.numero_sello === "N/A" ? "" : registro.numero_sello || "");
    setCantidadSellos(String(registro.cantidad_sellos || ""));
    setNombreSellador(registro.nombre_sellador || "");
    setHolgura(String(registro.holgura ?? ""));
    setAccesibilidad(String(registro.cielo_modular ?? registro.accesibilidad ?? ""));
    setAislacion(getAislacionOption(registro));
    setReparacionTabique(String(registro.reparacion_tabique ?? ""));
    setItemizadoSacyr(registro.itemizado_mandante || registro.itemizado_sacyr || "");
    setMetrosLineales(String(registro.metros_lineales || ""));
    setObservaciones(registro.observaciones || "");
    setFolio(registro.folio || "");
    setFotos([]);
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!obra) return "Debes seleccionar una obra antes de enviar.";

    const commonMissing =
      (campoConfiguradoVisible("fechaEjecucionSello") && !fecha.trim()) ||
      (campoConfiguradoVisible("recinto") && !recinto.trim()) ||
      (campoConfiguradoVisible("modulo") && !modulo.trim()) ||
      (campoConfiguradoVisible("piso") && !piso.trim()) ||
      (campoConfiguradoVisible("ejeNumerico") && !ejeNumerico.trim()) ||
      (campoConfiguradoVisible("ejeAlfabetico") && !ejeAlfabetico.trim()) ||
      (campoConfiguradoVisible("nombreSellador") && !nombreSellador.trim());

    if (commonMissing) return "Debes completar todos los campos obligatorios.";
    if (isJuntaLineal) {
      if (!metrosLineales.trim()) {
        return "Debes ingresar la longitud en metros.";
      }

      if (!Number.isFinite(toApiNumber(metrosLineales)) || toApiNumber(metrosLineales) <= 0) {
        return "La longitud debe ser mayor a 0.";
      }
    } else {
      if (
        (campoConfiguradoVisible("itemizadoBeck") && !itemizadoBeck.trim()) ||
        (campoConfiguradoVisible("dimensiones") && !dimensiones.trim()) ||
        (campoConfiguradoVisible("numeroSello") && !numeroSello.trim()) ||
        (campoConfiguradoVisible("cantidadSellos") && !cantidadSellos.trim()) ||
        (campoConfiguradoVisible("holgura") && !holgura.trim()) ||
        (campoConfiguradoVisible("cieloModular") && !accesibilidad.trim()) ||
        (campoConfiguradoVisible("aislacion") && !aislacion.trim()) ||
        (campoConfiguradoVisible("reparacionTabique") &&
          !reparacionTabique.trim())
      ) {
        return "Debes completar todos los campos obligatorios.";
      }
    }

    if (dimensiones.trim().length > 100) {
      return "Dimensiones no puede superar los 100 caracteres.";
    }

    if (!fotos.length) {
      return "Debes agregar al menos una foto.";
    }

    return "";
  };

  const validateJefeEditForm = () => {
    const commonMissing =
      (campoConfiguradoVisible("fechaEjecucionSello") && !fecha.trim()) ||
      (campoConfiguradoVisible("recinto") && !recinto.trim()) ||
      (campoConfiguradoVisible("modulo") && !modulo.trim()) ||
      (campoConfiguradoVisible("piso") && !piso.trim()) ||
      (campoConfiguradoVisible("ejeNumerico") && !ejeNumerico.trim()) ||
      (campoConfiguradoVisible("ejeAlfabetico") && !ejeAlfabetico.trim()) ||
      (campoConfiguradoVisible("nombreSellador") && !nombreSellador.trim());

    if (commonMissing) return "Debes completar todos los campos obligatorios.";
    if (isJuntaLineal) {
      if (!metrosLineales.trim()) return "Debes ingresar la longitud en metros.";
      if (!Number.isFinite(toApiNumber(metrosLineales)) || toApiNumber(metrosLineales) <= 0) {
        return "La longitud debe ser mayor a 0.";
      }
    } else if (
      (campoConfiguradoVisible("itemizadoBeck") && !itemizadoBeck.trim()) ||
      (userRole === "terreno" &&
        campoConfiguradoVisible("dimensiones") &&
        !dimensiones.trim()) ||
      (campoConfiguradoVisible("numeroSello") && !numeroSello.trim()) ||
      (campoConfiguradoVisible("cantidadSellos") && !cantidadSellos.trim()) ||
      (campoConfiguradoVisible("holgura") && !holgura.trim()) ||
      (campoConfiguradoVisible("cieloModular") && !accesibilidad.trim()) ||
      (campoConfiguradoVisible("aislacion") && !aislacion.trim()) ||
      (campoConfiguradoVisible("reparacionTabique") &&
        !reparacionTabique.trim())
    ) {
      return "Debes completar todos los campos obligatorios.";
    }

    if (dimensiones.trim().length > 100) {
      return "Dimensiones no puede superar los 100 caracteres.";
    }

    return "";
  };

  const openConfirm = () => {
    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setSuccess("");
      return;
    }

    setError("");
    setConfirmVisible(true);
  };

  const submitRegistro = async () => {
    let registroCreadoId: string | null = null;

    try {
      if (!obra) return;

      setConfirmVisible(false);
      setSaving(true);
      setError("");
      setSuccess("");

      const registro = await createRegistro({
        obraId: obra.id,
        ...getPayloadCommonFields(),
        descripcionMaterial: isJuntaLineal
          ? "Junta Lineal Espuma"
          : campoConfiguradoVisible("itemizadoBeck")
            ? itemizadoBeck
            : "No aplica",
        itemizadoBeck:
          isJuntaLineal || !campoConfiguradoVisible("itemizadoBeck")
            ? undefined
            : itemizadoBeck,
        dimensiones:
          !isJuntaLineal && campoConfiguradoVisible("dimensiones")
            ? dimensiones.trim()
            : undefined,
        numeroSello:
          isJuntaLineal || !campoConfiguradoVisible("numeroSello")
            ? "No aplica"
            : numeroSello,
        cantidadSellos:
          isJuntaLineal || !campoConfiguradoVisible("cantidadSellos")
            ? 1
            : toApiNumber(cantidadSellos),
        holgura:
          isJuntaLineal || !campoConfiguradoVisible("holgura")
            ? undefined
            : toApiNumber(holgura),
        accesibilidad:
          isJuntaLineal || !campoConfiguradoVisible("cieloModular")
            ? undefined
            : toApiNumber(accesibilidad),
        cieloModular:
          !isJuntaLineal && campoConfiguradoVisible("cieloModular")
            ? toApiNumber(accesibilidad)
            : undefined,
        aislacion:
          !isJuntaLineal && campoConfiguradoVisible("aislacion") && aislacion.trim()
            ? toApiNumber(aislacion)
            : undefined,
        reparacionTabique:
          !isJuntaLineal &&
          campoConfiguradoVisible("reparacionTabique") &&
          reparacionTabique.trim()
            ? toApiNumber(reparacionTabique)
            : undefined,
        observaciones: campoConfiguradoVisible("observaciones")
          ? observaciones
          : undefined,
        itemizadoSacyr:
          isJuntaLineal || !campoConfiguradoVisible("itemizadoMandante")
            ? undefined
            : itemizadoSacyr,
        tipoRegistro,
        metrosLineales: isJuntaLineal
          ? toApiNumber(metrosLineales)
          : undefined,
      });
      registroCreadoId = registro.id;

      await uploadRegistroFotos(registro.id, fotos);

      const registros = await getMisRegistros(true, { scope: "registro" });
      setTecnicoRegistros(registros);
      showSuccessMessage("Registro y fotos enviados correctamente.");
      await clearSelectedObra();
      setObra(null);
      resetForm();
      router.replace("/registros");
    } catch (err: any) {
      if (__DEV__) console.warn("CREATE/UPLOAD REGISTRO ERROR =>", err);
      if (registroCreadoId) {
        try {
          await deleteRegistroPendiente(registroCreadoId);
        } catch (deleteError) {
          if (__DEV__) console.warn("ROLLBACK REGISTRO ERROR =>", deleteError);
        }
      }
      setError(
        registroCreadoId
          ? "No se pudieron subir las fotos. El registro no fue guardado, intenta nuevamente."
          : err?.message || "No se pudo completar el envío.",
      );
    } finally {
      setSaving(false);
    }
  };

  const submitJefeEdit = async () => {
    try {
      if (!editingRegistro) return;

      const validationError = validateJefeEditForm();
      if (validationError) {
        setError(validationError);
        setSuccess("");
        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      if (fotos.length) {
        await uploadRegistroFotos(editingRegistro.id, fotos, {
          replaceExisting: true,
        });
      }

      await enviarRegistroAIngenieria(editingRegistro.id, {
        obraId: editingRegistro.obras?.id || editingRegistro.id,
        ...getPayloadCommonFields(),
        descripcionMaterial: isJuntaLineal
          ? "Junta Lineal Espuma"
          : campoConfiguradoVisible("itemizadoBeck")
            ? itemizadoBeck
            : "No aplica",
        codigoBeck:
          isJuntaLineal || !campoConfiguradoVisible("codigoBeck")
            ? undefined
            : itemizadoCodigoBeck,
        itemizadoBeck:
          isJuntaLineal || !campoConfiguradoVisible("itemizadoBeck")
            ? undefined
            : itemizadoBeck,
        numeroSello:
          isJuntaLineal || !campoConfiguradoVisible("numeroSello")
            ? "No aplica"
            : numeroSello,
        cantidadSellos:
          isJuntaLineal || !campoConfiguradoVisible("cantidadSellos")
            ? 1
            : toApiNumber(cantidadSellos),
        holgura:
          isJuntaLineal || !campoConfiguradoVisible("holgura")
            ? undefined
            : toApiNumber(holgura),
        accesibilidad:
          isJuntaLineal || !campoConfiguradoVisible("cieloModular")
            ? undefined
            : toApiNumber(accesibilidad),
        cieloModular:
          !isJuntaLineal && campoConfiguradoVisible("cieloModular")
            ? toApiNumber(accesibilidad)
            : undefined,
        aislacion:
          !isJuntaLineal && campoConfiguradoVisible("aislacion") && aislacion.trim()
            ? toApiNumber(aislacion)
            : undefined,
        reparacionTabique:
          !isJuntaLineal &&
          campoConfiguradoVisible("reparacionTabique") &&
          reparacionTabique.trim()
            ? toApiNumber(reparacionTabique)
            : undefined,
        folio: campoConfiguradoVisible("folio") ? folio : undefined,
        observaciones: campoConfiguradoVisible("observaciones")
          ? observaciones
          : undefined,
        itemizadoSacyr:
          isJuntaLineal || !campoConfiguradoVisible("itemizadoMandante")
            ? undefined
            : itemizadoSacyr,
        tipoRegistro,
        metrosLineales: isJuntaLineal
          ? toApiNumber(metrosLineales)
          : undefined,
      });

      const registros = await getMisRegistros(true);
      setJefeRegistros(registros);
      setEditingRegistro(null);
      resetForm();
      showSuccessMessage("Registro enviado a ingeniería.");
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar a ingeniería.");
    } finally {
      setSaving(false);
    }
  };

  const submitTecnicoReenvio = async () => {
    try {
      if (!editingRegistro || !obra) return;

      const validationError = validateJefeEditForm();
      if (validationError) {
        setError(validationError);
        setSuccess("");
        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      if (fotos.length) {
        await uploadRegistroFotos(editingRegistro.id, fotos, {
          replaceExisting: true,
        });
      }

      await reenviarRegistroComoTecnico(editingRegistro.id, {
        obraId: obra.id,
        ...getPayloadCommonFields(),
        descripcionMaterial: isJuntaLineal
          ? "Junta Lineal Espuma"
          : campoConfiguradoVisible("itemizadoBeck")
            ? itemizadoBeck
            : "No aplica",
        itemizadoBeck:
          isJuntaLineal || !campoConfiguradoVisible("itemizadoBeck")
            ? undefined
            : itemizadoBeck,
        dimensiones:
          !isJuntaLineal && campoConfiguradoVisible("dimensiones")
            ? dimensiones.trim()
            : undefined,
        numeroSello:
          isJuntaLineal || !campoConfiguradoVisible("numeroSello")
            ? "No aplica"
            : numeroSello,
        cantidadSellos:
          isJuntaLineal || !campoConfiguradoVisible("cantidadSellos")
            ? 1
            : toApiNumber(cantidadSellos),
        holgura:
          isJuntaLineal || !campoConfiguradoVisible("holgura")
            ? undefined
            : toApiNumber(holgura),
        accesibilidad:
          isJuntaLineal || !campoConfiguradoVisible("cieloModular")
            ? undefined
            : toApiNumber(accesibilidad),
        cieloModular:
          !isJuntaLineal && campoConfiguradoVisible("cieloModular")
            ? toApiNumber(accesibilidad)
            : undefined,
        aislacion:
          !isJuntaLineal && campoConfiguradoVisible("aislacion") && aislacion.trim()
            ? toApiNumber(aislacion)
            : undefined,
        reparacionTabique:
          !isJuntaLineal &&
          campoConfiguradoVisible("reparacionTabique") &&
          reparacionTabique.trim()
            ? toApiNumber(reparacionTabique)
            : undefined,
        observaciones: campoConfiguradoVisible("observaciones")
          ? observaciones
          : undefined,
        itemizadoSacyr:
          isJuntaLineal || !campoConfiguradoVisible("itemizadoMandante")
            ? undefined
            : itemizadoSacyr,
        tipoRegistro,
        metrosLineales: isJuntaLineal
          ? toApiNumber(metrosLineales)
          : undefined,
      });

      const registros = await getMisRegistros(true, { scope: "registro" });
      setTecnicoRegistros(registros);
      setEditingRegistro(null);
      resetForm();
      showSuccessMessage("Registro corregido y enviado al Supervisor.");
    } catch (err: any) {
      setError(err?.message || "No se pudo reenviar el registro.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarTecnico = async (registro: RegistroHistorialApi) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      await enviarRegistroATecnico(registro.id);
      const registros = await getMisRegistros(true);
      setJefeRegistros(registros);
      showSuccessMessage("Registro enviado al Operario para corrección.");
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar al Operario.");
    } finally {
      setSaving(false);
    }
  };

  const getPayloadCommonFields = () => ({
    fecha,
    recinto: campoConfiguradoVisible("recinto") ? recinto : undefined,
    modulo: campoConfiguradoVisible("modulo") ? modulo : undefined,
    moduloEdificio: campoConfiguradoVisible("modulo") ? modulo : undefined,
    piso,
    ejeNumerico: campoConfiguradoVisible("ejeNumerico")
      ? ejeNumerico.trim()
      : undefined,
    ejeAlfabetico: campoConfiguradoVisible("ejeAlfabetico")
      ? ejeAlfabetico
      : undefined,
    nombreSellador,
  });

  const renderMenuField = (
    label: string,
    value: string,
    onSelect: (next: string) => void,
    options: { value: string; label: string }[],
  ) => (
    <SelectSheet
      label={label}
      value={value || null}
      placeholder="Seleccionar opción"
      options={options}
      onChange={(next) => onSelect(next ?? "")}
      icon={
        label.startsWith("Holgura")
          ? "arrow-expand-vertical"
          : label === "Accesibilidad"
            ? "ladder"
            : label === "Aislación"
              ? "shield-home-outline"
              : "wall"
      }
    />
  );

  const renderItemizadoTerreno = () => {
    if (!campoConfiguradoVisible("itemizadoBeck")) return null;

    return (
      <>
      <SelectSheet
        label="Itemizado Básico"
        value={otroItemizado ? null : itemizadoBeck || null}
        placeholder="Seleccionar itemizado"
        options={ITEMIZADO_BECK_OPTIONS.map((itemizado) => ({
          value: itemizado,
          label: itemizado,
        }))}
        onChange={(next) => selectItemizadoBeck(next ?? "")}
        icon="format-list-bulleted"
      />

      {campoConfiguradoVisible("dimensiones") ? (
        <TextInput
          label="Dimensiones"
          value={dimensiones}
          onChangeText={setDimensiones}
          mode="outlined"
          placeholder="Ej: 60 mm"
          maxLength={100}
          style={styles.input}
        />
      ) : null}

      <Checkbox.Item
        label="Otras: escribir"
        status={otroItemizado ? "checked" : "unchecked"}
        onPress={toggleOtroItemizado}
        style={styles.checkboxItem}
      />

      {otroItemizado ? (
        <TextInput
          label="Ingresar Itemizado Básico"
          value={itemizadoBeck}
          onChangeText={setItemizadoBeck}
          mode="outlined"
          style={styles.input}
        />
      ) : null}
    </>
    );
  };

  const goToObras = () => {
    if (onChangeObra) {
      onChangeObra();
      return;
    }

    router.replace("/mis-obras");
  };

  const renderItemizadoSelectorModal = () => (
    <Modal
      visible={itemizadoSelectorVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setItemizadoSelectorVisible(false)}
    >
      <Pressable
        style={[styles.modalBackdrop, styles.itemizadoModalBackdrop]}
        onPress={() => setItemizadoSelectorVisible(false)}
      >
        <Pressable style={styles.itemizadoModal}>
          <View style={styles.itemizadoSheetHandle} />
          <View style={styles.modalHeaderRow}>
            <View style={styles.recordInfo}>
              <Text style={styles.modalTitle}>Seleccionar Itemizado Básico</Text>
              <Text style={styles.modalSubtitle}>
                Solo se muestran los itemizados habilitados para esta obra.
              </Text>
            </View>
            <Button mode="text" compact onPress={() => setItemizadoSelectorVisible(false)}>
              Cerrar
            </Button>
          </View>

          <BeckSearchInput
            placeholder="Buscar por itemizado, código o tipo"
            value={itemizadoSearch}
            onChangeText={setItemizadoSearch}
            onSubmitEditing={() => void loadItemizadoOpciones()}
          />
          <TextInput
            label="Elemento atravesado"
            value={itemizadoElementoPenetra}
            onChangeText={setItemizadoElementoPenetra}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Materialidad"
            value={itemizadoMaterialidad}
            onChangeText={setItemizadoMaterialidad}
            mode="outlined"
            style={styles.input}
          />

          <View style={styles.actionRow}>
            <Button
              mode="contained"
              onPress={() => void loadItemizadoOpciones()}
              loading={loadingItemizadoOpciones}
              disabled={loadingItemizadoOpciones}
              style={styles.inlineButton}
            >
              Buscar
            </Button>
            <Button
              mode="outlined"
              onPress={() => {
                setItemizadoSearch("");
                setItemizadoElementoPenetra("");
                setItemizadoMaterialidad("");
                setItemizadoOpciones([]);
              }}
              style={styles.inlineButton}
            >
              Limpiar
            </Button>
          </View>

          <ScrollView
            style={styles.itemizadoResults}
            keyboardShouldPersistTaps="handled"
          >
            {loadingItemizadoOpciones ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color="#f97316" />
                <Text style={styles.emptyText}>Cargando itemizados...</Text>
              </View>
            ) : null}

            {!loadingItemizadoOpciones && !itemizadoOpciones.length ? (
              <Text style={styles.emptyText}>
                Busca por elemento atravesado, materialidad o texto para ver opciones.
              </Text>
            ) : null}

            {itemizadoOpciones.map((opcion) => (
              <Pressable
                key={opcion.id}
                style={styles.itemizadoOption}
                onPress={() => selectItemizadoOpcion(opcion)}
              >
                <Text style={styles.recordTitle}>
                  {opcion.elemento_pasante || "Sin itemizado"}
                </Text>
                <Text style={styles.recordMeta}>
                  Código BECK: {opcion.codigo_beck || "Sin código"}
                </Text>
                <Text style={styles.recordMeta}>
                  Atravesado: {opcion.elemento_penetra || "Sin dato"} ·{" "}
                  Materialidad: {opcion.materialidad || "Sin dato"}
                </Text>
                {opcion.tipo ? (
                  <Text style={styles.recordMeta}>Tipo: {opcion.tipo}</Text>
                ) : null}
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );

  const renderFotos = (options?: {
    existingFotos?: NonNullable<RegistroHistorialApi["fotos"]>;
    replacementMode?: boolean;
    terrainCreate?: boolean;
  }) => {
    if (!campoConfiguradoVisible("foto")) return null;

    return (
      <>
      {options?.terrainCreate ? (
        <View style={styles.terrenoSectionHeader}>
          <View style={styles.terrenoSectionIcon}>
            <MaterialCommunityIcons name="camera-outline" size={18} color="#0f172a" />
          </View>
          <View style={styles.terrenoSectionHeading}>
            <Text style={styles.terrenoSectionTitle}>Evidencia fotográfica</Text>
            <Text style={styles.terrenoSectionHint}>
              Agrega al menos una fotografía clara del trabajo realizado.
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.photosTitle}>Foto</Text>
      )}

      {options?.existingFotos?.length ? (
        <>
          <Text style={styles.photosHint}>Fotografias actuales</Text>
          <View style={styles.photosGrid}>
            {options.existingFotos.map((foto) => (
              <View key={foto.id} style={styles.photoItem}>
                <ExpandableImage uri={foto.url} style={styles.photoPreview} />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {options?.replacementMode ? (
        <Text style={styles.photosHint}>
          Si agregas una foto nueva, reemplazara las fotografias actuales al
          enviar a ingenieria.
        </Text>
      ) : null}

      <View style={styles.photoActions}>
        <Button
          mode="outlined"
          icon="image-multiple-outline"
          onPress={pickFromLibrary}
          style={options?.terrainCreate ? styles.terrenoPhotoButton : undefined}
          textColor={options?.terrainCreate ? "#0f172a" : undefined}
        >
          Elegir de galeria
        </Button>
        <Button
          mode="outlined"
          icon="camera-outline"
          onPress={takePhoto}
          style={options?.terrainCreate ? styles.terrenoPhotoButton : undefined}
          textColor={options?.terrainCreate ? "#0f172a" : undefined}
        >
          Tomar foto
        </Button>
      </View>

      {fotos.length ? (
        <>
          {options?.replacementMode ? (
            <Text style={styles.photosHint}>Nuevas fotografias</Text>
          ) : null}
          <View style={styles.photosGrid}>
            {fotos.map((foto, index) => (
              <View key={`${foto.uri}-${index}`} style={styles.photoItem}>
                <ExpandableImage
                  uri={foto.uri}
                  style={styles.photoPreview}
                  accessibilityLabel={`Ver fotografía nueva ${index + 1} en pantalla completa`}
                />
                <Button
                  mode="text"
                  onPress={() => removeFoto(index)}
                  compact
                  textColor="#dc2626"
                >
                  Quitar
                </Button>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
    );
  };

  if (userRole === "jefeobra") {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        {isJefeObraObrasList ? (
          <View style={styles.fixedHeader}>
            <BrandHeader subtitle="Registros de Operarios · Supervisor" />

            <BeckSearchInput
              placeholder="Buscar obra por nombre o código"
              value={jefeObraSearch}
              onChangeText={setJefeObraSearch}
            />

            <Text style={styles.sectionTitle}>Obras disponibles</Text>
          </View>
        ) : isJefeObraRegistrosList && selectedJefeObra ? (
          <View style={styles.fixedHeader}>
            <View style={styles.fixedTopRow}>
              <View style={styles.fixedBrand}>
                <BrandHeader subtitle="Registros de Operarios · Supervisor" />
              </View>
              <Button
                mode="text"
                compact
                onPress={() => {
                  setSelectedJefeObraId(null);
                  setJefeRegistroSearch("");
                  setJefeEstadoFiltro("todos");
                }}
              >
                Volver
              </Button>
            </View>
            <Text style={styles.sectionTitle}>{selectedJefeObra.nombre}</Text>

            <BeckSearchInput
              placeholder="Buscar por operario, sello, piso o eje"
              value={jefeRegistroSearch}
              onChangeText={setJefeRegistroSearch}
            />

            <BeckFilterPanel
              title="Filtrar registros"
              resultCount={filteredJefeRegistros.length}
              options={REGISTRO_ESTADO_FILTERS.map((filter) => ({
                ...filter,
                count: jefeFilterCounts[filter.value],
              }))}
              value={jefeEstadoFiltro}
              onChange={setJefeEstadoFiltro}
            />
          </View>
        ) : null}
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            (isJefeObraObrasList || isJefeObraRegistrosList) &&
              styles.contentAfterFixedHeader,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          refreshControl={
            editingRegistro ? (
              <RefreshControl
                refreshing={refreshingConfiguracionRegistro}
                onRefresh={refreshConfiguracionFormulario}
              />
            ) : (
              <RefreshControl
                refreshing={refreshingJefeRegistros}
                onRefresh={refreshJefeObraData}
              />
            )
          }
        >
          {!isJefeObraObrasList && !isJefeObraRegistrosList ? (
            <BrandHeader subtitle="Registros de Operarios · Supervisor" />
          ) : null}

          {loadingJefeRegistros ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#f97316" />
              <Text style={styles.emptyText}>Cargando registros...</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          {editingRegistro && loadingConfiguracionRegistro ? (
            <Card style={styles.card}>
              <Card.Content style={styles.loadingBox}>
                <ActivityIndicator color="#f97316" />
                <Text style={styles.emptyText}>
                  Cargando campos del registro...
                </Text>
              </Card.Content>
            </Card>
          ) : editingRegistro ? (
            <Card style={[styles.card, styles.jefeEditCard]}>
              <View style={styles.jefeEditClip}>
              <View style={styles.jefeEditAccent} />
              <Card.Content style={styles.jefeEditContent}>
                <View style={styles.jefeEditHeader}>
                  <View style={styles.jefeEditHeaderIcon}>
                    <MaterialCommunityIcons
                      name={isJuntaLineal ? "ruler" : "fire"}
                      size={24}
                      color="#0f172a"
                    />
                  </View>
                  <View style={styles.jefeEditHeaderInfo}>
                    <Text style={styles.jefeEditTitle}>Editar registro</Text>
                    <Text style={styles.jefeEditOperator} numberOfLines={1}>
                      {editingRegistro.usuarios?.nombre || "Sin operario"}
                    </Text>
                  </View>
                  <Button
                    mode="text"
                    compact
                    textColor="#0f172a"
                    onPress={() => setEditingRegistro(null)}
                  >
                    Cancelar
                  </Button>
                </View>

                <View style={styles.jefeEditSummary}>
                  <View style={styles.jefeEditSummaryItem}>
                    <Text style={styles.jefeEditSummaryLabel}>Obra</Text>
                    <Text style={styles.jefeEditSummaryValue} numberOfLines={1}>
                      {editingRegistro.obras?.nombre || "Sin obra"}
                    </Text>
                  </View>
                  <View style={styles.jefeEditSummaryItem}>
                    <Text style={styles.jefeEditSummaryLabel}>Fecha</Text>
                    <Text style={styles.jefeEditSummaryValue}>
                      {formatExecutionDate(editingRegistro.fecha)}
                    </Text>
                  </View>
                  <View style={styles.jefeEditSummaryItem}>
                    <Text style={styles.jefeEditSummaryLabel}>Nº sello</Text>
                    <Text style={styles.jefeEditSummaryValue}>
                      {editingRegistro.numero_sello || "—"}
                    </Text>
                  </View>
                </View>

                <View style={styles.jefeEditSectionHeader}>
                  <MaterialCommunityIcons name="file-document-edit-outline" size={18} color="#f97316" />
                  <Text style={styles.jefeEditSectionTitle}>Datos generales</Text>
                </View>

                {campoConfiguradoVisible("tipoRegistro") ? (
                  <>
                    <Text style={styles.fieldLabel}>Tipo de registro</Text>
                    <SegmentedButtons
                      value={tipoRegistro}
                      onValueChange={(value) => setTipoRegistro(value as TipoRegistro)}
                      style={styles.segmented}
                      buttons={[
                        { value: "sello_cortafuego", label: "Sello" },
                        { value: "junta_lineal_espuma", label: "Junta" },
                      ]}
                    />
                  </>
                ) : null}

                {!isJuntaLineal && campoConfiguradoVisible("itemizadoBeck") ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Itemizado Básico"
                    onPress={openItemizadoSelector}
                    style={({ pressed }) => [
                      styles.catalogSelectButton,
                      pressed && styles.catalogSelectButtonPressed,
                    ]}
                  >
                    <View style={styles.catalogSelectIcon}>
                      <MaterialCommunityIcons
                        name="format-list-bulleted"
                        size={18}
                        color="#c2410c"
                      />
                    </View>
                    <View style={styles.catalogSelectTextGroup}>
                      <Text style={styles.catalogSelectLabel}>Itemizado Básico</Text>
                      <Text style={styles.catalogSelectValue} numberOfLines={1}>
                        {itemizadoBeck || "Seleccionar itemizado"}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={21} color="#64748b" />
                  </Pressable>
                ) : null}

                {!isJuntaLineal && campoConfiguradoVisible("dimensiones") ? (
                  <TextInput
                    label="Dimensiones"
                    value={dimensiones || "Sin información"}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                  />
                ) : null}

                {!isJuntaLineal && campoConfiguradoVisible("codigoBeck") ? (
                  <TextInput
                    label="Código BECK"
                    value={itemizadoCodigoBeck}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                  />
                ) : null}

                {!isJuntaLineal && campoConfiguradoVisible("itemizadoMandante") ? (
                  <TextInput
                    label="Itemizado Mandante"
                    value={itemizadoSacyr}
                    onChangeText={setItemizadoSacyr}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("fechaEjecucionSello") ? (
                  <Pressable onPress={() => setCalendarVisible(true)}>
                    <TextInput
                      label="Fecha ejecución de sello"
                      value={fecha}
                      mode="outlined"
                      editable={false}
                      pointerEvents="none"
                      right={<TextInput.Icon icon="calendar" />}
                      style={styles.input}
                    />
                  </Pressable>
                ) : null}

                {campoConfiguradoVisible("diaSemana") ? (
                  <TextInput
                    label="Día"
                    value={getDiaSemana(fecha)}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("piso") ? (
                  <TextInput
                    label="Piso"
                    value={piso}
                    onChangeText={setPiso}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("ejeAlfabetico") ? (
                  <TextInput
                    label="Eje Alfabético"
                    value={ejeAlfabetico}
                    onChangeText={setEjeAlfabetico}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("ejeNumerico") ? (
                  <TextInput
                    label="Eje Numérico"
                    value={ejeNumerico}
                    onChangeText={setEjeNumerico}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("nombreSellador") ? (
                  <TextInput
                    label="Nombre sellador"
                    value={nombreSellador}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                  />
                ) : null}

                {isJuntaLineal && campoConfiguradoVisible("metrosLineales") ? (
                  <TextInput
                    label="Longitud (m)"
                    value={metrosLineales}
                    onChangeText={setMetrosLineales}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                ) : null}

                {renderFotos({
                  existingFotos: getRegistroFotos(editingRegistro),
                  replacementMode: true,
                })}

                <View style={styles.jefeEditSectionHeader}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color="#f97316" />
                  <Text style={styles.jefeEditSectionTitle}>Ubicación y cantidades</Text>
                </View>

                {campoConfiguradoVisible("recinto") ? (
                  <TextInput
                    label="Recinto"
                    value={recinto}
                    onChangeText={setRecinto}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("modulo") ? (
                  <TextInput
                    label="Módulo o edificio"
                    value={modulo}
                    onChangeText={setModulo}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {!isJuntaLineal ? (
                  <>
                    {campoConfiguradoVisible("numeroSello") ? (
                      <TextInput
                        label="N° del sello"
                        value={numeroSello}
                        onChangeText={setNumeroSello}
                        mode="outlined"
                        style={styles.input}
                      />
                    ) : null}
                    {campoConfiguradoVisible("cantidadSellos") ? (
                      <TextInput
                        label="Cantidad de Sellos"
                        value={cantidadSellos}
                        onChangeText={(value) => setCantidadSellos(onlyDigits(value))}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    ) : null}
                    {campoConfiguradoVisible("holgura")
                      ? renderMenuField(
                          "Holgura (cm)",
                          holgura,
                          setHolgura,
                          HOLGURA_OPTIONS,
                        )
                      : null}
                    {campoConfiguradoVisible("factorPorHolguras") ? (
                      <TextInput
                        label="Factor por Holguras (calculado al guardar)"
                        value={String(editingRegistro.factor_por_holguras ?? "")}
                        mode="outlined"
                        editable={false}
                        style={styles.input}
                      />
                    ) : null}
                    {campoConfiguradoVisible("cieloModular") ? (
                      renderMenuField(
                        "Accesibilidad",
                        accesibilidad,
                        setAccesibilidad,
                        ACCESIBILIDAD_OPTIONS,
                      )
                    ) : null}
                    {campoConfiguradoVisible("cantidadSellosConFactores") ? (
                      <TextInput
                        label="Cantidad con factores (calculada al guardar)"
                        value={String(
                          editingRegistro.cantidad_sellos_con_factores ?? "",
                        )}
                        mode="outlined"
                        editable={false}
                        style={styles.input}
                      />
                    ) : null}
                    {campoConfiguradoVisible("aislacion") ? (
                      renderMenuField(
                        "Aislación",
                        aislacion,
                        setAislacion,
                        APLICA_OPTIONS,
                      )
                    ) : null}
                    {campoConfiguradoVisible("cantidadSellosAislacion") ? (
                      <TextInput
                        label="Cantidad de Sellos Aislación"
                        value={String(editingRegistro.cantidad_sellos_aislacion ?? "")}
                        mode="outlined"
                        editable={false}
                        style={styles.input}
                      />
                    ) : null}
                    {campoConfiguradoVisible("reparacionTabique") ? (
                      renderMenuField(
                        "Reparación de tabique",
                        reparacionTabique,
                        setReparacionTabique,
                        APLICA_OPTIONS,
                      )
                    ) : null}
                    {campoConfiguradoVisible("cantidadFinal") ? (
                      <TextInput
                        label="Cantidad final"
                        value={String(editingRegistro.cantidad_final ?? "")}
                        mode="outlined"
                        editable={false}
                        style={styles.input}
                      />
                    ) : null}
                    {campoConfiguradoVisible("folio") ? (
                      <TextInput
                        label="Folio"
                        value={folio}
                        onChangeText={setFolio}
                        mode="outlined"
                        style={styles.input}
                      />
                    ) : null}
                  </>
                ) : null}

                {campoConfiguradoVisible("observaciones") ? (
                  <>
                    <View style={styles.jefeEditSectionHeader}>
                      <MaterialCommunityIcons name="text-box-outline" size={18} color="#f97316" />
                      <Text style={styles.jefeEditSectionTitle}>Observaciones</Text>
                    </View>
                    <TextInput
                      label="Observaciones"
                      value={observaciones}
                      onChangeText={setObservaciones}
                      mode="outlined"
                      multiline
                      numberOfLines={6}
                      style={[styles.input, styles.observacionesInput]}
                    />
                  </>
                ) : null}

                <Button
                  mode="contained"
                  onPress={submitJefeEdit}
                  loading={saving}
                  disabled={saving}
                  style={[styles.button, styles.jefeEditSubmit]}
                  buttonColor="#f97316"
                  icon="send-outline"
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {saving ? "Enviando..." : "Enviar a ingeniería"}
                </Button>
              </Card.Content>
              </View>
            </Card>
          ) : selectedJefeObra ? (
            <>
              {!isJefeObraRegistrosList ? (
                <>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.recordInfo}>
                      <Text style={styles.sectionTitle}>{selectedJefeObra.nombre}</Text>
                    </View>
                    <Button
                      mode="text"
                      onPress={() => {
                        setSelectedJefeObraId(null);
                        setJefeRegistroSearch("");
                        setJefeEstadoFiltro("todos");
                      }}
                    >
                      Volver
                    </Button>
                  </View>

                  <BeckSearchInput
                    placeholder="Buscar por operario, sello, piso o eje"
                    value={jefeRegistroSearch}
                    onChangeText={setJefeRegistroSearch}
                  />

                  <BeckFilterPanel
                    title="Filtrar registros"
                    resultCount={filteredJefeRegistros.length}
                    options={REGISTRO_ESTADO_FILTERS.map((filter) => ({
                      ...filter,
                      count: jefeFilterCounts[filter.value],
                    }))}
                    value={jefeEstadoFiltro}
                    onChange={setJefeEstadoFiltro}
                  />
                </>
              ) : null}
              {filteredJefeRegistros.length ? (
                filteredJefeRegistros.map((registro) => (
                  <Card key={registro.id} style={[styles.historyCard, styles.jefeHistoryCard]}>
                    <View style={styles.jefeHistoryClip}>
                    <View
                      style={[
                        styles.jefeRegistroCardAccent,
                        (registro.estado === "rechazado" ||
                          (registro.es_correccion && !registro.corregido_at)) &&
                          styles.jefeRegistroCardAccentRejected,
                      ]}
                    />
                    <Card.Content style={styles.jefeCardContent}>
                      <View style={[styles.recordHeader, styles.jefeRecordHeader]}>
                        <View style={[styles.recordIcon, styles.jefeRecordIcon]}>
                          <MaterialCommunityIcons
                            name={
                              registro.tipo_registro === "junta_lineal_espuma"
                                ? "ruler"
                                : "fire"
                            }
                            size={19}
                            color="#0f172a"
                          />
                        </View>
                        <View style={styles.recordInfo}>
                          <Text style={[styles.recordTitle, styles.jefeRecordTitle]}>
                            {registro.tipo_registro === "junta_lineal_espuma"
                              ? "Junta lineal espuma"
                              : "Sello cortafuego"}
                          </Text>
                          <Text style={[styles.recordMeta, styles.jefeRecordMeta]}>
                            Piso {registro.piso} · Eje {registro.eje_alfabetico}-{registro.eje_numerico}
                          </Text>
                          <Text style={[styles.recordMeta, styles.jefeRecordMeta]}>
                            Fecha: {formatExecutionDate(registro.fecha)} · Hora: {formatTime24WithPeriod(registro.created_at)} · Sello: {registro.numero_sello || "Sin número"}
                          </Text>
                          <Text style={[styles.recordMeta, styles.jefeRecordMeta]}>
                            Operario: {registro.usuarios?.nombre || registro.nombre_sellador}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.statusPill,
                            styles.jefeStatusPill,
                            (registro.estado === "rechazado" ||
                              (registro.es_correccion && !registro.corregido_at)) &&
                              styles.statusRechazado,
                          ]}
                        >
                          {registro.es_correccion && !registro.corregido_at
                            ? "corrección"
                            : getRegistroEstadoLabel(registro.estado)}
                        </Text>
                      </View>

                      <RegistroContextBox registro={registro} />

                      <View style={[styles.actionRow, styles.jefeActionRow]}>
                        {registro.estado === "pendiente" ? (
                          <Button
                            mode="contained"
                            buttonColor="#f97316"
                            textColor="#ffffff"
                            onPress={() => fillFormFromRegistro(registro)}
                            style={[styles.inlineButton, styles.jefeInlineButton]}
                            contentStyle={styles.jefeButtonContent}
                            labelStyle={styles.jefeButtonLabel}
                          >
                            Editar y enviar
                          </Button>
                        ) : null}
                        {registro.estado === "pendiente" &&
                        registro.es_correccion &&
                        !registro.devuelto_a_tecnico ? (
                          <Button
                            mode="contained"
                            buttonColor="#0f172a"
                            textColor="#ffffff"
                            onPress={() => handleEnviarTecnico(registro)}
                            loading={saving}
                            disabled={saving}
                            style={[styles.inlineButton, styles.jefeInlineButton]}
                            contentStyle={styles.jefeButtonContent}
                            labelStyle={styles.jefeButtonLabel}
                          >
                            Enviar a Operario
                          </Button>
                        ) : null}
                      </View>
                    </Card.Content>
                    </View>
                  </Card>
                ))
              ) : (
                <Card style={styles.card}>
                  <Card.Content>
                    <Text style={styles.emptyText}>
                      No hay registros pendientes o rechazados para esta obra.
                    </Text>
                  </Card.Content>
                </Card>
              )}
            </>
          ) : (
            <>
              {!isJefeObraObrasList ? (
                <>
                  <BeckSearchInput
                    placeholder="Buscar obra por nombre o código"
                    value={jefeObraSearch}
                    onChangeText={setJefeObraSearch}
                  />

                  <Text style={styles.sectionTitle}>Obras disponibles</Text>
                </>
              ) : null}
              {filteredJefeObras.map((item) => (
                <Card
                  key={item.id}
                  style={[
                    styles.jefeObraCard,
                    selectedJefeObraId === item.id && styles.selectedCard,
                  ]}
                >
                  <View style={styles.jefeObraCardClip}>
                  <View style={styles.jefeObraCardAccent} />
                  <Card.Content style={styles.jefeObraCardContent}>
                    <View style={styles.jefeObraCardRow}>
                      <View style={styles.jefeObraIcon}>
                        <MaterialCommunityIcons
                          name="office-building-outline"
                          size={24}
                          color="#0f172a"
                        />
                      </View>
                      <View style={styles.recordInfo}>
                        <Text style={styles.jefeObraCardTitle}>{item.nombre}</Text>
                        <View style={styles.jefeObraBadges}>
                          <Text style={styles.jefeObraCodeBadge}>
                            {item.codigo || "Sin código"}
                          </Text>
                          <Text
                            style={[
                              styles.jefeObraStateBadge,
                              item.estado === "pausada" && styles.jefeObraStatePaused,
                            ]}
                          >
                            {item.estado || "Sin estado"}
                          </Text>
                        </View>
                      </View>
                      <Button
                        mode="contained"
                        compact
                        icon="arrow-right"
                        buttonColor="#0f172a"
                        textColor="#ffffff"
                        style={styles.jefeObraViewButton}
                        contentStyle={styles.jefeObraViewButtonContent}
                        labelStyle={styles.jefeObraViewButtonLabel}
                        onPress={() => {
                          setSelectedJefeObraId(item.id);
                          setJefeRegistroSearch("");
                          setJefeEstadoFiltro("todos");
                        }}
                      >
                        Ver
                      </Button>
                    </View>
                  </Card.Content>
                  </View>
                </Card>
              ))}

            </>
          )}
        </ScrollView>
        </TouchableWithoutFeedback>
        {renderItemizadoSelectorModal()}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      {isTerrenoRegistroList ? (
        <View style={styles.fixedHeader}>
          <BrandHeader subtitle="Registro de operario · BECK" />
          <BeckSearchInput
            placeholder="Buscar por obra, piso o N° de sello"
            value={tecnicoRegistroSearch}
            onChangeText={setTecnicoRegistroSearch}
          />
          <BeckFilterPanel
            title="Filtrar registros"
            resultCount={filteredTecnicoRegistros.length}
            options={REGISTRO_ESTADO_FILTERS.map((filter) => ({
              ...filter,
              count: tecnicoFilterCounts[filter.value],
            }))}
            value={tecnicoEstadoFiltro}
            onChange={setTecnicoEstadoFiltro}
          />
        </View>
      ) : null}
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          isTerrenoRegistroList && styles.contentAfterFixedHeader,
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          userRole === "terreno" && !isFormMode && !editingRegistro ? (
            <RefreshControl
              refreshing={refreshingTecnicoRegistros}
              onRefresh={refreshTecnicoRegistros}
            />
          ) : userRole === "terreno" && isFormMode && obra ? (
            <RefreshControl
              refreshing={refreshingConfiguracionRegistro}
              onRefresh={refreshConfiguracionFormulario}
            />
          ) : undefined
        }
      >
        {!isTerrenoRegistroList ? (
          <BrandHeader subtitle="Registro de operario · BECK" />
        ) : null}

        {userRole === "terreno" && !isFormMode && !editingRegistro ? (
          <>
            <Text style={styles.sectionTitle}>Registros pendientes</Text>
            {filteredTecnicoRegistros.map((registro) => {
              const canEditCorrection =
                registro.estado === "rechazado" ||
                isCorreccionEditable(registro);

              return (
                <Card
                  key={registro.id}
                  style={[styles.historyCard, styles.terrenoPendingCard]}
                  onPress={() => setSelectedTecnicoRegistro(registro)}
                  accessibilityLabel={`Ver detalle del registro ${registro.numero_sello || registro.id}`}
                >
                  <View style={styles.terrenoPendingClip}>
                  <View
                    style={[
                      styles.terrenoPendingAccent,
                      registro.estado === "rechazado" &&
                        styles.terrenoPendingAccentRejected,
                    ]}
                  />
                  <Card.Content style={styles.terrenoPendingContent}>
                    <View style={styles.terrenoPendingHeader}>
                      <View style={styles.terrenoPendingIcon}>
                        <MaterialCommunityIcons
                          name={
                            registro.tipo_registro === "junta_lineal_espuma"
                              ? "ruler"
                              : "fire"
                          }
                          size={20}
                          color="#0f172a"
                        />
                      </View>
                      <View style={styles.recordInfo}>
                        <Text style={styles.terrenoPendingType}>
                          {registro.tipo_registro === "junta_lineal_espuma"
                            ? "Junta lineal espuma"
                            : "Sello cortafuego"}
                        </Text>
                        <Text style={styles.terrenoPendingObra} numberOfLines={1}>
                          {registro.obras?.nombre || "Sin obra"} · {registro.obras?.codigo || "Sin código"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.statusPill,
                          styles.terrenoPendingStatus,
                          registro.estado === "rechazado" && styles.statusRechazado,
                        ]}
                      >
                        {getRegistroEstadoLabel(registro.estado)}
                      </Text>
                    </View>

                    <View style={styles.terrenoPendingDetails}>
                      <View style={styles.terrenoPendingDetailRow}>
                        <MaterialCommunityIcons
                          name="map-marker-outline"
                          size={14}
                          color="#c2410c"
                        />
                        <Text style={styles.terrenoPendingDetailValue}>
                          Piso {registro.piso || "—"} · Eje {registro.eje_alfabetico || "—"}-{registro.eje_numerico || "—"}
                        </Text>
                      </View>
                      <View style={styles.terrenoPendingDetailRow}>
                        <MaterialCommunityIcons
                          name="calendar-outline"
                          size={14}
                          color="#c2410c"
                        />
                        <Text style={styles.terrenoPendingDetailValue}>
                          {formatExecutionDate(registro.fecha)} · {formatTime24WithPeriod(registro.created_at)}
                          {registro.tipo_registro !== "junta_lineal_espuma"
                            ? ` · Sello ${registro.numero_sello || "Sin número"}`
                            : ""}
                        </Text>
                      </View>
                    </View>

                    <RegistroContextBox registro={registro} />
                    <View style={styles.terrenoPendingOpenHint}>
                      <MaterialCommunityIcons name="eye-outline" size={14} color="#c2410c" />
                      <Text style={styles.terrenoPendingOpenHintText}>
                        Ver registro completo y fotografías
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={16} color="#c2410c" />
                    </View>
                    {canEditCorrection ? (
                      <Button
                        mode="contained"
                        icon="file-document-edit-outline"
                        onPress={(event) => {
                          event.stopPropagation();
                          fillFormFromRegistro(registro);
                        }}
                        style={styles.terrenoCorrectionButton}
                        contentStyle={styles.terrenoCorrectionButtonContent}
                        labelStyle={styles.terrenoCorrectionButtonLabel}
                      >
                        Corregir registro
                      </Button>
                    ) : null}
                  </Card.Content>
                  </View>
                </Card>
              );
            })}
            {!filteredTecnicoRegistros.length ? (
              <Card style={styles.card}>
                <Card.Content>
                  <Text style={styles.emptyText}>
                    No tienes registros pendientes ni correcciones habilitadas.
                  </Text>
                </Card.Content>
              </Card>
            ) : null}
          </>
        ) : null}

        {editingRegistro && userRole === "terreno" && loadingConfiguracionRegistro ? (
          <Card style={styles.card}>
            <Card.Content style={styles.loadingBox}>
              <ActivityIndicator color="#f97316" />
              <Text style={styles.emptyText}>
                Cargando campos del registro...
              </Text>
            </Card.Content>
          </Card>
        ) : editingRegistro && userRole === "terreno" ? (
          <Card style={[styles.card, styles.terrenoFormCard]}>
            <View style={styles.terrenoFormClip}>
            <View style={styles.terrenoFormAccent} />
            <Card.Content style={styles.terrenoFormContent}>
              <View style={styles.terrenoFormHeader}>
                <View style={styles.terrenoFormHeaderIcon}>
                  <MaterialCommunityIcons
                    name="file-document-edit-outline"
                    size={25}
                    color="#0f172a"
                  />
                </View>
                <View style={styles.terrenoSectionHeading}>
                  <Text style={styles.terrenoFormTitle}>Corregir registro</Text>
                  <Text style={styles.terrenoFormSubtitle}>
                    Revisa el rechazo y actualiza los datos solicitados.
                  </Text>
                </View>
                <Button
                  mode="text"
                  compact
                  textColor="#c2410c"
                  onPress={() => setEditingRegistro(null)}
                >
                  Cancelar
                </Button>
              </View>

              <RegistroContextBox registro={editingRegistro} />

              {campoConfiguradoVisible("tipoRegistro") ? (
                <>
                  <View style={styles.terrenoSectionHeader}>
                    <View style={styles.terrenoSectionIcon}>
                      <MaterialCommunityIcons name="fire" size={18} color="#0f172a" />
                    </View>
                    <Text style={styles.terrenoSectionTitle}>Tipo de registro</Text>
                  </View>
                  <SegmentedButtons
                    value={tipoRegistro}
                    onValueChange={(value) => setTipoRegistro(value as TipoRegistro)}
                    style={styles.segmented}
                    buttons={[
                      { value: "sello_cortafuego", label: "Sello Cortafuego" },
                      { value: "junta_lineal_espuma", label: "Junta Lineal Espuma" },
                    ]}
                  />
                </>
              ) : null}

              {!isJuntaLineal ? renderItemizadoTerreno() : null}

              <View style={styles.terrenoSectionHeader}>
                <View style={styles.terrenoSectionIcon}>
                  <MaterialCommunityIcons
                    name="map-marker-outline"
                    size={18}
                    color="#0f172a"
                  />
                </View>
                <Text style={styles.terrenoSectionTitle}>Ubicación y ejecución</Text>
              </View>

              {campoConfiguradoVisible("fechaEjecucionSello") ? (
                <Pressable onPress={() => setCalendarVisible(true)}>
                  <TextInput
                    label="Fecha ejecución de sello"
                    value={fecha}
                    mode="outlined"
                    editable={false}
                    pointerEvents="none"
                    right={<TextInput.Icon icon="calendar" />}
                    style={styles.input}
                  />
                </Pressable>
              ) : null}

              {campoConfiguradoVisible("diaSemana") ? (
                <TextInput
                  label="Día"
                  value={getDiaSemana(fecha)}
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                />
              ) : null}

              {campoConfiguradoVisible("piso") ? (
                <TextInput
                  label="Piso"
                  value={piso}
                  onChangeText={setPiso}
                  mode="outlined"
                  style={styles.input}
                />
              ) : null}

              {campoConfiguradoVisible("ejeAlfabetico") ? (
                <TextInput
                  label="Eje Alfabético"
                  value={ejeAlfabetico}
                  onChangeText={setEjeAlfabetico}
                  mode="outlined"
                  style={styles.input}
                />
              ) : null}

              {campoConfiguradoVisible("ejeNumerico") ? (
                <TextInput
                  label="Eje Numérico"
                  value={ejeNumerico}
                  onChangeText={setEjeNumerico}
                  mode="outlined"
                  style={styles.input}
                />
              ) : null}

              {campoConfiguradoVisible("nombreSellador") ? (
                <TextInput
                  label="Nombre sellador"
                  value={nombreSellador}
                  mode="outlined"
                  editable={false}
                  style={styles.input}
                />
              ) : null}

              {isJuntaLineal ? (
                <>
                  {campoConfiguradoVisible("metrosLineales") ? (
                    <TextInput
                      label="Longitud (m)"
                      value={metrosLineales}
                      onChangeText={setMetrosLineales}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />
                  ) : null}
                  {campoConfiguradoVisible("observaciones") ? (
                    <TextInput
                      label="Observaciones"
                      value={observaciones}
                      onChangeText={setObservaciones}
                      mode="outlined"
                      multiline
                      numberOfLines={6}
                      style={[styles.input, styles.observacionesInput]}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {campoConfiguradoVisible("recinto") ? (
                    <TextInput
                      label="Recinto"
                      value={recinto}
                      onChangeText={setRecinto}
                      mode="outlined"
                      style={styles.input}
                    />
                  ) : null}
                  {campoConfiguradoVisible("modulo") ? (
                    <TextInput
                      label="Módulo o edificio"
                      value={modulo}
                      onChangeText={setModulo}
                      mode="outlined"
                      style={styles.input}
                    />
                  ) : null}
                  {campoConfiguradoVisible("numeroSello") ? (
                    <TextInput
                      label="N° del sello"
                      value={numeroSello}
                      onChangeText={setNumeroSello}
                      mode="outlined"
                      style={styles.input}
                    />
                  ) : null}
                  {campoConfiguradoVisible("cantidadSellos") ? (
                    <TextInput
                      label="Cantidad de Sellos"
                      value={cantidadSellos}
                      onChangeText={(value) => setCantidadSellos(onlyDigits(value))}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                  ) : null}
                  {campoConfiguradoVisible("holgura")
                    ? renderMenuField(
                        "Holgura (cm)",
                        holgura,
                        setHolgura,
                        HOLGURA_OPTIONS,
                      )
                    : null}
                  {campoConfiguradoVisible("cieloModular") ? (
                    renderMenuField(
                      "Accesibilidad",
                      accesibilidad,
                      setAccesibilidad,
                      ACCESIBILIDAD_OPTIONS,
                    )
                  ) : null}
                  {campoConfiguradoVisible("aislacion") ? (
                    renderMenuField(
                      "Aislación",
                      aislacion,
                      setAislacion,
                      APLICA_OPTIONS,
                    )
                  ) : null}
                  {campoConfiguradoVisible("reparacionTabique") ? (
                    renderMenuField(
                      "Reparación de tabique",
                      reparacionTabique,
                      setReparacionTabique,
                      APLICA_OPTIONS,
                    )
                  ) : null}
                  {campoConfiguradoVisible("observaciones") ? (
                    <TextInput
                      label="Observaciones"
                      value={observaciones}
                      onChangeText={setObservaciones}
                      mode="outlined"
                      multiline
                      numberOfLines={6}
                      style={[styles.input, styles.observacionesInput]}
                    />
                  ) : null}
                </>
              )}

              {renderFotos({
                terrainCreate: true,
                existingFotos: getRegistroFotos(editingRegistro),
                replacementMode: true,
              })}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? <Text style={styles.successText}>{success}</Text> : null}

              <Button
                mode="contained"
                onPress={submitTecnicoReenvio}
                loading={saving}
                disabled={saving}
                style={[styles.button, styles.terrenoSubmitButton]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
                icon="send-outline"
              >
                {saving ? "Reenviando..." : "Reenviar al Supervisor"}
              </Button>
            </Card.Content>
            </View>
          </Card>
        ) : isFormMode && !obra ? (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.emptyTitle}>No hay obra seleccionada</Text>
              <Text style={styles.emptyText}>
                Primero debes seleccionar una obra antes de registrar
                informacion.
              </Text>

              <Button
                mode="contained"
                onPress={goToObras}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                Ir a Mis Obras
              </Button>
            </Card.Content>
          </Card>
        ) : isFormMode && obra ? (
          <>
            <Card style={[styles.card, styles.terrenoObraCard]}>
              <View style={styles.terrenoObraClip}>
              <View style={styles.terrenoObraAccent} />
              <Card.Content style={styles.terrenoObraContent}>
                <View style={styles.terrenoObraRow}>
                  <View style={styles.terrenoObraIcon}>
                    <MaterialCommunityIcons
                      name="office-building-outline"
                      size={25}
                      color="#0f172a"
                    />
                  </View>
                  <View style={styles.terrenoObraInfo}>
                    <Text style={styles.terrenoObraLabel}>Obra seleccionada</Text>
                    <Text style={styles.terrenoObraName}>{obra.nombre}</Text>
                    <View style={styles.terrenoObraBadges}>
                      <Text style={styles.terrenoObraCode}>
                        {obra.codigo || "Sin código"}
                      </Text>
                      <Text
                        style={[
                          styles.terrenoObraState,
                          obra.estado === "pausada" && styles.terrenoObraStatePaused,
                        ]}
                      >
                        {obra.estado || "Sin estado"}
                      </Text>
                    </View>
                  </View>

                  <Button
                    mode="text"
                    compact
                    onPress={goToObras}
                    style={styles.terrenoChangeButton}
                    labelStyle={styles.terrenoChangeButtonLabel}
                    textColor="#c2410c"
                  >
                    Cambiar obra
                  </Button>
                </View>
              </Card.Content>
              </View>
            </Card>

            {loadingConfiguracionRegistro ? (
              <Card style={styles.card}>
                <Card.Content style={styles.loadingBox}>
                  <ActivityIndicator color="#f97316" />
                  <Text style={styles.emptyText}>
                    Cargando campos del registro...
                  </Text>
                </Card.Content>
              </Card>
            ) : (
            <Card style={[styles.card, styles.terrenoFormCard]}>
              <View style={styles.terrenoFormClip}>
              <View style={styles.terrenoFormAccent} />
              <Card.Content style={styles.terrenoFormContent}>
                <View style={styles.terrenoFormHeader}>
                  <View style={styles.terrenoFormHeaderIcon}>
                    <MaterialCommunityIcons
                      name="clipboard-plus-outline"
                      size={25}
                      color="#0f172a"
                    />
                  </View>
                  <View style={styles.terrenoSectionHeading}>
                    <Text style={styles.terrenoFormTitle}>Nuevo registro</Text>
                    <Text style={styles.terrenoFormSubtitle}>
                      Completa los datos del trabajo ejecutado.
                    </Text>
                  </View>
                </View>

                {campoConfiguradoVisible("tipoRegistro") ? (
                  <>
                    <View style={styles.terrenoSectionHeader}>
                      <View style={styles.terrenoSectionIcon}>
                        <MaterialCommunityIcons
                          name="fire"
                          size={18}
                          color="#0f172a"
                        />
                      </View>
                      <Text style={styles.terrenoSectionTitle}>Tipo de registro</Text>
                    </View>
                    <SegmentedButtons
                      value={tipoRegistro}
                      onValueChange={(value) => {
                        setTipoRegistro(value as TipoRegistro);
                        setError("");
                        setSuccess("");
                      }}
                      style={styles.segmented}
                      buttons={[
                        {
                          value: "sello_cortafuego",
                          label: "Sello Cortafuego",
                        },
                        {
                          value: "junta_lineal_espuma",
                          label: "Junta Lineal Espuma",
                        },
                      ]}
                    />
                  </>
                ) : null}

                {!isJuntaLineal ? renderItemizadoTerreno() : null}

                <View style={styles.terrenoSectionHeader}>
                  <View style={styles.terrenoSectionIcon}>
                    <MaterialCommunityIcons
                      name="map-marker-outline"
                      size={18}
                      color="#0f172a"
                    />
                  </View>
                  <Text style={styles.terrenoSectionTitle}>Ubicación y ejecución</Text>
                </View>

                {campoConfiguradoVisible("fechaEjecucionSello") ? (
                  <Pressable onPress={() => setCalendarVisible(true)}>
                    <TextInput
                      label="Fecha ejecución de sello"
                      value={fecha}
                      mode="outlined"
                      editable={false}
                      pointerEvents="none"
                      right={<TextInput.Icon icon="calendar" />}
                      style={styles.input}
                    />
                  </Pressable>
                ) : null}

                {campoConfiguradoVisible("diaSemana") ? (
                  <TextInput
                    label="Día"
                    value={getDiaSemana(fecha)}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("piso") ? (
                  <TextInput
                    label="Piso"
                    value={piso}
                    onChangeText={setPiso}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("ejeAlfabetico") ? (
                  <TextInput
                    label="Eje Alfabético"
                    value={ejeAlfabetico}
                    onChangeText={setEjeAlfabetico}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("ejeNumerico") ? (
                  <TextInput
                    label="Eje Numérico"
                    value={ejeNumerico}
                    onChangeText={setEjeNumerico}
                    mode="outlined"
                    style={styles.input}
                  />
                ) : null}

                {campoConfiguradoVisible("nombreSellador") ? (
                  <TextInput
                    label="Nombre sellador"
                    value={nombreSellador}
                    mode="outlined"
                    editable={false}
                    style={styles.input}
                  />
                ) : null}

                {isJuntaLineal ? (
                  campoConfiguradoVisible("metrosLineales") ? (
                    <>
                      <TextInput
                        label="Longitud (m)"
                        value={metrosLineales}
                        onChangeText={setMetrosLineales}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                      />
                      {campoConfiguradoVisible("observaciones") ? (
                        <TextInput
                          label="Observaciones"
                          value={observaciones}
                          onChangeText={setObservaciones}
                          mode="outlined"
                          multiline
                          numberOfLines={6}
                          style={[styles.input, styles.observacionesInput]}
                        />
                      ) : null}
                    </>
                  ) : null
                ) : (
                  <>
                    {campoConfiguradoVisible("recinto") ? (
                      <TextInput
                        label="Recinto"
                        value={recinto}
                        onChangeText={setRecinto}
                        mode="outlined"
                        style={styles.input}
                      />
                    ) : null}

                    {campoConfiguradoVisible("modulo") ? (
                      <TextInput
                        label="Módulo o edificio"
                        value={modulo}
                        onChangeText={setModulo}
                        mode="outlined"
                        style={styles.input}
                      />
                    ) : null}

                    {campoConfiguradoVisible("numeroSello") ? (
                      <TextInput
                        label="N° del sello"
                        value={numeroSello}
                        onChangeText={setNumeroSello}
                        mode="outlined"
                        style={styles.input}
                      />
                    ) : null}

                    {campoConfiguradoVisible("cantidadSellos") ? (
                      <TextInput
                        label="Cantidad de Sellos"
                        value={cantidadSellos}
                        onChangeText={(value) =>
                          setCantidadSellos(onlyDigits(value))
                        }
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.input}
                      />
                    ) : null}

                    {campoConfiguradoVisible("holgura")
                      ? renderMenuField(
                          "Holgura (cm)",
                          holgura,
                          setHolgura,
                          HOLGURA_OPTIONS,
                        )
                      : null}

                    {campoConfiguradoVisible("cieloModular") ? (
                      renderMenuField(
                        "Accesibilidad",
                        accesibilidad,
                        setAccesibilidad,
                        ACCESIBILIDAD_OPTIONS,
                      )
                    ) : null}

                    {campoConfiguradoVisible("aislacion") ? (
                      renderMenuField(
                        "Aislación",
                        aislacion,
                        setAislacion,
                        APLICA_OPTIONS,
                      )
                    ) : null}

                    {campoConfiguradoVisible("reparacionTabique") ? (
                      renderMenuField(
                        "Reparación de tabique",
                        reparacionTabique,
                        setReparacionTabique,
                        APLICA_OPTIONS,
                      )
                    ) : null}

                    {campoConfiguradoVisible("observaciones") ? (
                      <TextInput
                        label="Observaciones"
                        value={observaciones}
                        onChangeText={setObservaciones}
                        mode="outlined"
                        multiline
                        numberOfLines={6}
                        style={[styles.input, styles.observacionesInput]}
                      />
                    ) : null}
                  </>
                )}

                {renderFotos({ terrainCreate: true })}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {success ? (
                  <Text style={styles.successText}>{success}</Text>
                ) : null}

                <Button
                  mode="contained"
                  onPress={openConfirm}
                  loading={saving}
                  disabled={saving}
                  style={[styles.button, styles.terrenoSubmitButton]}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  icon="send-outline"
                >
                  {saving ? "Enviando..." : "Enviar Registro"}
                </Button>
              </Card.Content>
              </View>
            </Card>
            )}
          </>
        ) : null}
      </ScrollView>
      </TouchableWithoutFeedback>

      <Modal
        visible={selectedTecnicoRegistro !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTecnicoRegistro(null)}
      >
        <SafeAreaView style={styles.terrenoDetailScreen} edges={["top", "left", "right"]}>
          {selectedTecnicoRegistro ? (
            <>
              <View style={styles.terrenoDetailTopBar}>
                <View style={styles.terrenoDetailTopTitle}>
                  <View style={styles.terrenoDetailTopIcon}>
                    <MaterialCommunityIcons
                      name={
                        selectedTecnicoRegistro.tipo_registro === "junta_lineal_espuma"
                          ? "ruler"
                          : "fire"
                      }
                      size={22}
                      color="#0f172a"
                    />
                  </View>
                  <View style={styles.recordInfo}>
                    <Text style={styles.terrenoDetailTitle}>Detalle del registro</Text>
                    <Text style={styles.terrenoDetailSubtitle}>
                      Información enviada al Supervisor
                    </Text>
                  </View>
                </View>
                <Button
                  mode="text"
                  compact
                  onPress={() => setSelectedTecnicoRegistro(null)}
                  textColor="#c2410c"
                >
                  Cerrar
                </Button>
              </View>

              <ScrollView
                contentContainerStyle={styles.terrenoDetailContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.terrenoDetailHero}>
                  <View style={styles.terrenoDetailHeroHeading}>
                    <View style={styles.recordInfo}>
                      <Text style={styles.terrenoDetailObra}>
                        {selectedTecnicoRegistro.obras?.nombre || "Obra sin nombre"}
                      </Text>
                      <Text style={styles.terrenoDetailObraCode}>
                        {selectedTecnicoRegistro.obras?.codigo || "Sin código"}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.statusPill,
                        styles.terrenoPendingStatus,
                        selectedTecnicoRegistro.estado === "rechazado" &&
                          styles.statusRechazado,
                        selectedTecnicoRegistro.estado === "validado" &&
                          styles.statusValidado,
                      ]}
                    >
                      {getRegistroEstadoLabel(selectedTecnicoRegistro.estado)}
                    </Text>
                  </View>
                  <Text style={styles.terrenoDetailType}>
                    {selectedTecnicoRegistro.tipo_registro === "junta_lineal_espuma"
                      ? "Junta lineal espuma"
                      : "Sello cortafuego"}
                  </Text>
                </View>

                <View style={styles.terrenoDetailSection}>
                  <View style={styles.terrenoDetailSectionHeader}>
                    <MaterialCommunityIcons name="clipboard-text-outline" size={19} color="#c2410c" />
                    <Text style={styles.terrenoDetailSectionTitle}>Datos enviados</Text>
                  </View>
                  <View style={styles.terrenoDetailGrid}>
                    <RegistroDetailField label="Fecha de ejecución" value={formatExecutionDate(selectedTecnicoRegistro.fecha)} />
                    <RegistroDetailField label="Día" value={selectedTecnicoRegistro.dia_semana} />
                    <RegistroDetailField label="Responsable" value={selectedTecnicoRegistro.usuarios?.nombre || selectedTecnicoRegistro.nombre_sellador} />
                    <RegistroDetailField label="Itemizado Beck" value={selectedTecnicoRegistro.itemizado_beck || selectedTecnicoRegistro.descripcion_material} />
                    {campoConfiguradoVisible("dimensiones") ? (
                      <RegistroDetailField label="Dimensiones" value={selectedTecnicoRegistro.dimensiones} />
                    ) : null}
                    <RegistroDetailField label="Código Beck" value={selectedTecnicoRegistro.codigo_beck} />
                    <RegistroDetailField label="Itemizado mandante" value={selectedTecnicoRegistro.itemizado_mandante || selectedTecnicoRegistro.itemizado_sacyr} />
                    <RegistroDetailField label="Recinto" value={selectedTecnicoRegistro.recinto} />
                    <RegistroDetailField label="Módulo o edificio" value={selectedTecnicoRegistro.modulo} />
                    <RegistroDetailField label="Piso" value={selectedTecnicoRegistro.piso} />
                    <RegistroDetailField label="Eje alfabético" value={selectedTecnicoRegistro.eje_alfabetico} />
                    <RegistroDetailField label="Eje numérico" value={selectedTecnicoRegistro.eje_numerico} />
                    {selectedTecnicoRegistro.tipo_registro === "junta_lineal_espuma" ? (
                      <RegistroDetailField label="Metros lineales" value={selectedTecnicoRegistro.metros_lineales} />
                    ) : (
                      <>
                        <RegistroDetailField label="N° del sello" value={selectedTecnicoRegistro.numero_sello} />
                        <RegistroDetailField label="Cantidad de sellos" value={selectedTecnicoRegistro.cantidad_sellos} />
                        <RegistroDetailField label="Holgura" value={selectedTecnicoRegistro.holgura} />
                        <RegistroDetailField label="Factor por holguras" value={selectedTecnicoRegistro.factor_por_holguras} />
                        <RegistroDetailField label="Accesibilidad" value={selectedTecnicoRegistro.accesibilidad} />
                        <RegistroDetailField label="Sellos con factores" value={selectedTecnicoRegistro.cantidad_sellos_con_factores} />
                        <RegistroDetailField label="Aislación" value={selectedTecnicoRegistro.aislacion} />
                        <RegistroDetailField label="Sellos por aislación" value={selectedTecnicoRegistro.cantidad_sellos_aislacion} />
                        <RegistroDetailField label="Reparación de tabique" value={selectedTecnicoRegistro.reparacion_tabique} />
                        <RegistroDetailField label="Cantidad final" value={selectedTecnicoRegistro.cantidad_final} />
                      </>
                    )}
                  </View>
                  {selectedTecnicoRegistro.observaciones ? (
                    <View style={styles.terrenoDetailObservation}>
                      <Text style={styles.terrenoDetailFieldLabel}>Observaciones</Text>
                      <Text style={styles.terrenoDetailFieldValue}>
                        {selectedTecnicoRegistro.observaciones}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <RegistroContextBox registro={selectedTecnicoRegistro} />

                <View style={styles.terrenoDetailSection}>
                  <View style={styles.terrenoDetailSectionHeader}>
                    <MaterialCommunityIcons name="camera-outline" size={19} color="#c2410c" />
                    <Text style={styles.terrenoDetailSectionTitle}>Fotografías enviadas</Text>
                  </View>
                  {getRegistroFotos(selectedTecnicoRegistro).length ? (
                    <View style={styles.terrenoDetailPhotos}>
                      {getRegistroFotos(selectedTecnicoRegistro).map((foto, index) => (
                        <View key={foto.id} style={styles.terrenoDetailPhotoCard}>
                          <ExpandableImage
                            uri={foto.url}
                            style={styles.terrenoDetailPhoto}
                            accessibilityLabel={`Ver fotografía enviada ${index + 1} en pantalla completa`}
                          />
                          <Text style={styles.terrenoDetailPhotoHint}>
                            Toca la fotografía para verla en grande
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.terrenoDetailNoPhotos}>
                      <MaterialCommunityIcons name="image-off-outline" size={28} color="#94a3b8" />
                      <Text style={styles.terrenoDetailNoPhotosText}>
                        Este registro no tiene fotografías disponibles.
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </>
          ) : null}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={calendarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCalendarVisible(false)}
        >
          <Pressable style={styles.calendarModal} onPress={() => {}}>
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mes anterior"
                onPress={() => changeCalendarMonth(-1)}
                style={styles.calendarMonthButton}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color="#0f172a" />
              </Pressable>
              <Text style={styles.calendarTitle}>
                {MONTH_NAMES[calendarMonth.getMonth()]}{" "}
                {calendarMonth.getFullYear()}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mes siguiente"
                onPress={() => changeCalendarMonth(1)}
                style={styles.calendarMonthButton}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color="#0f172a" />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {buildCalendarDays(calendarMonth).map((day, index) => {
                const dayDate = day
                  ? formatDate(
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        day,
                      ),
                    )
                  : "";
                const isSelected = dayDate === fecha;

                return (
                  <Pressable
                    key={`${day || "empty"}-${index}`}
                    disabled={!day}
                    onPress={() => day && selectCalendarDay(day)}
                    style={[
                      styles.calendarDay,
                      isSelected && styles.calendarDaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {day || ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setConfirmVisible(false)}
        >
          <Pressable style={styles.confirmModal}>
            <Text style={styles.confirmTitle}>Enviar registro</Text>
            <Text style={styles.confirmText}>
              Estas seguro en enviar el registro de {tipoRegistroLabel}? Despues
              no podras modificarlo.
            </Text>
            <View style={styles.confirmActions}>
              <Button mode="outlined" onPress={() => setConfirmVisible(false)}>
                Cancelar
              </Button>
              <Button
                mode="contained"
                onPress={submitRegistro}
                buttonColor="#f97316"
              >
                Enviar
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 80,
  },
  contentAfterFixedHeader: {
    paddingTop: 4,
  },
  fixedHeader: {
    backgroundColor: "#f5f7fb",
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  fixedTopRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  fixedBrand: {
    flex: 1,
  },
  title: {
    color: "#0f172a",
    marginBottom: 4,
  },
  subtitle: {
    color: "#0f172a",
    marginBottom: 14,
    fontWeight: "500",
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  selectedCard: {
    borderColor: "#f97316",
    backgroundColor: "#fff7ed",
  },
  jefeEditCard: {
    backgroundColor: "#fffdf7",
    borderColor: "#FDC10B",
    borderRadius: 20,
  },
  jefeEditClip: {
    borderRadius: 20,
    overflow: "hidden",
  },
  jefeEditAccent: {
    backgroundColor: "#f97316",
    height: 6,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  jefeEditContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  jefeEditHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  jefeEditHeaderIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  jefeEditHeaderInfo: {
    flex: 1,
  },
  jefeEditTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  jefeEditOperator: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  jefeEditSummary: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    padding: 11,
  },
  jefeEditSummaryItem: {
    flex: 1,
  },
  jefeEditSummaryLabel: {
    color: "#FDC10B",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  jefeEditSummaryValue: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  jefeEditSectionHeader: {
    alignItems: "center",
    borderBottomColor: "#fde68a",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginBottom: 12,
    marginTop: 8,
    paddingBottom: 7,
  },
  jefeEditSectionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  jefeEditSubmit: {
    borderRadius: 14,
    marginTop: 12,
  },
  cardHeaderRow: {
    gap: 16,
  },
  cardHeaderInfo: {
    gap: 2,
  },
  changeButton: {
    alignSelf: "flex-start",
    borderRadius: 12,
  },
  terrenoObraCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
  },
  terrenoObraClip: {
    borderRadius: 18,
    overflow: "hidden",
  },
  terrenoObraAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  terrenoObraContent: {
    paddingHorizontal: 15,
    paddingVertical: 14,
  },
  terrenoObraRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  terrenoObraIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 13,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  terrenoObraInfo: {
    flex: 1,
  },
  terrenoObraLabel: {
    color: "#c2410c",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  terrenoObraName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 6,
    marginTop: 2,
  },
  terrenoObraBadges: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  terrenoObraCode: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  terrenoObraState: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    color: "#166534",
    fontSize: 9,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "capitalize",
  },
  terrenoObraStatePaused: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  terrenoChangeButton: {
    flexShrink: 0,
  },
  terrenoChangeButtonLabel: {
    fontSize: 10,
    fontWeight: "900",
    marginHorizontal: 3,
  },
  terrenoFormCard: {
    backgroundColor: "#fffdf7",
    borderColor: "#FDC10B",
    borderRadius: 20,
  },
  terrenoFormClip: {
    borderRadius: 20,
    overflow: "hidden",
  },
  terrenoFormAccent: {
    backgroundColor: "#FDC10B",
    height: 6,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  terrenoFormContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  terrenoFormHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
    marginBottom: 18,
  },
  terrenoFormHeaderIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  terrenoFormTitle: {
    color: "#0f172a",
    fontSize: 19,
    fontWeight: "900",
  },
  terrenoFormSubtitle: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  terrenoSectionHeader: {
    alignItems: "center",
    borderBottomColor: "#fde68a",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
    paddingBottom: 8,
  },
  terrenoSectionIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 9,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  terrenoSectionHeading: {
    flex: 1,
  },
  terrenoSectionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  terrenoSectionHint: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  terrenoPhotoButton: {
    borderColor: "#FDC10B",
    borderRadius: 14,
    flexGrow: 1,
  },
  terrenoSubmitButton: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    marginTop: 14,
  },
  formTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
  },
  label: {
    marginTop: 8,
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "600",
  },
  segmented: {
    marginBottom: 14,
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  observacionesInput: {
    minHeight: 132,
    textAlignVertical: "top",
  },
  fieldLabel: {
    marginTop: 4,
    marginBottom: 10,
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  catalogSelectButton: {
    alignItems: "center",
    backgroundColor: "#fffdf8",
    borderColor: "#fbbf24",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    marginBottom: 12,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  catalogSelectButtonPressed: {
    opacity: 0.75,
  },
  catalogSelectIcon: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  catalogSelectTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  catalogSelectLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  catalogSelectValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  checkboxItem: {
    paddingHorizontal: 0,
    marginBottom: 6,
  },
  photosTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
  },
  photosHint: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  photosGrid: {
    gap: 12,
  },
  photoItem: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 8,
    backgroundColor: "#fff",
  },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#f97316",
    borderRadius: 14,
  },
  buttonContent: {
    minHeight: 48,
  },
  buttonLabel: {
    fontWeight: "700",
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    marginTop: 10,
    color: "#475569",
    textAlign: "center",
    lineHeight: 20,
  },
  errorText: {
    marginTop: 4,
    color: "#dc2626",
    fontWeight: "600",
  },
  successText: {
    marginTop: 4,
    color: "#16a34a",
    fontWeight: "600",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderWidth: 1,
  },
  filterChipSelected: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  filterChipText: {
    color: "#334155",
    fontWeight: "700",
  },
  filterChipTextSelected: {
    color: "#ffffff",
  },
  tecnicoFilterPanel: {
    backgroundColor: "#fffaf0",
    borderColor: "#fbbf24",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 10,
  },
  tecnicoFilterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  tecnicoFilterTitleGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  tecnicoFilterIconBox: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 8,
    height: 29,
    justifyContent: "center",
    width: 29,
  },
  tecnicoFilterTitle: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  tecnicoFilterResultCount: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "700",
  },
  tecnicoFilterRow: {
    flexDirection: "row",
    gap: 6,
  },
  tecnicoFilterOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#fed7aa",
    borderRadius: 11,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 5,
  },
  tecnicoFilterOptionSelected: {
    backgroundColor: "#0f172a",
    borderColor: "#0f172a",
  },
  tecnicoFilterOptionPressed: {
    opacity: 0.75,
  },
  tecnicoFilterOptionText: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "800",
  },
  tecnicoFilterOptionTextSelected: {
    color: "#ffffff",
  },
  tecnicoFilterBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    color: "#475569",
    fontSize: 9,
    fontWeight: "900",
    minWidth: 19,
    overflow: "hidden",
    paddingHorizontal: 4,
    paddingVertical: 2,
    textAlign: "center",
  },
  tecnicoFilterBadgeSelected: {
    backgroundColor: "#FDC10B",
    color: "#0f172a",
  },
  loadingBox: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 8,
  },
  jefeObraCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  jefeObraCardClip: {
    borderRadius: 16,
    overflow: "hidden",
  },
  jefeObraCardAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  jefeObraCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  jefeObraCardRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  jefeObraIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  jefeObraCardTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 6,
  },
  jefeObraBadges: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  jefeObraCodeBadge: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  jefeObraStateBadge: {
    backgroundColor: "#ffedd5",
    borderRadius: 999,
    color: "#c2410c",
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "capitalize",
  },
  jefeObraStatePaused: {
    backgroundColor: "#fef3c7",
    color: "#92400e",
  },
  jefeObraViewButton: {
    borderRadius: 10,
    flexShrink: 0,
  },
  jefeObraViewButtonContent: {
    flexDirection: "row-reverse",
    minHeight: 38,
    paddingHorizontal: 2,
  },
  jefeObraViewButtonLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginHorizontal: 5,
  },
  recordHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  recordIcon: {
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  recordInfo: {
    flex: 1,
  },
  recordTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  recordMeta: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
  },
  jefeRecordHeader: {
    alignItems: "flex-start",
    gap: 9,
  },
  jefeRecordIcon: {
    backgroundColor: "#FDC10B",
    borderRadius: 11,
    height: 36,
    width: 36,
  },
  jefeRecordTitle: {
    fontSize: 14,
  },
  jefeRecordMeta: {
    fontSize: 11,
    lineHeight: 15,
  },
  recordDetails: {
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  jefeActionRow: {
    gap: 7,
    marginTop: 8,
  },
  contextBox: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginTop: 12,
    padding: 10,
  },
  contextHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  contextTitle: {
    fontSize: 12,
    fontWeight: "900",
  },
  contextTitleDanger: {
    color: "#dc2626",
  },
  contextTitleInfo: {
    color: "#2563eb",
  },
  contextText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
  },
  inlineButton: {
    borderRadius: 12,
    flexGrow: 1,
  },
  jefeInlineButton: {
    borderRadius: 10,
  },
  jefeButtonContent: {
    minHeight: 36,
  },
  jefeButtonLabel: {
    fontSize: 12,
    marginVertical: 6,
  },
  historyCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  terrenoPendingCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
    borderRadius: 15,
    marginBottom: 7,
  },
  terrenoPendingClip: {
    borderRadius: 15,
    overflow: "hidden",
  },
  terrenoPendingAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  terrenoPendingAccentRejected: {
    backgroundColor: "#dc2626",
  },
  terrenoPendingContent: {
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  terrenoPendingHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  terrenoPendingIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  terrenoPendingType: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
  },
  terrenoPendingObra: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  terrenoPendingStatus: {
    backgroundColor: "#FDC10B",
    color: "#0f172a",
    flexShrink: 0,
    fontSize: 9,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  terrenoPendingDetails: {
    backgroundColor: "#ffffff",
    borderColor: "#fde68a",
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  terrenoPendingDetailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  terrenoPendingDetailValue: {
    color: "#334155",
    fontSize: 10,
    flexShrink: 1,
    fontWeight: "700",
  },
  terrenoCorrectionButton: {
    backgroundColor: "#dc2626",
    borderRadius: 12,
    marginTop: 8,
  },
  terrenoPendingOpenHint: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 7,
  },
  terrenoPendingOpenHintText: {
    color: "#c2410c",
    flex: 1,
    fontSize: 9,
    fontWeight: "800",
  },
  terrenoCorrectionButtonContent: {
    minHeight: 38,
  },
  terrenoCorrectionButtonLabel: {
    fontSize: 11,
    fontWeight: "800",
    marginVertical: 5,
  },
  jefeHistoryCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
    borderRadius: 16,
    marginBottom: 7,
  },
  jefeHistoryClip: {
    borderRadius: 16,
    overflow: "hidden",
  },
  jefeRegistroCardAccent: {
    backgroundColor: "#f97316",
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0,
    width: 5,
  },
  jefeRegistroCardAccentRejected: {
    backgroundColor: "#dc2626",
  },
  jefeCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "capitalize",
  },
  jefeStatusPill: {
    backgroundColor: "#FDC10B",
    color: "#0f172a",
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusValidado: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
  },
  statusRechazado: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  terrenoDetailScreen: {
    backgroundColor: "#f5f7fb",
    flex: 1,
  },
  terrenoDetailTopBar: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  terrenoDetailTopTitle: {
    alignItems: "center",
    flexDirection: "row",
    flex: 1,
    gap: 10,
  },
  terrenoDetailTopIcon: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 11,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  terrenoDetailTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  terrenoDetailSubtitle: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  terrenoDetailContent: {
    padding: 16,
    paddingBottom: 40,
  },
  terrenoDetailHero: {
    backgroundColor: "#fffaf0",
    borderColor: "#FDC10B",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 13,
  },
  terrenoDetailHeroHeading: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
  },
  terrenoDetailObra: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  terrenoDetailObraCode: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  terrenoDetailType: {
    color: "#c2410c",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 9,
  },
  terrenoDetailSection: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 13,
  },
  terrenoDetailSectionHeader: {
    alignItems: "center",
    borderBottomColor: "#fde68a",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 7,
    marginBottom: 10,
    paddingBottom: 8,
  },
  terrenoDetailSectionTitle: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
  },
  terrenoDetailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  terrenoDetailField: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    minWidth: "47%",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  terrenoDetailFieldLabel: {
    color: "#94a3b8",
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  terrenoDetailFieldValue: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 2,
  },
  terrenoDetailObservation: {
    backgroundColor: "#fffaf0",
    borderColor: "#fde68a",
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 9,
    padding: 9,
  },
  terrenoDetailPhotos: {
    gap: 10,
  },
  terrenoDetailPhotoCard: {
    backgroundColor: "#fffaf0",
    borderColor: "#fde68a",
    borderRadius: 13,
    borderWidth: 1,
    overflow: "hidden",
    padding: 7,
  },
  terrenoDetailPhoto: {
    backgroundColor: "#e2e8f0",
    borderRadius: 9,
    height: 210,
    width: "100%",
  },
  terrenoDetailPhotoHint: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
    paddingBottom: 2,
    paddingTop: 7,
    textAlign: "center",
  },
  terrenoDetailNoPhotos: {
    alignItems: "center",
    gap: 7,
    paddingVertical: 18,
  },
  terrenoDetailNoPhotosText: {
    color: "#64748b",
    fontSize: 11,
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "center",
    padding: 18,
  },
  calendarModal: {
    alignSelf: "center",
    backgroundColor: "#fffaf0",
    borderColor: "#fbbf24",
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 370,
    padding: 15,
    width: "100%",
  },
  itemizadoModal: {
    backgroundColor: "#fffaf0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
    width: "100%",
  },
  itemizadoModalBackdrop: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
    padding: 0,
  },
  itemizadoSheetHandle: {
    alignSelf: "center",
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  modalHeaderRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  itemizadoResults: {
    marginTop: 8,
    maxHeight: 360,
  },
  itemizadoOption: {
    backgroundColor: "#ffffff",
    borderColor: "#fed7aa",
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 8,
    minHeight: 52,
    padding: 11,
  },
  confirmModal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
  },
  confirmTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  confirmText: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 18,
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  calendarMonthButton: {
    alignItems: "center",
    backgroundColor: "#FDC10B",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  calendarTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "capitalize",
  },
  weekRow: {
    flexDirection: "row",
    marginTop: 15,
  },
  weekDay: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center",
    width: "14.2857%",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 6,
  },
  calendarDay: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: "14.2857%",
  },
  calendarDaySelected: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
  },
  calendarDayText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
  },
  calendarDayTextSelected: {
    color: "#FDC10B",
    fontWeight: "900",
  },
});
