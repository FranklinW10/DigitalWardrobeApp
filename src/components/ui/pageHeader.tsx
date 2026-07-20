import { useTheme } from "@/context/ThemeContext";
import { View } from "react-native";
import { ThemedText } from "./themedText";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        marginBottom: 28,
      }}
    >
      <ThemedText
        style={{
          fontSize: 30,
          fontWeight: "700",
        }}
      >
        {title}
      </ThemedText>

      {subtitle && (
        <ThemedText
          style={{
            color: colors.textMuted,
            fontSize: 16,
            marginTop: 6,
          }}
        >
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}
