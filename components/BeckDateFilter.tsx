import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { Text } from "react-native-paper";

type Props = {
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];
const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function parseLocalDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toDateValue(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function displayDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "Todas las fechas";
}

export function BeckDateFilter({ value, onChange, compact = false, containerStyle }: Props) {
  const [visible, setVisible] = useState(false);
  const [month, setMonth] = useState(() => parseLocalDate(value));

  const days = useMemo(() => {
    const year = month.getFullYear();
    const monthIndex = month.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const mondayOffset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

    return Array.from({ length: 42 }, (_, index) => {
      const day = index - mondayOffset + 1;
      return day > 0 && day <= daysInMonth ? day : null;
    });
  }, [month]);

  const changeMonth = (offset: number) => {
    setMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  return (
    <>
      <View style={[styles.filterBox, containerStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seleccionar fecha del historial"
          onPress={() => {
            setMonth(parseLocalDate(value));
            setVisible(true);
          }}
          style={({ pressed }) => [styles.selectButton, pressed && styles.pressed]}
        >
          {!compact ? (
            <View style={styles.iconBox}>
              <MaterialCommunityIcons name="calendar-month-outline" size={18} color="#c2410c" />
            </View>
          ) : null}
          <View style={styles.textGroup}>
            <Text style={styles.label}>Filtrar por fecha</Text>
            <Text style={styles.value} numberOfLines={1}>
              {value ? displayDate(value) : "Todas las fechas"}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-down" size={21} color="#64748b" />
        </Pressable>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitar filtro de fecha"
            onPress={() => onChange("")}
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
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.calendar} onPress={() => {}}>
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityLabel="Mes anterior"
                onPress={() => changeMonth(-1)}
                style={styles.monthButton}
              >
                <MaterialCommunityIcons name="chevron-left" size={24} color="#0f172a" />
              </Pressable>
              <Text style={styles.monthTitle}>
                {MONTHS[month.getMonth()]} {month.getFullYear()}
              </Text>
              <Pressable
                accessibilityLabel="Mes siguiente"
                onPress={() => changeMonth(1)}
                style={styles.monthButton}
              >
                <MaterialCommunityIcons name="chevron-right" size={24} color="#0f172a" />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEK_DAYS.map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekDay}>{day}</Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {days.map((day, index) => {
                if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const dayValue = toDateValue(month.getFullYear(), month.getMonth(), day);
                const selected = value === dayValue;
                return (
                  <Pressable
                    key={dayValue}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onChange(dayValue);
                      setVisible(false);
                    }}
                    style={[styles.dayCell, selected && styles.daySelected]}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => {
                onChange("");
                setVisible(false);
              }}
              style={styles.allDatesButton}
            >
              <Text style={styles.allDatesText}>Mostrar todas las fechas</Text>
            </Pressable>
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
  selectButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pressed: { opacity: 0.75 },
  iconBox: {
    alignItems: "center",
    backgroundColor: "#ffedd5",
    borderRadius: 9,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
  textGroup: { flex: 1 },
  label: { color: "#64748b", fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  value: { color: "#0f172a", fontSize: 13, fontWeight: "800", marginTop: 1 },
  clearButton: {
    alignItems: "center",
    borderLeftColor: "#fed7aa",
    borderLeftWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 42,
  },
  clearButtonCompact: { width: 34 },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  calendar: {
    backgroundColor: "#fffaf0",
    borderColor: "#fbbf24",
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 370,
    padding: 15,
    width: "100%",
  },
  calendarHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  monthButton: { alignItems: "center", backgroundColor: "#FDC10B", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  monthTitle: { color: "#0f172a", fontSize: 16, fontWeight: "900", textTransform: "capitalize" },
  weekRow: { flexDirection: "row", marginTop: 15 },
  weekDay: { color: "#64748b", fontSize: 10, fontWeight: "900", textAlign: "center", width: "14.2857%" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  dayCell: { alignItems: "center", height: 40, justifyContent: "center", width: "14.2857%" },
  daySelected: { backgroundColor: "#0f172a", borderRadius: 20 },
  dayText: { color: "#334155", fontSize: 13, fontWeight: "700" },
  dayTextSelected: { color: "#FDC10B", fontWeight: "900" },
  allDatesButton: { alignItems: "center", borderColor: "#f97316", borderRadius: 12, borderWidth: 1, marginTop: 10, paddingVertical: 11 },
  allDatesText: { color: "#c2410c", fontSize: 12, fontWeight: "900" },
});
