import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, Easing, ImageBackground } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import AppImages from "@/constants/images";
import { useTheme } from "@/context/themeContext";

interface AnimatedSplashScreenProps {
  onAnimationFinish: () => void;
}

export default function AnimatedSplashScreen({
  onAnimationFinish,
}: AnimatedSplashScreenProps) {
  const { isDarkMode } = useTheme();

  const logoOpacity = useRef(new Animated.Value(1)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const hasAnimatedRef = useRef(false);

  const splashSource = AppImages.splash;

  useEffect(() => {
    if (hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;

    const run = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn("Error hiding native splash:", e);
      }

      Animated.sequence([
        Animated.delay(200),
        // Pulse
        Animated.sequence([
          Animated.timing(logoOpacity, {
            toValue: 0.3,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(150),
        // Fade everything out
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(onAnimationFinish);
    };

    run();
  }, [logoOpacity, containerOpacity, onAnimationFinish]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.container,
        { opacity: containerOpacity },
      ]}
      pointerEvents="none"
    >
      <ImageBackground
        source={splashSource}
        style={styles.bgImage}
        resizeMode="cover"
        blurRadius={4}
      >
        <View style={styles.bgOverlay} />

        <View style={styles.centered}>
          <Animated.Image
            source={splashSource}
            style={[styles.foregroundImage, { opacity: logoOpacity }]}
            resizeMode="contain"
          />
        </View>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    zIndex: 99999,
    backgroundColor: "#071826",
  },
  bgImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#071826",
    opacity: 0.35,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  foregroundImage: {
    width: "100%",
    height: "100%",
  },
});