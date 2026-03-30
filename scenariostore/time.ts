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
import type { Feature as TurfFeature, LineString as TurfLineString } from "geojson";
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
import { featureRuntimeState, unitRuntimeState } from "@/scenariostore/runtimeState";

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

const TIME_SCRUB_LABEL = "setCurrentTime:scrub";

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

type UnitStateCacheEntry = {
  stateRef: NUnit["state"];
  timestamps: number[];
  prefixStates: Array<CurrentState | null>;
};

type FeatureStateCacheEntry = {
  stateRef: NScenarioFeature["state"];
  timestamps: number[];
  prefixStates: Array<CurrentScenarioFeatureState | null>;
};

const unitStateCache = new WeakMap<NUnit, UnitStateCacheEntry>();
const featureStateCache = new WeakMap<NScenarioFeature, FeatureStateCacheEntry>();
type InterpolationSegmentCacheEntry = {
  signature: string;
  line: TurfFeature<TurfLineString>;
  averageSpeed: number;
  startTime: number;
};
const interpolationSegmentCache = new WeakMap<
  NUnit,
  Map<number, InterpolationSegmentCacheEntry>
>();

function getInterpolationCache(unit: NUnit) {
  let cache = interpolationSegmentCache.get(unit);
  if (!cache) {
    cache = new Map<number, InterpolationSegmentCacheEntry>();
    interpolationSegmentCache.set(unit, cache);
  }
  return cache;
}

function findLastStateIndex(timestamps: number[], timestamp: number) {
  let lo = 0;
  let hi = timestamps.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timestamps[mid] <= timestamp) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function mergeStateEntry(
  base: CurrentState | null,
  s: any,
): CurrentState | null {
  if (!base) {
    const { diff, update, ...rest } = s;
    return { ...rest } as CurrentState;
  }

  const { diff, update, ...rest } = s;
  const next = { ...base, ...rest } as CurrentState;

  if (update?.equipment && next.equipment) {
    for (const e of update.equipment) {
      const idx = next.equipment.findIndex((ee) => ee.id === e.id);
      if (idx !== -1) next.equipment[idx] = { ...next.equipment[idx], ...e };
    }
  }

  if (update?.personnel && next.personnel) {
    for (const p of update.personnel) {
      const idx = next.personnel.findIndex((pp) => pp.id === p.id);
      if (idx !== -1) next.personnel[idx] = { ...next.personnel[idx], ...p };
    }
  }

  if (update?.supplies && next.supplies) {
    for (const p of update.supplies) {
      const idx = next.supplies.findIndex((pp) => pp.id === p.id);
      if (idx !== -1) next.supplies[idx] = { ...next.supplies[idx], ...p };
    }
  }

  if (diff?.equipment && next.equipment) {
    for (const e of diff.equipment) {
      const idx = next.equipment.findIndex((ee) => ee.id === e.id);
      if (idx !== -1) {
        const eq = next.equipment[idx];
        const onHand = (eq?.onHand ?? eq.count) + (e.onHand ?? 0);
        next.equipment[idx] = { ...next.equipment[idx], onHand };
      }
    }
  }

  if (diff?.personnel && next.personnel) {
    for (const p of diff.personnel) {
      const idx = next.personnel.findIndex((pp) => pp.id === p.id);
      if (idx !== -1) {
        const pe = next.personnel[idx];
        const onHand = (pe?.onHand ?? pe.count) + (p.onHand ?? 0);
        next.personnel[idx] = { ...next.personnel[idx], onHand };
      }
    }
  }

  if (diff?.supplies && next.supplies) {
    for (const p of diff.supplies) {
      const idx = next.supplies.findIndex((pp) => pp.id === p.id);
      if (idx !== -1) {
        const pe = next.supplies[idx];
        const onHand = (pe?.onHand ?? pe.count) + (p.onHand ?? 0);
        next.supplies[idx] = { ...next.supplies[idx], onHand };
      }
    }
  }

  return next;
}

function getUnitStateCache(unit: NUnit): UnitStateCacheEntry {
  const cached = unitStateCache.get(unit);
  const unitStates = unit.state || [];
  if (cached && cached.stateRef === unit.state && cached.timestamps.length === unitStates.length) {
    return cached;
  }

  const timestamps: number[] = [];
  const prefixStates: Array<CurrentState | null> = [];
  let running = createInitialState(unit);

  for (const s of unitStates) {
    timestamps.push(s.t);
    running = mergeStateEntry(running, s);
    prefixStates.push(running);
  }

  const next = { stateRef: unit.state, timestamps, prefixStates };
  unitStateCache.set(unit, next);
  return next;
}

function getFeatureStateCache(feature: NScenarioFeature): FeatureStateCacheEntry {
  const cached = featureStateCache.get(feature);
  const featureStates = feature.state || [];
  if (
    cached &&
    cached.stateRef === feature.state &&
    cached.timestamps.length === featureStates.length
  ) {
    return cached;
  }

  const timestamps: number[] = [];
  const prefixStates: Array<CurrentScenarioFeatureState | null> = [];
  let running = createInitialFeatureState(feature);

  for (const s of featureStates) {
    timestamps.push(s.t);
    running = { ...running, ...s };
    prefixStates.push(running);
  }

  const next = { stateRef: feature.state, timestamps, prefixStates };
  featureStateCache.set(feature, next);
  return next;
}

export function updateCurrentUnitState(unit: NUnit, timestamp: number) {
  const currentState = computeUnitStateForTimestamp(unit, timestamp);
  const prevState = unitRuntimeState.get(unit.id);

  if (currentState?.sidc !== prevState?.sidc) {
    invalidateUnitStyle(unit.id);
  }

  unitRuntimeState.set(unit.id, currentState);
  return currentState;
}

function computeUnitStateForTimestamp(
  unit: NUnit,
  timestamp: number,
): CurrentState | null {
  if (!unit.state || !unit.state.length) {
    return createInitialState(unit);
  }

  const { timestamps, prefixStates } = getUnitStateCache(unit);
  const idx = findLastStateIndex(timestamps, timestamp);
  let currentState = idx >= 0 ? prefixStates[idx] : createInitialState(unit);
  const nextState = idx + 1 < unit.state.length ? unit.state[idx + 1] : undefined;

  if (
    nextState &&
    currentState?.location &&
    nextState.location &&
    !(nextState.interpolate === false) &&
    (nextState.viaStartTime ?? -Infinity) <= timestamp
  ) {
    const nextStateIndex = idx + 1;
    const startTime = nextState.viaStartTime ?? currentState.t;
    const segmentSignature = `${currentState.location[0]},${currentState.location[1]}|${nextState.location[0]},${nextState.location[1]}|${(nextState.via || []).length}|${startTime}|${nextState.t}`;

    const segmentCache = getInterpolationCache(unit);
    let segment = segmentCache.get(nextStateIndex);
    if (!segment || segment.signature !== segmentSignature) {
      const line = lineString(
        nextState.via
          ? [currentState.location, ...nextState.via, nextState.location]
          : [currentState.location, nextState.location],
      );
      const timeDiff = nextState.t - startTime;
      const pathLength = turfLength(line);
      segment = {
        signature: segmentSignature,
        line,
        averageSpeed: timeDiff > 0 ? pathLength / timeDiff : 0,
        startTime,
      };
      segmentCache.set(nextStateIndex, segment);
    }

    const p = turfAlong(
      segment.line,
      segment.averageSpeed * (timestamp - segment.startTime),
    );
    currentState = {
      ...currentState,
      t: timestamp,
      location: p.geometry.coordinates,
      type: "interpolated",
    };
  }

  return currentState;
}

function createInitialFeatureState(
  feature: NScenarioFeature,
): CurrentScenarioFeatureState | null {
  return {
    t: Number.MIN_SAFE_INTEGER,
    geometry: feature.geometry,
  };
}

function computeFeatureStateForTimestamp(
  feature: NScenarioFeature,
  timestamp: number,
): CurrentScenarioFeatureState | null {
  if (!feature.state?.length) {
    return createInitialFeatureState(feature);
  }

  const { timestamps, prefixStates } = getFeatureStateCache(feature);
  const idx = findLastStateIndex(timestamps, timestamp);
  return idx >= 0 ? prefixStates[idx] : createInitialFeatureState(feature);
}

// --- Logic Hook/Factory ---

export function useScenarioTime(store: NewScenarioStore) {
  const { state, update } = store;

  const goToScenarioEventHook = createEventHook<GoToScenarioEventEvent>();

  function setCurrentTime(timestamp: number) {
    const sameTimestamp = store.state.currentTime === timestamp;

    for (const unitId in store.state.unitMap) {
      const unit = store.state.unitMap[unitId];
      if (!unit) continue;
      updateCurrentUnitState(unit, timestamp);
    }

    for (const featureId in store.state.featureMap) {
      const feature = store.state.featureMap[featureId];
      if (!feature) continue;
      featureRuntimeState.set(featureId, computeFeatureStateForTimestamp(feature, timestamp));
    }

    if (sameTimestamp) return;

    update((s) => {
      // Update Layers
      for (const layerId in s.layerMap) {
        const layer = s.layerMap[layerId];
        if (!layer) continue;
        const visibleFromT = layer.visibleFromT || Number.MIN_SAFE_INTEGER;
        const visibleUntilT = layer.visibleUntilT || Number.MAX_SAFE_INTEGER;
        layer._hidden = timestamp <= visibleFromT || timestamp >= visibleUntilT;
      }

      // Update Features
      for (const featureId in s.featureMap) {
        const feature = s.featureMap[featureId];
        if (!feature) continue;
        const featVisibleFromT = feature.meta.visibleFromT || Number.MIN_SAFE_INTEGER;
        const featVisibleUntilT = feature.meta.visibleUntilT || Number.MAX_SAFE_INTEGER;

        feature._hidden =
          timestamp <= featVisibleFromT ||
          timestamp >= featVisibleUntilT ||
          !!feature.meta.isHidden;

      }

      s.currentTime = timestamp;
      s.unitStateCounter += 1;
    }, { label: TIME_SCRUB_LABEL });
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