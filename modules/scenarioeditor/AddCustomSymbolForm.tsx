"use client";

import React, { useEffect } from "react";
import { klona } from "klona";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSidcModal } from "@/components/injects"; // Giả định context hook
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import { useForm } from "@/hooks/forms"; // Giả định custom hook React

interface FormValues {
  id?: string;
  name: string;
  src: string;
  sidc: string;
  anchor?: [number, number];
}

interface Props {
  heading?: string;
  showNextToggle?: boolean;
  modelValue?: FormValues;
  onCancel: () => void;
  onSubmit: (form: FormValues) => void;
}

export default function AddCustomSymbolForm({
  heading = "Add new item",
  modelValue,
  onCancel,
  onSubmit: emitSubmit,
}: Props) {
  // --- Context Hooks ---
  const sidcModal = useSidcModal();

  // --- Form Logic ---
  const { form, setForm, handleSubmit } = useForm<FormValues>(
    {
      name: "",
      src: "",
      sidc: "10031000001100000000",
      ...modelValue, // Khởi tạo với modelValue nếu có
    }
  );

  // --- Handlers ---
  const onSubmit = (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      // Ngăn chặn submit đúp khi nhấn Enter trong input (React mặc định)
      if (
        (e as any).nativeEvent instanceof KeyboardEvent &&
        (e.target as HTMLElement).tagName === "INPUT"
      ) {
        // Có thể thêm logic kiểm tra cụ thể nếu cần
      }
    }

    handleSubmit();
    emitSubmit(klona(form));
  };

  const openSymbolPicker = async () => {
    if (!sidcModal?.getModalSidc) return;
    
    const newSidcValue = await sidcModal.getModalSidc(form.sidc, {
      hideSymbolColor: true,
      hideCustomSymbols: true,
      symbolOptions: { fillColor: "#f7f7f7" },
    });
    
    if (newSidcValue) {
      const { sidc } = newSidcValue;
      setForm({ ...form, sidc });
    }
  };

  // --- Keyboard Shortcuts (Tương đương @keyup modifiers) ---
  useEffect(() => {
    const handleGlobalKeydown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        onSubmit();
      }
    };

    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, [form, onCancel]);

  return (
    <form onSubmit={onSubmit}>
      <FieldGroup className="mb-4">
        <FieldSet>
          <FieldLegend>{heading}</FieldLegend>
          
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="symbol-name">Name</FieldLabel>
              <Input
                id="symbol-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
          </FieldGroup>

          <Field>
            <FieldLabel htmlFor="uri">URL/URI</FieldLabel>
            <Textarea
              id="uri"
              value={form.src}
              onChange={(e) => setForm({ ...form, src: e.target.value })}
              required
              placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
              rows={2}
              className="h-16 break-all"
            />
            <FieldDescription>Data URIs are supported</FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="symbol-sidc">Corresponding SIDC</FieldLabel>
            <div className="flex items-center gap-2">
              <NewMilitarySymbol
                sidc={form.sidc}
                size={32}
                options={{ fillColor: "#f7f7f7" }}
              />
              <Input
                id="symbol-sidc"
                value={form.sidc}
                onChange={(e) => setForm({ ...form, sidc: e.target.value })}
                required
              />
              <Button type="button" variant="outline" onClick={openSymbolPicker}>
                Open picker
              </Button>
            </div>
            <FieldDescription>
              Pick a symbol identification code that matches your custom symbol.
            </FieldDescription>
          </Field>
        </FieldSet>

        <Field orientation="horizontal">
          <Button type="submit">Save</Button>
          <Button variant="outline" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}