// components/RequestUniverseModal.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import LiquidGlass from "@/components/ui/LiquidGlass";
import BottomSheetModal from "@/components/ui/BottomSheetModal";

export type UniverseRequestPayload = {
  rating: number;
  name: string;
  email: string;
  universe: string;
  message: string;
};

type RequestStatus = "idle" | "success" | "error";

type RequestUniverseModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: UniverseRequestPayload) => void;
  isSubmitting?: boolean;
  status?: RequestStatus;
};

const HYPE_LEVELS: Array<{
  value: number;
  label: string;
  icon: any;
  tint: string;
  border: string;
  iconColor: string;
}> = [
  {
    value: 1,
    label: "Curious",
    icon: "help-circle-outline",
    tint: "rgba(148,163,184,0.10)",
    border: "rgba(148,163,184,0.22)",
    iconColor: "#94a3b8",
  },
  {
    value: 2,
    label: "Interested",
    icon: "thumb-up-outline",
    tint: "rgba(56,189,248,0.10)",
    border: "rgba(56,189,248,0.28)",
    iconColor: "#38bdf8",
  },
  {
    value: 3,
    label: "Want it",
    icon: "rocket-launch-outline",
    tint: "rgba(10,212,242,0.12)",
    border: "rgba(10,212,242,0.30)",
    iconColor: "#67e8f9",
  },
  {
    value: 4,
    label: "Need it",
    icon: "alert-decagram-outline",
    tint: "rgba(250,204,21,0.12)",
    border: "rgba(250,204,21,0.32)",
    iconColor: "#facc15",
  },
  {
    value: 5,
    label: "PLEASE",
    icon: "fire",
    tint: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.34)",
    iconColor: "#fb923c",
  },
];

const RequestUniverseModal: React.FC<RequestUniverseModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isSubmitting = false,
  status = "idle",
}) => {
  const { height: windowH } = useWindowDimensions();

  const [rating, setRating] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [universe, setUniverse] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const isSuccess = status === "success";
  const isError = status === "error";

  const isFormValid =
    rating > 0 &&
    name.trim() !== "" &&
    email.trim() !== "" &&
    universe.trim() !== "" &&
    message.trim() !== "";

  const ui = useMemo(() => {
    const title = "#E5E7EB";
    const sub = "rgba(226,232,240,0.72)";
    const border = "rgba(148,163,184,0.20)";
    const inputBg = "rgba(26,24,25,0.90)";
    return { title, sub, border, inputBg };
  }, []);

  const reset = () => {
    setRating(0);
    setName("");
    setEmail("");
    setUniverse("");
    setMessage("");
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleSubmit = () => {
    if (!isFormValid || isSubmitting || isSuccess) return;
    onSubmit({ rating, name, email, universe, message });
  };

  useEffect(() => {
    if (!visible) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const fixedHeight = Math.max(560, Math.min(Math.floor(windowH * 0.9), 560));

  return (
    <BottomSheetModal
      visible={visible}
      onRequestClose={handleClose}
      extraKeyboardPadding={30}
      fixedHeight={fixedHeight}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconPill, { backgroundColor: "rgba(148,163,184,0.24)" }]}>
            <MaterialCommunityIcons
              name={isSuccess ? "check-circle" : "message-plus-outline"}
              size={22}
              color={isSuccess ? "#22c55e" : "#0AD4F2"}
            />
          </View>

          <View>
            <Text className="font-psemibold text-base" style={{ color: ui.title }}>
              {isSuccess ? "Request sent" : "Request a new universe"}
            </Text>
            <Text className="font-pregular text-xs" style={{ color: ui.sub }}>
              {isSuccess
                ? "Thanks — this helps shape what CreatureRealm supports next."
                : "Tell me what game/universe you want added next."}
            </Text>
          </View>
        </View>

        <LiquidGlass tinted showFallbackBackground tintColor={"#1A1819"} style={{ borderRadius: 12 }}>
          <TouchableOpacity
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ padding: 6, alignItems: "center", justifyContent: "center" }}
          >
            <MaterialCommunityIcons name="close" size={22} color="#f97373" />
          </TouchableOpacity>
        </LiquidGlass>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isSuccess ? (
          <View style={styles.successWrapper}>
            <MaterialCommunityIcons name="party-popper" size={40} color="#22c55e" style={{ marginBottom: 8 }} />
            <Text className="font-psemibold text-sm mb-2 text-center" style={{ color: ui.title }}>
              We got it!
            </Text>
            <Text className="font-pregular text-xs mb-10 text-center" style={{ color: ui.sub }}>
              Your request was submitted. Keep an eye out — new universes will show up here.
            </Text>

            <TouchableOpacity onPress={handleClose} activeOpacity={0.9} style={styles.successButton}>
              <Text className="font-psemibold text-sm text-white">Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.ratingSection}>
              <Text className="font-pregular text-xs mb-2" style={{ color: ui.sub }}>
                How badly do you want this universe?
              </Text>

              <View style={styles.hypeRow}>
                {HYPE_LEVELS.map((h, idx) => {
                  const selected = rating === h.value;

                  return (
                    <TouchableOpacity
                      key={h.value}
                      onPress={() => setRating(h.value)}
                      disabled={isSubmitting}
                      activeOpacity={0.85}
                      style={[styles.hypeItem, idx === HYPE_LEVELS.length - 1 && { marginRight: 0 }]}
                    >
                      <LiquidGlass
                        glassEffectStyle="clear"
                        interactive={false}
                        tinted
                        tintColor={selected ? h.tint : "rgba(148,163,184,0.06)"}
                        showFallbackBackground
                        style={[
                          styles.hypeGlass,
                          { borderColor: selected ? h.border : "rgba(148,163,184,0.16)" },
                        ]}
                      >
                        <View style={styles.hypeInner}>
                          <MaterialCommunityIcons
                            name={h.icon}
                            size={22}
                            color={selected ? h.iconColor : "rgba(148,163,184,0.9)"}
                          />
                          <Text
                            className="font-pregular"
                            style={[
                              styles.hypeLabel,
                              { color: selected ? ui.title : "rgba(226,232,240,0.72)" },
                            ]}
                            numberOfLines={1}
                          >
                            {h.label}
                          </Text>
                        </View>
                      </LiquidGlass>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.hypeHintRow}>
                <Text className="font-pregular text-[10px]" style={{ color: ui.sub }}>
                  Low
                </Text>
                <Text className="font-pregular text-[10px]" style={{ color: ui.sub }}>
                  High
                </Text>
              </View>
            </View>

            {/* Name + Email */}
            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { marginRight: 6 }]}>
                <Text className="font-psemibold text-xs mb-1" style={{ color: ui.title }}>
                  Name
                </Text>
                <TextInput
                  placeholder="full name"
                  value={name}
                  onChangeText={setName}
                  editable={!isSubmitting}
                  style={[styles.input, { backgroundColor: ui.inputBg, borderColor: ui.border, color: ui.title }]}
                  placeholderTextColor={ui.sub}
                />
              </View>

              <View style={[styles.inputGroup, { marginLeft: 6 }]}>
                <Text className="font-psemibold text-xs mb-1" style={{ color: ui.title }}>
                  Email
                </Text>
                <TextInput
                  placeholder="you@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isSubmitting}
                  style={[styles.input, { backgroundColor: ui.inputBg, borderColor: ui.border, color: ui.title }]}
                  placeholderTextColor={ui.sub}
                />
              </View>
            </View>

            {/* Universe */}
            <View style={styles.messageGroup}>
              <Text className="font-psemibold text-xs mb-1" style={{ color: ui.title }}>
                Universe (Game Name)
              </Text>
              <TextInput
                placeholder="…………………………"
                value={universe}
                onChangeText={setUniverse}
                editable={!isSubmitting}
                style={[styles.input, { backgroundColor: ui.inputBg, borderColor: ui.border, color: ui.title }]}
                placeholderTextColor={ui.sub}
              />
            </View>

            {/* Message */}
            <View style={styles.messageGroup}>
              <Text className="font-psemibold text-xs mb-1" style={{ color: ui.title }}>
                What should tracking include?
              </Text>
              <TextInput
                placeholder="Progress, squads, map, items, collections, etc."
                value={message}
                onChangeText={setMessage}
                editable={!isSubmitting}
                style={[styles.messageInput, { backgroundColor: ui.inputBg, borderColor: ui.border, color: ui.title }]}
                placeholderTextColor={ui.sub}
                multiline
              />
              {isError && (
                <Text className="font-pregular text-[10px] mt-2" style={{ color: "#f97373" }}>
                  Couldn’t send right now. Please try again.
                </Text>
              )}
            </View>

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isSubmitting}
                style={[styles.secondaryButton, isSubmitting && { opacity: 0.55 }]}
                activeOpacity={0.85}
              >
                <Text className="font-pregular text-sm text-[#f97373]">Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={!isFormValid || isSubmitting}
                style={[styles.primaryButton, (!isFormValid || isSubmitting) && { opacity: 0.55 }]}
                activeOpacity={0.9}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color={"#fff"} />
                ) : (
                  <View style={styles.primaryButtonContent}>
                    <MaterialCommunityIcons name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text className="font-psemibold text-sm text-white">Send Request</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  iconPill: { width: 32, height: 32, borderRadius: 999, marginRight: 8, alignItems: "center", justifyContent: "center" },

  ratingSection: { marginBottom: 14 },

  // ✅ One-row icon hype meter + tiny labels underneath
  hypeRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  hypeItem: { flex: 1, marginRight: 8 },
  hypeGlass: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  hypeInner: { height: 54, alignItems: "center", justifyContent: "center", paddingTop: 8 },
  hypeLabel: { marginTop: 4, fontSize: 9, opacity: 0.95 },
  hypeHintRow: { marginTop: 8, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2 },

  inputRow: { flexDirection: "row", marginBottom: 10 },
  inputGroup: { flex: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontFamily: "Poppins-Regular", fontSize: 13 },

  messageGroup: { marginBottom: 12 },
  messageInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9, minHeight: 92, maxHeight: 160, fontFamily: "Poppins-Regular", fontSize: 13, textAlignVertical: "top" },

  buttonRow: { flexDirection: "row", marginTop: 10 },
  secondaryButton: { flex: 1, marginRight: 8, borderRadius: 999, borderWidth: 1, borderColor: "#f97373", paddingVertical: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(148,163,184,0.10)" },
  primaryButton: { flex: 1, borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#0AD4F2" },
  primaryButtonContent: { flexDirection: "row", alignItems: "center" },

  successWrapper: { alignItems: "center", justifyContent: "center", paddingTop: 10, paddingBottom: 18 },
  successButton: { marginTop: 4, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 26, backgroundColor: "#0AD4F2" },
});

export default RequestUniverseModal;
