import React from "react";
import { Pressable, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

export default function PokopiaSearchInput({ value, onChangeText, placeholder }: Props) {
  const hasValue = value.trim().length > 0;

  return (
    <View className="h-11 rounded-2xl border border-slate-700 bg-slate-950 px-4 flex-row items-center">
      <Ionicons name="search" size={16} color="rgba(148,163,184,0.9)" />

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(148,163,184,0.8)"
        className="flex-1 ml-2 text-[13px] text-slate-100"
      />

      {hasValue ? (
        <Pressable
          onPress={() => onChangeText("")}
          className="ml-2 h-7 w-7 items-center justify-center rounded-full border border-slate-700 bg-slate-900"
          hitSlop={8}
        >
          <Ionicons name="close" size={14} color="#cbd5e1" />
        </Pressable>
      ) : null}
    </View>
  );
}
