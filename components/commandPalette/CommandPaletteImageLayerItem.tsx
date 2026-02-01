"use client";

import React, { useMemo } from "react";
import { type MapLayerSearchResult } from "@/components/types";
import { type ScenarioMapLayer } from "@/types/scenarioGeoModels";
import { getMapLayerIcon } from "@/modules/scenarioeditor/scenarioMapLayers";

interface CommandPaletteImageLayerItemProps {
  item: MapLayerSearchResult;
  active?: boolean;
}

export default function CommandPaletteImageLayerItem({ 
  item, 
  active 
}: CommandPaletteImageLayerItemProps) {
  
  // Tương đương computed trong Vue
  const IconComponent = useMemo(() => {
    return getMapLayerIcon(item as unknown as ScenarioMapLayer);
  }, [item]);

  return (
    <>
      <div className="flex w-7 justify-center">
        {/* Render Dynamic Icon */}
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