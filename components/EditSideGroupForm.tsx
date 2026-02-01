"use client";

import React, { useState, useMemo, useEffect } from "react";

// Types & Context
import { type EntityId } from "@/types/base";
import { type UnitSymbolOptions } from "@/types/scenarioModels";
import { useActiveScenario } from "@/components/injects";

// Components
import InputGroup from "./InputGroup";
import PlainButton from "./PlainButton";
import PrimaryButton from "./PrimaryButton";
import InlineFormPanel from "./InlineFormPanel";
import SymbolFillColorSelect from "@/components/SymbolFillColorSelect";

// Helpers
import { useFocusOnMount } from "./helpers";

interface FormState {
  name: string;
  symbolOptions: UnitSymbolOptions;
}

interface Props {
  sideGroupId: EntityId;
  onClose: () => void;
}

export default function EditSideGroupForm({ sideGroupId, onClose }: Props) {
  // --- Context & Scenario Data ---
  const { store, unitActions, helpers } = useActiveScenario();
  const { focusId } = useFocusOnMount();

  // --- Local State ---
  const [form, setForm] = useState<FormState>({
    name: "Units",
    symbolOptions: {},
  });

  // --- Computed (useMemo) ---
  const sideGroup = useMemo(() => 
    sideGroupId ? store?.state.sideGroupMap[sideGroupId] : undefined,
    [sideGroupId, store?.state.sideGroupMap]
  );

  const side = useMemo(() => 
    sideGroup?._pid ? helpers.getSideById(sideGroup._pid) : undefined,
    [sideGroup?._pid, helpers]
  );

  // --- Watchers (useEffect) ---
  useEffect(() => {
    if (sideGroupId && sideGroup) {
      const { name, symbolOptions = {} } = sideGroup;
      setForm({ 
        name, 
        symbolOptions: { ...symbolOptions } 
      });
    }
  }, [sideGroupId, sideGroup]);

  // --- Handlers ---
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    unitActions.updateSideGroup(sideGroupId, { ...form });
    onClose();
  };

  const updateFillColor = (color: string | null) => {
    setForm((prev) => ({
      ...prev,
      symbolOptions: { ...prev.symbolOptions, fillColor: color || undefined },
    }));
  };

  return (
    <InlineFormPanel onClose={onClose} title="Edit group info">
      <form onSubmit={onFormSubmit} className="space-y-4">
        <InputGroup
          label="Group name"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          id={focusId}
        />

        

        <SymbolFillColorSelect
          value={form.symbolOptions.fillColor}
          onChange={updateFillColor}
          defaultFillColor={side?.symbolOptions?.fillColor}
          sid={side?.standardIdentity}
        />

        <div className="flex justify-end space-x-2">
          <PrimaryButton type="submit">Save</PrimaryButton>
          <PlainButton type="button" onClick={onClose}>
            Cancel
          </PlainButton>
        </div>
      </form>
    </InlineFormPanel>
  );
}