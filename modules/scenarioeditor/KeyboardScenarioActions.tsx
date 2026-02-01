"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useUiStore } from "@/stores/uiStore";
import { inputEventFilter } from "@/components/helpers";
import { useActiveScenario, useSearchActions } from "@/components/injects";
import { useActiveUnit } from "@/stores/dragStore";
import { useScenarioFeatureActions, useUnitActions } from "@/hooks/scenarioActions";
import { UnitActions } from "@/types/constants";
import { useUnitSettingsStore } from "@/stores/geoStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useSelectedWaypoints } from "@/stores/selectedWaypoints";
import { usePlaybackStore } from "@/stores/playbackStore";
import { FeatureId } from "@/types/scenarioGeoModels"; 

export default function KeyboardScenarioActions() {
  // --- Hooks & Stores ---
  const uiStore = useUiStore();
  const activeUnitStore = useActiveUnit();
  const unitSettings = useUnitSettingsStore();
  const playback = usePlaybackStore();
  
  const { 
    unitActions, 
    helpers: { getUnitById } 
  } = useActiveScenario();

  const searchActions = useSearchActions();
  const onUnitSelect = searchActions?.onUnitSelect;

  const {
    clear: clearSelected,
    selectedUnitIds,
    selectedFeatureIds,
    activeUnitId,
    activeScenarioEventId,
    setActiveScenarioEventId,
  } = useSelectedItems();

  const { selectedWaypointIds } = useSelectedWaypoints();
  
  const { onUnitAction } = useUnitActions();
  const { onFeatureAction } = useScenarioFeatureActions();

  // --- Computed ---
  
  const shortcutsEnabled = !uiStore.modalOpen;

  const selectedUnits = useMemo(() => {
    return Array.from(selectedUnitIds).map((id) => getUnitById(id));
  }, [selectedUnitIds, getUnitById]);

  const activeUnit = useMemo(() => {
    return (activeUnitId && getUnitById(activeUnitId)) || null;
  }, [activeUnitId, getUnitById]);

  // --- Actions ---

  const createNewUnit = useCallback(() => {
    if (activeUnitId) unitActions.createSubordinateUnit(activeUnitId);
  }, [activeUnitId, unitActions]);

  const duplicateUnit = useCallback(() => {
    if (activeUnitId) unitActions.cloneUnit(activeUnitId);
  }, [activeUnitId, unitActions]);

  const isTargetReka = (target: HTMLElement) => {
    return (
      (target?.id && (target.id.includes("dropdown") || target.id.includes("popover"))) ||
      ["dropdown", "context-menu", "popover", "select"].some((type) =>
        target.dataset?.slot?.includes(type)
      )
    );
  };

  const isRekaComponent = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (!target) return false;
    return (
      isTargetReka(target) || (target.parentElement && isTargetReka(target.parentElement))
    );
  };

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (uiStore.getEscEnabled()) {
      if (isRekaComponent(e)) return;
      
      clearSelected();
      activeUnitStore.clearActiveUnit();
      if (setActiveScenarioEventId) setActiveScenarioEventId(null);
    }
  }, [uiStore.getEscEnabled, clearSelected, activeUnitStore, setActiveScenarioEventId]);

  const handleZoomShortcut = useCallback(() => {
    if (selectedFeatureIds.size > 0) {
      const fIds = Array.from(selectedFeatureIds);
      const target = fIds.length > 1 ? fIds : fIds[0];
      onFeatureAction(target as any, "zoom");
    } else if (selectedUnitIds.size > 0 || activeUnit) {
      if (selectedUnitIds.size > 1) {
        const units = Array.from(selectedUnitIds).map((id) => getUnitById(id));
        onUnitAction(units, UnitActions.Zoom);
      } else {
        onUnitAction(activeUnit, UnitActions.Zoom);
      }
    }
  }, [selectedFeatureIds, selectedUnitIds, activeUnit, onFeatureAction, onUnitAction, getUnitById]);

  const handlePanShortcut = useCallback(() => {
    if (selectedFeatureIds.size > 0) {
      const fIds = Array.from(selectedFeatureIds);
      const target = fIds.length > 1 ? fIds : fIds[0];
      onFeatureAction(target as any, "pan");
    } else if (selectedUnitIds.size > 0 || activeUnit) {
      if (selectedUnitIds.size > 1) {
        const units = Array.from(selectedUnitIds).map((id) => getUnitById(id));
        onUnitAction(units, UnitActions.Pan);
      } else {
        onUnitAction(activeUnit, UnitActions.Pan);
      }
    }
  }, [selectedFeatureIds, selectedUnitIds, activeUnit, onFeatureAction, onUnitAction, getUnitById]);

  const handleMoveShortcut = useCallback(() => {
    unitSettings.setMoveUnitEnabled(!unitSettings.moveUnitEnabled);
  }, [unitSettings]);

  const handleDelete = useCallback(() => {
    if (selectedWaypointIds.size > 0) {
      const wIds = Array.from(selectedWaypointIds);
      onUnitAction(selectedUnits, UnitActions.DeleteWaypoints, wIds);
      return;
    }
    onUnitAction(selectedUnits, UnitActions.ClearStateOrDelete);
    
    // SỬA LỖI 3: Ép kiểu mảng FeatureId
    onFeatureAction(Array.from(selectedFeatureIds) as any, "delete");
  }, [selectedWaypointIds, selectedUnits, selectedFeatureIds, onUnitAction, onFeatureAction]);

  const handleLocate = useCallback(() => {
    if (activeUnit && onUnitSelect) {
      // SỬA LỖI 1: Gọi trực tiếp function onUnitSelect
      onUnitSelect({ unitId: activeUnit.id, options: { noZoom: true } });
    }
  }, [activeUnit, onUnitSelect]);

  const handlePlaybackShortcut = useCallback(() => {
    playback.togglePlayback();
  }, [playback]);

  const handleSpecialKeys = useCallback((e: KeyboardEvent) => {
    if (e.key === "<") {
      playback.decreaseSpeed();
    } else if (e.key === ">") {
      playback.increaseSpeed();
    }
  }, [playback]);

  // --- Main Event Listener ---

  useEffect(() => {
    if (!shortcutsEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!inputEventFilter(e)) return;

      const key = e.key.toLowerCase();
      const noMods = !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;
      
      if (key === "c" && noMods) {
        createNewUnit();
      } else if (key === "d" && noMods) {
        duplicateUnit();
      } else if (e.key === "Escape") {
        handleEscape(e);
      } else if (key === "z" && noMods) {
        handleZoomShortcut();
      } else if (key === "p") {
        if (e.altKey) { 
           handlePlaybackShortcut();
        } else if (noMods) {
           handlePanShortcut();
        }
      } else if (key === "k" && noMods) {
        handlePlaybackShortcut();
      } else if (key === "m" && noMods) {
        handleMoveShortcut();
      } else if ((e.key === "Delete" || e.key === "Backspace") && noMods) {
        handleDelete();
      } else if (key === "l" && noMods) {
        handleLocate();
      } else {
        handleSpecialKeys(e);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    shortcutsEnabled,
    createNewUnit,
    duplicateUnit,
    handleEscape,
    handleZoomShortcut,
    handlePlaybackShortcut,
    handlePanShortcut,
    handleMoveShortcut,
    handleDelete,
    handleLocate,
    handleSpecialKeys
  ]);

  return null;
}