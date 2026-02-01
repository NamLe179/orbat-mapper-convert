"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toLonLat } from "ol/proj";

// Types
import type {
  ScenarioTileJSONLayer,
  ScenarioXYZLayer,
} from "@/types/scenarioGeoModels";
import { type ScenarioImageLayerUpdate } from "@/types/internalModels";

// Utils
import { getChangedValues, sanitizeHTML } from "@/utils";

// Components
import InputGroup from "@/components/InputGroup";
import BaseButton from "@/components/BaseButton";
import TextAreaGroup from "@/components/TextAreaGroup";
import { Button } from "@/components/ui/button";

interface TileMapLayerSettingsFormProps {
  layer: ScenarioTileJSONLayer | ScenarioXYZLayer | ScenarioImageLayerUpdate;
  onUpdate?: (data: any) => void;
  onCancel?: () => void;
  onAction?: (action: string) => void;
}

export default function TileMapLayerSettingsForm({
  layer,
  onUpdate,
  onCancel,
}: TileMapLayerSettingsFormProps) {
  // --- State ---
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState("");
  
  const [formData, setFormData] = useState({
    url: layer.url || "",
    attributions: layer.attributions || "",
    _isNew: false,
  });

  // --- Helpers ---
  const toggleAdvanced = () => setShowAdvanced((prev) => !prev);

  // --- Effects (Sync Prop to State) ---
  useEffect(() => {
    setFormData({
      url: layer.url || "",
      attributions: layer.attributions || "",
      _isNew: false,
    });
  }, [layer]);

  // --- Computed ---
  const urlLabel = useMemo(() => {
    if (layer.type === "TileJSONLayer") {
      return "TileJSON URL";
    } else if (layer.type === "ImageLayer") {
      return "Image URL";
    } else {
      return "XYZ tile URL template";
    }
  }, [layer.type]);

  // --- Logic Functions ---

  function isValidJSONString(str: string) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  function loadAdvanced() {
    const s = advancedSettings;
    const isValidData =
      s.includes("imageCenter") && s.includes("imageScale") && s.includes("imageRotate");

    if (isValidData) {
      // Logic xử lý JSON lỏng lẻo (có hoặc không có ngoặc nhọn bao quanh)
      const rawData = isValidJSONString(s)
        ? JSON.parse(s)
        : isValidJSONString(`{${s}}`)
        ? JSON.parse(`{${s}}`)
        : null;

      if (rawData && onUpdate) {
        const { imageCenter, imageScale, imageRotate, url = "" } = rawData;
        
        const data: ScenarioImageLayerUpdate = {
          // @ts-ignore: imageCenter từ JSON có thể là mảng số, toLonLat xử lý việc này
          imageCenter: toLonLat(imageCenter),
          imageRotate,
          imageScale,
        };

        if (url) {
          data.url = url.replace(" ", "");
        }
        
        onUpdate(data);
      }
    }
  }

  function updateData(e: React.FormEvent) {
    e.preventDefault();

    if (showAdvanced) {
      loadAdvanced();
      return;
    }

    if (onUpdate) {
      const diff = getChangedValues({ ...formData }, layer);
      if (diff.attributions) {
        diff.attributions = sanitizeHTML(diff.attributions);
      }
      onUpdate(diff);
    }
  }

  return (
    <form onSubmit={updateData} className="p-1">
      <div className="space-y-4">
        {!showAdvanced ? (
          <>
            <InputGroup
              label={urlLabel}
              type="text"
              value={formData.url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData({ ...formData, url: e.target.value })
              }
              required
              autoFocus // Thay thế useFocusOnMount
            />

            {(layer.type === "XYZLayer" || layer.type === "ImageLayer") && (
              <InputGroup
                label="Attributions"
                type="text"
                value={formData.attributions}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, attributions: e.target.value })
                }
              />
            )}

            {layer.type === "ImageLayer" && (
              <p className="flex justify-end">
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={toggleAdvanced}
                >
                  + Add image from Map-georeferencer
                </Button>
              </p>
            )}
          </>
        ) : (
          <div>
            <TextAreaGroup
              label="Map-georeferencer settings"
              value={advancedSettings}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setAdvancedSettings(e.target.value)
              }
              description="Paste map settings from Map-georeferencer here."
            />
            <div className="prose prose-sm dark:prose-invert mt-4">
              <p>
                <a
                  target="_blank"
                  href="http://viglino.github.io/Map-georeferencer/"
                  rel="noopener noreferrer"
                >
                  Map-georeferencer
                </a>{" "}
                is an online tool for georeferencing images using control points.
                You can get the transformation parameters by clicking the{" "}
                <span className="rounded border border-gray-600 bg-blue-100 p-1">
                  φ
                </span>{" "}
                button at the bottom of the screen and copy the settings from the
                dialog.
              </p>
            </div>
          </div>
        )}
      </div>

      <footer className="mt-4 flex justify-end space-x-2">
        <BaseButton small primary type="submit">
          Update
        </BaseButton>
        <BaseButton small type="button" onClick={onCancel}>
          Cancel
        </BaseButton>
      </footer>
    </form>
  );
}