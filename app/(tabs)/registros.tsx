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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
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
  Chip,
  Checkbox,
  Menu,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { BrandHeader } from "../../components/BrandHeader";

type TipoRegistro = "sello_cortafuego" | "junta_lineal_espuma";

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

const HOLGURA_OPTIONS = [
  { value: "1", label: "H <= 2" },
  { value: "1.2", label: "2<H <4" },
  { value: "1.4", label: "4<H <6" },
  { value: "1.8", label: "6<H <10" },
  { value: "0", label: "No aplica" },
];

const CIELO_MODULAR_OPTIONS = [
  { value: "1", label: "Normal" },
  { value: "2", label: "Cielo Americano o estructurado" },
  { value: "3", label: "Cielo duro y gateras" },
  { value: "0", label: "No aplica" },
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

  return date.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const fallbackUrls = [
    ...(Array.isArray(registro.fotos_urls) ? registro.fotos_urls : []),
    registro.foto_url,
    ...(Array.isArray(registro.registro_origen?.fotos_urls)
      ? registro.registro_origen.fotos_urls
      : []),
    registro.registro_origen?.foto_url,
  ].filter((url): url is string => Boolean(url));

  const seen = new Set<string>();

  return [
    ...relationFotos,
    ...originFotos,
    ...fallbackUrls.map((url, index) => ({
      id: `${registro.id}-fallback-${index}`,
      url,
      created_at: registro.created_at,
    })),
  ].filter((foto) => {
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

function getDiaSemana(fecha: string) {
  const date = new Date(`${fecha}T00:00:00`);

  return Number.isNaN(date.getTime()) ? "" : FULL_WEEK_DAYS[date.getDay()];
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatEjeAlfabetico(value: string) {
  const letras = value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
  return letras.length > 1 ? `${letras[0]}-${letras[1]}` : letras;
}

function formatEjeNumerico(value: string) {
  const numeros = onlyDigits(value).slice(0, 2);
  return numeros.length > 1 ? `${numeros[0]}-${numeros[1]}` : numeros;
}

function toApiNumber(value: string) {
  return Number(value.replace(",", "."));
}

function factorValue(value: string) {
  return value === "0" ? 1 : toApiNumber(value);
}

function buildCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;

  return [
    ...Array.from({ length: mondayFirstOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [jefeRegistros, setJefeRegistros] = useState<RegistroHistorialApi[]>([]);
  const [jefeObras, setJefeObras] = useState<ObraApi[]>([]);
  const [jefeObraSearch, setJefeObraSearch] = useState("");
  const [jefeRegistroSearch, setJefeRegistroSearch] = useState("");
  const [jefeEstadoFiltro, setJefeEstadoFiltro] = useState<
    "todos" | "pendiente" | "rechazado"
  >("todos");
  const [tecnicoRegistroSearch, setTecnicoRegistroSearch] = useState("");
  const [tecnicoEstadoFiltro, setTecnicoEstadoFiltro] = useState<
    "todos" | "pendiente" | "rechazado"
  >("todos");
  const [selectedJefeObraId, setSelectedJefeObraId] = useState<string | null>(null);
  const [tecnicoRegistros, setTecnicoRegistros] = useState<RegistroHistorialApi[]>([]);
  const [editingRegistro, setEditingRegistro] =
    useState<RegistroHistorialApi | null>(null);

  const [tipoRegistro, setTipoRegistro] =
    useState<TipoRegistro>("sello_cortafuego");
  const [fecha, setFecha] = useState(formatDate(new Date()));
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [itemizadoBeck, setItemizadoBeck] = useState("");
  const [itemizadoCodigoBeck, setItemizadoCodigoBeck] = useState("");
  const [itemizadoMenuVisible, setItemizadoMenuVisible] = useState(false);
  const [itemizadoSelectorVisible, setItemizadoSelectorVisible] = useState(false);
  const [itemizadoSearch, setItemizadoSearch] = useState("");
  const [itemizadoElementoPenetra, setItemizadoElementoPenetra] = useState("");
  const [itemizadoMaterialidad, setItemizadoMaterialidad] = useState("");
  const [itemizadoOpciones, setItemizadoOpciones] = useState<ItemizadoOpcionApi[]>([]);
  const [loadingItemizadoOpciones, setLoadingItemizadoOpciones] = useState(false);
  const [holguraMenuVisible, setHolguraMenuVisible] = useState(false);
  const [cieloModularMenuVisible, setCieloModularMenuVisible] = useState(false);
  const [aislacionMenuVisible, setAislacionMenuVisible] = useState(false);
  const [reparacionTabiqueMenuVisible, setReparacionTabiqueMenuVisible] =
    useState(false);
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
      const isCorreccion = isCorreccionEditable(registro);
      const esEstadoVisible =
        registro.estado === "pendiente" ||
        registro.estado === "rechazado" ||
        isCorreccion;
      const pasaFiltro =
        jefeEstadoFiltro === "todos" ||
        registro.estado === jefeEstadoFiltro ||
        (jefeEstadoFiltro === "rechazado" && isCorreccion);

      return esEstadoVisible && pasaFiltro;
    });

    if (!term) return visibles;

    return visibles.filter((registro) =>
      `${registro.usuarios?.nombre || registro.nombre_sellador} ${registro.piso} ${registro.eje_alfabetico}-${registro.eje_numerico} ${registro.tipo_registro}`
        .toLowerCase()
        .includes(term),
    );
  }, [jefeEstadoFiltro, jefeRegistroSearch, jefeRegistrosPorObra]);

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
      `${registro.obras?.nombre || ""} ${registro.piso || ""}`
        .toLowerCase()
        .includes(term),
    );
  }, [
    tecnicoEstadoFiltro,
    tecnicoPendientes,
    tecnicoRechazados,
    tecnicoRegistroSearch,
  ]);

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
  }, [editingRegistro?.obras?.id, obra?.id, userRole]);

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
          setLoadingJefeRegistros(true);
          try {
            const [obrasDisponibles, registros] = await Promise.all([
              getMisObras(),
              getMisRegistros(),
            ]);

            setJefeObras(obrasDisponibles);
            setJefeRegistros(registros);
          } finally {
            setLoadingJefeRegistros(false);
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
    setItemizadoCodigoBeck("");
    setItemizadoSelectorVisible(false);
    setItemizadoSearch("");
    setItemizadoElementoPenetra("");
    setItemizadoMaterialidad("");
    setItemizadoOpciones([]);
    setItemizadoMenuVisible(false);
    setHolguraMenuVisible(false);
    setCieloModularMenuVisible(false);
    setAislacionMenuVisible(false);
    setReparacionTabiqueMenuVisible(false);
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
    setItemizadoMenuVisible(false);
  };

  const loadItemizadoOpciones = async () => {
    try {
      setLoadingItemizadoOpciones(true);
      const opciones = await getItemizadoOpciones({
        search: itemizadoSearch,
        elementoPenetra: itemizadoElementoPenetra,
        materialidad: itemizadoMaterialidad,
        limit: 80,
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
    setItemizadoSelectorVisible(false);
    setError("");
  };

  const toggleOtroItemizado = () => {
    setOtroItemizado((current) => {
      const next = !current;
      setItemizadoBeck(next ? "" : itemizadoBeck);
      setItemizadoMenuVisible(false);
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
    setHolgura(String(registro.holgura || ""));
    setAccesibilidad(String(registro.cielo_modular ?? registro.accesibilidad ?? ""));
    setAislacion(String(registro.aislacion || ""));
    setReparacionTabique(String(registro.reparacion_tabique || ""));
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
    if (
      campoConfiguradoVisible("ejeAlfabetico") &&
      !/^[A-Z]-[A-Z]$/.test(ejeAlfabetico)
    ) {
      return "El Eje Alfabético debe tener el formato F-G.";
    }
    if (
      campoConfiguradoVisible("ejeNumerico") &&
      !/^\d-\d$/.test(ejeNumerico)
    ) {
      return "El Eje Numérico debe tener el formato 8-9.";
    }

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
    if (
      campoConfiguradoVisible("ejeAlfabetico") &&
      !/^[A-Z]-[A-Z]$/.test(ejeAlfabetico)
    ) {
      return "El Eje Alfabético debe tener el formato F-G.";
    }
    if (
      campoConfiguradoVisible("ejeNumerico") &&
      !/^\d-\d$/.test(ejeNumerico)
    ) {
      return "El Eje Numérico debe tener el formato 8-9.";
    }

    if (isJuntaLineal) {
      if (!metrosLineales.trim()) return "Debes ingresar la longitud en metros.";
      if (!Number.isFinite(toApiNumber(metrosLineales)) || toApiNumber(metrosLineales) <= 0) {
        return "La longitud debe ser mayor a 0.";
      }
    } else if (
      (campoConfiguradoVisible("itemizadoBeck") && !itemizadoBeck.trim()) ||
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
            ? 0
            : toApiNumber(holgura),
        factorHolguras:
          isJuntaLineal || !campoConfiguradoVisible("holgura")
            ? undefined
            : factorValue(holgura),
        accesibilidad:
          isJuntaLineal || !campoConfiguradoVisible("cieloModular")
            ? 1
            : factorValue(accesibilidad),
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
            ? 0
            : toApiNumber(holgura),
        factorHolguras:
          isJuntaLineal || !campoConfiguradoVisible("holgura")
            ? undefined
            : factorValue(holgura),
        accesibilidad:
          isJuntaLineal || !campoConfiguradoVisible("cieloModular")
            ? 1
            : factorValue(accesibilidad),
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
            ? 0
            : toApiNumber(holgura),
        factorHolguras:
          isJuntaLineal || !campoConfiguradoVisible("holgura")
            ? undefined
            : factorValue(holgura),
        accesibilidad:
          isJuntaLineal || !campoConfiguradoVisible("cieloModular")
            ? 1
            : factorValue(accesibilidad),
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

  const renderCommonFields = () => (
    <>
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

      {campoConfiguradoVisible("piso") ? (
        <TextInput
          label="Piso"
          value={piso}
          onChangeText={(value) => setPiso(onlyDigits(value))}
          mode="outlined"
          keyboardType="numeric"
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

      {campoConfiguradoVisible("ejeNumerico") ? (
        <TextInput
          label="Eje Numérico"
          value={ejeNumerico}
          onChangeText={(value) => setEjeNumerico(formatEjeNumerico(value))}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
        />
      ) : null}

      {campoConfiguradoVisible("ejeAlfabetico") ? (
        <TextInput
          label="Eje Alfabético"
          value={ejeAlfabetico}
          onChangeText={(value) => setEjeAlfabetico(formatEjeAlfabetico(value))}
          mode="outlined"
          autoCapitalize="characters"
          style={styles.input}
        />
      ) : null}
    </>
  );

  const getPayloadCommonFields = () => ({
    fecha,
    recinto: campoConfiguradoVisible("recinto") ? recinto : "No aplica",
    modulo: campoConfiguradoVisible("modulo") ? modulo : "No aplica",
    moduloEdificio: campoConfiguradoVisible("modulo") ? modulo : "No aplica",
    piso: campoConfiguradoVisible("piso") ? piso : "0",
    ejeNumerico: campoConfiguradoVisible("ejeNumerico")
      ? ejeNumerico.trim()
      : "0-0",
    ejeAlfabetico: campoConfiguradoVisible("ejeAlfabetico")
      ? ejeAlfabetico
      : "A-A",
    nombreSellador,
  });

  const renderMenuField = (
    label: string,
    value: string,
    visible: boolean,
    setVisible: (next: boolean) => void,
    onSelect: (next: string) => void,
    options: { value: string; label: string }[],
  ) => (
    <>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Menu
        visible={visible}
        onDismiss={() => setVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setVisible(true)}
            style={styles.dropdownButton}
            contentStyle={styles.dropdownContent}
          >
            {options.find((option) => option.value === value)?.label ||
              "Seleccionar opción"}
          </Button>
        }
      >
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            title={option.label}
            onPress={() => {
              onSelect(option.value);
              setVisible(false);
            }}
          />
        ))}
      </Menu>
    </>
  );

  const renderItemizadoTerreno = () => {
    if (!campoConfiguradoVisible("itemizadoBeck")) return null;

    return (
      <>
      <Text style={styles.fieldLabel}>Itemizado BECK</Text>
      <Menu
        visible={itemizadoMenuVisible}
        onDismiss={() => setItemizadoMenuVisible(false)}
        anchor={
          <Button
            mode="outlined"
            onPress={() => setItemizadoMenuVisible(true)}
            style={styles.dropdownButton}
            contentStyle={styles.dropdownContent}
          >
            {itemizadoBeck || "Seleccionar itemizado"}
          </Button>
        }
      >
        {ITEMIZADO_BECK_OPTIONS.map((itemizado) => (
          <Menu.Item
            key={itemizado}
            title={itemizado}
            onPress={() => selectItemizadoBeck(itemizado)}
          />
        ))}
      </Menu>

      <Checkbox.Item
        label="Otras: escribir"
        status={otroItemizado ? "checked" : "unchecked"}
        onPress={toggleOtroItemizado}
        style={styles.checkboxItem}
      />

      {otroItemizado ? (
        <TextInput
          label="Ingresar Itemizado BECK"
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
        style={styles.modalBackdrop}
        onPress={() => setItemizadoSelectorVisible(false)}
      >
        <Pressable style={styles.itemizadoModal}>
          <View style={styles.modalHeaderRow}>
            <View style={styles.recordInfo}>
              <Text style={styles.modalTitle}>Seleccionar Itemizado BECK</Text>
              <Text style={styles.modalSubtitle}>
                Solo se muestran opciones visibles del catálogo.
              </Text>
            </View>
            <Button mode="text" compact onPress={() => setItemizadoSelectorVisible(false)}>
              Cerrar
            </Button>
          </View>

          <TextInput
            label="Buscar por itemizado, código o tipo"
            value={itemizadoSearch}
            onChangeText={setItemizadoSearch}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="magnify" />}
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
  }) => {
    if (!campoConfiguradoVisible("foto")) return null;

    return (
      <>
      <Text style={styles.photosTitle}>Foto</Text>

      {options?.existingFotos?.length ? (
        <>
          <Text style={styles.photosHint}>Fotografias actuales</Text>
          <View style={styles.photosGrid}>
            {options.existingFotos.map((foto) => (
              <View key={foto.id} style={styles.photoItem}>
                <Image source={{ uri: foto.url }} style={styles.photoPreview} />
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
        <Button mode="outlined" onPress={pickFromLibrary}>
          Elegir de galeria
        </Button>
        <Button mode="outlined" onPress={takePhoto}>
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
                <Image source={{ uri: foto.uri }} style={styles.photoPreview} />
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
            <BrandHeader subtitle="Registros · Supervisor" />
            <Text variant="titleLarge" style={styles.title}>
              Registro de Operarios
            </Text>
            <Text style={styles.subtitle}>
              Busca una obra activa o pausada para revisar registros pendientes,
              corregirlos y enviarlos a ingeniería.
            </Text>

            <TextInput
              label="Buscar obra"
              value={jefeObraSearch}
              onChangeText={setJefeObraSearch}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="magnify" />}
            />

            <Text style={styles.sectionTitle}>Obras disponibles</Text>
          </View>
        ) : isJefeObraRegistrosList && selectedJefeObra ? (
          <View style={styles.fixedHeader}>
            <View style={styles.fixedTopRow}>
              <View style={styles.fixedBrand}>
                <BrandHeader subtitle="Registros · Supervisor" />
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
            <Text variant="titleLarge" style={styles.title}>
              Registro de Operarios
            </Text>
            <Text style={styles.subtitle}>
              Busca una obra activa o pausada para revisar registros pendientes,
              corregirlos y enviarlos a ingeniería.
            </Text>

            <Text style={styles.sectionTitle}>{selectedJefeObra.nombre}</Text>
            <Text style={styles.recordMeta}>
              Código: {selectedJefeObra.codigo || "Sin codigo"} ·{" "}
              {selectedJefeObra.estado || "Sin estado"}
            </Text>

            <TextInput
              label="Buscar por Operario, piso o eje"
              value={jefeRegistroSearch}
              onChangeText={setJefeRegistroSearch}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="magnify" />}
            />

            <View style={styles.filterRow}>
              <Chip
                selected={jefeEstadoFiltro === "todos"}
                onPress={() => setJefeEstadoFiltro("todos")}
                style={[
                  styles.filterChip,
                  jefeEstadoFiltro === "todos" && styles.filterChipSelected,
                ]}
                textStyle={[
                  styles.filterChipText,
                  jefeEstadoFiltro === "todos" && styles.filterChipTextSelected,
                ]}
              >
                Todos
              </Chip>
              <Chip
                selected={jefeEstadoFiltro === "pendiente"}
                onPress={() => setJefeEstadoFiltro("pendiente")}
                style={[
                  styles.filterChip,
                  jefeEstadoFiltro === "pendiente" && styles.filterChipSelected,
                ]}
                textStyle={[
                  styles.filterChipText,
                  jefeEstadoFiltro === "pendiente" &&
                    styles.filterChipTextSelected,
                ]}
              >
                Pendientes
              </Chip>
              <Chip
                selected={jefeEstadoFiltro === "rechazado"}
                onPress={() => setJefeEstadoFiltro("rechazado")}
                style={[
                  styles.filterChip,
                  jefeEstadoFiltro === "rechazado" && styles.filterChipSelected,
                ]}
                textStyle={[
                  styles.filterChipText,
                  jefeEstadoFiltro === "rechazado" &&
                    styles.filterChipTextSelected,
                ]}
              >
                Rechazados
              </Chip>
            </View>

            <Text style={styles.sectionTitle}>Registros de la obra</Text>
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
            <>
              <BrandHeader subtitle="Registros · Supervisor" />
              <Text variant="titleLarge" style={styles.title}>
                Registro de Operarios
              </Text>
              <Text style={styles.subtitle}>
                Busca una obra activa o pausada para revisar registros pendientes,
                corregirlos y enviarlos a ingeniería.
              </Text>
            </>
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
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.formTitle}>Editar registro</Text>
                    <Text style={styles.emptyText}>
                      Operario: {editingRegistro.usuarios?.nombre || "Sin Operario"}
                    </Text>
                  </View>
                  <Button mode="text" onPress={() => setEditingRegistro(null)}>
                    Cancelar
                  </Button>
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

                {renderCommonFields()}

                {isJuntaLineal ? (
                  campoConfiguradoVisible("metrosLineales") ? (
                    <TextInput
                      label="Longitud (m)"
                      value={metrosLineales}
                      onChangeText={setMetrosLineales}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />
                  ) : null
                ) : (
                  <>
                    {campoConfiguradoVisible("codigoBeck") ? (
                      <TextInput
                        label="Código BECK"
                        value={itemizadoCodigoBeck}
                        mode="outlined"
                        editable={false}
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
                    {campoConfiguradoVisible("itemizadoBeck") ? (
                      <>
                        <Text style={styles.fieldLabel}>Itemizado BECK</Text>
                        <Button
                          mode="outlined"
                          onPress={openItemizadoSelector}
                          style={styles.dropdownButton}
                          contentStyle={styles.dropdownContent}
                        >
                          {itemizadoBeck || "Seleccionar itemizado"}
                        </Button>
                      </>
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
                    {campoConfiguradoVisible("holgura")
                      ? renderMenuField(
                      "Holgura (cm)",
                      holgura,
                      holguraMenuVisible,
                      setHolguraMenuVisible,
                      setHolgura,
                      HOLGURA_OPTIONS,
                        )
                      : null}
                    {campoConfiguradoVisible("factorPorHolguras") ? (
                      <TextInput
                        label="Factor por Holguras"
                        value={String(
                          holgura.trim()
                            ? factorValue(holgura)
                            : editingRegistro.factor_por_holguras ?? "",
                        )}
                        mode="outlined"
                        editable={false}
                        style={styles.input}
                      />
                    ) : null}
                    {campoConfiguradoVisible("cieloModular") ? (
                      renderMenuField(
                        "Accesibilidad",
                        accesibilidad,
                        cieloModularMenuVisible,
                        setCieloModularMenuVisible,
                        setAccesibilidad,
                        CIELO_MODULAR_OPTIONS,
                      )
                    ) : null}
                    {campoConfiguradoVisible("cantidadSellosConFactores") ? (
                      <TextInput
                        label="Cantidad de sellos con factores sin reparaciones"
                        value={String(
                          cantidadSellos.trim() && holgura.trim()
                            ? toApiNumber(cantidadSellos) * factorValue(holgura)
                            : editingRegistro.cantidad_sellos_con_factores ?? "",
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
                        aislacionMenuVisible,
                        setAislacionMenuVisible,
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
                        reparacionTabiqueMenuVisible,
                        setReparacionTabiqueMenuVisible,
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
                    {campoConfiguradoVisible("itemizadoMandante") ? (
                      <TextInput
                        label="Itemizado Mandante"
                        value={itemizadoSacyr}
                        onChangeText={setItemizadoSacyr}
                        mode="outlined"
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
                )}

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

                {renderFotos({
                  existingFotos: getRegistroFotos(editingRegistro),
                  replacementMode: true,
                })}

                <Button
                  mode="contained"
                  onPress={submitJefeEdit}
                  loading={saving}
                  disabled={saving}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {saving ? "Enviando..." : "Enviar a ingeniería"}
                </Button>
              </Card.Content>
            </Card>
          ) : selectedJefeObra ? (
            <>
              {!isJefeObraRegistrosList ? (
                <>
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.recordInfo}>
                      <Text style={styles.sectionTitle}>{selectedJefeObra.nombre}</Text>
                      <Text style={styles.recordMeta}>
                        {selectedJefeObra.codigo || "Sin codigo"} ·{" "}
                        {selectedJefeObra.estado || "Sin estado"}
                      </Text>
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

                  <TextInput
                    label="Buscar por Operario, piso o eje"
                    value={jefeRegistroSearch}
                    onChangeText={setJefeRegistroSearch}
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Icon icon="magnify" />}
                  />

                  <View style={styles.filterRow}>
                    <Chip
                      selected={jefeEstadoFiltro === "todos"}
                      onPress={() => setJefeEstadoFiltro("todos")}
                      style={[
                        styles.filterChip,
                        jefeEstadoFiltro === "todos" && styles.filterChipSelected,
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        jefeEstadoFiltro === "todos" &&
                          styles.filterChipTextSelected,
                      ]}
                    >
                      Todos
                    </Chip>
                    <Chip
                      selected={jefeEstadoFiltro === "pendiente"}
                      onPress={() => setJefeEstadoFiltro("pendiente")}
                      style={[
                        styles.filterChip,
                        jefeEstadoFiltro === "pendiente" &&
                          styles.filterChipSelected,
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        jefeEstadoFiltro === "pendiente" &&
                          styles.filterChipTextSelected,
                      ]}
                    >
                      Pendientes
                    </Chip>
                    <Chip
                      selected={jefeEstadoFiltro === "rechazado"}
                      onPress={() => setJefeEstadoFiltro("rechazado")}
                      style={[
                        styles.filterChip,
                        jefeEstadoFiltro === "rechazado" &&
                          styles.filterChipSelected,
                      ]}
                      textStyle={[
                        styles.filterChipText,
                        jefeEstadoFiltro === "rechazado" &&
                          styles.filterChipTextSelected,
                      ]}
                    >
                      Rechazados
                    </Chip>
                  </View>

                  <Text style={styles.sectionTitle}>Registros de la obra</Text>
                </>
              ) : null}
              {filteredJefeRegistros.length ? (
                filteredJefeRegistros.map((registro) => (
                  <Card key={registro.id} style={styles.historyCard}>
                    <Card.Content>
                      <View style={styles.recordHeader}>
                        <View style={styles.recordIcon}>
                          <MaterialCommunityIcons
                            name={
                              registro.tipo_registro === "junta_lineal_espuma"
                                ? "ruler"
                                : "fire"
                            }
                            size={22}
                            color="#f97316"
                          />
                        </View>
                        <View style={styles.recordInfo}>
                          <Text style={styles.recordTitle}>
                            {registro.tipo_registro === "junta_lineal_espuma"
                              ? "Junta lineal espuma"
                              : "Sello cortafuego"}
                          </Text>
                          <Text style={styles.recordMeta}>
                            Piso {registro.piso} · Eje {registro.eje_alfabetico}-{registro.eje_numerico}
                          </Text>
                          <Text style={styles.recordMeta}>
                            Operario: {registro.usuarios?.nombre || registro.nombre_sellador}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.statusPill,
                            registro.estado === "rechazado" &&
                              styles.statusRechazado,
                          ]}
                        >
                          {getRegistroEstadoLabel(registro.estado)}
                        </Text>
                      </View>

                      <RegistroContextBox registro={registro} />

                      <View style={styles.actionRow}>
                        <Button
                          mode={registro.estado === "pendiente" ? "contained" : "outlined"}
                          onPress={() => fillFormFromRegistro(registro)}
                          style={styles.inlineButton}
                        >
                          {registro.estado === "pendiente"
                            ? "Editar y enviar"
                            : "Editar"}
                        </Button>
                        {registro.estado === "rechazado" ? (
                          <Button
                            mode="contained"
                            onPress={() => handleEnviarTecnico(registro)}
                            loading={saving}
                            disabled={saving}
                            style={styles.inlineButton}
                          >
                            Enviar a Operario
                          </Button>
                        ) : null}
                      </View>
                    </Card.Content>
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
                  <TextInput
                    label="Buscar obra"
                    value={jefeObraSearch}
                    onChangeText={setJefeObraSearch}
                    mode="outlined"
                    style={styles.input}
                    left={<TextInput.Icon icon="magnify" />}
                  />

                  <Text style={styles.sectionTitle}>Obras disponibles</Text>
                </>
              ) : null}
              {filteredJefeObras.map((item) => (
                <Card
                  key={item.id}
                  style={[
                    styles.card,
                    selectedJefeObraId === item.id && styles.selectedCard,
                  ]}
                >
                  <Card.Content>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordTitle}>{item.nombre}</Text>
                        <Text style={styles.recordMeta}>
                          {item.codigo || "Sin codigo"} · {item.estado || "Sin estado"}
                        </Text>
                      </View>
                      <Button
                        mode={selectedJefeObraId === item.id ? "contained" : "outlined"}
                        onPress={() => {
                          setSelectedJefeObraId(item.id);
                          setJefeRegistroSearch("");
                          setJefeEstadoFiltro("todos");
                        }}
                      >
                        Ver registros
                      </Button>
                    </View>
                  </Card.Content>
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
          <BrandHeader subtitle="Registro de terreno · BECK" />
          <Text variant="titleLarge" style={styles.title}>
            Registros
          </Text>
          <Text style={styles.subtitle}>
            Carga avances, fotos y datos de instalacion por obra seleccionada.
          </Text>

          <TextInput
            label="Buscar por obra o piso"
            value={tecnicoRegistroSearch}
            onChangeText={setTecnicoRegistroSearch}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="magnify" />}
          />
          <View style={styles.filterRow}>
            <Chip
              selected={tecnicoEstadoFiltro === "todos"}
              onPress={() => setTecnicoEstadoFiltro("todos")}
              style={[
                styles.filterChip,
                tecnicoEstadoFiltro === "todos" && styles.filterChipSelected,
              ]}
              textStyle={[
                styles.filterChipText,
                tecnicoEstadoFiltro === "todos" && styles.filterChipTextSelected,
              ]}
            >
              Todos
            </Chip>
            <Chip
              selected={tecnicoEstadoFiltro === "pendiente"}
              onPress={() => setTecnicoEstadoFiltro("pendiente")}
              style={[
                styles.filterChip,
                tecnicoEstadoFiltro === "pendiente" && styles.filterChipSelected,
              ]}
              textStyle={[
                styles.filterChipText,
                tecnicoEstadoFiltro === "pendiente" &&
                  styles.filterChipTextSelected,
              ]}
            >
              Pendientes
            </Chip>
            <Chip
              selected={tecnicoEstadoFiltro === "rechazado"}
              onPress={() => setTecnicoEstadoFiltro("rechazado")}
              style={[
                styles.filterChip,
                tecnicoEstadoFiltro === "rechazado" && styles.filterChipSelected,
              ]}
              textStyle={[
                styles.filterChipText,
                tecnicoEstadoFiltro === "rechazado" &&
                  styles.filterChipTextSelected,
              ]}
            >
              Rechazados
            </Chip>
          </View>
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
          <>
            <BrandHeader subtitle="Registro de terreno · BECK" />
            <Text variant="titleLarge" style={styles.title}>
              Registros
            </Text>
            <Text style={styles.subtitle}>
              Carga avances, fotos y datos de instalacion por obra seleccionada.
            </Text>
          </>
        ) : null}

        {userRole === "terreno" && !isFormMode && !editingRegistro ? (
          <>
            <Text style={styles.sectionTitle}>Registros pendientes</Text>
            {filteredTecnicoRegistros.map((registro) => {
              const canEditCorrection =
                registro.estado === "rechazado" ||
                isCorreccionEditable(registro);

              return (
                <Card key={registro.id} style={styles.historyCard}>
                  <Card.Content>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.recordInfo}>
                        <Text style={styles.recordTitle}>
                          {registro.obras?.nombre || "Sin obra"} · Piso {registro.piso}
                        </Text>
                        <Text style={styles.recordMeta}>
                          {registro.tipo_registro === "junta_lineal_espuma"
                            ? "Junta lineal espuma"
                            : "Sello cortafuego"}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.statusPill,
                          registro.estado === "rechazado" && styles.statusRechazado,
                        ]}
                      >
                        {getRegistroEstadoLabel(registro.estado)}
                      </Text>
                    </View>
                    <RegistroContextBox registro={registro} />
                    {canEditCorrection ? (
                      <Button
                        mode="contained"
                        onPress={() => fillFormFromRegistro(registro)}
                        style={styles.button}
                      >
                        Corregir registro
                      </Button>
                    ) : null}
                  </Card.Content>
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
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.formTitle}>Corregir registro rechazado</Text>
                  <Text style={styles.emptyText}>
                    Al reenviarlo quedará pendiente para Supervisor.
                  </Text>
                </View>
                <Button mode="text" onPress={() => setEditingRegistro(null)}>
                  Cancelar
                </Button>
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

              {renderCommonFields()}

              {isJuntaLineal ? (
                campoConfiguradoVisible("metrosLineales") ? (
                  <TextInput
                    label="Longitud (m)"
                    value={metrosLineales}
                    onChangeText={setMetrosLineales}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                ) : null
              ) : (
                <>
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
                  {renderItemizadoTerreno()}
                  {campoConfiguradoVisible("numeroSello") ? (
                    <TextInput
                      label="N° del sello"
                      value={numeroSello}
                      onChangeText={setNumeroSello}
                      mode="outlined"
                      style={styles.input}
                    />
                  ) : null}
                  {campoConfiguradoVisible("holgura")
                    ? renderMenuField(
                        "Holgura (cm)",
                        holgura,
                        holguraMenuVisible,
                        setHolguraMenuVisible,
                        setHolgura,
                        HOLGURA_OPTIONS,
                      )
                    : null}
                  {campoConfiguradoVisible("cieloModular") ? (
                    renderMenuField(
                      "Accesibilidad",
                      accesibilidad,
                      cieloModularMenuVisible,
                      setCieloModularMenuVisible,
                      setAccesibilidad,
                      CIELO_MODULAR_OPTIONS,
                    )
                  ) : null}
                  {campoConfiguradoVisible("aislacion") ? (
                    renderMenuField(
                      "Aislación",
                      aislacion,
                      aislacionMenuVisible,
                      setAislacionMenuVisible,
                      setAislacion,
                      APLICA_OPTIONS,
                    )
                  ) : null}
                  {campoConfiguradoVisible("reparacionTabique") ? (
                    renderMenuField(
                      "Reparación de tabique",
                      reparacionTabique,
                      reparacionTabiqueMenuVisible,
                      setReparacionTabiqueMenuVisible,
                      setReparacionTabique,
                      APLICA_OPTIONS,
                    )
                  ) : null}
                </>
              )}

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

              {renderFotos()}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? <Text style={styles.successText}>{success}</Text> : null}

              <Button
                mode="contained"
                onPress={submitTecnicoReenvio}
                loading={saving}
                disabled={saving}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {saving ? "Reenviando..." : "Reenviar al Supervisor"}
              </Button>
            </Card.Content>
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
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardHeaderInfo}>
                    <Text style={styles.label}>Obra seleccionada</Text>
                    <Text style={styles.value}>{obra.nombre}</Text>

                    <Text style={styles.label}>Codigo</Text>
                    <Text style={styles.value}>{obra.codigo}</Text>

                    <Text style={styles.label}>Estado</Text>
                    <Text style={styles.value}>
                      {obra.estado || "Sin estado"}
                    </Text>
                  </View>

                  <Button
                    mode="outlined"
                    onPress={goToObras}
                    style={styles.changeButton}
                  >
                    Cambiar obra
                  </Button>
                </View>
              </Card.Content>
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
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.formTitle}>Nuevo registro de terreno</Text>

                {campoConfiguradoVisible("tipoRegistro") ? (
                  <>
                    <Text style={styles.fieldLabel}>Tipo de registro</Text>
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

                {renderCommonFields()}

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

                    {renderFotos()}
                    </>
                  ) : null
                ) : (
                  <>
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

                    {renderItemizadoTerreno()}

                    {campoConfiguradoVisible("numeroSello") ? (
                      <TextInput
                        label="N° del sello"
                        value={numeroSello}
                        onChangeText={setNumeroSello}
                        mode="outlined"
                        style={styles.input}
                      />
                    ) : null}

                    {campoConfiguradoVisible("holgura")
                      ? renderMenuField(
                          "Holgura (cm)",
                          holgura,
                          holguraMenuVisible,
                          setHolguraMenuVisible,
                          setHolgura,
                          HOLGURA_OPTIONS,
                        )
                      : null}

                    {campoConfiguradoVisible("cieloModular") ? (
                      renderMenuField(
                        "Accesibilidad",
                        accesibilidad,
                        cieloModularMenuVisible,
                        setCieloModularMenuVisible,
                        setAccesibilidad,
                        CIELO_MODULAR_OPTIONS,
                      )
                    ) : null}

                    {campoConfiguradoVisible("aislacion") ? (
                      renderMenuField(
                        "Aislación",
                        aislacion,
                        aislacionMenuVisible,
                        setAislacionMenuVisible,
                        setAislacion,
                        APLICA_OPTIONS,
                      )
                    ) : null}

                    {campoConfiguradoVisible("reparacionTabique") ? (
                      renderMenuField(
                        "Reparación de tabique",
                        reparacionTabique,
                        reparacionTabiqueMenuVisible,
                        setReparacionTabiqueMenuVisible,
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

                    {renderFotos()}
                  </>
                )}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                {success ? (
                  <Text style={styles.successText}>{success}</Text>
                ) : null}

                <Button
                  mode="contained"
                  onPress={openConfirm}
                  loading={saving}
                  disabled={saving}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  {saving ? "Enviando..." : "Enviar Registro"}
                </Button>
              </Card.Content>
            </Card>
            )}
          </>
        ) : null}
      </ScrollView>
      </TouchableWithoutFeedback>

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
          <Pressable style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Button mode="text" onPress={() => changeCalendarMonth(-1)}>
                Anterior
              </Button>
              <Text style={styles.calendarTitle}>
                {MONTH_NAMES[calendarMonth.getMonth()]}{" "}
                {calendarMonth.getFullYear()}
              </Text>
              <Button mode="text" onPress={() => changeCalendarMonth(1)}>
                Siguiente
              </Button>
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
  dropdownButton: {
    alignSelf: "stretch",
    borderRadius: 12,
    marginBottom: 6,
  },
  dropdownContent: {
    minHeight: 48,
    justifyContent: "flex-start",
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
  historyCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
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
  statusValidado: {
    backgroundColor: "#dcfce7",
    color: "#16a34a",
  },
  statusRechazado: {
    backgroundColor: "#fee2e2",
    color: "#dc2626",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.42)",
    justifyContent: "center",
    padding: 18,
  },
  calendarModal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
  },
  itemizadoModal: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    maxHeight: "88%",
    padding: 14,
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
    borderColor: "#e2e8f0",
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
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
    marginBottom: 8,
  },
  calendarTitle: {
    color: "#0f172a",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "capitalize",
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekDay: {
    color: "#64748b",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    alignItems: "center",
    aspectRatio: 1,
    justifyContent: "center",
    width: `${100 / 7}%`,
  },
  calendarDaySelected: {
    backgroundColor: "#f97316",
    borderRadius: 999,
  },
  calendarDayText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "600",
  },
  calendarDayTextSelected: {
    color: "#ffffff",
  },
});
