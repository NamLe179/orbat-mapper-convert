"use client";

import React, { useState, useEffect } from "react";
import { eventBus } from "@/lib/eventBus"; // Use eventBus directly
import { imageLayerAction } from "@/components/eventKeys";
import { getChangedValues } from "@/utils";

// Types
import type { ScenarioImageLayer } from "@/types/scenarioGeoModels";
import type {
  ScenarioImageLayerUpdate,
  ScenarioMapLayerUpdate,
} from "@/types/internalModels";
import { type LayerUpdateOptions, useMapLayerInfo } from "@/hooks/geoMapLayers";

// Components
import DescriptionItem from "@/components/DescriptionItem";
import BaseButton from "@/components/BaseButton";
import TileMapLayerSettingsForm from "@/modules/scenarioeditor/TileMapLayerSettingsForm";

interface ImageMapLayerSettingsProps {
  layer: ScenarioImageLayer;
  onUpdate: (d: ScenarioMapLayerUpdate, options?: LayerUpdateOptions) => void;
}

export default function ImageMapLayerSettings({
  layer,
  onUpdate,
}: ImageMapLayerSettingsProps) {
  // --- Local State ---
  const [editMode, setEditMode] = useState(
    (layer._isNew && !layer._isTemporary) ?? false
  );

  // --- Hooks ---
  const { layerTypeLabel, status, isInitialized } = useMapLayerInfo(layer);

  // --- Lifecycle & Watchers ---

  // Tương đương watch(status) và onMounted
  useEffect(() => {
    if (status === "initialized") {
      eventBus.emit(imageLayerAction, { action: "zoom", id: layer.id });
      eventBus.emit(imageLayerAction, { action: "startTransform", id: layer.id });
    }
  }, [status, layer.id]);

  // Tương đương onMounted (initialization check) và onUnmounted cleanup
  useEffect(() => {
    if (isInitialized) {
      eventBus.emit(imageLayerAction, { action: "startTransform", id: layer.id });
    }

    return () => {
      // Cleanup: Tương đương onUnmounted
      eventBus.emit(imageLayerAction, { action: "endTransform", id: layer.id });
    };
  }, [isInitialized, layer.id]);

  // Tương đương watch(() => props.layer.id)
  useEffect(() => {
    eventBus.emit(imageLayerAction, { action: "endTransform", id: layer.id });
    eventBus.emit(imageLayerAction, { action: "startTransform", id: layer.id });
  }, [layer.id]);

  // --- Handlers ---
  function handleUpdate(formData: ScenarioImageLayerUpdate) {
    const diff = getChangedValues({ ...formData }, layer);
    onUpdate(diff);
    setEditMode(false);
  }

  return (
    <section>
      <header className="flex justify-end">
        {/* Class badge thay bằng Tailwind nếu chưa định nghĩa */}
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
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
          <DescriptionItem label="Image URL">
            <span className="break-all">{layer.url || "Not set"}</span>
          </DescriptionItem>

          <DescriptionItem label="Attributions" className="mt-4">
            <span className="break-all">{layer.attributions || "Not set"}</span>
          </DescriptionItem>

          <footer className="mt-4 flex justify-end space-x-2 pb-1">
            <BaseButton small type="button" onClick={() => setEditMode(true)}>
              Edit
            </BaseButton>
          </footer>
        </div>
      )}

      {!isInitialized && (
        <p className="text-muted-foreground mt-2 text-sm">
          This layer has not been initialized yet.
        </p>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-red-600">
          Failed to load layer.
        </p>
      )}
    </section>
  );
}