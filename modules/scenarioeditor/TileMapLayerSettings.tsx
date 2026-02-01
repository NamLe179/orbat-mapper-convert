"use client";

import React, { useState, useMemo, useEffect } from "react";

// Types
import type { ScenarioTileJSONLayer, ScenarioXYZLayer } from "@/types/scenarioGeoModels";
import type {
  ScenarioTileJSONLayerUpdate,
  ScenarioXYZLayerUpdate,
} from "@/types/internalModels";

// Utils & Hooks
import { getChangedValues } from "@/utils";
import { useMapLayerInfo } from "@/hooks/geoMapLayers";

// Components
import TileMapLayerSettingsForm from "@/modules/scenarioeditor/TileMapLayerSettingsForm";
import DescriptionItem from "@/components/DescriptionItem";
import { Button } from "@/components/ui/button";

interface TileMapLayerSettingsProps {
  layer: ScenarioTileJSONLayer | ScenarioXYZLayer;
  onUpdate: (diff: any) => void;
  onAction: (action: string) => void;
}

export default function TileMapLayerSettings({
  layer,
  onUpdate,
  onAction,
}: TileMapLayerSettingsProps) {
  // --- Local State ---
  const [editMode, setEditMode] = useState(layer._isNew ?? false);

  // --- Map Layer Info ---
  const { status, isInitialized, layerTypeLabel } = useMapLayerInfo(layer);

  // --- Computed (useMemo) ---
  const urlLabel = useMemo(() => {
    return layer.type === "TileJSONLayer" ? "TileJSON URL" : "XYZ tile URL template";
  }, [layer.type]);

  // --- Watchers (useEffect) ---

  // Tương đương watch(status)
  useEffect(() => {
    if (status === "initialized") {
      onAction("zoom");
    }
  }, [status, onAction]);

  // Tương đương watch(() => props.layer, ..., { immediate: true })
  useEffect(() => {
    setEditMode(layer._isNew ?? false);
  }, [layer.id, layer._isNew]);

  // --- Handlers ---
  const handleUpdate = (formData: ScenarioTileJSONLayerUpdate | ScenarioXYZLayerUpdate) => {
    const diff = getChangedValues({ ...formData }, layer);
    onUpdate(diff);
    setEditMode(false);
  };

  return (
    <section>
      <header className="flex justify-end">
        {/* Class badge giả định đã có trong globals.css hoặc dùng Tailwind trực tiếp */}
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
          {layerTypeLabel}
        </span>
      </header>

      

      {editMode ? (
        <TileMapLayerSettingsForm
          key={layer.id}
          layer={layer}
          onCancel={() => setEditMode(false)}
          onUpdate={handleUpdate}
        />
      ) : (
        <div>
          <DescriptionItem label={urlLabel} ddClass="truncate">
            {layer.url || "Not set"}
          </DescriptionItem>
          
          <footer className="mt-4 flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              Edit
            </Button>
          </footer>
        </div>
      )}

      {!isInitialized && (
        <p className="text-muted-foreground mt-2 text-sm italic">
          This layer has not been initialized yet.
        </p>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-red-600 font-medium">
          Failed to load layer.
        </p>
      )}
    </section>
  );
}