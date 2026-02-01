"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ChevronLeft, ChevronRight, Settings, MousePointer2, Move, 
  Lock, LockKeyholeOpen, MapPin, Pencil, Plus, RotateCcw, 
  RotateCw, Ruler, SkipBack, SkipForward, Calendar 
} from "lucide-react";

// Components
import MainToolbarButton from "@/components/MainToolbarButton";
import PanelSymbolButton from "@/components/PanelSymbolButton";
import FloatingPanel from "@/components/FloatingPanel";
import SymbolPickerPopover from "@/modules/scenarioeditor/SymbolPickerPopover";
import EchelonPickerPopover from "@/modules/scenarioeditor/EchelonPickerPopover";
import { Button } from "@/components/ui/button";

// Hooks & Stores
import { useActiveScenario, useActiveMap } from "@/components/injects";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import { useUnitSettingsStore } from "@/stores/geoStore";
import { useMapSelectStore } from "@/stores/mapSelectStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useActiveUnit } from "@/stores/dragStore";
import { useToolbarUnitSymbolData, useToolbarStore } from "@/hooks/mainToolbarData";
import { useGetMapLocation } from "@/hooks/geoMapLocation";
import { useEventBus } from "@/lib/eventBus"; // React version of useEventBus
import { orbatUnitClick } from "@/components/eventKeys";

// Utils & Types
import { SID_INDEX, Sidc } from "@/symbology/sidc";
import { CUSTOM_SYMBOL_PREFIX } from "@/config/constants";
import { cn } from "@/lib/utils";

interface MapEditorMainToolbarProps {
  onOpenTimeModal: () => void;
  onIncDay: () => void;
  onDecDay: () => void;
  onNextEvent: () => void;
  onPrevEvent: () => void;
  onShowSettings: () => void;
}

export default function MapEditorMainToolbar(props: MapEditorMainToolbarProps) {
  const { store: scnStore, unitActions, geo, helpers } = useActiveScenario();
  const mapRef = useActiveMap();
  
  // Zustand Stores
  const toolbarStore = useMainToolbarStore();
  const unitSettings = useUnitSettingsStore();
  const selectStore = useMapSelectStore();
  const { selectedUnitIds } = useSelectedItems();
  const { activeUnitId, resetActiveParent, activeParent, activeParentId } = useActiveUnit();
  const { currentSid, currentEchelon, activeSidc } = useToolbarUnitSymbolData();
  const { setCurrentEchelon, setCurrentSid, setActiveSidc } = useToolbarStore();

  // Use selected unit as parent if activeParentId is not set
  const effectiveParentId = activeParentId || (selectedUnitIds.size === 1 ? Array.from(selectedUnitIds)[0] : null);
  const effectiveParent = effectiveParentId ? helpers.getUnitById(effectiveParentId as string) : activeParent;

  // --- Computed (useMemo) ---
  const computedSidc = useMemo(() => {
    const baseSidc = activeSidc.startsWith(CUSTOM_SYMBOL_PREFIX)
      ? "10031000141211000000"
      : activeSidc;
    const parsed = new Sidc(baseSidc);
    parsed.standardIdentity = currentSid;
    parsed.emt = "00";
    parsed.hqtfd = "0";
    return parsed.toString();
  }, [activeSidc, currentSid]);

  const symbolOptions = useMemo(() => {
    if (!effectiveParent) return {};
    return { ...unitActions.getCombinedSymbolOptions(effectiveParent, true), outlineWidth: 5 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveParent]);

  // --- Map Location Logic ---
  const { 
    start: startGetLocation, 
    isActive: isGetLocationActive, 
    cancel: cancelGetLocation,
  } = useGetMapLocation(mapRef, {
    onGetLocation: (location: import("geojson").Position) => {
      console.log("onGetLocation called", { location, effectiveParentId });
      selectStore.setHoverEnabled(true);
      
      if (!effectiveParentId) {
        console.warn("No active parent selected. Please select a unit in the ORBAT panel first.");
        return;
      }
      
      if (unitActions.isUnitLocked(effectiveParentId as string)) {
        console.warn("Parent unit is locked.");
        return;
      }
      
      scnStore.groupUpdate(() => {
        const sidcObj = new Sidc(activeSidc);
        sidcObj.emt = currentEchelon;
        sidcObj.standardIdentity = currentSid;
        
        console.log("Creating unit with sidc:", sidcObj.toString());
        const unitId = unitActions.createSubordinateUnit(effectiveParentId as string, {
          sidc: sidcObj.toString(),
          name: `${(effectiveParent?.subUnits?.length ?? 0) + 1}`,
        });
        console.log("Unit created", { unitId, sidc: sidcObj.toString() });
        
        if (unitId) {
          console.log("Adding unit position", { unitId, location });
          geo.addUnitPosition(unitId, location);
          console.log("Unit position added");
        } else {
          console.error("Failed to create unit - unitId is null/undefined");
        }
      });

      if (toolbarStore.addMultiple && activeSidc) {
        startGetLocation();
      }
    },
    onStart: () => {
      console.log("Map location picker started");
      selectStore.setHoverEnabled(false);
    },
    onCancel: () => {
      console.log("Map location picker cancelled");
      selectStore.setHoverEnabled(true);
    }
  });

  // --- Effects ---
  useEffect(() => {
    if (!effectiveParentId) resetActiveParent();
  }, [effectiveParentId, resetActiveParent]);

  // Event Bus listener (ORBAT click during placement)
  useEventBus(orbatUnitClick, (unit) => {
    if (isGetLocationActive) {
      if (!toolbarStore.addMultiple) cancelGetLocation();
      
      const sidcObj = new Sidc(activeSidc);
      sidcObj.emt = currentEchelon;
      sidcObj.standardIdentity = unit.sidc[SID_INDEX];
      
      unitActions.createSubordinateUnit(unit.id, {
        sidc: sidcObj.toString(),
        name: `${(activeParent?.subUnits?.length ?? 0) + 1}`,
      });
    }
  });

  // --- Callbacks ---
  const handleSelectEchelon = useCallback((sidc: string) => {
    const s = new Sidc(sidc);
    setCurrentEchelon(s.emt);
    setCurrentSid(s.standardIdentity);
  }, [setCurrentEchelon, setCurrentSid]);

  const handleAddUnit = useCallback((sidc: string) => {
    setActiveSidc(sidc);
    startGetLocation();
  }, [setActiveSidc, startGetLocation]);

  return (
    <nav className="bg-background border-border pointer-events-auto flex w-full items-center justify-between border p-1 text-sm shadow-sm sm:rounded-xl sm:p-2 md:w-auto">
      <section className="flex items-center justify-between">
        {/* Placement Mode Lock */}
        <MainToolbarButton 
          title="Keep tool active" 
          onClick={() => toolbarStore.setAddMultiple(!toolbarStore.addMultiple)}
          className="hidden sm:flex"
        >
          {toolbarStore.addMultiple ? <Lock className="size-5" /> : <LockKeyholeOpen className="size-6" />}
        </MainToolbarButton>

        <MainToolbarButton 
          onClick={() => unitSettings.setMoveUnitEnabled(false)} 
          active={!unitSettings.moveUnitEnabled}
        >
          <MousePointer2 className="size-6" />
        </MainToolbarButton>

        <MainToolbarButton 
          active={unitSettings.moveUnitEnabled}
          onClick={() => unitSettings.setMoveUnitEnabled(true)}
          title="Move unit"
        >
          <Move className="size-6" />
        </MainToolbarButton>

        <MainToolbarButton onClick={props.onShowSettings} title="Settings" className="hidden md:flex">
          <Settings className="size-6" />
        </MainToolbarButton>

        <div className="border-border h-7 border-l-2 sm:mx-1" />

        {/* Toolbars Toggles */}
        <MainToolbarButton 
          active={toolbarStore.currentToolbar === 'measurements'}
          onClick={() => toolbarStore.toggleToolbar('measurements')}
          title="Measurements"
        >
          <Ruler className="size-6" />
        </MainToolbarButton>

        <MainToolbarButton 
          active={toolbarStore.currentToolbar === 'draw'}
          onClick={() => toolbarStore.toggleToolbar('draw')}
          title="Draw"
        >
          <Pencil className="size-6" />
        </MainToolbarButton>

        <MainToolbarButton 
          active={toolbarStore.currentToolbar === 'track'}
          onClick={() => toolbarStore.toggleToolbar('track')}
          title="Unit track"
        >
          <MapPin className="size-6" />
        </MainToolbarButton>

        <div className="border-border h-7 border-l-2 sm:mx-1" />

        {/* Symbol & Echelon Pickers */}
        <div className="ml-2 flex items-center">
          <EchelonPickerPopover 
            symbolOptions={symbolOptions} 
            selectEchelon={handleSelectEchelon} 
          />
          
          <PanelSymbolButton
            size={22}
            sidc={computedSidc}
            className="group relative ml-2 sm:ml-5"
            symbolOptions={symbolOptions}
            onClick={() => {
              console.log("Add unit clicked", { activeSidc, effectiveParentId });
              setActiveSidc(activeSidc);
              startGetLocation();
            }}
            title="Add unit"
          >
            <Plus className="bg-opacity-70 text-muted-foreground group-hover:text-foreground bg-background absolute -right-2 bottom-0 h-4 w-4 rounded-full border" />
          </PanelSymbolButton>

          <SymbolPickerPopover symbolOptions={symbolOptions} addUnit={handleAddUnit} />
        </div>
      </section>

      

      {/* History and Time Controls */}
      <section className="flex items-center">
        <div className="border-border -mx-1 h-7 border-l-2 sm:mx-1" />
        
        <MainToolbarButton title="Undo" onClick={() => scnStore.undo()} disabled={!scnStore.canUndo}>
          <RotateCcw className="size-6" />
        </MainToolbarButton>
        <MainToolbarButton title="Redo" onClick={() => scnStore.redo()} disabled={!scnStore.canRedo}>
          <RotateCw className="size-6" />
        </MainToolbarButton>

        <div className="border-border mx-1 hidden h-7 border-l-2 sm:block" />

        <MainToolbarButton title="Time" className="hidden sm:flex" onClick={props.onOpenTimeModal}>
          <Calendar className="size-5" />
        </MainToolbarButton>

        <MainToolbarButton title="Prev Day" className="hidden sm:flex" onClick={props.onDecDay}>
          <ChevronLeft className="size-5" />
        </MainToolbarButton>
        <MainToolbarButton title="Next Day" className="hidden sm:flex" onClick={props.onIncDay}>
          <ChevronRight className="size-5" />
        </MainToolbarButton>

        <MainToolbarButton title="Prev Event" className="hidden sm:flex" onClick={props.onPrevEvent}>
          <SkipBack className="size-5" />
        </MainToolbarButton>
        <MainToolbarButton title="Next Event" className="hidden sm:flex" onClick={props.onNextEvent}>
          <SkipForward className="size-5" />
        </MainToolbarButton>
      </section>

      {/* Placement Instruction Overlay */}
      {isGetLocationActive && (
        <FloatingPanel className="bg-opacity-75 absolute bottom-14 overflow-visible p-2 px-4 text-sm sm:bottom-16 sm:left-1/2 sm:-translate-x-1/2">
          Click on map or ORBAT to place unit.
          <Button variant="link" size="sm" onClick={() => cancelGetLocation()}>
            Cancel
          </Button>
        </FloatingPanel>
      )}
    </nav>
  );
}