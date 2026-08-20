import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

export type SelectSheetOption = {
  value: string;
  label: string;
};

type SelectSheetProps = {
  label: string;
  value: string | null;
  placeholder: string;
  options: SelectSheetOption[];
  onChange: (value: string | null) => void;
  includeAllOption?: { label: string };
  accentColor?: string;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
};

const BRAND = "#f97316";

export function SelectSheet({
  label,
  value,
  placeholder,
  options,
  onChange,
  includeAllOption,
  accentColor = BRAND,
  icon = "format-list-bulleted",
}: SelectSheetProps) {
  const [open, setOpen] = useState(false);

  const selectedLabel =
    value === null
      ? placeholder
      : options.find((o) => o.value === value)?.label ?? placeholder;

  const data: { value: string | null; label: string }[] = includeAllOption
    ? [{ value: null, label: includeAllOption.label }, ...options]
    : options;

  const handleSelect = (selected: string | null) => {
    onChange(selected);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.pickerButton,
          pressed && styles.pickerButtonPressed,
        ]}
        onPress={() => setOpen(true)}
      >
        <View style={styles.iconBox}>
          <MaterialCommunityIcons name={icon} size={18} color="#c2410c" />
        </View>
        <View style={styles.textGroup}>
          <Text style={styles.fieldLabel}>{label}</Text>
          <Text style={styles.pickerButtonText} numberOfLines={1}>
            {selectedLabel}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={21} color="#64748b" />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={data}
              keyExtractor={(item) => item.value ?? "__all__"}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={[
                      styles.modalOption,
                      active && styles.modalOptionSelected,
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <View
                      style={[
                        styles.optionIcon,
                        active && styles.optionIconSelected,
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.value === null ? "view-grid-outline" : icon}
                        size={18}
                        color={active ? "#0f172a" : "#64748b"}
                      />
                    </View>
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && styles.modalOptionTextSelected,
                      ]}
                      numberOfLines={2}
                    >
                      {item.label}
                    </Text>
                    {active ? (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={accentColor}
                      />
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "stretch",
    marginBottom: 12,
  },
  fieldLabel: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  pickerButton: {
    alignItems: "center",
    backgroundColor: "#fffdf8",
    borderColor: "#fbbf24",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 50,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pickerButtonPressed: {
    opacity: 0.75,
  },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
  },
  pickerButtonText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
  },
  modalOverlay: {
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#fffaf0",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingBottom: 28,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 10,
  },
  modalOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#fed7aa",
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    minHeight: 52,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  modalOptionSelected: {
    backgroundColor: "#fff7ed",
    borderColor: "#f97316",
  },
  optionIcon: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 9,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  optionIconSelected: {
    backgroundColor: "#FDC10B",
  },
  modalOptionText: {
    color: "#475569",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  modalOptionTextSelected: {
    color: "#0f172a",
    fontWeight: "900",
  },
});
