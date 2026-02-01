"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Crosshair, 
  MapPin, 
  MapPinOff, 
  Route, 
  MoreVertical 
} from "lucide-react";

// Types & Stores
import type { NState, NUnit } from "@/types/internalModels";
import type { StateAdd } from "@/types/scenarioModels";
import { type StateAction, UnitActions } from "@/types/constants";
import { useUiStore } from "@/stores/uiStore";
import { useSelectedWaypoints } from "@/stores/selectedWaypoints";
import { useTimeFormatStore } from "@/stores/timeFormatStore";

// Hooks & Utils
import { useActiveScenario, useSidcModal, useTimeModal } from "@/components/injects";
import { useUnitActions } from "@/hooks/scenarioActions";
import { formatDateString, formatPosition } from "@/geo/utils";
import { useLocalStorage } from "usehooks-ts"; // Custom hook
import { useTimeFormatters } from "@/stores/timeFormatStore";

// Components
import IconButton from "@/components/IconButton";
import DotsMenu from "@/components/DotsMenu";
import CoordinateInput, { type CoordinateInputFormat } from "@/components/CoordinateInput";
import SplitButton from "@/components/SplitButton";
import UnitStatusPopover from "@/modules/scenarioeditor/UnitStatusPopover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  unit: NUnit;
  isLocked?: boolean;
}

export default function UnitPanelState({ unit, isLocked = false }: Props) {
  const { store, time, unitActions } = useActiveScenario();
  const { getModalTimestamp } = useTimeModal();
  const modalSidc = useSidcModal();
  const { onUnitAction } = useUnitActions();
  
  const unitStatusMap = store.state.unitStatusMap;
  const { scenarioFormatter } = useTimeFormatters();
  const uiState = useUiStore();
  const { selectedWaypointIds, toggleWaypoint } = useSelectedWaypoints();

  const [coordinateInputFormat, setCoordinateInputFormat] = useLocalStorage<CoordinateInputFormat>(
    "coordinateInputFormat",
    "LonLat"
  );

  // --- Local UI State ---
  const [editedTitle, setEditedTitle] = useState<NState | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [editedPosition, setEditedPosition] = useState<NState | null>(null);
  const [newPosition, setNewPosition] = useState<any>(null);
  const [editInitialPosition, setEditInitialPosition] = useState(false);

  const state = useMemo(() => unit.state || [], [unit.state]);

  // --- Menu Items ---
  const menuItems = useMemo(() => [
    { label: "Delete", action: "delete", disabled: isLocked },
    { label: "Duplicate", action: "duplicate", disabled: isLocked },
    { label: "Change time", action: "changeTime", disabled: isLocked },
    { label: "Edit title", action: "editTitle", disabled: isLocked },
    { label: "Edit location", action: "editLocation", disabled: isLocked },
    { label: "Clear location", action: "clearLocation", disabled: isLocked },
    { label: "Convert to initial position", action: "convertToInitialPosition", disabled: isLocked },
  ], [isLocked]);

  const initialMenuItems = useMemo(() => [
    { label: "Delete", action: "delete", disabled: isLocked },
    { label: "Edit initial position", action: "editLocation", disabled: isLocked },
  ], [isLocked]);

  const stateItems = useMemo(() => [
    { label: "Change symbol", onClick: () => handleChangeSymbol(), disabled: isLocked },
    { label: "Remove from map", onClick: () => handleRemoveFromMap(), disabled: isLocked },
  ], [isLocked, unit.sidc]);

  // --- Handlers ---
  const isActive = useCallback((s: NState, index: number) => {
    if (!state.length) return false;
    const nextUnitTimestamp = state[index + 1]?.t || Number.MAX_VALUE;
    const currentTime = store.state.currentTime;
    return s.t <= currentTime && nextUnitTimestamp > currentTime;
  }, [state, store.state.currentTime]);

  const onStateAction = async (index: number, action: string) => {
    if (action === "delete") {
      if (index < 0) {
        unitActions.updateUnit(unit.id, { location: undefined }, { doUpdateUnitState: true });
      } else {
        unitActions.deleteUnitStateEntry(unit.id, index);
      }
    } else if (action === "editTitle") {
      const s = state[index];
      setEditedTitle(s);
      setNewTitle(s.title || "");
    } else if (action === "editLocation") {
      if (index < 0) {
        setEditInitialPosition(true);
        setNewPosition(unit.location ?? [0, 0]);
      } else {
        const s = state[index];
        setEditedPosition(s);
        setNewPosition(s.location);
      }
    } else if (action === "changeTime") {
      const newTimestamp = await getModalTimestamp(state[index].t, {
        timeZone: store.state.info.timeZone,
        title: "Set event time",
      });
      if (newTimestamp !== undefined) {
        unitActions.updateUnitStateEntry(unit.id, index, { t: newTimestamp });
      }
    } else if (action === "duplicate") {
      unitActions.addUnitStateEntry(unit.id, { ...state[index], t: store.state.currentTime });
    }
    // ... rest of actions
  };

  const doneEditTitle = (s: NState) => {
    const index = state.indexOf(s);
    if (index >= 0 && newTitle !== s.title) {
      unitActions.updateUnitStateEntry(unit.id, index, { title: newTitle });
    }
    setEditedTitle(null);
  };

  const doneEditPosition = (s: NState) => {
    const index = state.indexOf(s);
    if (index >= 0) {
      unitActions.updateUnitStateEntry(unit.id, index, { location: newPosition });
    }
    setEditedPosition(null);
  };

  async function handleChangeSymbol() {
    if (!modalSidc?.getModalSidc) return;
    const newSidcValue = await modalSidc.getModalSidc(unit.sidc, {
      title: `Change symbol at ${formatDateString(store.state.currentTime, store.state.info.timeZone)}`,
      symbolOptions: unitActions.getCombinedSymbolOptions(unit),
    });
    if (newSidcValue !== undefined) {
      unitActions.addUnitStateEntry(unit.id, {
        sidc: newSidcValue.sidc,
        t: store.state.currentTime,
        symbolOptions: newSidcValue.symbolOptions,
      }, true);
    }
  }

  function handleRemoveFromMap() {
    unitActions.addUnitStateEntry(unit.id, { location: null, t: store.state.currentTime }, true);
  }

  return (
    <section>
      <h3 className="text-foreground mt-6 font-medium">Unit state</h3>
      <div className="flex items-center justify-between">
        <span className="text-sm">Change</span>
        <div className="flex items-center gap-1">
          <UnitStatusPopover onUpdate={(s) => unitActions.addUnitStateEntry(unit.id, { status: s, t: store.state.currentTime }, true)} disabled={isLocked} />
          <SplitButton items={stateItems} />
        </div>
      </div>

      

      <ul className="divide-border border-border mt-2 divide-y border-t border-b">
        {/* Initial Position */}
        {unit.location && (
          <li className="relative flex items-center py-4">
            <div className="flex min-w-0 flex-auto flex-col text-sm">
              <span className="text-muted-foreground font-medium">Initial position</span>
              {editInitialPosition ? (
                <CoordinateInput
                  value={newPosition}
                  onChange={setNewPosition}
                  format={coordinateInputFormat}
                  onFormatChange={setCoordinateInputFormat}
                  onBlur={() => {
                    setEditInitialPosition(false);
                    unitActions.updateUnit(unit.id, { location: newPosition }, { doUpdateUnitState: true });
                  }}
                  autoFocus
                />
              ) : (
                <p className="text-foreground cursor-pointer" onDoubleClick={() => {
                  setEditInitialPosition(true);
                  setNewPosition(unit.location);
                }}>
                  {formatPosition(unit.location)}
                </p>
              )}
            </div>
            <DotsMenu items={initialMenuItems} onAction={(act) => onStateAction(-1, act)} portal />
          </li>
        )}

        {/* State History */}
        {state.map((s, index) => (
          <li
            key={s.id}
            className={cn(
              "relative flex items-center py-4 transition-colors",
              selectedWaypointIds.has(s.id) ? "bg-accent/10" : ""
            )}
          >
            <div className="flex min-w-0 flex-auto flex-col text-sm">
              <button
                className={cn(
                  "flex text-left hover:underline",
                  isActive(s, index) ? "text-foreground font-bold" : "text-muted-foreground font-medium"
                )}
                onClick={() => time.setCurrentTime(s.t)}
              >
                {scenarioFormatter.format(s.t)}
              </button>

              {s === editedTitle ? (
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => doneEditTitle(s)}
                  onKeyDown={(e) => e.key === 'Enter' && doneEditTitle(s)}
                  autoFocus
                />
              ) : s.title ? (
                <p className="text-foreground my-1 leading-tight font-medium cursor-pointer" onDoubleClick={() => onStateAction(index, 'editTitle')}>
                  {s.title}
                </p>
              ) : null}

              {s === editedPosition ? (
                <CoordinateInput
                  value={newPosition}
                  onChange={setNewPosition}
                  format={coordinateInputFormat}
                  onFormatChange={setCoordinateInputFormat}
                  onBlur={() => doneEditPosition(s)}
                  autoFocus
                />
              ) : s.location ? (
                <p className="text-foreground mt-1 cursor-pointer" onDoubleClick={() => onStateAction(index, 'editLocation')}>
                  {formatPosition(s.location)}
                </p>
              ) : s.location === null ? (
                <MapPinOff className="text-muted-foreground h-5 w-5" />
              ) : null}

              {/* Badges Section */}
              <div className="mt-1 flex flex-wrap gap-1">
                {s.sidc && <span className="bg-accent/10 text-accent-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">SIDC</span>}
                {s.status && (
                  <span className="bg-muted/10 text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {unitStatusMap[s.status]?.name}
                  </span>
                )}
                {/* Other badges... */}
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <IconButton title="Goto Time and Place" onClick={() => time.setCurrentTime(s.t)}>
                <Crosshair className="h-5 w-5" />
              </IconButton>
              <DotsMenu items={menuItems} onAction={(act) => onStateAction(index, act)} portal />
            </div>

            {/* Path/Interpolation indicator */}
            {(s.via?.length || s.interpolate === false) && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <div className="border-border bg-muted flex items-center rounded-full border px-4 py-0.5">
                  {s.via?.length ? <Route className="text-muted-foreground h-5 w-5" /> : <MapPin className="text-muted-foreground h-5 w-5" />}
                  {s.viaStartTime && (
                    <span className="text-muted-foreground ml-2 text-xs">
                      {formatDateString(s.viaStartTime, store.state.info.timeZone)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}