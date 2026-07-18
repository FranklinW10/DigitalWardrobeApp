import { useTheme } from "@/context/ThemeContext";
import { ScrollView, ScrollViewProps } from "react-native";

export function ThemedScrollView({
  style,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      {...props}
      style={[
        {
          backgroundColor: colors.background,
        },
        style,
      ]}
      contentContainerStyle={contentContainerStyle}
    />
  );
}
