import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo, useEffect } from "react";

// Project Utils
import { formatDateString, formatDTG } from "@/geo/utils";
import type { RadioGroupItemData } from "@/components/types";
import { useScenario } from "@/scenariostore"; // Assuming this hook exists from previous steps

// -----------------------------------------------------------------------------
// 1. Types & Constants (Keep mostly as-is)
// -----------------------------------------------------------------------------

export type TimeFormat = "iso" | "local" | "military" | "custom";

export interface TimeFormatSettings {
  timeFormat: TimeFormat;
  locale: string;
  dateStyle: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle: Intl.DateTimeFormatOptions["timeStyle"];
}

export const timeFormatItems: RadioGroupItemData<TimeFormat>[] = [
  { name: "ISO 8601", value: "iso" },
  { name: "Localized", value: "local" },
  { name: "Military DTG", value: "military" },
];

export const intlItems = [
  { label: "Full", value: "full" },
  { label: "Long", value: "long" },
  { label: "Medium", value: "medium" },
  { label: "Short", value: "short" },
];

// -----------------------------------------------------------------------------
// 2. Settings Store (Persisted)
// -----------------------------------------------------------------------------

interface TimeFormatSettingsState {
  track: TimeFormatSettings;
  scenario: TimeFormatSettings;

  // Actions
  setTrackSettings: (settings: Partial<TimeFormatSettings>) => void;
  setScenarioSettings: (settings: Partial<TimeFormatSettings>) => void;
}

export const useTimeFormatSettingsStore = create<TimeFormatSettingsState>()(
  persist(
    (set) => ({
      track: {
        timeFormat: "local",
        locale: "",
        dateStyle: "short",
        timeStyle: "short",
      },
      scenario: {
        timeFormat: "local",
        locale: "",
        dateStyle: "medium",
        timeStyle: "short",
      },

      setTrackSettings: (newSettings) =>
        set((state) => ({ track: { ...state.track, ...newSettings } })),

      setScenarioSettings: (newSettings) =>
        set((state) => ({ scenario: { ...state.scenario, ...newSettings } })),
    }),
    {
      name: "time-format-settings",
    }
  )
);

// -----------------------------------------------------------------------------
// 3. TimeFormat Store (Runtime State: TimeZone)
// -----------------------------------------------------------------------------

interface TimeFormatState {
  timeZone: string;
  setTimeZone: (tz: string) => void;
}

export const useTimeFormatStore = create<TimeFormatState>((set) => ({
  timeZone: "UTC",
  setTimeZone: (timeZone) => set({ timeZone }),
}));

// -----------------------------------------------------------------------------
// 4. Helper Function (Pure Logic)
// -----------------------------------------------------------------------------

function createFormatter(
  timeZone: string,
  settings: TimeFormatSettings,
  { dateOnly = false } = {},
) {
  if (settings.timeFormat === "iso") {
    if (dateOnly) {
      return {
        format: (value: number) => formatDateString(value, timeZone).split("T")[0],
      };
    }
    return {
      format: (value: number) => formatDateString(value, timeZone),
    };
  }
  if (settings.timeFormat === "military") {
    return {
      format: (value: number) => formatDTG(value, timeZone),
    };
  }
  
  // Handling Intl.DateTimeFormat
  // Note: We use undefined for locale to use system default if empty string
  if (dateOnly) {
    return new Intl.DateTimeFormat(settings.locale || undefined, {
      timeZone,
      dateStyle: settings.dateStyle,
    });
  }
  return new Intl.DateTimeFormat(settings.locale || undefined, {
    timeZone,
    dateStyle: settings.dateStyle,
    timeStyle: settings.timeStyle,
  });
}

// -----------------------------------------------------------------------------
// 5. Hooks (Replaces Computed & Providers)
// -----------------------------------------------------------------------------

/**
 * React Hook to access formatters.
 * Replaces the computed properties in the original Pinia store.
 */
export function useTimeFormatters() {
  const timeZone = useTimeFormatStore((s) => s.timeZone);
  const trackSettings = useTimeFormatSettingsStore((s) => s.track);
  const scenarioSettings = useTimeFormatSettingsStore((s) => s.scenario);

  const trackFormatter = useMemo(
    () => createFormatter(timeZone, trackSettings),
    [timeZone, trackSettings]
  );

  const scenarioFormatter = useMemo(
    () => createFormatter(timeZone, scenarioSettings),
    [timeZone, scenarioSettings]
  );

  const scenarioDateFormatter = useMemo(
    () => createFormatter(timeZone, scenarioSettings, { dateOnly: true }),
    [timeZone, scenarioSettings]
  );

  return {
    timeZone,
    trackFormatter,
    scenarioFormatter,
    scenarioDateFormatter,
  };
}

/**
 * Hook to sync TimeZone from Scenario Store to TimeFormat Store.
 * Usage: Call this once in your main App layout or ScenarioWrapper component.
 */
export function useTimeZoneSync() {
  const { scenario } = useScenario(); // Assumes useScenario hook exists
  const setTimeZone = useTimeFormatStore((s) => s.setTimeZone);

  // Watch scenario info timezone
  useEffect(() => {
    if (scenario?.store?.state?.info?.timeZone) {
      setTimeZone(scenario.store.state.info.timeZone);
    } else {
      setTimeZone("UTC");
    }
  }, [scenario?.store?.state?.info?.timeZone, setTimeZone]);
}