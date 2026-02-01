"use client";

import React, { useMemo } from "react";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useBaseLayersStore } from "@/stores/baseLayersStore";

// Components
import SimpleSelect from "@/components/SimpleSelect";
import { type SelectItem } from "@/components/types";

export default function ScenarioMapSettings() {
  // --- Hooks ---
  const { store } = useActiveScenario();
  const mapSettings = useMapSettingsStore();
  const baseLayersStore = useBaseLayersStore();

  // --- Computed (useMemo) ---
  const baseMapItems = useMemo((): SelectItem[] => {
    const layers = baseLayersStore.layers.map((l: any) => ({
      label: l.title,
      value: l.name,
    }));
    return [...layers, { label: "No base map", value: "None" }];
  }, [baseLayersStore.layers]);

  // --- Logic (Getter) ---
  // Giả định store.state là reactive object (nếu dùng Valtio/MobX) hoặc trigger re-render
  const currentBaseMapId = store.state.mapSettings.baseMapId;

  // --- Logic (Setter) ---
  const handleBaseMapChange = (value: string | number | null) => {
    if (!value || typeof value !== 'string') return;
    
    // 1. Update Scenario Store
    store.update((s: any) => {
      s.mapSettings.baseMapId = value;
      
      // Update Map Settings Store
      // Lưu ý: Trong React nếu store immutable (Zustand/Redux), 
      // ta nên gọi setter: mapSettings.setBaseLayerName(value)
      // Nếu port trực tiếp logic Vue (mutable), dòng dưới có thể giữ nguyên nếu store hỗ trợ.
      if ('setBaseLayerName' in mapSettings) {
         (mapSettings as any).setBaseLayerName(value);
      } else {
         (mapSettings as any).baseLayerName = value;
      }
    });

    // 2. Select Layer in BaseLayers Store
    baseLayersStore.selectLayer(value);
  };

  return (
    <div>
      <SimpleSelect
        label="Default base map"
        items={baseMapItems}
        value={currentBaseMapId}
        onValueChange={handleBaseMapChange}
      />
    </div>
  );
}