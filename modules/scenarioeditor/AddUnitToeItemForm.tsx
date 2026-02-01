"use client";

import React, { useMemo, useEffect } from "react";
import { klona } from "klona";

// Types
import type {
  EUnitEquipment,
  EUnitPersonnel,
  NUnitEquipment,
  NUnitPersonnel,
  ToeMode,
} from "@/types/internalModels";

// Hooks & Utils
import { useActiveScenario } from "@/components/injects";
import { useForm } from "@/hooks/forms"; // Giả định hook đã convert
import { sortBy } from "@/utils";

// Components
import InputGroup from "@/components/InputGroup";
import SimpleSelect from "@/components/SimpleSelect";
import FormFooter from "@/modules/scenarioeditor/FormFooter";

type FormValues = NUnitEquipment | NUnitPersonnel;

interface Props {
  heading?: string;
  usedItems?: EUnitEquipment[] | EUnitPersonnel[];
  mode: ToeMode;
  value?: FormValues;
  onCancel: () => void;
  onSubmit: (form: FormValues) => void;
}

export default function AddUnitToeItemForm({
  heading = "Add item",
  usedItems = [],
  mode,
  value,
  onCancel,
  onSubmit: emitSubmit,
}: Props) {
  // --- Context ---
  const { store } = useActiveScenario();

  // --- Form Logic ---
  const { form, setForm, handleSubmit } = useForm<FormValues>(
    {
      id: "",
      count: 1,
    },
    value
  );

  // --- Computed: Item Categories (useMemo) ---
  const itemCategories = useMemo(() => {
    const usedIds = usedItems.map((i) => i.id);
    const sourceMap = mode === "equipment" ? store.state.equipmentMap : store.state.personnelMap;
    
    const sc = Object.values(sourceMap || {})
      .filter((v: any) => !usedIds.includes(v.id))
      .map((ic: any) => ({
        label: ic.name,
        value: ic.id,
      }));

    return sortBy(sc, "label");
  }, [mode, store.state.equipmentMap, store.state.personnelMap, usedItems]);

  // --- Watch Logic (useEffect) ---
  // Tương đương watch(itemCategories, ..., { immediate: true })
  useEffect(() => {
    if (itemCategories.length > 0 && !form.id) {
      setForm({ ...form, id: itemCategories[0].value });
    }
  }, [itemCategories, form.id]);

  // --- Handlers ---
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
    emitSubmit(klona(form));
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <form onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold">{heading}</h3>

      

      {itemCategories.length > 0 ? (
        <section className="mt-4 grid grid-cols-2 gap-6">
          <SimpleSelect
            label={mode === "equipment" ? "Equipment type" : "Personnel type"}
            value={form.id}
            items={itemCategories}
            onValueChange={(val: string | number | null) => setForm({ ...form, id: String(val || "") })}
          />
          <InputGroup
            label="Initial count"
            type="number"
            value={form.count}
            onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
          />
        </section>
      ) : (
        <section className="mt-4">
          <p className="text-muted-foreground text-sm">No items to add</p>
        </section>
      )}

      <FormFooter onCancel={onCancel} submitLabel="Add" />
    </form>
  );
}