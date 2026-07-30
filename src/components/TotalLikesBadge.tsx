import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text } from "react-native";

const getLikesGradient = (likes: number): [string, string] => {
  if (likes >= 10000) return ["#FF4D8D", "#FF1744"];
  if (likes >= 1000) return ["#FF8A8A", "#FF3B30"];
  if (likes >= 100) return ["#FFB35C", "#FF6B35"];
  return ["#FF8A8A", "#FF3B30"];
};

export function TotalLikesBadge({ likes }: { likes: number }) {
  if (likes < 1) return null;

  return (
    <LinearGradient colors={getLikesGradient(likes)} style={styles.badge}>
      <Ionicons name="heart-outline" size={16} color="#fff" />

      <Text style={styles.text}>{likes}</Text>
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
