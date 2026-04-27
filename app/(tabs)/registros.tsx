import {
  createRegistro,
  uploadRegistroFotos,
} from "@/services/api/registrosApi";
import { getSelectedObra } from "@/services/auth/session";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Text, TextInput } from "react-native-paper";

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

export default function RegistrosScreen() {
  const [obra, setObra] = useState<ObraSeleccionada | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [descripcionMaterial, setDescripcionMaterial] = useState("");
  const [modulo, setModulo] = useState("");
  const [piso, setPiso] = useState("");
  const [ejeNumerico, setEjeNumerico] = useState("");
  const [ejeAlfabetico, setEjeAlfabetico] = useState("");
  const [numeroSello, setNumeroSello] = useState("");
  const [cantidadSellos, setCantidadSellos] = useState("");
  const [nombreSellador, setNombreSellador] = useState("");
  const [holgura, setHolgura] = useState("");
  const [accesibilidad, setAccesibilidad] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fotos, setFotos] = useState<FotoLocal[]>([]);

  useFocusEffect(
    useCallback(() => {
      const loadSelectedObra = async () => {
        const currentObra = await getSelectedObra();
        setObra(currentObra);
      };

      loadSelectedObra();
    }, []),
  );

  const resetForm = () => {
    setDescripcionMaterial("");
    setModulo("");
    setPiso("");
    setEjeNumerico("");
    setEjeAlfabetico("");
    setNumeroSello("");
    setCantidadSellos("");
    setNombreSellador("");
    setHolgura("");
    setAccesibilidad("");
    setObservaciones("");
    setFotos([]);
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

  const onSubmit = async () => {
    try {
      if (!obra) {
        setError("Debes seleccionar una obra antes de guardar.");
        return;
      }

      if (
        !fecha.trim() ||
        !descripcionMaterial.trim() ||
        !modulo.trim() ||
        !piso.trim() ||
        !ejeNumerico.trim() ||
        !ejeAlfabetico.trim() ||
        !numeroSello.trim() ||
        !cantidadSellos.trim() ||
        !nombreSellador.trim() ||
        !holgura.trim() ||
        !accesibilidad.trim()
      ) {
        setError("Debes completar todos los campos obligatorios.");
        return;
      }

      if (!fotos.length) {
        setError("Debes agregar al menos una foto.");
        return;
      }

      setSaving(true);
      setError("");
      setSuccess("");

      const registro = await createRegistro({
        obraId: obra.id,
        fecha,
        descripcionMaterial,
        modulo,
        piso,
        ejeNumerico: Number(ejeNumerico),
        ejeAlfabetico,
        numeroSello,
        cantidadSellos: Number(cantidadSellos),
        nombreSellador,
        holgura: Number(holgura),
        accesibilidad: Number(accesibilidad),
        observaciones,
      });

      await uploadRegistroFotos(registro.id, fotos);

      setSuccess("Registro y fotos enviados correctamente.");
      resetForm();
    } catch (err: any) {
      console.log("CREATE/UPLOAD REGISTRO ERROR =>", err);
      setError(err?.message || "No se pudo completar el envío.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        Registros
      </Text>

      {!obra ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.emptyTitle}>No hay obra seleccionada</Text>
            <Text style={styles.emptyText}>
              Primero debes seleccionar una obra antes de registrar información.
            </Text>

            <Button
              mode="contained"
              onPress={() => router.replace("/mis-obras")}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Ir a Mis Obras
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.cardHeaderRow}>
                <View style={styles.cardHeaderInfo}>
                  <Text style={styles.label}>Obra seleccionada</Text>
                  <Text style={styles.value}>{obra.nombre}</Text>

                  <Text style={styles.label}>Código</Text>
                  <Text style={styles.value}>{obra.codigo}</Text>

                  <Text style={styles.label}>Estado</Text>
                  <Text style={styles.value}>
                    {obra.estado || "Sin estado"}
                  </Text>
                </View>

                <Button
                  mode="outlined"
                  onPress={() => router.replace("/mis-obras")}
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

              <TextInput
                label="Fecha (YYYY-MM-DD)"
                value={fecha}
                onChangeText={setFecha}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Descripción material"
                value={descripcionMaterial}
                onChangeText={setDescripcionMaterial}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Módulo"
                value={modulo}
                onChangeText={setModulo}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Piso"
                value={piso}
                onChangeText={setPiso}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Eje numérico"
                value={ejeNumerico}
                onChangeText={setEjeNumerico}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />

              <TextInput
                label="Eje alfabético"
                value={ejeAlfabetico}
                onChangeText={setEjeAlfabetico}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Número de sello"
                value={numeroSello}
                onChangeText={setNumeroSello}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Cantidad de sellos"
                value={cantidadSellos}
                onChangeText={setCantidadSellos}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />

              <TextInput
                label="Nombre del sellador"
                value={nombreSellador}
                onChangeText={setNombreSellador}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Holgura"
                value={holgura}
                onChangeText={setHolgura}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />

              <TextInput
                label="Accesibilidad"
                value={accesibilidad}
                onChangeText={setAccesibilidad}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
              />

              <TextInput
                label="Observaciones"
                value={observaciones}
                onChangeText={setObservaciones}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
              />

              <Text style={styles.photosTitle}>Fotografías</Text>

              <View style={styles.photoActions}>
                <Button mode="outlined" onPress={pickFromLibrary}>
                  Elegir de galería
                </Button>
                <Button mode="outlined" onPress={takePhoto}>
                  Tomar foto
                </Button>
              </View>

              <View style={styles.photosGrid}>
                {fotos.map((foto, index) => (
                  <View key={`${foto.uri}-${index}`} style={styles.photoItem}>
                    <Image
                      source={{ uri: foto.uri }}
                      style={styles.photoPreview}
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

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {success ? (
                <Text style={styles.successText}>{success}</Text>
              ) : null}

              <Button
                mode="contained"
                onPress={onSubmit}
                loading={saving}
                disabled={saving}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                {saving ? "Enviando..." : "Guardar registro y fotos"}
              </Button>
            </Card.Content>
          </Card>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fb",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  title: {
    color: "#0f172a",
    fontWeight: "700",
    marginBottom: 16,
  },
  card: {
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
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
  input: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  photosTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
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
});
