import { useBadgeBubble } from "@/hooks/useBadgeBubble";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

export const getStreakGradient = (streak: number): [string, string] => {
  if (streak >= 60) return ["#4FE3FF", "#0066FF"];
  if (streak >= 30) return ["#D9B3FF", "#7B2FF7"];
  if (streak >= 14) return ["#FF8A8A", "#FF3B30"];
  if (streak >= 7) return ["#FFB35C", "#FF6B35"];
  return ["#FFD866", "#FF9500"];
};

export function MaxStreakBadge({ streak }: { streak: number }) {
  const { visible, animatedStyle, trigger } = useBadgeBubble();
  if (streak < 3) return null;
  const gradient = getStreakGradient(streak);

  return (
    <TouchableOpacity onPress={trigger} activeOpacity={0.85}>
      {visible && (
        <Animated.View style={[styles.bubbleWrap, animatedStyle]}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bubble, { shadowColor: gradient[1] }]}
          >
            <Text style={styles.bubbleText}>
              Your longest streak is {streak} days
            </Text>
          </LinearGradient>
        </Animated.View>
      )}

      <View style={[styles.shadowWrap, { shadowColor: gradient[1] }]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.badge}
        >
          <View style={styles.iconCircle}>
            <FontAwesome5 name="fire" size={12} color="#fff" solid />
          </View>
          <Text style={styles.text}>{streak}</Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
    borderRadius: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bubbleWrap: {
    position: "absolute",
    bottom: "0%",
    marginBottom: 45,
    alignSelf: "center",
    zIndex: 20,
  },
  bubble: {
    minWidth: 150,
    maxWidth: 260,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
  },
  bubbleText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
});
