"use client";

import React, { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { klona } from "klona";

// Types
import type { NScenarioEvent, NScenarioFeature, NUnit } from "@/types/internalModels";

// Components
import InputGroup from "@/components/InputGroup";
import BaseButton from "@/components/BaseButton";

// Dynamic Import (Tương đương defineAsyncComponent)
const SimpleMarkdownInput = dynamic(
  () => import("@/components/SimpleMarkdownInput"),
  {
    loading: () => <div className="h-24 w-full animate-pulse bg-muted rounded" />,
    ssr: false, // Markdown editor thường cần browser API
  }
);

interface EditMetaFormProps {
  item?: NUnit | NScenarioFeature | NScenarioEvent | null;
  onCancel?: () => void;
  onUpdate?: (data: ItemMetaForm) => void;
}

type ItemMetaForm = {
  name: string;
  shortName?: string;
  description: string;
  externalUrl: string;
  title: string;
  subTitle: string;
};

// --- Type Guards ---

const isScenarioFeatureType = (
  item: NUnit | NScenarioFeature | NScenarioEvent
): item is NScenarioFeature => {
  return "type" in item && item.type === "Feature";
};

const isScenarioEventType = (
  item: NUnit | NScenarioFeature | NScenarioEvent
): item is NScenarioEvent => {
  return "startTime" in item || ("_type" in item && item._type === "scenario");
};

const isUnitType = (
  item: NUnit | NScenarioFeature | NScenarioEvent
): item is NUnit => {
  return "sidc" in item;
};

export default function EditMetaForm({
  item,
  onCancel,
  onUpdate,
}: EditMetaFormProps) {
  // --- State ---
  const [form, setForm] = useState<Partial<ItemMetaForm>>({
    name: "",
    shortName: "",
    description: "",
    externalUrl: "",
    title: "",
    subTitle: "",
  });

  // --- Computed / Memo ---
  const isScenarioEvent = useMemo(() => {
    return item && isScenarioEventType(item);
  }, [item]);

  // Logic sửa đổi: Hiển thị shortName input nếu nó là Unit (dựa trên watch logic)
  const isUnit = useMemo(() => {
    return item && isUnitType(item);
  }, [item]);

  // --- Watcher (Sync prop to state) ---
  useEffect(() => {
    if (!item) return;

    if (isScenarioFeatureType(item)) {
      setForm({
        name: item?.meta?.name ?? "",
        description: item?.meta?.description ?? "",
        externalUrl: item?.meta?.externalUrl ?? "",
      });
    } else if (isUnitType(item)) {
      setForm({
        name: item?.name ?? "",
        shortName: item?.shortName ?? "",
        description: item?.description ?? "",
        externalUrl: item?.externalUrl ?? "",
      });
    } else if (isScenarioEventType(item)) {
      setForm({
        title: item?.title ?? "",
        subTitle: item?.subTitle ?? "",
        description: item?.description ?? "",
        externalUrl: item?.externalUrl ?? "",
      });
    }
  }, [item]);

  // --- Handlers ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdate) {
      onUpdate(klona(form as ItemMetaForm));
    }
  };

  const handleChange = (field: keyof ItemMetaForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-0 mb-6 space-y-4">
      {isScenarioEvent ? (
        <>
          <InputGroup
            label="Title"
            id="title-input"
            value={form.title || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange("title", e.target.value)
            }
            autoFocus
          />
          {/* <InputGroup label="Sub title" value={form.subTitle} onChange={...} /> */}
        </>
      ) : (
        <>
          <InputGroup
            label="Name"
            id="name-input"
            value={form.name || ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleChange("name", e.target.value)
            }
            autoFocus
          />
          
          {/* Lưu ý: Logic hiển thị Short Name ở đây dựa trên isUnitType=true 
            để khớp với việc data được populate trong useEffect.
          */}
          {isUnit && (
            <InputGroup
              label="Short name"
              description="Alternative name"
              value={form.shortName || ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                handleChange("shortName", e.target.value)
              }
            />
          )}
        </>
      )}

      <SimpleMarkdownInput
        label="Description"
        description="Use markdown syntax for formatting"
        value={form.description || ""}
        onValueChange={(val: string) => handleChange("description", val)}
      />

      <InputGroup
        label="External URL"
        description=""
        value={form.externalUrl || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleChange("externalUrl", e.target.value)
        }
      />

      <div className="flex items-center justify-end space-x-2">
        <BaseButton type="submit" small primary>
          Save
        </BaseButton>
        <BaseButton small type="button" onClick={onCancel}>
          Cancel
        </BaseButton>
      </div>
    </form>
  );
}