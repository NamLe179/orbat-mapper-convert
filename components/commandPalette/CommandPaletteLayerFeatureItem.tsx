"use client";

import React from "react";
import { type LayerFeatureSearchResult } from "@/components/types";
import { getItemsIcon } from "@/modules/scenarioeditor/featureLayerUtils";

interface CommandPaletteLayerFeatureItemProps {
  item: LayerFeatureSearchResult;
}

export default function CommandPaletteLayerFeatureItem({ item }: CommandPaletteLayerFeatureItemProps) {
  // Lấy icon component dựa trên type
  // Giả định getItemsIcon trả về một React Component (vd: Lucide Icon)
  const IconComponent = getItemsIcon(item.type);

  return (
    <>
      <div className="flex w-7 justify-center">
        {IconComponent && (
          <IconComponent className="text-muted-foreground h-6 w-6" />
        )}
      </div>
      
      <p
        className="ml-3 flex-auto truncate"
        dangerouslySetInnerHTML={{
          __html: item.highlight ? item.highlight : item.name,
        }}
      />
    </>
  );
}