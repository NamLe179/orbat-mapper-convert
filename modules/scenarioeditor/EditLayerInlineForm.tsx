"use client";

import React, { useState } from "react";
import { type ScenarioLayerInstance } from "@/types/scenarioGeoModels";
import { type NScenarioLayer } from "@/types/internalModels";
import { formatDateString } from "@/geo/utils";

// Hooks & Contexts
import { useActiveScenario, useTimeModal } from "@/components/injects";

// Components (Giả định đã convert)
import InputGroup from "@/components/InputGroup";
import InlineFormPanel from "@/components/InlineFormPanel";
import BaseButton from "@/components/BaseButton";
import DescriptionItem from "@/components/DescriptionItem";
import PlainButton from "@/components/PlainButton";

interface EditLayerInlineFormProps {
  layer: ScenarioLayerInstance | NScenarioLayer;
  onClose?: () => void;
  onUpdate?: (layer: Partial<NScenarioLayer>) => void;
}

export default function EditLayerInlineForm({
  layer,
  onClose,
  onUpdate,
}: EditLayerInlineFormProps) {
  // --- Contexts ---
  const { time } = useActiveScenario();
  const { getModalTimestamp } = useTimeModal();

  // --- State ---
  const [formData, setFormData] = useState<Partial<NScenarioLayer>>({
    name: layer.name,
    visibleFromT: layer.visibleFromT,
    visibleUntilT: layer.visibleUntilT,
    _isNew: false,
  });

  // --- Handlers ---

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate?.({ ...formData });
    onClose?.();
  };

  async function doShowTimeModal(field: "visibleFromT" | "visibleUntilT") {
    // getModalTimestamp return Promise<number | undefined>
    const currentVal = formData[field];
    
    // Lưu ý: time.timeZone là string (vd: "UTC"), không phải Ref như Vue
    const newTimestamp = await getModalTimestamp(currentVal!, {
      timeZone: time.timeZone, 
      title: field === "visibleFromT" ? "Visible from" : "Visible until",
    });

    if (newTimestamp !== undefined) {
      setFormData((prev) => ({ ...prev, [field]: newTimestamp }));
    }
  }

  const clearTime = (field: "visibleFromT" | "visibleUntilT") => {
    setFormData((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <InlineFormPanel onClose={onClose} title="Edit layer">
      <form onSubmit={onFormSubmit} className="space-y-4">
        {/* Layer Name Input */}
        <InputGroup
          label="Layer name"
          value={formData.name || ""}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, name: e.target.value })
          }
          // Thay thế useFocusOnMount bằng autoFocus của React
          autoFocus 
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose?.();
          }}
        />

        {/* Visible From */}
        <DescriptionItem label="Visible from">
          {formatDateString(formData.visibleFromT, time.timeZone)}
          <PlainButton
            type="button"
            onClick={() => doShowTimeModal("visibleFromT")}
            className="ml-2"
          >
            Change
          </PlainButton>
          {formData.visibleFromT !== undefined && (
            <PlainButton type="button" onClick={() => clearTime("visibleFromT")}>
              X
            </PlainButton>
          )}
        </DescriptionItem>

        {/* Visible Until */}
        <DescriptionItem label="Visible until">
          {formatDateString(formData.visibleUntilT, time.timeZone)}
          <PlainButton
            type="button"
            onClick={() => doShowTimeModal("visibleUntilT")}
            className="ml-2"
          >
            Change
          </PlainButton>
          {formData.visibleUntilT !== undefined && (
            <PlainButton type="button" onClick={() => clearTime("visibleUntilT")}>
              X
            </PlainButton>
          )}
        </DescriptionItem>

        {/* Action Buttons */}
        <div className="my-4 flex items-center justify-end space-x-2">
          <BaseButton primary small type="submit">
            Save
          </BaseButton>
          <BaseButton small type="button" onClick={onClose}>
            Cancel
          </BaseButton>
        </div>
      </form>
    </InlineFormPanel>
  );
}