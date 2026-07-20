import { useTheme } from "@/context/ThemeContext";
import {
    ActivityIndicator,
    Text,
    TouchableOpacity,
    TouchableOpacityProps,
} from "react-native";

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export function PrimaryButton({
  title,
  loading = false,
  style,
  disabled,
  ...props
}: PrimaryButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled || loading}
      style={[
        {
          backgroundColor: disabled ? colors.textMuted : colors.accent,
          paddingVertical: 16,
          borderRadius: 14,
          alignItems: "center",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text
          style={{
            color: colors.background,
            fontWeight: "600",
            fontSize: 16,
          }}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}
