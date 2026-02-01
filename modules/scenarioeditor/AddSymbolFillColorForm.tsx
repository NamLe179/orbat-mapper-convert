"use client";

import React, { useEffect } from "react";
import { klona } from "klona";

// Components
import InputGroup from "@/components/InputGroup";
import FormFooter from "@/modules/scenarioeditor/FormFooter";
import PopoverColorPicker from "@/components/PopoverColorPicker";

// Hooks
import { useForm } from "@/hooks/forms"; // Giả định hook này đã được convert sang React

interface FormValues {
  id?: string;
  code: string;
  text: string;
}

interface Props {
  heading?: string;
  showNextToggle?: boolean;
  value?: FormValues;
  onCancel: () => void;
  onSubmit: (form: FormValues) => void;
}

export default function AddSymbolFillColorForm({
  heading = "Add new item",
  showNextToggle = false,
  value,
  onCancel,
  onSubmit: emitSubmit,
}: Props) {
  
  // --- Form Logic ---
  const { form, setForm, handleSubmit } = useForm<FormValues>(
    {
      text: "",
      code: "",
    },
    value // Initial data từ props (tương đương modelValue)
  );

  // --- Handlers ---
  const onSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    // Ngăn chặn submit đúp khi nhấn Enter trong Input
    if (
      e && 
      (e as any).nativeEvent instanceof KeyboardEvent && 
      e.target instanceof HTMLInputElement
    ) {
      return;
    }

    if (e && 'preventDefault' in e) e.preventDefault();
    
    handleSubmit();
    emitSubmit(klona(form));
  };

  // --- Keyboard Shortcuts (Tương đương @keyup modifiers của Vue) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keydown Esc -> Cancel
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
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
        />
        
        <div className="flex w-full self-end">
          <PopoverColorPicker 
            label="Fill Color" 
            value={form.code} 
            onValueChange={(val: string | null) => setForm({ ...form, code: val || "" })}
          />
        </div>
      </section>

      <FormFooter 
        onCancel={onCancel} 
        showNextToggle={showNextToggle} 
      />
    </form>
  );
}