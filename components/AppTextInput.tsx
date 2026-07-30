import React from "react";
import { TextInput as PaperTextInput } from "react-native-paper";

type PaperTextInputProps = React.ComponentProps<typeof PaperTextInput>;

/**
 * Wrapper de TextInput con autocorrector y corrector ortografico
 * desactivados por defecto. Los tecnicos reportaron que el
 * autocorrector les cambiaba lo que escribian en los campos.
 */
function AppTextInput({
  autoCorrect = false,
  spellCheck = false,
  autoComplete = "off",
  ...rest
}: PaperTextInputProps) {
  return (
    <PaperTextInput
      autoCorrect={autoCorrect}
      spellCheck={spellCheck}
      autoComplete={autoComplete}
      {...rest}
    />
  );
}

const TextInput = AppTextInput as typeof AppTextInput & {
  Icon: typeof PaperTextInput.Icon;
  Affix: typeof PaperTextInput.Affix;
};
TextInput.Icon = PaperTextInput.Icon;
TextInput.Affix = PaperTextInput.Affix;

export { TextInput };
