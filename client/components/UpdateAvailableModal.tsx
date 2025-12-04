// components/modals/UpdateAvailableModal.tsx
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import AppColors, { hexToRGBA } from "@/constants/colors";

type UpdateAvailableModalProps = {
  visible: boolean;
  onUpdateNow: () => void;
  isUpdating?: boolean;
};

const UpdateAvailableModal: React.FC<UpdateAvailableModalProps> = ({
  visible,
  onUpdateNow,
  isUpdating = false,
}) => {
  const backdropColor = AppColors.background.backdrop;
  const cardBg = AppColors.background.surface;
  const borderColor = AppColors.background.border2;
  const titleColor = AppColors.text.light.primary;
  const bodyColor = AppColors.text.light.secondary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: backdropColor }}
      >
        <View
          className="w-full max-w-[420px] rounded-3xl p-5 border shadow-lg"
          style={{
            backgroundColor: cardBg,
            borderColor,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 12,
          }}
        >
          {/* Pill */}
          <View className="flex-row justify-center mb-2.5">
            <View
              className="flex-row items-center rounded-full px-3 py-1"
              style={{
                backgroundColor: hexToRGBA(AppColors.primary[500], 0.12),
              }}
            >
              <View
                className="w-1.5 h-1.5 rounded-full mr-1.5"
                style={{ backgroundColor: AppColors.primary[500] }}
              />
              <Text
                className="text-[11px] android:mt-[2px] uppercase tracking-[1.4px]"
                style={{
                  color: AppColors.primary[500],
                  fontFamily: "Poppins-SemiBold",
                }}
              >
                new realm update
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text
            className="text-[18px] leading-6 mt-1 mb-1.5 text-center"
            style={{
              color: titleColor,
              fontFamily: "Poppins-SemiBold",
            }}
          >
            A fresher build has appeared
          </Text>

          {/* Body */}
          <Text
            className="text-[14px] leading-5 mt-2 mb-5 text-center"
            style={{
              color: bodyColor,
              fontFamily: "Poppins-Regular",
            }}
          >
            An update is required to keep exploring CreatureRealm with the latest
            fixes and improvements.
          </Text>

          {/* Primary button */}
          <View className="flex-row mb-1.5">
            <TouchableOpacity
              onPress={isUpdating ? undefined : onUpdateNow}
              activeOpacity={0.85}
              className="flex-1 flex-row items-center justify-center rounded-full py-2.5"
              style={{
                backgroundColor: AppColors.accent[500],
                opacity: isUpdating ? 0.75 : 1,
              }}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  className="text-[14px] android:mt-[2px] text-white"
                  style={{ fontFamily: "Poppins-SemiBold" }}
                >
                  Update & Continue
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer text */}
          <Text
            className="mt-0.5 text-[11px] text-center"
            style={{
              color: bodyColor,
              fontFamily: "Poppins-Regular",
            }}
          >
            This should only take a moment—like a quick trip to the Poké Center.
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default UpdateAvailableModal;
