import { useCallback, useEffect, useRef, useState } from "react";
import {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

export function useBadgeBubble(
  showDuration = 3000,
  fadeInMs = 250,
  fadeOutMs = 400,
) {
  const [visible, setVisible] = useState(false);
  const opacity = useSharedValue(0);
  const showTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (showTimeout.current) clearTimeout(showTimeout.current);
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  };

  // Cancel any pending timers if the component unmounts mid-bubble
  useEffect(() => clearTimers, []);

  const trigger = useCallback(() => {
    // If already showing, restart the clock instead of stacking timers
    clearTimers();
    setVisible(true);
    opacity.value = withTiming(1, { duration: fadeInMs });

    showTimeout.current = setTimeout(() => {
      opacity.value = withTiming(0, { duration: fadeOutMs });
      hideTimeout.current = setTimeout(() => setVisible(false), fadeOutMs);
    }, showDuration);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return { visible, animatedStyle, trigger };
}
