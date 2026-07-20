import { useTheme } from "@/context/ThemeContext";
import { TextInput, TextInputProps } from "react-native";

export function ThemedInput({ style, ...props }: TextInputProps) {
  const { colors } = useTheme();

  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.textMuted}
      style={[
        {
          backgroundColor: colors.surface,
          color: colors.text,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 16,
          paddingVertical: 14,
        },
        style,
      ]}
    />
  );
}
