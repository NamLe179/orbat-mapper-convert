/**
 * Scenario Time & Events Management
 * 
 * Cơ chế hoạt động khi ghép BE:
 * - FE CHỈ gửi request và nhận response từ BE
 * - Sau khi nhận response từ BE, cập nhật local state (Zustand store)
 * 
 * Ví dụ flow tạo Event:
 * 1. FE gọi: POST /api/scenarios/:scenarioId/events với body { title, startTime, ... }
 * 2. BE tạo event, sinh ID, lưu DB, trả về { id, title, startTime, ... }
 * 3. FE nhận response, cập nhật store.eventMap[id] = response.data
 * 
 * API Endpoints:
 * - POST   /api/scenarios/:scenarioId/events          - Create event 
 * - PUT    /api/scenarios/:scenarioId/events/:eventId - Update event
 * - DELETE /api/scenarios/:scenarioId/events/:eventId - Delete event
 */

import dayjs, { type ManipulateType } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import turfLength from "@turf/length";
import turfAlong from "@turf/along";
import { lineString } from "@turf/helpers";
import { klona } from "klona";

// TODO: API Integration - Uncomment and configure when backend is ready
// async function apiCreateEvent(scenarioId: string, event: NScenarioEvent): Promise<string> {
//   const response = await fetch(`/api/scenarios/${scenarioId}/events`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(event),
//   });
//   const data = await response.json();
//   return data.id;
// }

// async function apiUpdateEvent(scenarioId: string, eventId: string, data: ScenarioEventUpdate): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/events/${eventId}`, {
//     method: 'PUT',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(data),
//   });
// }

// async function apiDeleteEvent(scenarioId: string, eventId: string): Promise<void> {
//   await fetch(`/api/scenarios/${scenarioId}/events/${eventId}`, {
//     method: 'DELETE',
//   });
// }

// Utils
import { nanoid } from "@/utils";
import { resolveTimeZone } from "@/utils/militaryTimeZones";
import { invalidateUnitStyle } from "@/geo/unitStyles";

// Types
import type { NewScenarioStore } from "./newScenarioStore";
import type { CurrentState, ScenarioEvent } from "@/types/scenarioModels";
import type {
  NScenarioEvent,
  NScenarioFeature,
  NUnit,
  ScenarioEventUpdate,
} from "@/types/internalModels";
import type { EntityId } from "@/types/base";
import type { CurrentScenarioFeatureState } from "@/types/scenarioGeoModels";

// Ensure dayjs plugins are loaded (safe to call multiple times)
dayjs.extend(utc);
dayjs.extend(timezone);

export type GoToScenarioEventOptions = {
  silent?: boolean;
};

export type GoToScenarioEventEvent = {
  event: NScenarioEvent;
};

// --- Helpers ---

/**
 * Replacement for @vueuse/core createEventHook
 */
function createEventHook<T>() {
  const listeners = new Set<(param: T) => void>();
  return {
    on: (fn: (param: T) => void) => {
      listeners.add(fn);
      return {
        off: () => listeners.delete(fn),
      };
    },
    trigger: (param: T) => {
      listeners.forEach((fn) => fn(param));
      return Promise.resolve();
    },
  };
}

// --- Pure Functions ---

export function createInitialState(unit: NUnit): CurrentState | null {
  if (
    unit.location ||
    unit.equipment?.length ||
    unit.personnel?.length ||
    unit.supplies?.length
  )
    return {
      t: Number.MIN_SAFE_INTEGER,
      location: unit.location,
      type: "initial",
      sidc: unit.sidc,
      equipment: klona(unit.equipment),
      personnel: klona(unit.personnel),
      supplies: klona(unit.supplies),
    };
  return null;
}

export function updateCurrentUnitState(unit: NUnit, timestamp: number) {
  if (!unit.state || !unit.state.length) {
    if (!unit._state) {
      unit._state = createInitialState(unit);
    }
    return;
  }
  let currentState = createInitialState(unit);
  for (const s of unit.state) {
    if (s.t <= timestamp) {
      const { diff, update, ...rest } = s;
      if (update?.equipment && currentState?.equipment) {
        for (const e of update.equipment) {
          const idx = currentState.equipment.findIndex((ee) => ee.id === e.id);
          if (idx !== -1) {
            currentState.equipment[idx] = { ...currentState.equipment[idx], ...e };
          } else {
            console.warn("Equipment not found", e);
          }
        }
      }
      if (update?.personnel && currentState?.personnel) {
        for (const p of update.personnel) {
          const idx = currentState.personnel.findIndex((pp) => pp.id === p.id);
          if (idx !== -1) {
            currentState.personnel[idx] = { ...currentState.personnel[idx], ...p };
          } else {
            console.warn("Personnel not found", p);
          }
        }
      }

      if (update?.supplies && currentState?.supplies) {
        for (const p of update.supplies) {
          const idx = currentState.supplies.findIndex((pp) => pp.id === p.id);
          if (idx !== -1) {
            currentState.supplies[idx] = { ...currentState.supplies[idx], ...p };
          } else {
            console.warn("Supplies not found", p);
          }
        }
      }

      if (diff?.equipment && currentState?.equipment) {
        for (const e of diff.equipment) {
          const idx = currentState.equipment.findIndex((ee) => ee.id === e.id);
          if (idx !== -1) {
            const eq = currentState.equipment[idx];
            const onHand = (eq?.onHand ?? eq.count) + (e.onHand ?? 0);
            currentState.equipment[idx] = { ...currentState.equipment[idx], onHand };
          } else {
            console.warn("Equipment not found", e);
          }
        }
      }
      if (diff?.personnel && currentState?.personnel) {
        for (const p of diff.personnel) {
          const idx = currentState.personnel.findIndex((pp) => pp.id === p.id);
          if (idx !== -1) {
            const pe = currentState.personnel[idx];
            const onHand = (pe?.onHand ?? pe.count) + (p.onHand ?? 0);
            currentState.personnel[idx] = { ...currentState.personnel[idx], onHand };
          } else {
            console.warn("Personnel not found", p);
          }
        }
      }

      if (diff?.supplies && currentState?.supplies) {
        for (const p of diff.supplies) {
          const idx = currentState.supplies.findIndex((pp) => pp.id === p.id);
          if (idx !== -1) {
            const pe = currentState.supplies[idx];
            const onHand = (pe?.onHand ?? pe.count) + (p.onHand ?? 0);
            currentState.supplies[idx] = { ...currentState.supplies[idx], onHand };
          } else {
            console.warn("Supplies not found", p);
          }
        }
      }
      currentState = { ...currentState, ...rest };
    } else {
      if (
        currentState?.location &&
        s.location &&
        !(s.interpolate === false) &&
        (s.viaStartTime ?? -Infinity) <= timestamp
      ) {
        const n = lineString(
          s.via
            ? [currentState.location, ...s.via, s.location]
            : [currentState.location, s.location],
        );
        const timeDiff = s.t - (s.viaStartTime ?? currentState.t);
        const pathLength = turfLength(n);
        const averageSpeed = pathLength / timeDiff;
        const p = turfAlong(
          n,
          averageSpeed * (timestamp - (s.viaStartTime ?? currentState.t)),
        );
        currentState = {
          ...currentState,
          t: timestamp,
          location: p.geometry.coordinates,
          type: "interpolated",
        };
      }
      break;
    }
  }
  if (currentState?.sidc !== unit._state?.sidc) {
    unit._ikey = undefined;
    invalidateUnitStyle(unit.id);
  }
  unit._state = currentState;
}

function createInitialFeatureState(
  feature: NScenarioFeature,
): CurrentScenarioFeatureState | null {
  return {
    t: Number.MIN_SAFE_INTEGER,
    geometry: feature.geometry,
  };
}

// --- Logic Hook/Factory ---

export function useScenarioTime(store: NewScenarioStore) {
  const { state, update } = store;

  const goToScenarioEventHook = createEventHook<GoToScenarioEventEvent>();

  function setCurrentTime(timestamp: number) {
    update((s) => {
      // Update Units
      Object.values(s.unitMap).forEach((unit) =>
        updateCurrentUnitState(unit, timestamp),
      );
      
      // Update Layers
      Object.values(s.layerMap).forEach((layer) => {
        const visibleFromT = layer.visibleFromT || Number.MIN_SAFE_INTEGER;
        const visibleUntilT = layer.visibleUntilT || Number.MAX_SAFE_INTEGER;
        layer._hidden = timestamp <= visibleFromT || timestamp >= visibleUntilT;
        
        // Update Features in Layer
        layer.features.forEach((featureId) => {
          const feature = s.featureMap[featureId];
          if (!feature) return;
          const featVisibleFromT = feature.meta.visibleFromT || Number.MIN_SAFE_INTEGER;
          const featVisibleUntilT = feature.meta.visibleUntilT || Number.MAX_SAFE_INTEGER;
          
          feature._hidden =
            timestamp <= featVisibleFromT ||
            timestamp >= featVisibleUntilT ||
            !!feature.meta.isHidden;
          
          if (feature.state?.length) {
            let currentState = createInitialFeatureState(feature);
            for (const st of feature.state) {
              if (st.t <= timestamp) {
                currentState = { ...currentState, ...st };
              } else {
                break;
              }
            }
            feature._state = currentState;
          }
        });
      });
      s.currentTime = timestamp;
    }, { label: "setCurrentTime" }); // Optional: omit label to avoid filling undo stack with time scrubbing
  }

  function add(amount: number, unit: ManipulateType, normalize = false) {
    const timeZone = getTimeZone();
    const newTime = normalize
      ? dayjs(state.currentTime)
          .add(amount, unit)
          .tz(resolveTimeZone(timeZone || "UTC"))
          .hour(12)
      : dayjs(state.currentTime).add(amount, unit);
    setCurrentTime(newTime.valueOf());
  }

  function subtract(amount: number, unit: ManipulateType, normalize = false) {
    const timeZone = getTimeZone();
    const newTime = normalize
      ? dayjs(state.currentTime)
          .subtract(amount, unit)
          .tz(resolveTimeZone(timeZone || "UTC"))
          .hour(12)
      : dayjs(state.currentTime).subtract(amount, unit);
    setCurrentTime(newTime.valueOf());
  }

  function jumpToNextEvent() {
    let newTime = Number.MAX_SAFE_INTEGER;
    Object.values(state.unitMap).forEach((unit) => {
      if (!unit?.state?.length) {
        return;
      }
      for (const s of unit.state) {
        if (s.t > state.currentTime) {
          if (s.t < newTime) newTime = s.t;
          break;
        }
      }
    });
    if (newTime < Number.MAX_SAFE_INTEGER) setCurrentTime(newTime);
  }

  function jumpToPrevEvent() {
    let newTime = Number.MIN_SAFE_INTEGER;
    Object.values(state.unitMap).forEach((unit) => {
      if (!unit?.state?.length) {
        return;
      }
      for (const s of unit.state) {
        if (s.t < state.currentTime) {
          if (s.t > newTime) newTime = s.t;
          break;
        }
      }
    });
    if (newTime > Number.MIN_SAFE_INTEGER) setCurrentTime(newTime);
  }

  function computeTimeHistogram() {
    const histogram: Record<number, number> = {};
    let max = 1;

    Object.values(state.unitMap).forEach((unit) => {
      (unit?.state || []).forEach((s) => {
        // round to nearest hour
        const t = Math.round(s.t / 3600000) * 3600000;
        histogram[t] = (histogram[t] || 0) + 1;
        max = Math.max(max, histogram[t]);
      });
    });

    Object.values(state.featureMap).forEach((feature) => {
      (feature?.state || []).forEach((s) => {
        // round to nearest hour
        const t = Math.round(s.t / 3600000) * 3600000;
        histogram[t] = (histogram[t] || 0) + 1;
        max = Math.max(max, histogram[t]);
      });
    });

    return {
      histogram: Object.entries(histogram).map(([k, v]) => ({ t: +k, count: v })),
      max,
    };
  }

  function goToNextScenarioEvent(options: GoToScenarioEventOptions = {}) {
    const nextEventId = state.events.find(
      (event) => state.eventMap[event].startTime > state.currentTime,
    );
    const nextEvent = nextEventId && state.eventMap[nextEventId];
    const newTime = nextEvent ? nextEvent.startTime : Number.MAX_SAFE_INTEGER;
    if (newTime < Number.MAX_SAFE_INTEGER) goToScenarioEvent(nextEvent!, options);
  }

  function goToPrevScenarioEvent(options: GoToScenarioEventOptions = {}) {
    const prevEventId = state.events
      .slice()
      .reverse()
      .find((event) => state.eventMap[event].startTime < state.currentTime);
    const prevEvent = prevEventId && state.eventMap[prevEventId];
    const newTime = prevEvent ? prevEvent.startTime : Number.MIN_SAFE_INTEGER;
    if (newTime > Number.MIN_SAFE_INTEGER) goToScenarioEvent(prevEvent!, options);
  }

  function goToScenarioEvent(
    eventOrEventId: EntityId | NScenarioEvent,
    options: GoToScenarioEventOptions = {},
  ) {
    const event =
      typeof eventOrEventId === "string"
        ? state.eventMap[eventOrEventId]
        : eventOrEventId;
    if (event) {
      setCurrentTime(event.startTime);
      if (!options.silent) {
        goToScenarioEventHook.trigger({ event }).then();
      }
    }
  }

  // --- Getters (Replaces Computed) ---
  // In React components, use: const utcTime = useMemo(() => getUtcTime(), [currentTime])
  
  function getUtcTime() {
    return dayjs.utc(state.currentTime);
  }

  function getScenarioTime() {
    return dayjs(state.currentTime).tz(resolveTimeZone(state.info.timeZone || "UTC"));
  }

  function getTimeZone() {
    return state.info.timeZone;
  }

  function getEventById(id: EntityId) {
    return state.eventMap[id];
  }

  function addScenarioEvent(event: NScenarioEvent | ScenarioEvent) {
    let newEvent = klona(event) as NScenarioEvent;
    if (!newEvent.id) newEvent.id = nanoid();
    if (!newEvent._type) newEvent._type = "scenario";
    update((s) => {
      s.events.push(newEvent.id);
      s.eventMap[newEvent.id] = newEvent;
      s.events.sort((a, b) => s.eventMap[a].startTime - s.eventMap[b].startTime);
    });
    return newEvent.id;
  }

  function deleteScenarioEvent(id: EntityId) {
    update((s) => {
      s.events = s.events.filter((e) => e !== id);
      delete s.eventMap[id];
    });
  }

  function updateScenarioEvent(id: EntityId, data: ScenarioEventUpdate) {
    const event = getEventById(id);
    if (!event) return;
    if (event._type === "scenario") {
      update((s) => {
        const e = s.eventMap[id];
        if (!e) return;
        s.eventMap[e.id] = klona(Object.assign(e, { ...data }));
        if ("startTime" in data) {
          s.events.sort((a, b) => s.eventMap[a].startTime - s.eventMap[b].startTime);
        }
      });
    } else {
      console.warn("Cannot update non-scenario event yet");
    }
  }

  return {
    setCurrentTime,
    add,
    subtract,
    getUtcTime,
    getScenarioTime,
    getTimeZone,
    jumpToNextEvent,
    jumpToPrevEvent,
    goToScenarioEvent,
    goToNextScenarioEvent,
    goToPrevScenarioEvent,
    getEventById,
    addScenarioEvent,
    updateScenarioEvent,
    deleteScenarioEvent,
    computeTimeHistogram,
    onGoToScenarioEventEvent: goToScenarioEventHook.on,
  };
}