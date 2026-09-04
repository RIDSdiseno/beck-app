import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  Image,
  type ImageProps,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    Image.getSize(
      uri,
      (width, height) => setImageSize({ width, height }),
      () => setImageSize({ width: 1, height: 1 }),
    );
  }, [uri]);

  const displayedSize = useMemo(() => {
    const maxWidth = screenWidth * 0.92;
    const maxHeight = screenHeight * 0.74;
    const ratio = imageSize.width / imageSize.height;
    let width = maxWidth;
    let height = width / ratio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    return { width, height };
  }, [imageSize, screenHeight, screenWidth]);

  const resetZoom = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const close = () => {
    setVisible(false);
    resetZoom();
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.min(5, Math.max(1, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.01) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const shouldZoom = scale.value < 1.5;
      scale.value = withTiming(shouldZoom ? 2.5 : 1);
      savedScale.value = shouldZoom ? 2.5 : 1;
      if (!shouldZoom) {
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture,
  );
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

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
        onRequestClose={close}
      >
        <GestureHandlerRootView style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar fotografía"
            style={styles.backdrop}
            onPress={close}
          />
          <GestureDetector gesture={composedGesture}>
            <Animated.View
              style={[
                styles.imageFrame,
                displayedSize,
                animatedImageStyle,
              ]}
            >
              <Animated.Image
                source={{ uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>
          <View pointerEvents="box-none" style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar fotografía"
              hitSlop={16}
              style={({ pressed }) => [
                styles.closeButton,
                { top: insets.top + 18 },
                pressed && styles.pressed,
              ]}
              onPress={close}
            >
              <MaterialCommunityIcons name="close" size={30} color="#ffffff" />
            </Pressable>
            <Text style={[styles.hint, { bottom: insets.bottom + 18 }]}>
              Pellizca para ampliar · toca fuera para cerrar
            </Text>
          </View>
        </GestureHandlerRootView>
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
    ...StyleSheet.absoluteFill,
  },
  imageFrame: {
    alignItems: "center",
    justifyContent: "center",
  },
  fullImage: {
    height: "100%",
    width: "100%",
  },
  controls: {
    ...StyleSheet.absoluteFill,
  },
  closeButton: {
    position: "absolute",
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.55)",
    borderWidth: 1,
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
