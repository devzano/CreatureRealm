// components/ui/BottomSheetModal.tsx
import React, { useEffect, useState } from "react";
import { Modal, View, TouchableWithoutFeedback, Keyboard, Platform, StyleSheet, KeyboardEvent, StyleProp, ViewStyle, useWindowDimensions } from "react-native";
import LiquidGlass from "@/components/ui/LiquidGlass";
import { useTheme } from "@/context/themeContext";
import AppColors from "@/constants/colors";

type BottomSheetModalProps = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  extraKeyboardPadding?: number;
  sheetStyle?: StyleProp<ViewStyle>;
  overlayColor?: string;
  tintColor?: string;
  fixedHeight?: number;
};

const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onRequestClose,
  children,
  extraKeyboardPadding = 30,
  sheetStyle,
  overlayColor,
  tintColor,
  fixedHeight,
}) => {
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const { isDarkMode } = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onKeyboardShow = (e: KeyboardEvent) => {
      setKeyboardOffset(e.endCoordinates.height);
    };

    const onKeyboardHide = () => {
      setKeyboardOffset(0);
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const overlayBgDefault = "rgba(3,7,18,0.85)";
  const sheetTintDefault = "#020617";

  const overlayBg = overlayColor ?? overlayBgDefault;
  const sheetTint = tintColor ?? sheetTintDefault;

  const desiredBottom =
    keyboardOffset > 0 ? keyboardOffset + extraKeyboardPadding : 0;

  const topMargin = Platform.OS === "ios" ? 48 : 32;

  let bottomOffset = desiredBottom;
  if (sheetHeight > 0) {
    const maxBottom = Math.max(0, windowHeight - topMargin - sheetHeight);
    bottomOffset = Math.min(desiredBottom, maxBottom);
  }

  const resolvedSheetStyle: StyleProp<ViewStyle> = [
    styles.sheet,
    fixedHeight
      ? { height: fixedHeight }
      : { maxHeight: "79%", minHeight: 260 },
    sheetStyle,
  ];

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { backgroundColor: overlayBg }]}>
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            onRequestClose();
          }}
        >
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View
          style={[styles.sheetWrapper, { marginBottom: bottomOffset }]}
          onLayout={(e) => {
            setSheetHeight(e.nativeEvent.layout.height);
          }}
        >
          <LiquidGlass
            interactive
            glassEffectStyle="regular"
            tinted
            tintColor={sheetTint}
            showFallbackBackground
            style={resolvedSheetStyle}
          >
            {children}
          </LiquidGlass>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrapper: {
    width: "100%",
    paddingBottom: 10,
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
    width: "100%",
    alignSelf: "stretch",
  },
});

export default BottomSheetModal;
