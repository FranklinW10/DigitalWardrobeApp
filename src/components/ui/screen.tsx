import { useTheme } from "@/context/ThemeContext";
import { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps {
  children: ReactNode;
}

export function Screen({ children }: ScreenProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {children}
    </SafeAreaView>
  );
}
