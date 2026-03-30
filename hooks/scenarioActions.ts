import { useMemo, useCallback } from "react";
import { GeoJSON } from "ol/format";
import Feature from "ol/Feature";
import OLMap from "ol/Map";
import { multiPoint } from "@turf/helpers";
import turfEnvelope from "@turf/envelope";

// Project imports
import { TAB_SCENARIO_SETTINGS, UnitActions, type UnitAction } from "@/types/constants";
import type { OrbatItemData, Unit } from "@/types/scenarioModels";
import type { NOrbatItemData, NUnit } from "@/types/internalModels";
import type { EntityId, FeatureId } from "@/types/base";
import type { MenuItemData } from "@/components/types";
import { useFeatureLayerUtils } from "@/modules/scenarioeditor/featureLayerUtils"; // Giả định module này có hook React

// Hooks / Contexts replacements
import { useActiveScenario } from "@/components/injects"; 
import { useGeoStore } from "@/stores/geoStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useScenarioInfoPanelStore } from "@/stores/scenarioInfoPanelStore";
import { useUiStore } from "@/stores/uiStore";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

// --- HOOK 1: Unit Actions ---

export function useUnitActions() {
  const {
    unitActions,
    store: { groupUpdate },
  } = useActiveScenario();
  
  // Zustand hooks
  const geoStore = useGeoStore(); 
  const { 
    activeUnitId, 
    selectedUnitIds,
    setActiveUnitId,
    setSelectedUnitIds, 
    clearSelectedUnitIds, 
    addSelectedUnitId,
    deleteSelectedUnitId
  } = useSelectedItems(); // Giả định Zustand store expose các method này

  const _onUnitAction = useCallback((
    unit: NUnit | undefined | null,
    action: UnitAction,
    waypointIds?: EntityId[],
  ) => {
    if (!unit) return;

    if (action === UnitActions.Expand) {
      unitActions.walkSubUnits(
        unit.id,
        (unit1) => {
          unit1._isOpen = true; // Lưu ý: Mutating state trực tiếp chỉ OK nếu dùng Immer hoặc Proxy object trong store
        },
        { includeParent: true },
      );
    }

    if (action === UnitActions.Zoom) {
      if (getUnitRuntimeState(unit.id)?.location) {
        geoStore.zoomToUnit(unit, 0);
      } else {
        const subUnits: NUnit[] = [];
        unitActions.walkSubUnits(
          unit.id,
          (unit1) => {
            subUnits.push(unit1);
          },
          {},
        );
        const locations = subUnits
          .filter((u) => getUnitRuntimeState(u.id)?.location)
          // @ts-ignore
          .map((u) => getUnitRuntimeState(u.id)?.location);

        if (locations.length > 0) {
          // @ts-ignore: Turf types mismatch sometimes
          const bb = new GeoJSON().readFeature(turfEnvelope(multiPoint(locations)), {
            featureProjection: "EPSG:3857",
            dataProjection: "EPSG:4326",
          }) as Feature<any>;
          
          if (bb && geoStore.olMap) {
            geoStore.olMap.getView().fit(bb.getGeometry(), { maxZoom: 17 });
          }
        }
      }
    }

    if (action === UnitActions.Pan) geoStore.panToUnit(unit, 500);
    
    if (action === UnitActions.Lock) {
      unitActions.updateUnitLocked(unit.id, true);
    }
    if (action === UnitActions.Unlock) {
      unitActions.updateUnitLocked(unit.id, false);
    }

    if (unitActions.isUnitLocked(unit.id)) return;

    if (action === UnitActions.AddSubordinate) {
      // unit._isOpen = true; // Cần update thông qua action nếu state là immutable
      unitActions.createSubordinateUnit(unit.id);
    }

    if (action === UnitActions.Edit) {
      // Clear & Set selection
      // Trong Zustand có thể là: setSelectedUnitIds(new Set([unit.id]))
      // Hoặc: 
      clearSelectedUnitIds();
      addSelectedUnitId(unit.id);
    }

    if (action === UnitActions.Clone) unitActions.cloneUnit(unit.id);
    if (action === UnitActions.CloneWithState) unitActions.cloneUnit(unit.id, { includeState: true });
    if (action === UnitActions.CloneWithSubordinates) unitActions.cloneUnit(unit.id, { includeSubordinates: true });
    if (action === UnitActions.CloneWithSubordinatesAndState)
      unitActions.cloneUnit(unit.id, { includeSubordinates: true, includeState: true });
    
    if (action === UnitActions.MoveUp) unitActions.reorderUnit(unit.id, "up");
    if (action === UnitActions.MoveDown) unitActions.reorderUnit(unit.id, "down");

    if (
      action === UnitActions.Delete ||
      (action === UnitActions.ClearStateOrDelete && !unit.state?.length)
    ) {
      if (activeUnitId === unit.id) {
        setActiveUnitId(null);
      }
      unitActions.deleteUnit(unit.id);
      deleteSelectedUnitId(unit.id);
    }

    if (action === UnitActions.DeleteWaypoints && waypointIds && waypointIds.length) {
      waypointIds.forEach((wid) =>
        unitActions.deleteUnitStateEntryByStateId(unit.id, wid),
      );
    }

    if (action === UnitActions.ClearState || action === UnitActions.ClearStateOrDelete) {
      unitActions.clearUnitState(unit.id);
    }
  }, [activeUnitId, unitActions, geoStore, setActiveUnitId, clearSelectedUnitIds, addSelectedUnitId, deleteSelectedUnitId]);

  const onUnitAction = useCallback((
    unitOrUnits: NUnit | NUnit[] | null,
    action: UnitAction,
    waypointIds?: EntityId[],
  ) => {
    if (!unitOrUnits) return;
    if (Array.isArray(unitOrUnits)) {
      groupUpdate(() => {
        if (action === UnitActions.Zoom || action === UnitActions.Pan) {
          geoStore.zoomToUnits(unitOrUnits, { duration: 500 });
        } else {
          unitOrUnits.forEach((unit) => _onUnitAction(unit, action, waypointIds));
        }
      });
    } else {
      _onUnitAction(unitOrUnits, action, waypointIds);
    }
  }, [groupUpdate, geoStore, _onUnitAction]);

  return { onUnitAction };
}

// --- HOOK 2: Unit Menu Items ---

export function useUnitMenu(
  item: OrbatItemData | NOrbatItemData | Unit,
  isLocked: boolean, // React pass value, not Ref
  isSideGroupLocked: boolean
) {
  // Normalize input
  const unit = "unit" in item ? item.unit : item;
  
  // React Memo to re-calculate menu items only when dependencies change
  const unitMenuItems = useMemo((): MenuItemData<UnitAction>[] => {
    const hasChildren = Boolean(unit.subUnits && unit.subUnits.length);
    const hasLocation = Boolean(getUnitRuntimeState(unit.id)?.location);

    return [
      {
        label: "Add subordinate",
        action: UnitActions.AddSubordinate,
        disabled: isLocked,
      },
      { label: "Delete", action: UnitActions.Delete, disabled: isLocked },
      { label: "Clear state", action: UnitActions.ClearState, disabled: isLocked },
      { label: "Edit", action: UnitActions.Edit, disabled: isLocked },
      {
        label: "Expand",
        action: UnitActions.Expand,
        disabled: !hasChildren,
      },
      {
        label: "Zoom to",
        action: UnitActions.Zoom,
        disabled: !hasLocation,
      },
      { label: "Duplicate", action: UnitActions.Clone, disabled: isLocked },
      {
        label: "Duplicate (with state)",
        action: UnitActions.CloneWithState,
        disabled: isLocked,
      },
      {
        label: "Duplicate hierarchy",
        action: UnitActions.CloneWithSubordinates,
        disabled: isLocked,
      },
      {
        label: "Duplicate hierarchy (with state)",
        action: UnitActions.CloneWithSubordinatesAndState,
        disabled: isLocked,
      },
      { label: "Move up", action: UnitActions.MoveUp, disabled: isLocked },
      { label: "Move down", action: UnitActions.MoveDown, disabled: isLocked },
      unit.locked
        ? {
            label: "Unlock",
            action: UnitActions.Unlock,
            disabled: isSideGroupLocked,
          }
        : {
            label: "Lock",
            action: UnitActions.Lock,
            disabled: isSideGroupLocked,
          },
    ];
  }, [unit, isLocked, isSideGroupLocked]);

  return { unitMenuItems };
}

// --- HOOK 3: Feature Actions ---

export function useScenarioFeatureActions() {
  const geoStore = useGeoStore();
  const mapRef = geoStore.olMap; // Assuming olMap is in store
  
  const {
    store: { groupUpdate },
    geo,
  } = useActiveScenario();

  // Assuming useFeatureLayerUtils is adapted for React or is a utility function
  // If it's a hook, we call it unconditionally. If mapRef is null, it should handle gracefully.
  const { zoomToFeature, panToFeature, zoomToFeatures } = useFeatureLayerUtils(mapRef as OLMap);

  const onFeatureAction = useCallback((
    featureOrFeaturesId: FeatureId | FeatureId[],
    action: "zoom" | "pan" | "delete" | string,
  ) => {
    const isArray = Array.isArray(featureOrFeaturesId);
    
    if (isArray && (action === "zoom" || action === "pan")) {
      zoomToFeatures(featureOrFeaturesId);
      return;
    }

    groupUpdate(
      () => {
        const ids = isArray ? featureOrFeaturesId : [featureOrFeaturesId];
        ids.forEach((featureId) => {
          if (action === "zoom") zoomToFeature(featureId);
          if (action === "pan") panToFeature(featureId);
          if (action === "delete") geo.deleteFeature(featureId);
          if (action === "duplicate") {
            geo.duplicateFeature(featureId);
          }
        });
      },
      { label: "batchLayer", value: "dummy" },
    );
  }, [groupUpdate, geo, zoomToFeature, panToFeature, zoomToFeatures]);

  return { onFeatureAction };
}

// --- HOOK 4: TOE Actions (UI Navigation) ---

export function useToeActions() {
  // Assuming these are Zustand stores
  const setActiveTabIndex = useUiStore((s) => s.setActiveTabIndex);
  const setScenarioInfo = useScenarioInfoPanelStore((s) => s.setState); // Generic setter or specific actions

  const goToAddEquipment = useCallback(() => {
    setActiveTabIndex(TAB_SCENARIO_SETTINGS);
    setScenarioInfo({ showAddEquipment: true, tabIndex: 1 });
  }, [setActiveTabIndex, setScenarioInfo]);

  const goToAddPersonnel = useCallback(() => {
    setActiveTabIndex(TAB_SCENARIO_SETTINGS);
    setScenarioInfo({ showAddPersonnel: true, tabIndex: 2 });
  }, [setActiveTabIndex, setScenarioInfo]);

  const goToAddSupplies = useCallback(() => {
    setActiveTabIndex(TAB_SCENARIO_SETTINGS);
    setScenarioInfo({ showAddSupplies: true, tabIndex: 3 });
  }, [setActiveTabIndex, setScenarioInfo]);

  const goToAddGroup = useCallback(() => {
    setActiveTabIndex(TAB_SCENARIO_SETTINGS);
    setScenarioInfo({ showAddGroup: true, tabIndex: 4 });
  }, [setActiveTabIndex, setScenarioInfo]);

  return { goToAddEquipment, goToAddPersonnel, goToAddSupplies, goToAddGroup };
}