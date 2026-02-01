"use client";

import React, { useState, useEffect } from "react";
import type { ScenarioMapLayer } from "@/types/scenarioGeoModels";
import { getChangedValues } from "@/utils";

import InputGroup from "@/components/InputGroup";
import TextAreaGroup from "@/components/TextAreaGroup";
import BaseButton from "@/components/BaseButton";

interface MapLayerMetaSettingsFormProps {
  layer: ScenarioMapLayer;
  onUpdate?: (diff: Partial<ScenarioMapLayer>) => void;
  onCancel?: () => void;
  // onAction prop không thấy dùng trong code Vue gốc nên có thể bỏ qua hoặc giữ lại nếu cần
}

export default function MapLayerMetaSettingsForm({
  layer,
  onUpdate,
  onCancel,
}: MapLayerMetaSettingsFormProps) {
  // --- State ---
  const [formData, setFormData] = useState({
    description: layer.description || "",
    externalUrl: layer.externalUrl || "",
  });

  // --- Watcher (Sync prop to state) ---
  // Tương đương với watch(() => props.layer, ...)
  useEffect(() => {
    setFormData({
      description: layer.description || "",
      externalUrl: layer.externalUrl || "",
    });
  }, [layer]);

  // --- Computed ---
  // const status = layer._status; // Không dùng trong template nên comment lại hoặc bỏ

  // --- Handlers ---
  const updateData = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tính toán diff giữa form mới và layer cũ
    const diff = getChangedValues({ ...formData }, layer);
    
    if (onUpdate) {
      onUpdate(diff);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={updateData} className="p-1">
      <div className="space-y-4">
        {/* Description Field */}
        <TextAreaGroup
          label="Description"
          value={formData.description}
          // Giả định TextAreaGroup trả về ChangeEvent
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
            handleChange("description", e.target.value)
          }
          // useFocusOnMount replacement
          autoFocus
        />

        {/* External URL Field */}
        <InputGroup
          label="External URL"
          type="text"
          value={formData.externalUrl}
          // Giả định InputGroup trả về ChangeEvent
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            handleChange("externalUrl", e.target.value)
          }
        />
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