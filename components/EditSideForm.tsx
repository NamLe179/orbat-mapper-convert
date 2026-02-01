"use client";

import React, { useState, useMemo, useEffect } from "react";

// Types & Context
import { type SideUpdate } from "@/types/internalModels";
import { useActiveScenario } from "@/components/injects";

// UI Components
import { Button } from "@/components/ui/button";
import InputGroup from "./InputGroup";
import InlineFormPanel from "./InlineFormPanel";
import StandardIdentitySelect from "@/components/StandardIdentitySelect";

// Helpers
import { useFocusOnMount } from "./helpers";

interface FormState {
  name: string;
  standardIdentity: string;
  symbolOptions: {
    fillColor?: string;
  };
}

interface EditSideFormProps {
  sideId: string;
  onClose: () => void;
}

export default function EditSideForm({ sideId, onClose }: EditSideFormProps) {
  // --- Context & Actions ---
  const { store, unitActions } = useActiveScenario();
  const { focusId } = useFocusOnMount();

  // --- Local State ---
  const [form, setForm] = useState<FormState>({
    name: "New side",
    standardIdentity: "3",
    symbolOptions: {},
  });

  // --- Computed (useMemo) ---
  const side = useMemo(() => 
    store?.state.sideMap[sideId], 
    [sideId, store?.state.sideMap]
  );

  // --- Watcher (useEffect) ---
  // Tương đương watch(sideId, ..., { immediate: true })
  useEffect(() => {
    if (sideId && side) {
      const { name, standardIdentity, symbolOptions = {} } = side;
      setForm({
        name,
        standardIdentity,
        symbolOptions: { ...symbolOptions },
      });
    }
  }, [sideId, side]);

  // --- Handlers ---
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unitActions.updateSide(sideId, { ...form } as SideUpdate);
    onClose();
  };

  const updateFillColor = (color: string | null) => {
    setForm((prev) => ({
      ...prev,
      symbolOptions: { 
        ...prev.symbolOptions, 
        fillColor: color || undefined 
      },
    }));
  };

  return (
    <InlineFormPanel onClose={onClose} title="Edit side info">
      <form onSubmit={onFormSubmit} className="space-y-4">
        
        <InputGroup
          label="Side name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          id={focusId}
        />

        

        <StandardIdentitySelect
          value={form.standardIdentity}
          onValueChange={(val) => setForm((prev) => ({ ...prev, standardIdentity: val }))}
          fillColor={form.symbolOptions.fillColor || null}
          onFillColorChange={updateFillColor}
          compact
        />

        <div className="flex justify-end space-x-2">
          <Button size="sm" type="submit">
            Save
          </Button>
          <Button variant="outline" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </InlineFormPanel>
  );
}