"use client";

import React, { useEffect, useCallback, useMemo } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { useUiStore } from "@/stores/uiStore";
import { inputEventFilter } from "./helpers";
import BaseToolbar from "./BaseToolbar";
import ToolbarButton from "./ToolbarButton";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Giả định các hooks này đã được convert từ file injects
// Thay vì injectStrict, ta dùng Custom Hooks để access Context/Store
import { useActiveScenario, useTimeModal } from "@/components/injects"; 

dayjs.extend(utc);
dayjs.extend(timezone);

export default function TimeController() {
  // --- Hooks ---
  const uiStore = useUiStore();
  const { store, time } = useActiveScenario();
  const { getModalTimestamp } = useTimeModal();

  const { 
    setCurrentTime, 
    add, 
    subtract, 
    jumpToNextEvent, 
    jumpToPrevEvent 
  } = time;

  const { state } = store;

  const scenarioTime = useMemo(() => {
    const tz = state.info.timeZone || "UTC";
    return dayjs(state.currentTime).tz(tz);
  }, [state.currentTime, state.info.timeZone]);

  // --- Handlers ---

  const openTimeDialog = useCallback(async () => {
    // Giả định getModalTimestamp trả về Promise<number | undefined>
    const newTimestamp = await getModalTimestamp(state.currentTime, {
      timeZone: state.info.timeZone,
    });
    
    if (newTimestamp !== undefined) {
      setCurrentTime(newTimestamp);
    }
  }, [getModalTimestamp, state.currentTime, state.info.timeZone, setCurrentTime]);

  // --- Keyboard Shortcuts (GlobalEvents replacement) ---
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      // Check shortcut enabled & filter inputs
      if (!uiStore.getShortcutsEnabled) return;
      // inputEventFilter return true nếu KHÔNG phải đang gõ text (dựa trên logic Vue cũ)
      // Chú ý: Cần kiểm tra lại implementation của helpers.ts để đảm bảo logic tương thích DOM React
      if (inputEventFilter(e)) { 
          // Shortcut: 't'
          if (e.key.toLowerCase() === 't') {
              openTimeDialog();
          }
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [uiStore.getShortcutsEnabled, openTimeDialog]);

  // --- Render ---

  return (
    <div className="flex w-full items-center justify-between p-4">
      <div>
        <p className="text-muted-foreground text-sm font-medium">
          {/* Giả định scenarioTime là object Dayjs hoặc tương tự */}
          {scenarioTime.format("YYYY-MM-DD")}
        </p>
        <p className="text-foreground text-sm font-medium">
          {scenarioTime.format("HH:mmZ")}
        </p>
      </div>

      <BaseToolbar>
        <ToolbarButton onClick={openTimeDialog} start>
          <span className="sr-only">Select time and date</span>
          <Calendar className="h-5 w-5" aria-hidden="true" />
        </ToolbarButton>

        <ToolbarButton onClick={() => jumpToPrevEvent()}>
          <span className="sr-only">Previous Event</span>
          <SkipBack className="h-5 w-5" aria-hidden="true" />
        </ToolbarButton>

        <ToolbarButton onClick={() => jumpToNextEvent()}>
          <span className="sr-only">Next Event</span>
          <SkipForward className="h-5 w-5" aria-hidden="true" />
        </ToolbarButton>

        <ToolbarButton type="button" onClick={() => subtract(1, "day", true)}>
          <span className="sr-only">Previous Day</span>
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </ToolbarButton>

        <ToolbarButton onClick={() => add(1, "day", true)} end>
          <span className="sr-only">Next Day</span>
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </ToolbarButton>
      </BaseToolbar>
    </div>
  );
}