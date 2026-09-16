import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { getSession, type SessionUser } from "@/services/auth/session";
import {
  BodegaButton,
  BodegaHeader,
  BodegaListFooter,
  bodegaStyles as s,
  useBodegaList,
} from "@/components/BodegaBeckUI";
type Movimiento = {
  id: string;
  descripcion: string;
  created_at: string;
  datos: {
    payload?: { motivo?: string };
    resultado?: { stockAnterior?: number; stockActual?: number };
  };
};
export default function PerfilBodega() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    getSession().then((session) => setUser(session.user));
  }, []);
  const list = useBodegaList<Movimiento>("/historial");
  return (
    <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
      <BodegaHeader
        title={user?.nombre || "Mi cuenta"}
        subtitle={`${user?.email || ""} · Bodeguero Firemat`}
      />
      <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
        <BodegaButton
          title="Volver a Firemat"
          secondary
          onPress={() => router.replace("/(firemat)/perfil")}
        />
        <Text style={[s.name, { marginTop: 16 }]}>
          Mis movimientos en bodega BECK
        </Text>
      </View>
      <FlatList
        data={list.items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={s.content}
        refreshing={list.loading}
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
          !list.loading ? (
            <Text style={s.text}>Todavía no hay movimientos.</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.name}>{item.descripcion.replaceAll("_", " ")}</Text>
            <Text style={s.text}>
              {new Date(item.created_at).toLocaleString("es-CL")}
            </Text>
            {item.datos?.payload?.motivo && (
              <Text style={s.text}>{item.datos.payload.motivo}</Text>
            )}
            {item.datos?.resultado?.stockActual !== undefined && (
              <Text style={s.text}>
                Stock: {item.datos.resultado.stockAnterior} →{" "}
                {item.datos.resultado.stockActual}
              </Text>
            )}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
