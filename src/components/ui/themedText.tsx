import { useTheme } from "@/context/ThemeContext";
import { Text, TextProps } from "react-native";

export function ThemedText({ style, ...props }: TextProps) {
  const { colors } = useTheme();

  return (
    <Text
      {...props}
      style={[
        {
          color: colors.text,
        },
        style,
      ]}
    />
  );
}
