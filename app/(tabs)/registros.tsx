import {
  createRegistro,
  enviarRegistroATecnico,
  enviarRegistroAIngenieria,
  getMisRegistros,
  reenviarRegistroComoTecnico,
  RegistroHistorialApi,
  uploadRegistroFotos,
} from "@/services/api/registrosApi";
import { getMisObras, ObraApi } from "@/services/api/obrasApi";
import {
  clearSelectedObra,
  getSelectedObra,
  getSession,
} from "@/services/auth/session";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
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

const ITEMIZADO_BECK_OPTIONS = [
  "Tuberia metalica",
  "Tuberia no metalica",
  "Ducto clima circular",
  "Ducto clima rectangular",
  "Bandejas y escalerillas",
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

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
  const [refreshingJefeRegistros, setRefreshingJefeRegistros] =
    useState(false);
  const [loadingJefeRegistros, setLoadingJefeRegistros] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
  const [itemizadoMenuVisible, setItemizadoMenuVisible] = useState(false);
  const [otroItemizado, setOtroItemizado] = useState(false);
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
  const [fotos, setFotos] = useState<FotoLocal[]>([]);

  const isJuntaLineal = tipoRegistro === "junta_lineal_espuma";
  const isFormMode = mode === "form";

  const tipoRegistroLabel = useMemo(
    () =>
      isJuntaLineal ? "Junta Lineal Espuma" : "Sello Cortafuego",
    [isJuntaLineal],
  );

  const selectedJefeObra = useMemo(
    () => jefeObras.find((item) => item.id === selectedJefeObraId) ?? null,
    [jefeObras, selectedJefeObraId],
  );

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
    const visibles = jefeRegistrosPorObra.filter(
      (registro) =>
        (registro.estado === "pendiente" || registro.estado === "rechazado") &&
        (jefeEstadoFiltro === "todos" || registro.estado === jefeEstadoFiltro),
    );

    if (!term) return visibles;

    return visibles.filter((registro) =>
      `${registro.usuarios?.nombre || registro.nombre_sellador} ${registro.piso} ${registro.eje_alfabetico}-${registro.eje_numerico} ${registro.tipo_registro}`
        .toLowerCase()
        .includes(term),
    );
  }, [jefeEstadoFiltro, jefeRegistroSearch, jefeRegistrosPorObra]);

  const tecnicoRechazados = useMemo(
    () => tecnicoRegistros.filter((registro) => registro.estado === "rechazado"),
    [tecnicoRegistros],
  );

  const tecnicoPendientes = useMemo(
    () => tecnicoRegistros.filter((registro) => registro.estado === "pendiente"),
    [tecnicoRegistros],
  );

  const filteredTecnicoRegistros = useMemo(() => {
    const term = tecnicoRegistroSearch.trim().toLowerCase();
    const visibles = [...tecnicoRechazados, ...tecnicoPendientes].filter(
      (registro) =>
        tecnicoEstadoFiltro === "todos" ||
        registro.estado === tecnicoEstadoFiltro,
    );
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
      const registros = await getMisRegistros(true, { scope: "registro" });
      setTecnicoRegistros(registros);
    } catch (err: any) {
      setError(err?.message || "No se pudieron obtener los registros");
    } finally {
      setRefreshingTecnicoRegistros(false);
    }
  }, []);

  const refreshJefeObraData = useCallback(async () => {
    try {
      setRefreshingJefeRegistros(true);
      setError("");
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadInitialData = async () => {
        try {
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
          console.log("LOAD REGISTROS ERROR =>", err);
          setError(err?.message || "No se pudieron obtener los registros");
        } finally {
          setLoadingJefeRegistros(false);
        }
      };

      loadInitialData();
    }, [initialObra]),
  );

  const resetForm = () => {
    setTipoRegistro("sello_cortafuego");
    setFecha(formatDate(new Date()));
    setCalendarMonth(new Date());
    setItemizadoBeck("");
    setItemizadoMenuVisible(false);
    setOtroItemizado(false);
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
    setFotos([]);
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

  const toggleOtroItemizado = () => {
    setOtroItemizado((current) => {
      const next = !current;
      setItemizadoBeck(next ? "" : itemizadoBeck);
      setItemizadoMenuVisible(false);
      return next;
    });
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
        quality: 0.8,
      });

      if (result.canceled) return;

      const nuevasFotos: FotoLocal[] = result.assets.map((asset, index) => ({
        uri: asset.uri,
        name:
          asset.fileName ||
          `foto-${Date.now()}-${index}.${asset.mimeType?.split("/")[1] || "jpg"}`,
        type: asset.mimeType || "image/jpeg",
      }));

      setFotos((prev) => [...prev, ...nuevasFotos]);
      setError("");
    } catch (err) {
      console.log("PICK IMAGE ERROR =>", err);
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

      const nuevaFoto: FotoLocal = {
        uri: asset.uri,
        name:
          asset.fileName ||
          `camara-${Date.now()}.${asset.mimeType?.split("/")[1] || "jpg"}`,
        type: asset.mimeType || "image/jpeg",
      };

      setFotos((prev) => [...prev, nuevaFoto]);
      setError("");
    } catch (err) {
      console.log("TAKE PHOTO ERROR =>", err);
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
    setItemizadoBeck(registro.descripcion_material || "");
    setOtroItemizado(false);
    setModulo(registro.modulo || "");
    setPiso(registro.piso || "");
    setEjeNumerico(registro.eje_numerico || "");
    setEjeAlfabetico(registro.eje_alfabetico || "");
    setNumeroSello(registro.numero_sello === "N/A" ? "" : registro.numero_sello || "");
    setCantidadSellos(String(registro.cantidad_sellos || ""));
    setNombreSellador(registro.nombre_sellador || "");
    setHolgura(String(registro.holgura || ""));
    setAccesibilidad(String(registro.accesibilidad || ""));
    setItemizadoSacyr(registro.itemizado_sacyr || "");
    setMetrosLineales(String(registro.metros_lineales || ""));
    setObservaciones(registro.observaciones || "");
    setFotos([]);
    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    if (!obra) return "Debes seleccionar una obra antes de enviar.";

    const commonMissing =
      !fecha.trim() ||
      !modulo.trim() ||
      !piso.trim() ||
      !ejeNumerico.trim() ||
      !ejeAlfabetico.trim() ||
      !nombreSellador.trim();

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
        !itemizadoBeck.trim() ||
        !numeroSello.trim() ||
        !cantidadSellos.trim() ||
        !holgura.trim() ||
        !accesibilidad.trim()
      ) {
        return "Debes completar todos los campos obligatorios.";
      }
    }

    if (!fotos.length) return "Debes agregar al menos una foto.";

    return "";
  };

  const validateJefeEditForm = () => {
    const commonMissing =
      !fecha.trim() ||
      !modulo.trim() ||
      !piso.trim() ||
      !ejeNumerico.trim() ||
      !ejeAlfabetico.trim() ||
      !nombreSellador.trim();

    if (commonMissing) return "Debes completar todos los campos obligatorios.";

    if (isJuntaLineal) {
      if (!metrosLineales.trim()) return "Debes ingresar la longitud en metros.";
      if (!Number.isFinite(toApiNumber(metrosLineales)) || toApiNumber(metrosLineales) <= 0) {
        return "La longitud debe ser mayor a 0.";
      }
    } else if (
      !itemizadoBeck.trim() ||
      !numeroSello.trim() ||
      !cantidadSellos.trim() ||
      !holgura.trim() ||
      !accesibilidad.trim()
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
    try {
      if (!obra) return;

      setConfirmVisible(false);
      setSaving(true);
      setError("");
      setSuccess("");

      const registro = await createRegistro({
        obraId: obra.id,
        fecha,
        descripcionMaterial: isJuntaLineal
          ? "Junta Lineal Espuma"
          : itemizadoBeck,
        modulo,
        piso,
        ejeNumerico: ejeNumerico.trim(),
        ejeAlfabetico,
        numeroSello: isJuntaLineal ? "" : numeroSello,
        cantidadSellos: isJuntaLineal ? 1 : toApiNumber(cantidadSellos),
        nombreSellador,
        holgura: isJuntaLineal ? 0 : toApiNumber(holgura),
        accesibilidad: isJuntaLineal ? 1 : toApiNumber(accesibilidad),
        observaciones,
        itemizadoSacyr: isJuntaLineal ? undefined : itemizadoSacyr,
        tipoRegistro,
        metrosLineales: isJuntaLineal
          ? toApiNumber(metrosLineales)
          : undefined,
      });

      await uploadRegistroFotos(registro.id, fotos);

      const registros = await getMisRegistros(true, { scope: "registro" });
      setTecnicoRegistros(registros);
      setSuccess("Registro y fotos enviados correctamente.");
      await clearSelectedObra();
      setObra(null);
      resetForm();
      router.replace("/registros");
    } catch (err: any) {
      console.log("CREATE/UPLOAD REGISTRO ERROR =>", err);
      setError(err?.message || "No se pudo completar el envío.");
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
        fecha,
        descripcionMaterial: isJuntaLineal
          ? "Junta Lineal Espuma"
          : itemizadoBeck,
        modulo,
        piso,
        ejeNumerico: ejeNumerico.trim(),
        ejeAlfabetico,
        numeroSello: isJuntaLineal ? "" : numeroSello,
        cantidadSellos: isJuntaLineal ? 1 : toApiNumber(cantidadSellos),
        nombreSellador,
        holgura: isJuntaLineal ? 0 : toApiNumber(holgura),
        accesibilidad: isJuntaLineal ? 1 : toApiNumber(accesibilidad),
        observaciones,
        itemizadoSacyr: isJuntaLineal ? undefined : itemizadoSacyr,
        tipoRegistro,
        metrosLineales: isJuntaLineal
          ? toApiNumber(metrosLineales)
          : undefined,
      });

      const registros = await getMisRegistros(true);
      setJefeRegistros(registros);
      setEditingRegistro(null);
      resetForm();
      setSuccess("Registro enviado a ingeniería.");
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

      await reenviarRegistroComoTecnico(editingRegistro.id, {
        obraId: obra.id,
        fecha,
        descripcionMaterial: isJuntaLineal
          ? "Junta Lineal Espuma"
          : itemizadoBeck,
        modulo,
        piso,
        ejeNumerico: ejeNumerico.trim(),
        ejeAlfabetico,
        numeroSello: isJuntaLineal ? "" : numeroSello,
        cantidadSellos: isJuntaLineal ? 1 : toApiNumber(cantidadSellos),
        nombreSellador,
        holgura: isJuntaLineal ? 0 : toApiNumber(holgura),
        accesibilidad: isJuntaLineal ? 1 : toApiNumber(accesibilidad),
        observaciones,
        itemizadoSacyr: isJuntaLineal ? undefined : itemizadoSacyr,
        tipoRegistro,
        metrosLineales: isJuntaLineal
          ? toApiNumber(metrosLineales)
          : undefined,
      });

      const registros = await getMisRegistros(true, { scope: "registro" });
      setTecnicoRegistros(registros);
      setEditingRegistro(null);
      resetForm();
      setSuccess("Registro corregido y enviado al jefe de obra.");
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
      setSuccess("Registro enviado al técnico para corrección.");
    } catch (err: any) {
      setError(err?.message || "No se pudo enviar al técnico.");
    } finally {
      setSaving(false);
    }
  };

  const renderCommonFields = () => (
    <>
      <Pressable onPress={() => setCalendarVisible(true)}>
        <TextInput
          label="Fecha"
          value={fecha}
          mode="outlined"
          editable={false}
          pointerEvents="none"
          right={<TextInput.Icon icon="calendar" />}
          style={styles.input}
        />
      </Pressable>

      <TextInput
        label="Modulo / Recinto"
        value={modulo}
        onChangeText={setModulo}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Piso"
        value={piso}
        onChangeText={(value) => setPiso(onlyDigits(value))}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
      />

      <TextInput
        label="Nombre del sellador"
        value={nombreSellador}
        mode="outlined"
        editable={false}
        style={styles.input}
      />

      <TextInput
        label="Eje numerico"
        value={ejeNumerico}
        onChangeText={setEjeNumerico}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Eje alfabetico"
        value={ejeAlfabetico}
        onChangeText={setEjeAlfabetico}
        mode="outlined"
        style={styles.input}
      />
    </>
  );

  const goToObras = () => {
    if (onChangeObra) {
      onChangeObra();
      return;
    }

    router.replace("/mis-obras");
  };

  const renderFotos = (options?: {
    existingFotos?: RegistroHistorialApi["fotos"];
    replacementMode?: boolean;
  }) => (
    <>
      <Text style={styles.photosTitle}>Fotografias</Text>

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

  if (userRole === "jefeobra") {
    return (
      <SafeAreaView
        style={[styles.container, { paddingTop: insets.top + 2 }]}
        edges={["top", "left", "right"]}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            !editingRegistro ? (
              <RefreshControl
                refreshing={refreshingJefeRegistros}
                onRefresh={refreshJefeObraData}
              />
            ) : undefined
          }
        >
          <BrandHeader subtitle="Registros · Jefe de obra" />
          <Text variant="titleLarge" style={styles.title}>
            Registros de técnicos
          </Text>
          <Text style={styles.subtitle}>
            Busca una obra activa o pausada para revisar registros pendientes,
            corregirlos y enviarlos a ingeniería.
          </Text>

          {loadingJefeRegistros ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#f97316" />
              <Text style={styles.emptyText}>Cargando registros...</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

          {editingRegistro ? (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeaderRow}>
                  <View>
                    <Text style={styles.formTitle}>Editar registro</Text>
                    <Text style={styles.emptyText}>
                      Técnico: {editingRegistro.usuarios?.nombre || "Sin técnico"}
                    </Text>
                  </View>
                  <Button mode="text" onPress={() => setEditingRegistro(null)}>
                    Cancelar
                  </Button>
                </View>

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

                {renderCommonFields()}

                {isJuntaLineal ? (
                  <TextInput
                    label="Longitud (m)"
                    value={metrosLineales}
                    onChangeText={setMetrosLineales}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                ) : (
                  <>
                    <TextInput
                      label="Cantidad de Sellos"
                      value={cantidadSellos}
                      onChangeText={(value) => setCantidadSellos(onlyDigits(value))}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <TextInput
                      label="Itemizado BECK"
                      value={itemizadoBeck}
                      onChangeText={setItemizadoBeck}
                      mode="outlined"
                      style={styles.input}
                    />
                    <TextInput
                      label="Numero del Sello"
                      value={numeroSello}
                      onChangeText={setNumeroSello}
                      mode="outlined"
                      style={styles.input}
                    />
                    <TextInput
                      label="Holgura"
                      value={holgura}
                      onChangeText={setHolgura}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />
                    <TextInput
                      label="Accesibilidad"
                      value={accesibilidad}
                      onChangeText={(value) => setAccesibilidad(onlyDigits(value))}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <TextInput
                      label="Itemizado SACYR"
                      value={itemizadoSacyr}
                      onChangeText={setItemizadoSacyr}
                      mode="outlined"
                      style={styles.input}
                    />
                  </>
                )}

                <TextInput
                  label="Observaciones"
                  value={observaciones}
                  onChangeText={setObservaciones}
                  mode="outlined"
                  multiline
                  numberOfLines={6}
                  style={[styles.input, styles.observacionesInput]}
                />

                {renderFotos({
                  existingFotos: editingRegistro.fotos,
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
                label="Buscar por técnico, piso o eje"
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
                            Técnico: {registro.usuarios?.nombre || registro.nombre_sellador}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.statusPill,
                            registro.estado === "rechazado" &&
                              styles.statusRechazado,
                          ]}
                        >
                          {registro.estado.replace("_", " ")}
                        </Text>
                      </View>

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
                            Enviar a técnico
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
              <TextInput
                label="Buscar obra"
                value={jefeObraSearch}
                onChangeText={setJefeObraSearch}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="magnify" />}
              />

              <Text style={styles.sectionTitle}>Obras disponibles</Text>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 2 }]}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          userRole === "terreno" && !isFormMode && !editingRegistro ? (
            <RefreshControl
              refreshing={refreshingTecnicoRegistros}
              onRefresh={refreshTecnicoRegistros}
            />
          ) : undefined
        }
      >
        <BrandHeader subtitle="Registro de terreno · BECK" />
        <Text variant="titleLarge" style={styles.title}>
          Registros
        </Text>
        <Text style={styles.subtitle}>
          Carga avances, fotos y datos de instalacion por obra seleccionada.
        </Text>

        {userRole === "terreno" && !isFormMode && !editingRegistro ? (
          <>
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
                  tecnicoEstadoFiltro === "todos" &&
                    styles.filterChipTextSelected,
                ]}
              >
                Todos
              </Chip>
              <Chip
                selected={tecnicoEstadoFiltro === "pendiente"}
                onPress={() => setTecnicoEstadoFiltro("pendiente")}
                style={[
                  styles.filterChip,
                  tecnicoEstadoFiltro === "pendiente" &&
                    styles.filterChipSelected,
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
                  tecnicoEstadoFiltro === "rechazado" &&
                    styles.filterChipSelected,
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

            <Text style={styles.sectionTitle}>Registros pendientes</Text>
            {filteredTecnicoRegistros.map((registro) => (
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
                      {registro.estado.replace("_", " ")}
                    </Text>
                  </View>
                  {registro.estado === "rechazado" ? (
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
            ))}
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

        {editingRegistro && userRole === "terreno" ? (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.formTitle}>Corregir registro rechazado</Text>
                  <Text style={styles.emptyText}>
                    Al reenviarlo quedará pendiente para jefe de obra.
                  </Text>
                </View>
                <Button mode="text" onPress={() => setEditingRegistro(null)}>
                  Cancelar
                </Button>
              </View>

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

              {renderCommonFields()}

              {isJuntaLineal ? (
                <TextInput
                  label="Longitud (m)"
                  value={metrosLineales}
                  onChangeText={setMetrosLineales}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              ) : (
                <>
                  <TextInput
                    label="Cantidad de Sellos"
                    value={cantidadSellos}
                    onChangeText={(value) => setCantidadSellos(onlyDigits(value))}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                  <TextInput
                    label="Itemizado BECK"
                    value={itemizadoBeck}
                    onChangeText={setItemizadoBeck}
                    mode="outlined"
                    style={styles.input}
                  />
                  <TextInput
                    label="Numero del Sello"
                    value={numeroSello}
                    onChangeText={setNumeroSello}
                    mode="outlined"
                    style={styles.input}
                  />
                  <TextInput
                    label="Holgura"
                    value={holgura}
                    onChangeText={setHolgura}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                  <TextInput
                    label="Accesibilidad"
                    value={accesibilidad}
                    onChangeText={(value) => setAccesibilidad(onlyDigits(value))}
                    mode="outlined"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                  <TextInput
                    label="Itemizado SACYR"
                    value={itemizadoSacyr}
                    onChangeText={setItemizadoSacyr}
                    mode="outlined"
                    style={styles.input}
                  />
                </>
              )}

              <TextInput
                label="Observaciones"
                value={observaciones}
                onChangeText={setObservaciones}
                mode="outlined"
                multiline
                numberOfLines={6}
                style={[styles.input, styles.observacionesInput]}
              />

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
                {saving ? "Reenviando..." : "Reenviar al jefe de obra"}
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

            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.formTitle}>Nuevo registro de terreno</Text>

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

                {renderCommonFields()}

                {isJuntaLineal ? (
                  <>
                    <TextInput
                      label="Longitud (m)"
                      value={metrosLineales}
                      onChangeText={setMetrosLineales}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />

                    <TextInput
                      label="Observaciones"
                      value={observaciones}
                      onChangeText={setObservaciones}
                      mode="outlined"
                      multiline
                      numberOfLines={6}
                      style={[styles.input, styles.observacionesInput]}
                    />

                    {renderFotos()}
                  </>
                ) : (
                  <>
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
                      label="Otro"
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

                    <TextInput
                      label="Numero del Sello"
                      value={numeroSello}
                      onChangeText={setNumeroSello}
                      mode="outlined"
                      style={styles.input}
                    />

                    <TextInput
                      label="Holgura"
                      value={holgura}
                      onChangeText={setHolgura}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                    />

                    <TextInput
                      label="Accesibilidad"
                      value={accesibilidad}
                      onChangeText={(value) => setAccesibilidad(onlyDigits(value))}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.input}
                    />

                    <TextInput
                      label="Itemizado SACYR"
                      value={itemizadoSacyr}
                      onChangeText={setItemizadoSacyr}
                      mode="outlined"
                      style={styles.input}
                    />

                    <TextInput
                      label="Observaciones"
                      value={observaciones}
                      onChangeText={setObservaciones}
                      mode="outlined"
                      multiline
                      numberOfLines={6}
                      style={[styles.input, styles.observacionesInput]}
                    />

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
          </>
        ) : null}
      </ScrollView>

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
