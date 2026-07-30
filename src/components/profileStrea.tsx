import { FontAwesome5 } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

export const getStreakGradient = (streak: number): [string, string] => {
  if (streak >= 60) return ["#4FE3FF", "#0066FF"];
  if (streak >= 30) return ["#D9B3FF", "#7B2FF7"];
  if (streak >= 14) return ["#FF8A8A", "#FF3B30"];
  if (streak >= 7) return ["#FFB35C", "#FF6B35"];
  return ["#FFD866", "#FF9500"];
};

export function StreakFireBadge({
  streak,
  size = 32,
  offsetX,
  offsetY,
}: {
  streak: number;
  size?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  const resolvedOffsetX = offsetX ?? -size * 0.28;
  const resolvedOffsetY = offsetY ?? -size * 0.28;
  const numberFontSize = Math.round(size * 0.34);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          right: resolvedOffsetX,
          bottom: resolvedOffsetY,
        },
      ]}
    >
      <MaskedView
        maskElement={
          <FontAwesome5 name="fire" size={size} color="black" solid />
        }
      >
        <LinearGradient
          colors={getStreakGradient(streak)}
          style={{ width: size, height: size }}
        />
      </MaskedView>

      <Text
        style={[styles.number, { fontSize: numberFontSize, top: size * 0.32 }]}
      >
        {streak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  number: {
    position: "absolute",
    color: "white",
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
