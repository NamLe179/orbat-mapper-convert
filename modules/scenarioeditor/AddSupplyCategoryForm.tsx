"use client";

import React, { useMemo, useEffect } from "react";
import { klona } from "klona";

// Stores & Hooks
import { useActiveScenario } from "@/components/injects";
import { useForm } from "@/hooks/forms"; // Giả định hook đã convert

// Components
import InputGroup from "@/components/InputGroup";
import SimpleSelect from "@/components/SimpleSelect";
import FormFooter from "@/modules/scenarioeditor/FormFooter";

interface FormValues {
  name: string;
  description?: string;
  supplyClass?: string;
  uom?: string;
}

interface Props {
  heading?: string;
  showNextToggle?: boolean;
  value?: FormValues;
  onCancel: () => void;
  onSubmit: (form: FormValues) => void;
}

export default function AddSupplyCategoryForm({
  heading = "Add new supply category",
  showNextToggle = false,
  value,
  onCancel,
  onSubmit: emitSubmit,
}: Props) {
  // --- Context ---
  const { store } = useActiveScenario();

  // --- Form State ---
  const { form, setForm, handleSubmit } = useForm<FormValues>(
    {
      name: "",
      description: "",
      supplyClass: "",
      uom: "",
    },
    value
  );

  // --- Computed (useMemo) ---
  const supplyClasses = useMemo(() => {
    const classes = Object.values(store.state.supplyClassMap || {}).map((sc: any) => ({
      label: sc.description ? `${sc.name} (${sc.description})` : sc.name,
      value: sc.id,
    }));
    return [{ label: "Unspecified", value: "" }, ...classes];
  }, [store.state.supplyClassMap]);

  const supplyUnits = useMemo(() => {
    const units = Object.values(store.state.supplyUomMap || {}).map((sc: any) => ({
      label: sc.code ? `${sc.name} (${sc.code})` : sc.name,
      value: sc.id,
    }));
    return [{ label: "Unspecified", value: "" }, ...units];
  }, [store.state.supplyUomMap]);

  // --- Handlers ---
  const onSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    // Chống submit đúp khi nhấn Enter trong input
    if (e && (e as any).nativeEvent instanceof KeyboardEvent && e.target instanceof HTMLInputElement) {
      return;
    }

    if (e && "preventDefault" in e) e.preventDefault();

    handleSubmit();
    emitSubmit(klona(form));
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) onSubmit();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [form, onCancel]);

  return (
    <form onSubmit={onSubmit}>
      <h3 className="text-sm font-semibold">{heading}</h3>
      
      
      
      <section className="mt-4 grid grid-cols-2 gap-6">
        <InputGroup
          autoFocus
          label="Name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <SimpleSelect
          label="Class"
          items={supplyClasses}
          value={form.supplyClass}
          onValueChange={(val: string | number | null) => setForm({ ...form, supplyClass: String(val || "") })}
        />

        <InputGroup
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />

        <SimpleSelect
          label="Unit of measure/issue"
          items={supplyUnits}
          value={form.uom}
          onValueChange={(val: string | number | null) => setForm({ ...form, uom: String(val || "") })}
        />
      </section>

      <FormFooter onCancel={onCancel} showNextToggle={showNextToggle} />
    </form>
  );
}