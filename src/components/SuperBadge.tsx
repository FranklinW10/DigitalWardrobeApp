import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text } from "react-native";
const getStreakGradient = (streak: number): [string, string] => {
  if (streak >= 60) return ["#4FE3FF", "#0066FF"];
  if (streak >= 30) return ["#D9B3FF", "#7B2FF7"];
  if (streak >= 14) return ["#FF8A8A", "#FF3B30"];
  if (streak >= 7) return ["#FFB35C", "#FF6B35"];
  return ["#FFD866", "#FF9500"];
};

export function SuperBadge({ streak }: { streak: number }) {
  if (streak < 3) return null;

  return (
    <LinearGradient colors={getStreakGradient(streak)} style={styles.badge}>
      <Ionicons name="star-outline" size={16} color="#fff" />
      <Text style={styles.text}>{streak}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  label: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  text: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
