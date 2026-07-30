import { Ionicons } from "@expo/vector-icons";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

const getStreakGradient = (streak: number): [string, string] => {
  if (streak >= 60) return ["#4FE3FF", "#0066FF"];
  if (streak >= 30) return ["#D9B3FF", "#7B2FF7"];
  if (streak >= 14) return ["#FF8A8A", "#FF3B30"];
  if (streak >= 7) return ["#FFB35C", "#FF6B35"];
  return ["#FFD866", "#FF9500"];
};

export function StreakFireBadge({ streak }: { streak: number }) {
  return (
    <View style={styles.container}>
      <MaskedView
        maskElement={<Ionicons name="flame" size={30} color="black" />}
      >
        <LinearGradient
          colors={getStreakGradient(streak)}
          style={{ width: 28, height: 28 }}
        />
      </MaskedView>

      <Text
        style={styles.number}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {streak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: -8,
    bottom: -8,
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  flame: {
    position: "absolute",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  number: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 6,
    color: "white",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -1,
    textAlign: "center",
  },
});
