"use client";

import React, { useMemo, useEffect } from "react";
import { klona } from "klona";

// Types
import type { EUnitSupply, NUnitSupply } from "@/types/internalModels";

// Hooks & Utils
import { useActiveScenario } from "@/components/injects";
import { useForm } from "@/hooks/forms"; // Giả định hook này đã được convert
import { sortBy } from "@/utils";

// Components
import InputGroup from "@/components/InputGroup";
import SimpleSelect from "@/components/SimpleSelect";
import FormFooter from "@/modules/scenarioeditor/FormFooter";

interface Props {
  heading?: string;
  usedSupplies?: EUnitSupply[];
  value?: NUnitSupply;
  onCancel: () => void;
  onSubmit: (form: NUnitSupply) => void;
}

export default function AddUnitSupplyForm({
  heading = "Add unit supply",
  usedSupplies = [],
  value,
  onCancel,
  onSubmit: emitSubmit,
}: Props) {
  // --- Context ---
  const { store } = useActiveScenario();
  const { supplyCategoryMap } = store.state;

  // --- Form Logic ---
  const { form, setForm, handleSubmit } = useForm<NUnitSupply>(
    {
      id: "",
      count: 1,
    },
    value
  );

  // --- Computed: Supply Categories (useMemo) ---
  const supplyCategories = useMemo(() => {
    const usedIds = usedSupplies.map((i) => i.id);
    
    const sc = Object.values(supplyCategoryMap || {})
      .filter((v: any) => !usedIds.includes(v.id))
      .map((sc: any) => ({
        label: `${sc.name}`,
        value: sc.id,
      }));

    return sortBy(sc, "label");
  }, [supplyCategoryMap, usedSupplies]);

  // --- Watch Logic (useEffect) ---
  // Tương đương với watch(supplyCategories, ..., { immediate: true })
  useEffect(() => {
    if (supplyCategories.length > 0 && !form.id) {
      setForm({ ...form, id: supplyCategories[0].value });
    }
  }, [supplyCategories, form.id]);

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

      

      {supplyCategories.length > 0 ? (
        <section className="mt-4 grid grid-cols-2 gap-6">
          <SimpleSelect
            label="Supply category"
            value={form.id}
            items={supplyCategories}
            onValueChange={(val: string | number | null) => setForm({ ...form, id: String(val || "") })}
          />
          <InputGroup
            label="Initial value"
            type="number"
            value={form.count}
            onChange={(e) => setForm({ ...form, count: Number(e.target.value) })}
          />
        </section>
      ) : (
        <section className="mt-4">
          <p className="text-muted-foreground text-sm">No more supplies to add</p>
        </section>
      )}

      <FormFooter onCancel={onCancel} submitLabel="Add" />
    </form>
  );
}