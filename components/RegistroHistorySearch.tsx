import React from "react";
import { BeckSearchInput } from "./BeckSearchInput";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function RegistroHistorySearch({
  value,
  onChangeText,
  placeholder = "Buscar por N° de sello o piso",
}: Props) {
  return (
    <BeckSearchInput
      accessibilityLabel={placeholder}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
    />
  );
}
