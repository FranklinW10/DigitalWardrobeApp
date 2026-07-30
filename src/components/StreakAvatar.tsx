import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";

const getStreakGradient = (streak: number): [string, string] => {
  if (streak >= 60) return ["#4FE3FF", "#0066FF"];
  if (streak >= 30) return ["#D9B3FF", "#7B2FF7"];
  if (streak >= 14) return ["#FF8A8A", "#FF3B30"];
  if (streak >= 7) return ["#FFB35C", "#FF6B35"];
  return ["#FFD866", "#FF9500"];
};

interface StreakAvatarProps {
  uri?: string | null;
  initial: string;
  streak: number;
  size?: number;
  colors: any;
  RING_WIDTH?: number;
  RING_GAP?: number;
}

export const StreakAvatar = ({
  uri,
  initial,
  streak,
  size = 40,
  colors,
  RING_WIDTH = 2.5,
  RING_GAP = 2,
}: StreakAvatarProps) => {
  const outerSize = size + (RING_WIDTH + RING_GAP) * 2;
  const gapSize = size + RING_GAP * 2;

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const avatarNode = uri ? (
    <Image source={{ uri }} cachePolicy="memory-disk" style={avatarStyle} />
  ) : (
    <View
      style={[
        avatarStyle,
        {
          backgroundColor: colors.surface,
          justifyContent: "center",
          alignItems: "center",
        },
      ]}
    >
      <Text
        style={{
          color: colors.textMuted,
          fontWeight: "600",
          fontSize: size * 0.4,
        }}
      >
        {initial}
      </Text>
    </View>
  );

  if (streak < 3) return avatarNode;

  return (
    <LinearGradient
      colors={getStreakGradient(streak)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: outerSize,
        height: outerSize,
        borderRadius: outerSize / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: gapSize,
          height: gapSize,
          borderRadius: gapSize / 2,
          backgroundColor: colors.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {avatarNode}
      </View>
    </LinearGradient>
  );
};
