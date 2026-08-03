import { useBadgeBubble } from "@/hooks/useBadgeBubble";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated from "react-native-reanimated";

const getLikesGradient = (likes: number): [string, string] => {
  if (likes >= 10000) return ["#FF4D8D", "#FF1744"];
  if (likes >= 1000) return ["#FF8A8A", "#FF3B30"];
  if (likes >= 100) return ["#FFB35C", "#FF6B35"];
  return ["#FF8A8A", "#FF3B30"];
};

const formatLikes = (likes: number) => {
  if (likes >= 1000000) return `${(likes / 1000000).toFixed(1)}M`;
  if (likes >= 1000) return `${(likes / 1000).toFixed(1)}K`;
  return `${likes}`;
};

export function TotalLikesBadge({ likes }: { likes: number }) {
  const { visible, animatedStyle, trigger } = useBadgeBubble();
  if (likes < 1) return null;
  const gradient = getLikesGradient(likes);

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
              You have {likes.toLocaleString()} total likes across all your
              posts
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
            <Ionicons name="heart" size={12} color="#fff" />
          </View>
          <Text style={styles.text}>{formatLikes(likes)}</Text>
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
    minWidth: 170,
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
