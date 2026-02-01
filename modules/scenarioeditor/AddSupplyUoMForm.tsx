"use client";

import React, { useEffect, useMemo } from "react";
import { klona } from "klona";

// Types
import type { UnitOfMeasure, UoMType } from "@/types/scenarioModels";
import { type SelectItem } from "@/components/types";

// Hooks & Utils
import { useForm } from "@/hooks/forms"; // Giả định hook này đã được convert sang React

// Components
import InputGroup from "@/components/InputGroup";
import SimpleSelect from "@/components/SimpleSelect";
import FormFooter from "@/modules/scenarioeditor/FormFooter";

interface FormValues extends UnitOfMeasure {
  id?: string;
}

interface AddSupplyUoMFormProps {
  heading?: string;
  modelValue?: FormValues;
  onCancel: () => void;
  onSubmit: (form: FormValues) => void;
}

export default function AddSupplyUoMForm({
  heading = "Add new supply category",
  modelValue,
  onCancel,
  onSubmit: emitSubmit,
}: AddSupplyUoMFormProps) {
  
  // --- Constants (Tương đương uomTypes trong Vue) ---
  const uomTypes: SelectItem<UoMType | "">[] = useMemo(() => [
    { label: "Unspecified", value: "" },
    { value: "quantity", label: "Quantity" },
    { value: "volume", label: "Volume" },
    { value: "weight", label: "Weight" },
    { value: "distance", label: "Distance" },
  ], []);

  // --- Form Logic ---
  const { form, setForm, handleSubmit } = useForm<FormValues>(
    {
      name: "",
      code: "",
      description: "",
      type: undefined, // Mặc định từ UnitOfMeasure type
    },
    modelValue // Khởi tạo nếu có dữ liệu truyền vào
  );

  // --- Handlers ---
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
    emitSubmit(klona(form));
  };

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

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
        
        <InputGroup
          label="Abbreviation"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        
        <SimpleSelect
          label="Type"
          items={uomTypes}
          value={form.type || ""}
          onValueChange={(val: string | number | null) => setForm({ ...form, type: (val as UoMType) || undefined })}
        />
        
        <InputGroup
          label="Description"
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </section>

      <FormFooter onCancel={onCancel} />
    </form>
  );
}