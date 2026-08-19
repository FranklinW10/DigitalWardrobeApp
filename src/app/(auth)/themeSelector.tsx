import { palettes, themeMeta, ThemeName } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ThemeSelectorScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { updateUser } = useAuth();
  const router = useRouter();
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("dark");

  const preview = palettes[selectedTheme];
  const themeNames = Object.keys(palettes) as ThemeName[];
  const { setTheme } = useTheme();
  const handleCompleate = async () => {
    if (!selectedTheme) return;

    setIsLoading(true);
    try {
      await setTheme(selectedTheme);
      await updateUser({ theme: selectedTheme });

      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving theme:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[
        styles.container,
        {
          backgroundColor: preview.background,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: preview.text,
              },
            ]}
          >
            Pick Your Style
          </Text>
          <Text style={[styles.subtitle, { color: preview.textMuted }]}>
            Choose a look for the app. You can change this later.
          </Text>
        </View>
        <View style={styles.form}>
          <View style={styles.grid}>
            {themeNames.map((name) => {
              const palette = palettes[name];
              const isActive = name === selectedTheme;

              return (
                <TouchableOpacity
                  key={name}
                  onPress={() => setSelectedTheme(name)}
                  activeOpacity={0.8}
                  style={[
                    styles.swatchCard,
                    {
                      backgroundColor: palette.background,
                      borderColor: isActive ? palette.accent : "#e0e0e0",
                      borderWidth: isActive ? 2 : 1,
                    },
                  ]}
                >
                  <View style={styles.dotRow}>
                    <View
                      style={[styles.dot, { backgroundColor: palette.primary }]}
                    />
                    <View
                      style={[styles.dot, { backgroundColor: palette.accent }]}
                    />
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: palette.surface,
                          borderWidth: 1,
                          borderColor: palette.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.swatchLabel, { color: palette.text }]}>
                    {themeMeta[name].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              !selectedTheme && styles.buttonDisabled,
              { backgroundColor: preview.accent },
            ]}
            onPress={handleCompleate}
            disabled={!selectedTheme || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size={24} color="#fff" />
            ) : (
              <Text style={[styles.buttontext, { color: preview.background }]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    color: "#666",
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  swatchCard: {
    width: "48%",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  dotRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  swatchLabel: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10,
  },
  swatchHint: {
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    backgroundColor: "#000",
    width: "100%",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: "#999",
  },
  buttontext: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
