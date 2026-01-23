import React from "react";
import { View } from "react-native";

import { type PalDetail } from "@/lib/palworld/pal/paldbDetails";
import PalHeroGallery from "@/components/Palworld/PalworldDetails/PalImageDropHero";
import PaldeckEntryStrip from "@/components/Palworld/PalworldDetails/PalEntryStrip";

export type PalDetailHeaderSectionProps = {
  data: PalDetail;
  dexId: string; // "5" or "5B"
  subtitle: string;
  accent: string;
};

export const PalDetailHeaderSection: React.FC<PalDetailHeaderSectionProps> = ({
  data,
  dexId,
  subtitle,
  accent,
}) => {
  const key = String(dexId ?? "").trim();

  return (
    <View className="mb-1">
      <PalHeroGallery data={data} subtitle={subtitle} accent={accent} />
      {key ? <PaldeckEntryStrip dexId={key} /> : null}
    </View>
  );
};

export default PalDetailHeaderSection;
