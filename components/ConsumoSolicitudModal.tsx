import React, { useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { BodegaModal, BodegaButton, BodegaInput, bodegaStyles as s } from "./BodegaBeckUI";
import { inventarioBeckRequest, type ItemMiEquipo } from "@/services/api/inventarioBeckApi";
import { nuevaOperacionBodega } from "@/services/api/bodegaBeckApi";

export function ConsumoSolicitudModal({ item, onClose, onDone }: { item: ItemMiEquipo; onClose: () => void; onDone: () => void }) {
  const [cantidad, setCantidad] = useState("1");
  const [codes, setCodes] = useState<string[]>([]);
  const [observacion, setObservacion] = useState("");
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const retry = useRef({ signature: "", id: "" });
  const numbered = (item.subSkus?.length || 0) > 0;
  const amount = numbered ? codes.length : Number(cantidad);
  async function send() {
    if (lock.current) return;
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > item.cantidad) return Alert.alert("Cantidad inválida", "Indica las unidades consumidas dentro de tu saldo asignado.");
    lock.current = true; setSaving(true);
    const data = { cantidad: amount, subSkus: codes, observacion: observacion.trim() };
    const signature = JSON.stringify(data);
    if (retry.current.signature !== signature) retry.current = { signature, id: nuevaOperacionBodega() };
    try {
      await inventarioBeckRequest(`/api/inventario-beck/operario/asignaciones/${item.id}/consumo`, { method: "POST", body: JSON.stringify({ ...data, requestId: retry.current.id }) });
      onDone();
      Alert.alert("Consumo informado", "Tu supervisor debe confirmar el consumo. Mientras tanto no podrás devolver este lote.");
    } catch (e) { Alert.alert("No se pudo informar", e instanceof Error ? e.message : "Intenta nuevamente."); }
    finally { lock.current = false; setSaving(false); }
  }
  return <BodegaModal open title="Informar consumo" onClose={onClose} busy={saving} footer={<BodegaButton title={saving ? "Enviando..." : `Informar consumo de ${amount || 0} unidades`} disabled={saving} onPress={() => void send()} />}>
    <Text style={s.name}>{item.nombre}</Text>
    <Text style={s.text}>Asignadas: {item.cantidad} unidades. Supervisor: {item.supervisor.nombre}</Text>
    <Text style={[s.text, { marginVertical: 12 }]}>Estas unidades fueron consumidas y no serán devueltas. Se requiere confirmación del supervisor.</Text>
    {numbered ? <><Text style={s.name}>Selecciona los códigos consumidos</Text><View style={{ gap: 8, marginVertical: 12 }}>
      {item.subSkus!.map(code => <Pressable key={code} disabled={saving} accessibilityRole="checkbox" accessibilityState={{ checked: codes.includes(code) }} onPress={() => setCodes(current => current.includes(code) ? current.filter(c => c !== code) : [...current, code])} style={{ padding: 14, borderWidth: 1, borderRadius: 14, borderColor: "#fbbf24", backgroundColor: codes.includes(code) ? "#fef3c7" : "white" }}><Text>{codes.includes(code) ? "✓ " : "○ "}{code}</Text></Pressable>)}
    </View></> : <BodegaInput label="Cantidad consumida" numeric value={cantidad} onChangeText={setCantidad} />}
    <BodegaInput label="Observación opcional" value={observacion} onChangeText={setObservacion} multiline maxLength={1000} />
  </BodegaModal>;
}
