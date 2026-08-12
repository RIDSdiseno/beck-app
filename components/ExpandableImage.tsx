import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Image,
  type ImageProps,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

type ExpandableImageProps = Omit<ImageProps, "source"> & {
  uri: string;
  accessibilityLabel?: string;
};

export function ExpandableImage({
  uri,
  accessibilityLabel = "Ver fotografía en pantalla completa",
  resizeMode = "cover",
  ...imageProps
}: ExpandableImageProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => setVisible(true)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <Image
          {...imageProps}
          source={{ uri }}
          resizeMode={resizeMode}
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar fotografía"
            style={styles.backdrop}
            onPress={() => setVisible(false)}
          />
          <Image
            source={{ uri }}
            style={styles.fullImage}
            resizeMode="contain"
          />
          <SafeAreaView pointerEvents="box-none" style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar fotografía"
              hitSlop={12}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressed,
              ]}
              onPress={() => setVisible(false)}
            >
              <MaterialCommunityIcons name="close" size={28} color="#ffffff" />
            </Pressable>
            <Text style={styles.hint}>Toca fuera de la imagen para cerrar</Text>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  modal: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.96)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  fullImage: {
    width: "100%",
    height: "82%",
  },
  controls: {
    ...StyleSheet.absoluteFillObject,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 16,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.82)",
  },
  hint: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
});
