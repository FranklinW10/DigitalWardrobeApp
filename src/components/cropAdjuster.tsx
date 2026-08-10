import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

interface CropAdjusterProps {
  uri: string;
  naturalWidth: number;
  naturalHeight: number;
  frameWidth: number;
  minRatio?: number; // width/height — smaller = taller frame. Default 0.75 ≈ "4:3" portrait
  maxRatio?: number; // width/height — default 1 = square
  onFrameChange: (f: {
    frameHeight: number;
    imageScale: number;
    translateY: number;
  }) => void;
  onPress?: () => void;
}

export function CropAdjuster({
  uri,
  naturalWidth,
  naturalHeight,
  frameWidth,
  minRatio = 0.75,
  maxRatio = 1,
  onFrameChange,
  onPress,
}: CropAdjusterProps) {
  // Image always fills the frame's width exactly — this is fixed, not
  // something the user zooms anymore. What the user controls is how
  // TALL the frame is, which reveals more or less of this fixed-scale image.
  const imageScale = frameWidth / naturalWidth;
  const displayedImageHeight = naturalHeight * imageScale;

  const squareHeight = frameWidth; // ratio 1
  const wideHeight = frameWidth / minRatio; // taller extreme, e.g. /0.75

  // Never let the frame ask for more height than the photo actually has.
  const maxAllowedHeight = Math.min(wideHeight, displayedImageHeight);
  const minAllowedHeight = Math.min(squareHeight, maxAllowedHeight);

  const frameHeight = useSharedValue(minAllowedHeight);
  const savedFrameHeight = useSharedValue(minAllowedHeight);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const emit = () => {
    onFrameChange({
      frameHeight: frameHeight.value,
      imageScale,
      translateY: translateY.value,
    });
  };

  const clampY = (currentFrameHeight: number) => {
    "worklet";
    const maxY = Math.max(0, displayedImageHeight - currentFrameHeight);
    translateY.value = Math.min(maxY, Math.max(0, translateY.value));
  };

  // Pinch: spreading fingers apart (scale > 1) grows the frame taller
  // (reveals more of the photo, moving toward the 3:4 extreme). Pinching
  // together shrinks it back toward square. Flip the sign here if this
  // feels backwards on device.
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const next = savedFrameHeight.value * e.scale;
      frameHeight.value = Math.min(
        maxAllowedHeight,
        Math.max(minAllowedHeight, next),
      );
      clampY(frameHeight.value);
    })
    .onEnd(() => {
      savedFrameHeight.value = frameHeight.value;
      savedTranslateY.value = translateY.value;
      runOnJS(emit)();
    });

  // Vertical pan lets the user choose WHICH part of the photo shows,
  // whenever the frame is shorter than the full displayed image height.
  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onUpdate((e) => {
      translateY.value = savedTranslateY.value - e.translationY;
      clampY(frameHeight.value);
    })
    .onEnd(() => {
      savedTranslateY.value = translateY.value;
      runOnJS(emit)();
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    if (onPress) runOnJS(onPress)();
  });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    tapGesture,
  );

  const frameAnimatedStyle = useAnimatedStyle(() => ({
    width: frameWidth,
    height: frameHeight.value,
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    width: frameWidth,
    height: displayedImageHeight,
    transform: [{ translateY: -translateY.value }],
  }));

  return (
    <Animated.View style={[styles.frame, frameAnimatedStyle]}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={imageAnimatedStyle}>
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            contentFit="cover"
          />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: "#000",
  },
});
