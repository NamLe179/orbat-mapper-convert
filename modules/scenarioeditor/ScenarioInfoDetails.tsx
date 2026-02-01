"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Utils & Hooks
import { renderMarkdown } from "@/hooks/formatting";
import { useNotifications } from "@/hooks/notifications";
import { resolveTimeZone } from "@/utils/militaryTimeZones";
import { useActiveScenario, useTimeModal } from "@/components/injects"; 
import { useSymbolSettingsStore } from "@/stores/settingsStore"; 

// Components (Giả định đã convert)
import DescriptionItem from "@/components/DescriptionItem";
import PrimaryButton from "@/components/PrimaryButton";
import PlainButton from "@/components/PlainButton";
import RadioGroupList from "@/components/RadioGroupList";

// Plugins Dayjs (Cần thiết nếu chưa init global)
dayjs.extend(utc);
dayjs.extend(timezone);

// Dynamic Imports
const TimezoneSelect = dynamic(() => import("@/components/TimezoneSelect"), {
  ssr: false,
  loading: () => <div className="h-10 w-full animate-pulse bg-muted rounded" />,
});

const SimpleMarkdownInput = dynamic(
  () => import("@/components/SimpleMarkdownInput"),
  {
    ssr: false,
    loading: () => <div className="h-24 w-full animate-pulse bg-muted rounded" />,
  }
);

// Types
import type { ScenarioInfo, SymbologyStandard } from "@/types/scenarioModels";

const standardSettings = [
  {
    value: "2525",
    name: "MIL-STD-2525D",
    description: "US version",
  },
  {
    value: "app6",
    name: "APP-6",
    description: "NATO version",
  },
];

export default function ScenarioInfoDetails() {
  // --- Hooks & Contexts ---
  const { send } = useNotifications();
  const { store, io } = useActiveScenario();
  const { getModalTimestamp } = useTimeModal();
  const settingsStore = useSymbolSettingsStore();

  const state = store.state;

  // --- State ---
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form State
  const [form, setForm] = useState<ScenarioInfo>({
    name: "",
    description: "",
    startTime: 0,
    timeZone: "UTC",
    symbologyStandard: "2525",
  });

  // --- Computed (useMemo) ---
  
  // Render Markdown Description
  const hDescription = useMemo(() => {
    return renderMarkdown(state.info.description || "");
  }, [state.info.description]);

  // Compute Start Time
  const computedStartTime = useMemo(() => {
    try {
      return dayjs(form.startTime).tz(resolveTimeZone(form.timeZone || "UTC"));
    } catch (e) {
      return dayjs(form.startTime);
    }
  }, [form.startTime, form.timeZone]);

  // Read-only Start Time (Display Mode)
  const displayStartTime = useMemo(() => {
     try {
      return dayjs(state.info.startTime).tz(resolveTimeZone(state.info.timeZone || "UTC"));
    } catch (e) {
      return dayjs(state.info.startTime);
    }
  }, [state.info.startTime, state.info.timeZone]);

  // --- Effects (Watchers) ---
  
  // Sync form when entering edit mode
  useEffect(() => {
    if (isEditMode) {
      const { name, description, startTime, timeZone, symbologyStandard } =
        store.state.info;
      setForm({
        name,
        description,
        startTime,
        timeZone,
        symbologyStandard,
      });
    }
  }, [isEditMode, store.state.info]);

  // --- Handlers ---

  const toggleEditMode = () => setIsEditMode((prev) => !prev);

  const updateScenarioInfo = (data: Partial<ScenarioInfo>) => {
    // Giả định store.update hoạt động tương tự Vue (Immer style hoặc setter)
    store.update((s: any) => {
      Object.assign(s.info, { ...data });
    });
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateScenarioInfo(form);

    if (form.symbologyStandard) {
        // Zustand store update
        // Nếu settingsStore là object reactive (như Vue), gán trực tiếp.
        // Nếu là Zustand chuẩn, phải dùng setter: settingsStore.setSymbologyStandard(...)
        // Code này giả định setter có tên setSymbologyStandard hoặc assign trực tiếp nếu dùng proxy.
        // Dưới đây là cách an toàn cho Zustand:
        if ('setSymbologyStandard' in settingsStore) {
             (settingsStore as any).setSymbologyStandard(form.symbologyStandard);
        } else {
             (settingsStore as any).symbologyStandard = form.symbologyStandard;
        }
    }
    
    setIsEditMode(false);
  };

  async function openTimeModal() {
    const newTime = await getModalTimestamp(form.startTime!, {
      timeZone: form.timeZone,
      title: "Set scenario start time",
    });
    if (newTime !== undefined) {
      setForm((prev) => ({ ...prev, startTime: newTime }));
    }
  }

  /* Các hàm action không dùng trong template hiện tại nhưng giữ lại theo logic gốc */
  /*
  function onDownload() {
    io.downloadAsJson();
  }

  function onSave() {
    io.saveToIndexedDb();
    send({ message: "Scenario saved to IndexedDB" });
  }

  function onLoad() {
    io.loadFromLocalStorage();
    send({ message: "Scenario loaded from local storage" });
  }
  */

  // --- Render ---

  return (
    <div>
      {isEditMode ? (
        // --- Edit Mode ---
        <form onSubmit={onFormSubmit} className="space-y-4">
          <SimpleMarkdownInput
            label="Description"
            value={form.description || ""}
            onValueChange={(val: string) => setForm({ ...form, description: val })}
            description="Use markdown syntax for formatting"
          />

          <DescriptionItem label="Start time">
            {computedStartTime.format()}
            <PlainButton
              type="button"
              onClick={openTimeModal}
              className="ml-2"
            >
              Change
            </PlainButton>
          </DescriptionItem>

          <TimezoneSelect
            label="Time zone"
            value={form.timeZone}
            onValueChange={(val: string) => setForm({ ...form, timeZone: val })}
          />

          <RadioGroupList
            items={standardSettings}
            value={form.symbologyStandard}
            onValueChange={(val: string) => setForm({ ...form, symbologyStandard: val as SymbologyStandard })}
          />

          <div className="flex justify-end space-x-2">
            <PrimaryButton type="submit">Update</PrimaryButton>
            <PlainButton type="button" onClick={toggleEditMode}>
              Cancel
            </PlainButton>
          </div>
        </form>
      ) : (
        // --- View Mode ---
        <div className="space-y-4 p-0">
          <DescriptionItem label="Description">
            <div
              className="prose-sm prose dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: hDescription }}
            />
          </DescriptionItem>

          <DescriptionItem label="Start time">
            {displayStartTime.format()}
          </DescriptionItem>

          <DescriptionItem label="Time zone name">
            {state.info.timeZone}
          </DescriptionItem>

          <DescriptionItem label="Symbology standard">
            {state.info.symbologyStandard}
          </DescriptionItem>

          <DescriptionItem label="Number of units">
            {Object.keys(state.unitMap).length}
          </DescriptionItem>

          <div className="flex items-center space-x-2">
            <PlainButton onClick={toggleEditMode}>Edit</PlainButton>
          </div>
        </div>
      )}
    </div>
  );
}