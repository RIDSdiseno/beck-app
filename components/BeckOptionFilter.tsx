import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "react-native-paper";

type Option = { value: string; label: string };

type Props = {
  label: string;
  value: string;
  allValue: string;
  allLabel: string;
  options: Option[];
  onChange: (value: string) => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function BeckOptionFilter({
  label,
  value,
  allValue,
  allLabel,
  options,
  onChange,
  icon = "office-building-outline",
  compact = false,
  containerStyle,
}: Props) {
  const [visible, setVisible] = useState(false);
  const data = useMemo(
    () => [{ value: allValue, label: allLabel }, ...options],
    [allLabel, allValue, options],
  );
  const selectedLabel =
    value === allValue
      ? allLabel
      : options.find((option) => option.value === value)?.label || allLabel;

  return (
    <>
      <View style={[styles.filterBox, containerStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => setVisible(true)}
          style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}
        >
          {!compact ? (
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name={icon} size={18} color="#c2410c" />
            </View>
          ) : null}
          <View style={styles.textGroup}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value} numberOfLines={1}>{selectedLabel}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={21} color="#64748b" />
        </Pressable>
        {value !== allValue ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Quitar ${label.toLowerCase()}`}
            onPress={() => onChange(allValue)}
            hitSlop={8}
            style={[styles.clearButton, compact && styles.clearButtonCompact]}
          >
            <MaterialCommunityIcons name="close" size={19} color="#64748b" />
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label}</Text>
            <FlatList
              data={data}
              keyExtractor={(item) => item.value}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setVisible(false);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={[styles.optionIcon, selected && styles.optionIconSelected]}>
                      <MaterialCommunityIcons
                        name={item.value === allValue ? "view-grid-outline" : icon}
                        size={18}
                        color={selected ? "#0f172a" : "#64748b"}
                      />
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={2}>
                      {item.label}
                    </Text>
                    {selected ? (
                      <MaterialCommunityIcons name="check-circle" size={20} color="#f97316" />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  filterBox: {
    alignItems: "center",
    backgroundColor: "#fffdf8",
    borderColor: "#fbbf24",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    minHeight: 50,
  },
  selectButton: { alignItems: "center", flex: 1, flexDirection: "row", gap: 9, paddingHorizontal: 10, paddingVertical: 7 },
  pressed: { opacity: 0.75 },
  iconBox: { alignItems: "center", backgroundColor: "#ffedd5", borderRadius: 9, height: 32, justifyContent: "center", width: 32 },
  textGroup: { flex: 1, minWidth: 0 },
  label: { color: "#64748b", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  value: { color: "#0f172a", fontSize: 13, fontWeight: "800", marginTop: 1 },
  clearButton: { alignItems: "center", borderLeftColor: "#fed7aa", borderLeftWidth: 1, height: 34, justifyContent: "center", width: 42 },
  clearButtonCompact: { width: 34 },
  overlay: { backgroundColor: "rgba(15, 23, 42, 0.5)", flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fffaf0", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "70%", paddingBottom: 28, paddingHorizontal: 16, paddingTop: 10 },
  sheetHandle: { alignSelf: "center", backgroundColor: "#cbd5e1", borderRadius: 2, height: 4, marginBottom: 14, width: 42 },
  sheetTitle: { color: "#0f172a", fontSize: 17, fontWeight: "900", marginBottom: 10 },
  option: { alignItems: "center", backgroundColor: "#ffffff", borderColor: "#fed7aa", borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 10, marginBottom: 8, minHeight: 52, paddingHorizontal: 11, paddingVertical: 8 },
  optionSelected: { backgroundColor: "#fff7ed", borderColor: "#f97316" },
  optionIcon: { alignItems: "center", backgroundColor: "#f1f5f9", borderRadius: 9, height: 34, justifyContent: "center", width: 34 },
  optionIconSelected: { backgroundColor: "#FDC10B" },
  optionText: { color: "#475569", flex: 1, fontSize: 13, fontWeight: "700" },
  optionTextSelected: { color: "#0f172a", fontWeight: "900" },
});
