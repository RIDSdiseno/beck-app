import { Ionicons } from "@expo/vector-icons";
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
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        style={styles.pickerButton}
        onPress={() => setOpen(true)}
        android_ripple={{ color: "#e2e8f0" }}
      >
        <Text style={styles.pickerButtonText} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#98A2B3" />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => {}}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={data}
              keyExtractor={(item) => item.value ?? "__all__"}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <Pressable
                    style={styles.modalOption}
                    onPress={() => handleSelect(item.value)}
                    android_ripple={{ color: "#f1f5f9" }}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        active && { color: accentColor, fontWeight: "800" },
                      ]}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={accentColor} />
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
  wrapper: { flex: 1 },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    backgroundColor: "#ffffff",
    marginTop: 8,
    gap: 8,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    paddingTop: 16,
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 8,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
});
