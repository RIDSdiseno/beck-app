import React from "react";
import type { StyleProp, TextStyle } from "react-native";
import { StyleSheet } from "react-native";
import { TextInput } from "@/components/AppTextInput";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
  onSubmitEditing?: () => void;
};

export function BeckSearchInput({
  value,
  onChangeText,
  placeholder,
  accessibilityLabel,
  style,
  onSubmitEditing,
}: Props) {
  return (
    <TextInput
      accessibilityLabel={accessibilityLabel || placeholder}
      mode="outlined"
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      left={<TextInput.Icon icon="magnify" color="#c2410c" />}
      right={
        value ? (
          <TextInput.Icon
            icon="close-circle-outline"
            color="#64748b"
            onPress={() => onChangeText("")}
          />
        ) : undefined
      }
      outlineColor="#fbbf24"
      activeOutlineColor="#f97316"
      textColor="#0f172a"
      style={[styles.input, style]}
      outlineStyle={styles.outline}
      contentStyle={styles.content}
      autoCapitalize="none"
      autoCorrect={false}
      spellCheck={false}
      autoComplete="off"
      returnKeyType="search"
      onSubmitEditing={onSubmitEditing}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fffdf8",
    fontSize: 13,
    marginBottom: 12,
  },
  outline: {
    borderRadius: 14,
    borderWidth: 1,
  },
  content: {
    minHeight: 48,
  },
});
