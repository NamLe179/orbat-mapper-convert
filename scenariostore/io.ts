import dayjs from "dayjs";
import { klona } from "klona";
import { nanoid } from "@/utils";
import { resolveTimeZone } from "@/utils/militaryTimeZones";
import { saveBlobToLocalFile } from "@/utils/files";
import {
  DEFAULT_BASEMAP_ID,
  LOCALSTORAGE_KEY,
  SCENARIO_FILE_VERSION,
} from "@/config/constants";

// Types
import type {
  EquipmentData,
  PersonnelData,
  Scenario,
  ScenarioEvent,
  ScenarioInfo,
  Side,
  SideGroup,
  State,
  SupplyCategory,
  SupplyClass,
  SymbologyStandard,
  Unit,
  UnitOfMeasure,
  UnitStatus,
} from "@/types/scenarioModels";
import type {
  RangeRingGroup,
  ScenarioLayer,
  ScenarioMapLayer,
} from "@/types/scenarioGeoModels";
import {
  INTERNAL_NAMES,
  type NState,
  type NUnit,
  TIMESTAMP_NAMES,
} from "@/types/internalModels";
import { type EntityId } from "@/types/base";

// Store / Logic Imports
import {
  type NewScenarioStore,
  type ScenarioState,
  useNewScenarioStore,
} from "./newScenarioStore";
import { useSymbolSettingsStore } from "@/stores/settingsStore"; // Assuming converted to Zustand/Hook
import { useSetLoading } from "@/scenariostore/index"; // Converted to Zustand in previous step
import { getIndexedDb } from "@/scenariostore/localdb"; // Assuming async utility

export interface CreateEmptyScenarioOptions {
  id?: string;
  addGroups?: boolean;
  symbologyStandard?: SymbologyStandard;
}

/**
 * Creates an empty scenario object.
 * Note: In React, we cannot call hooks (useSymbolSettingsStore) inside a regular function.
 * The caller should provide the symbologyStandard if needed, otherwise it defaults to "2525".
 */
export function createEmptyScenario(options: CreateEmptyScenarioOptions = {}): Scenario {
  const addGroups = options.addGroups ?? false;
  // Default to 2525 if not provided, as we can't use the store hook here
  const symbologyStandard = options.symbologyStandard ?? "2525"; 
  
  let timeZone;
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (e) {}
  
  const rangeRingGroups: RangeRingGroup[] = addGroups
    ? [{ name: "GR1" }, { name: "GR2" }]
    : [];

  return {
    id: options.id ?? nanoid(),
    type: "ORBAT-mapper",
    version: SCENARIO_FILE_VERSION,
    meta: {
      createdDate: new Date().toISOString(),
      lastModifiedDate: new Date().toISOString(),
    },
    name: "New scenario",
    description: "Empty scenario description",
    startTime: new Date().setHours(12, 0, 0, 0),
    timeZone,
    symbologyStandard,
    sides: [],
    events: [],
    layers: [{ id: nanoid(), name: "Features", features: [] }],
    mapLayers: [],
    settings: {
      rangeRingGroups,
      statuses: [],
      map: { baseMapId: DEFAULT_BASEMAP_ID },
      supplyClasses: [
        { name: "Class I" },
        { name: "Class II" },
        { name: "Class III" },
        { name: "Class IV" },
        { name: "Class V" },
      ],
      supplyUoMs: [
        { name: "Kilogram", code: "KG", type: "weight" },
        { name: "Liter", code: "LI", type: "volume" },
        { name: "Each", code: "EA", type: "quantity" },
        { name: "Meter", code: "MR", type: "distance" },
        { name: "Gallon", code: "GL", type: "volume" },
      ],
      symbolFillColors: [],
    },
  };
}

// --- Serialization Helpers (Pure Functions) ---

function getScenarioInfo(state: ScenarioState): ScenarioInfo {
  return { ...state.info };
}

function getScenarioEvents(state: ScenarioState): ScenarioEvent[] {
  return state.events
    .filter((id) => state.eventMap[id]._type === "scenario")
    .map((id) => state.eventMap[id]);
}

function getSides(state: ScenarioState): Side[] {
  function getSideGroup(groupId: EntityId): SideGroup {
    const group = state.sideGroupMap[groupId];
    return {
      ...group,
      subUnits: group.subUnits.map((unitId) => serializeUnit(unitId, state)),
    };
  }

  return state.sides
    .map((sideId) => state.sideMap[sideId])
    .map((nSide) => ({
      ...nSide,
      groups: nSide.groups.map((groupId) => getSideGroup(groupId)),
      subUnits: nSide.subUnits.length
        ? nSide.subUnits.map((unitId) => serializeUnit(unitId, state))
        : undefined,
    }));
}

export type SerializeUnitOptions = {
  newId?: boolean;
  includeSubUnits?: boolean;
};

export function serializeUnit(
  unitId: EntityId,
  scnState: ScenarioState,
  options: SerializeUnitOptions = {},
): Unit {
  const { newId = false, includeSubUnits = true } = options;
  const nUnit = scnState.unitMap[unitId];
  let { equipment, personnel, supplies } = serializeToeStuff(nUnit, scnState);
  let rangeRings = nUnit.rangeRings?.map(({ group, ...rest }) => {
    return group ? { group: scnState.rangeRingGroupMap[group].name, ...rest } : rest;
  });

  if (rangeRings?.length === 0) rangeRings = undefined;
  const { id, state, ...rest } = nUnit;

  return {
    id: newId ? nanoid() : id,
    ...rest,
    status: nUnit.status ? scnState.unitStatusMap[nUnit.status]?.name : undefined,
    subUnits: includeSubUnits
      ? nUnit.subUnits.map((subUnitId) => serializeUnit(subUnitId, scnState, options))
      : [],
    equipment,
    personnel,
    supplies,
    rangeRings,
    state: state ? state.map((s) => serializeState(s, scnState)) : undefined,
  };
}

function serializeToeStuff(nUnit: NUnit, scnState: ScenarioState) {
  let equipment = nUnit.equipment?.map(({ id, count, onHand }) => {
    const { name } = scnState.equipmentMap[id];
    return { name, count, onHand };
  });
  if (equipment?.length === 0) equipment = undefined;
  let personnel = nUnit.personnel?.map(({ id, count, onHand }) => {
    const { name } = scnState.personnelMap[id];
    return { name, count, onHand };
  });
  if (personnel?.length === 0) personnel = undefined;

  let supplies = nUnit.supplies?.map(({ id, count, onHand }) => {
    const { name } = scnState.supplyCategoryMap[id];
    return { name, count, onHand };
  });
  if (supplies?.length === 0) supplies = undefined;

  return { equipment, personnel, supplies };
}

function serializeState(s: NState, scnState: ScenarioState) {
  let diffEquipment, diffPersonnel, diffSupplies;
  const c = klona(s) as State;

  if (s.diff) {
    if (s.diff.equipment) {
      diffEquipment = s.diff.equipment.map(({ id, count, onHand }) => {
        return { name: scnState.equipmentMap[id]?.name ?? id, count, onHand };
      });
    }

    if (s.diff?.personnel) {
      diffPersonnel = s.diff.personnel.map(({ id, count, onHand }) => {
        return { name: scnState.personnelMap[id]?.name ?? id, count, onHand };
      });
    }

    if (s.diff?.supplies) {
      diffSupplies = s.diff.supplies.map(({ id, count, onHand }) => {
        return {
          name: scnState.supplyCategoryMap[id]?.name ?? id,
          count,
          onHand,
        };
      });
    }
    c.diff = {
      equipment: diffEquipment,
      personnel: diffPersonnel,
      supplies: diffSupplies,
    };
  }

  if (s.update) {
    let updateEquipment, updatePersonnel, updateSupplies;

    if (s.update.equipment) {
      updateEquipment = s.update.equipment.map(({ id, count, onHand }) => {
        return { name: scnState.equipmentMap[id]?.name ?? id, count, onHand };
      });
    }
    if (s.update.personnel) {
      updatePersonnel = s.update.personnel.map(({ id, count, onHand }) => {
        return { name: scnState.personnelMap[id]?.name ?? id, count, onHand };
      });
    }

    if (s.update.supplies) {
      updateSupplies = s.update.supplies.map(({ id, count, onHand }) => {
        return {
          name: scnState.supplyCategoryMap[id]?.name ?? id,
          count,
          onHand,
        };
      });
    }
    c.update = {
      equipment: updateEquipment,
      personnel: updatePersonnel,
      supplies: updateSupplies,
    };
  }

  if (s.status) {
    c.status = scnState.unitStatusMap[s.status]?.name;
  }
  return c;
}

function getLayers(state: ScenarioState): ScenarioLayer[] {
  return state.layers
    .map((id) => state.layerMap[id])
    .map((layer) => ({
      ...layer,
      features: layer.features.map((fId) => state.featureMap[fId]),
    }));
}

function getMapLayers(state: ScenarioState): ScenarioMapLayer[] {
  return state.mapLayers
    .map((id) => state.mapLayerMap[id])
    .filter((l) => !l._isTemporary);
}

function getEquipment(state: ScenarioState): EquipmentData[] {
  return Object.values(state.equipmentMap).map(({ name, description, sidc }) => ({
    name,
    description,
    sidc,
  }));
}

function getPersonnel(state: ScenarioState): PersonnelData[] {
  return Object.values(state.personnelMap).map(({ name, description }) => ({
    name,
    description,
  }));
}

function getSupplyCategories(state: ScenarioState): SupplyCategory[] {
  return Object.values(state.supplyCategoryMap).map(({ id, ...sup }) => {
    return {
      ...sup,
      supplyClass: sup.supplyClass
        ? (state.supplyClassMap[sup.supplyClass]?.name ?? sup.supplyClass)
        : undefined,
      uom: sup.uom ? (state.supplyUomMap[sup.uom]?.name ?? sup.uom) : undefined,
    };
  });
}

function getRangeRingGroups(state: ScenarioState): RangeRingGroup[] {
  return Object.values(state.rangeRingGroupMap).map(({ id, ...rest }) => rest);
}

function getUnitStatuses(state: ScenarioState): UnitStatus[] {
  return Object.values(state.unitStatusMap).map(({ id, ...rest }) => rest);
}

function getSupplyClasses(state: ScenarioState): SupplyClass[] {
  return Object.values(state.supplyClassMap).map(({ id, ...rest }) => rest);
}

function getSupplyUoMs(state: ScenarioState): UnitOfMeasure[] {
  return Object.values(state.supplyUomMap).map(({ id, ...rest }) => rest);
}

function getSymbolFillColors(state: ScenarioState) {
  return Object.values(state.symbolFillColorMap).map(({ id, ...rest }) => rest);
}

function getCustomSymbols(state: ScenarioState) {
  return Object.values(state.customSymbolMap);
}

// --- IO Hook ---

export interface ScenarioIOContext {
  store: NewScenarioStore | null;
  setStore: (s: NewScenarioStore) => void;
}

export function useScenarioIO({ store, setStore }: ScenarioIOContext) {
  const settingsStore = useSymbolSettingsStore();
  const setLoading = useSetLoading();

  function toObject(): Scenario {
    if (!store) throw new Error("Scenario store not initialized");
    const { state } = store;
    return {
      id: state.id,
      type: "ORBAT-mapper",
      version: SCENARIO_FILE_VERSION,
      meta: {
        createdDate: state?.meta?.createdDate,
        lastModifiedDate: new Date().toISOString(),
      },
      ...getScenarioInfo(state),
      sides: getSides(state),
      layers: getLayers(state),
      events: getScenarioEvents(state),
      mapLayers: getMapLayers(state),
      equipment: getEquipment(state),
      personnel: getPersonnel(state),
      supplyCategories: getSupplyCategories(state),
      settings: {
        rangeRingGroups: getRangeRingGroups(state),
        statuses: getUnitStatuses(state),
        supplyClasses: getSupplyClasses(state),
        supplyUoMs: getSupplyUoMs(state),
        map: state.mapSettings,
        symbolFillColors: getSymbolFillColors(state),
        customSymbols: getCustomSymbols(state),
      },
    };
  }

  function stringifyReplacer(name: string, val: any) {
    if (val === undefined) return undefined;
    if (INTERNAL_NAMES.includes(name)) return undefined;
    if (TIMESTAMP_NAMES.includes(name)) {
      const timeZone = store?.state.info.timeZone || "UTC";
      return dayjs(val)
        .tz(resolveTimeZone(timeZone))
        .format();
    }
    return val;
  }

  function stringifyScenario() {
    return JSON.stringify(toObject(), stringifyReplacer, "  ");
  }

  function stringifyObject(obj: any) {
    return JSON.stringify(obj, stringifyReplacer, "  ");
  }

  function serializeToObject(): Scenario {
    return JSON.parse(stringifyScenario());
  }

  function saveToLocalStorage(key = LOCALSTORAGE_KEY) {
    const data = stringifyScenario();
    localStorage.setItem(key, data);
  }

  async function saveToIndexedDb() {
    const { putScenario } = await getIndexedDb();
    const scn = serializeToObject();
    if (scn.id.startsWith("demo-")) {
      scn.id = nanoid();
      if (store) store.state.id = scn.id;
    }
    return await putScenario(scn);
  }

  async function duplicateScenario() {
    const { putScenario } = await getIndexedDb();
    const scn = serializeToObject();
    scn.id = nanoid();
    scn.name = `${scn.name} (copy)`;
    await putScenario(scn);
    return scn.id;
  }

  function loadFromLocalStorage(key = LOCALSTORAGE_KEY) {
    const scn = localStorage.getItem(key);
    if (scn) {
      loadFromObject(JSON.parse(scn));
    }
  }

  function loadFromObject(data: Scenario) {
    const newStore = useNewScenarioStore(data);
    setStore(newStore);
    settingsStore.setSymbologyStandard(newStore.state.info.symbologyStandard || "2525");
  }

  async function loadFromUrl(url: string) {
    setLoading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load scenario: ${response.statusText}`);
      }
      const data = await response.json();
      loadFromObject(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function loadEmptyScenario() {
    // Pass current settings to empty scenario creation if needed
    const scn = createEmptyScenario({ 
        symbologyStandard: settingsStore.symbologyStandard 
    });
    loadFromObject(scn);
  }

  async function loadDemoScenario(id: string | "falkland82" | "narvik40") {
    setLoading(true);
    const idUrlMap: Record<string, string> = {
      falkland82: "/scenarios/falkland82.json",
      narvik40: "/scenarios/narvik40.json",
    };
    const url = idUrlMap[id];
    if (!url) {
      console.warn("Unknown scenario id", id);
      setLoading(false);
      return;
    }
    await loadFromUrl(url);
    // isLoading is handled inside loadFromUrl's finally block, 
    // but redundant set here just in case of logic flow changes
    setLoading(false);
  }

  async function downloadAsJson(fileName?: string) {
    let name = fileName;
    if (!name && store) {
      // Dynamic import
      const { default: filenamify } = await import("filenamify/browser");
      name = filenamify(store.state.info.name || "scenario.json");
    }
    await saveBlobToLocalFile(
      new Blob([stringifyScenario()], {
        type: "application/json",
      }),
      (name || "scenario") + ".json",
    );
  }

  return {
    loadDemoScenario,
    loadEmptyScenario,
    loadFromObject,
    downloadAsJson,
    saveToLocalStorage,
    loadFromLocalStorage,
    stringifyScenario,
    serializeToObject,
    saveToIndexedDb,
    duplicateScenario,
    stringifyObject,
    toObject,
  };
}