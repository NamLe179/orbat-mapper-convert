"use client";

import React, { useEffect, useState } from "react";
import { type Media } from "@/types/scenarioModels";
import { Button } from "@/components/ui/button";

// Giả định component đã convert
import InputGroup from "@/components/InputGroup";

interface EditMediaFormProps {
  media?: Media | null;
  onCancel?: () => void;
  onUpdate?: (media: Media) => void;
}

export default function EditMediaForm({
  media,
  onCancel,
  onUpdate,
}: EditMediaFormProps) {
  // --- State ---
  const [form, setForm] = useState<Media>({
    url: "",
    caption: "",
    credits: "",
    creditsUrl: "",
  });

  // --- Watcher (Sync prop to state) ---
  useEffect(() => {
    setForm({
      url: media?.url ?? "",
      caption: media?.caption ?? "",
      credits: media?.credits ?? "",
      creditsUrl: media?.creditsUrl ?? "",
    });
  }, [media]);

  // --- Handlers ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Emit bản copy của form (tương đương klona)
    onUpdate?.({ ...form });
  };

  const handleChange = (field: keyof Media, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-0 mb-6 space-y-4">
      <InputGroup
        label="Image URL"
        value={form.url || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleChange("url", e.target.value)
        }
        autoFocus
      />
      
      <InputGroup
        label="Caption"
        value={form.caption || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleChange("caption", e.target.value)
        }
      />
      
      <InputGroup
        label="Credits"
        value={form.credits || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleChange("credits", e.target.value)
        }
      />
      
      <InputGroup
        label="Credits URL"
        value={form.creditsUrl || ""}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          handleChange("creditsUrl", e.target.value)
        }
      />

      <div className="flex items-center justify-end space-x-2">
        <Button type="submit" size="sm">
          Save
        </Button>
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}