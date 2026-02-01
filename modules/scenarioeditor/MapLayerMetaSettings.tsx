"use client";

import React, { useState, useEffect } from "react";

// Types
import type { ScenarioMapLayer } from "@/types/scenarioGeoModels";
import type { ScenarioMapLayerUpdate } from "@/types/internalModels";

// Utils & Composables
import { getChangedValues } from "@/utils";
import { useMapLayerInfo } from "@/hooks/geoMapLayers";

// Components
import BaseButton from "@/components/BaseButton";
import DescriptionItem from "@/components/DescriptionItem";
import MapLayerMetaSettingsForm from "@/modules/scenarioeditor/MapLayerMetaSettingsForm";

interface MapLayerMetaSettingsProps {
  layer: ScenarioMapLayer;
  onUpdate: (diff: ScenarioMapLayerUpdate) => void;
  onAction: (action: string) => void;
}

export default function MapLayerMetaSettings({
  layer,
  onUpdate,
  onAction,
}: MapLayerMetaSettingsProps) {
  // --- Local State ---
  const [editMode, setEditMode] = useState(layer._isNew ?? false);

  // --- Hooks ---
  const { status, isInitialized, layerTypeLabel } = useMapLayerInfo(layer);

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
  }, [layer.id, layer._isNew]); // Dùng layer.id làm dependency để track sự thay đổi instance

  // --- Handlers ---
  function updateData(formData: ScenarioMapLayerUpdate) {
    const diff = getChangedValues({ ...formData }, layer);
    onUpdate(diff);
    setEditMode(false);
  }

  return (
    <section className="mt-2">
      {editMode ? (
        <MapLayerMetaSettingsForm
          key={layer.id}
          layer={layer}
          onCancel={() => setEditMode(false)}
          onUpdate={updateData}
        />
      ) : (
        <div className="space-y-4">
          
          
          <DescriptionItem label="Description">
            <p className="whitespace-pre-wrap">{layer.description || "Not set"}</p>
          </DescriptionItem>

          {layer.externalUrl && (
            <DescriptionItem label="External URL" ddClass="truncate">
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-600 hover:text-blue-800"
                href={layer.externalUrl}
              >
                {layer.externalUrl}
              </a>
            </DescriptionItem>
          )}

          <footer className="mt-4 flex justify-end space-x-2 pb-1">
            <BaseButton small type="button" onClick={() => setEditMode(true)}>
              Edit
            </BaseButton>
          </footer>
        </div>
      )}
    </section>
  );
}