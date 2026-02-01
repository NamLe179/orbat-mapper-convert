"use client";

import React, { useEffect, useMemo, useCallback } from "react";
import { klona } from "klona";

// Types
import type { EUnitSupply, NUnitSupply } from "@/types/internalModels";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useForm } from "@/hooks/forms";
import { useSuppliesEditStore } from "@/stores/toeStore";
import { useTimeFormatters } from "@/stores/timeFormatStore";

// Components
import InputGroup from "@/components/InputGroup";
import InputCheckbox from "@/components/InputCheckbox";
import FormFooter from "@/modules/scenarioeditor/FormFooter";

interface ModifyUnitSupplyFormProps {
  itemData: EUnitSupply;
  onCancel: () => void;
  onDiffOnHand: (id: string, form: NUnitSupply) => void;
  onUpdateOnHand: (id: string, form: NUnitSupply) => void;
  onUpdateCount: (id: string, form: NUnitSupply) => void;
}

export default function ModifyUnitSupplyForm({
  itemData,
  onCancel,
  onDiffOnHand,
  onUpdateOnHand,
  onUpdateCount,
}: ModifyUnitSupplyFormProps) {
  // --- Context & Stores ---
  const { time } = useActiveScenario();
  const editStore = useSuppliesEditStore(); // Giả định Zustand store
  const fmt = useTimeFormatters();

  // --- Form Logic ---
  const { form, setForm, handleSubmit } = useForm<NUnitSupply>({
    id: itemData.id,
    count: itemData.count,
    onHand: itemData.onHand,
  });

  // --- Watchers (Tương đương watch trong Vue) ---
  
  // Đồng bộ props.itemData vào form khi thay đổi
  useEffect(() => {
    setForm(klona(itemData));
  }, [itemData]);

  // Reset form khi thay đổi mode (On-hand mode hoặc Diff mode)
  useEffect(() => {
    setForm(klona(itemData));
  }, [editStore.isOnHandMode, editStore.isDiffMode, itemData]);

  // --- Computed ---
  const formattedTime = useMemo(() => 
    fmt.scenarioFormatter.format(Number(time.getScenarioTime()))
  , [fmt.scenarioFormatter, time]);

  // --- Handlers ---
  const onSubmit = useCallback((e?: React.FormEvent | React.KeyboardEvent) => {
    // Chống submit đúp khi nhấn Enter trong input
    if (e && (e as any).nativeEvent instanceof KeyboardEvent && e.target instanceof HTMLInputElement) {
      return;
    }

    if (e && 'preventDefault' in e) e.preventDefault();

    handleSubmit();

    if (editStore.isOnHandMode) {
      if (editStore.isDiffMode) {
        onDiffOnHand(form.id, {
          id: form.id,
          onHand: editStore.diffValue,
          count: -1,
        });
      } else {
        onUpdateOnHand(form.id, {
          id: form.id,
          onHand: form.onHand,
          count: -1,
        });
      }
    } else {
      onUpdateCount(form.id, { id: form.id, count: form.count });
    }
  }, [editStore, form, handleSubmit, onDiffOnHand, onUpdateCount, onUpdateOnHand]);

  // --- Keyboard Shortcuts (Tương đương @keyup modifiers) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSubmit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, onSubmit]);

  return (
    <form onSubmit={onSubmit}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{itemData.name}</h3>
        <div className="flex items-center gap-1">
          {itemData.supplyClass && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
              {itemData.supplyClass}
            </span>
          )}
          {itemData.uom && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
              {itemData.uom}
            </span>
          )}
        </div>
      </div>

      

      <div className="mt-4">
        <InputCheckbox
          checked={editStore.isOnHandMode}
          onCheckedChange={(val) => editStore.setIsOnHandMode(!!val)}
          label={`Edit supplies at ${formattedTime}`}
          description=""
        />
      </div>

      <section className="mt-4 grid grid-cols-2 items-start gap-6">
        <InputGroup
          label="Initial value"
          type="number"
          disabled={editStore.isOnHandMode}
          value={form.count}
          onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
          autoFocus={!editStore.isOnHandMode}
        />
        
        <InputGroup
          label="Available / On hand"
          type="number"
          disabled={!editStore.isOnHandMode || editStore.isDiffMode}
          value={form.onHand}
          onChange={(e) => setForm({ ...form, onHand: Number(e.target.value) })}
          min="0"
          autoFocus={editStore.isOnHandMode && !editStore.isDiffMode}
        />

        {editStore.isOnHandMode && (
          <>
            <InputCheckbox
              label="Add/subtract mode"
              description=""
              checked={editStore.isDiffMode}
              onCheckedChange={(val) => editStore.setIsDiffMode(!!val)}
            />
            {editStore.isDiffMode && (
              <InputGroup
                label="Add/subtract"
                type="number"
                autoFocus={editStore.isDiffMode}
                value={editStore.diffValue}
                onChange={(e) => editStore.setDiffValue(Number(e.target.value))}
              />
            )}
          </>
        )}
      </section>

      <FormFooter onCancel={onCancel} showNextToggle />
    </form>
  );
}