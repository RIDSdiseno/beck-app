import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export type BeckFilterOption<T extends string> = {
  value: T;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  count: number;
};

type Props<T extends string> = {
  title: string;
  resultCount: number;
  options: BeckFilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  columns?: 2 | 3;
  children?: ReactNode;
};

export function BeckFilterPanel<T extends string>({
  title,
  resultCount,
  options,
  value,
  onChange,
  columns = 3,
  children,
}: Props<T>) {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleGroup}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="tune-variant" size={17} color="#c2410c" />
          </View>
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.resultCount}>
          {resultCount} {resultCount === 1 ? "resultado" : "resultados"}
        </Text>
      </View>

      <View style={[styles.options, columns === 2 && styles.optionsWrap]}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                columns === 2 ? styles.optionTwoColumns : styles.optionThreeColumns,
                selected && styles.optionSelected,
                pressed && styles.optionPressed,
              ]}
            >
              <MaterialCommunityIcons
                name={option.icon}
                size={17}
                color={selected ? "#FDC10B" : "#64748b"}
              />
              <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                {option.label}
              </Text>
              <Text style={[styles.badge, selected && styles.badgeSelected]}>
                {option.count}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {children ? <View style={styles.extra}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#fffaf0",
    borderColor: "#fbbf24",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    padding: 10,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 9,
  },
  titleGroup: { alignItems: "center", flexDirection: "row", gap: 7 },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 8,
    height: 29,
    justifyContent: "center",
    width: 29,
  },
  title: { color: "#0f172a", fontSize: 13, fontWeight: "900" },
  resultCount: { color: "#64748b", fontSize: 10, fontWeight: "700" },
  options: { flexDirection: "row", gap: 6 },
  optionsWrap: { flexWrap: "wrap" },
  option: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#fed7aa",
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 5,
  },
  optionThreeColumns: { flex: 1 },
  optionTwoColumns: { flexBasis: "48%", flexGrow: 1 },
  optionSelected: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  optionPressed: { opacity: 0.75 },
  optionText: { color: "#475569", flexShrink: 1, fontSize: 10, fontWeight: "800" },
  optionTextSelected: { color: "#ffffff" },
  badge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    color: "#475569",
    fontSize: 9,
    fontWeight: "900",
    minWidth: 19,
    overflow: "hidden",
    paddingHorizontal: 4,
    paddingVertical: 2,
    textAlign: "center",
  },
  badgeSelected: { backgroundColor: "#FDC10B", color: "#0f172a" },
  extra: {
    borderTopColor: "#fed7aa",
    borderTopWidth: 1,
    marginTop: 10,
    paddingTop: 10,
  },
});
