"use client";

import React, { useEffect } from "react";
import { klona } from "klona";

// Components
import InputGroup from "@/components/InputGroup";
import FormFooter from "@/modules/scenarioeditor/FormFooter";

// Hooks
import { useForm } from "@/hooks/forms"; // Giả định hook này đã được convert sang React

interface FormValues {
  id?: string;
  name: string;
  description?: string;
}

interface Props {
  heading?: string;
  showNextToggle?: boolean;
  value?: FormValues;
  onCancel: () => void;
  onSubmit: (form: FormValues) => void;
}

export default function AddNameDescriptionForm({
  heading = "Add new item",
  showNextToggle = false,
  value,
  onCancel,
  onSubmit: emitSubmit,
}: Props) {
  
  // --- Form Logic ---
  const { form, setForm, handleSubmit } = useForm<FormValues>(
    {
      name: "",
      description: "",
    },
    value // Initial data từ props
  );

  // --- Handlers ---
  const onSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    // Ngăn chặn submit đúp khi nhấn Enter trong Input (logic giống bản Vue)
    if (e && (e as any).nativeEvent instanceof KeyboardEvent && e.target instanceof HTMLInputElement) {
      return;
    }

    if (e && 'preventDefault' in e) e.preventDefault();
    
    handleSubmit();
    emitSubmit(klona(form));
  };

  // --- Keyboard Shortcuts (Tương đương @keyup modifiers của Vue) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keyup Esc -> Cancel
      if (e.key === "Escape") {
        onCancel();
      }
      // Ctrl/Meta + Enter -> Submit
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        onSubmit();
      }
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
        <InputGroup
          label="Description"
          value={form.description || ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </section>

      <FormFooter 
        onCancel={onCancel} 
        showNextToggle={showNextToggle} 
      />
    </form>
  );
}