import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";
import { View, ViewProps } from "react-native";

interface CardProps extends ViewProps {
  children: ReactNode;
}

export function Card({ style, children, ...props }: CardProps) {
  const { colors } = useTheme();

  return (
    <View
      {...props}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
