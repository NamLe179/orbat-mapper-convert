"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { 
  Crosshair, 
  FolderTree, 
  Image as ImageIcon, 
  Lock, 
  Search as ZoomIcon, 
  Pencil as EditIcon 
} from "lucide-react";
import { useEventListener } from "usehooks-ts";

// UI Components (Shadcn/Custom)
import { TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScrollTabs from "@/components/ScrollTabs";
import IconButton from "@/components/IconButton";
import EditableLabel from "@/components/EditableLabel";
import DotsMenu from "@/components/DotsMenu";
import SplitButton from "@/components/SplitButton";
import DescriptionItem from "@/components/DescriptionItem";
import UnitSymbol from "@/components/UnitSymbol";
import ItemMedia from "./ItemMedia";
import EditMetaForm from "./EditMetaForm";
import EditMediaForm from "./EditMediaForm";

// Tab-specific Components
import UnitPanelState from "./UnitPanelState";
import UnitDetailsToe from "./UnitDetailsToe";
import UnitDetailsMapDisplay from "./UnitDetailsMapDisplay";
import UnitDetailsProperties from "./UnitDetailsProperties";
import UnitDetailsSymbol from "./UnitDetailsSymbol";

// Hooks & Logic
import { useActiveScenario, useSearchActions, useSidcModal } from "@/components/injects";
import { useUiStore } from "@/stores/uiStore";
import { useTabStore } from "@/stores/tabStore";
import { useGeoStore, useUnitSettingsStore } from "@/stores/geoStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useUnitActions } from "@/hooks/scenarioActions";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { getUnitDragItem } from "@/types/draggables";
import { formatPosition } from "@/geo/utils";
import { renderMarkdown } from "@/hooks/formatting";
import { UnitActions, type UnitAction } from "@/types/constants";
import { inputEventFilter, setCharAt } from "@/components/helpers";
import { CUSTOM_SYMBOL_SID_INDEX, SID_INDEX } from "@/symbology/sidc";
import { CUSTOM_SYMBOL_PREFIX } from "@/config/constants";

// Lazy loading for heavy transformation component
const FeatureTransformations = dynamic(() => import("./FeatureTransformations"), { ssr: false });

interface UnitDetailsProps {
  unitId: string; // EntityId
}

export default function UnitDetails({ unitId }: UnitDetailsProps) {
  const scn = useActiveScenario();
  const searchActions = useSearchActions();
  const sidcModal = useSidcModal();
  
  const uiStore = useUiStore();
  const tabStore = useTabStore();
  const geoStore = useGeoStore();
  const unitSettings = useUnitSettingsStore();
  const { selectedUnitIds, clear: clearSelection } = useSelectedItems();
  const { onUnitAction } = useUnitActions();

  // --- Refs & State ---
  const elRef = useRef<HTMLButtonElement>(null);
  const [unitName, setUnitName] = useState("");
  const [shortName, setShortName] = useState("");
  const [truncateUnits, setTruncateUnits] = useState(true);
  const [isDragged, setIsDragged] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditMediaMode, setIsEditMediaMode] = useState(false);

  // --- Computed ---
  const unit = useMemo(() => scn.helpers.getUnitById(unitId), [unitId, scn.store.state]);
  const isLocked = useMemo(() => scn.unitActions.isUnitLocked(unitId), [unitId, scn.store.state]);
  const isMultiMode = selectedUnitIds.size > 1;

  const unitStatus = useMemo(() => {
    const status = unit ? getUnitRuntimeState(unit.id)?.status || unit.status : undefined;
    return status ? scn.store.state.unitStatusMap[status]?.name : undefined;
  }, [unit, scn.store.state.unitStatusMap]);

  // --- Effects: Sync state with unit data ---
  useEffect(() => {
    if (unit) {
      setUnitName(unit.name || "");
      setShortName(unit.shortName || "");
    }
  }, [unit]);

  // --- Drag and Drop logic ---
  useEffect(() => {
    const el = elRef.current;
    if (!el || !unit) return;

    return draggable({
      element: el,
      getInitialData: () => getUnitDragItem({ unit }, "detailsPanel"),
      onDragStart: () => setIsDragged(true),
      onDrop: () => setIsDragged(false),
      canDrag: () => !scn.unitActions.isUnitLocked(unit.id),
    });
  }, [unit, scn.unitActions]);

  // --- Keyboard Shortcuts ---
  useEventListener("keyup", (e) => {
    if (uiStore.getShortcutsEnabled() && inputEventFilter(e as any) && e.key === "e") {
      setIsEditMode(!isEditMode);
    }
  });

  // --- Handlers ---
  const handleZoom = () => {
    if (isMultiMode) {
      const units = Array.from(selectedUnitIds).map(id => scn.helpers.getUnitById(id));
      onUnitAction(units, UnitActions.Zoom);
    } else {
      onUnitAction(unit!, UnitActions.Zoom);
    }
  };

  const handleChangeSymbol = async () => {
    if (isLocked || !unit || !sidcModal) return;
    const newSidcValue = await sidcModal.getModalSidc(unit.sidc, {
      symbolOptions: unit.symbolOptions,
      inheritedSymbolOptions: scn.unitActions.getCombinedSymbolOptions(unit, true),
      reinforcedStatus: unit.reinforcedStatus,
    });

    if (newSidcValue) {
      const { sidc, symbolOptions = {}, reinforcedStatus } = newSidcValue;
      const isCustom = sidc.startsWith(CUSTOM_SYMBOL_PREFIX);
      const dataUpdate: any = { sidc, symbolOptions };
      if (reinforcedStatus) dataUpdate.reinforcedStatus = reinforcedStatus;

      if (isMultiMode) {
        scn.store.groupUpdate(() => {
          selectedUnitIds.forEach((id) => {
            const { side } = scn.unitActions.getUnitHierarchy(id);
            dataUpdate.sidc = setCharAt(
              sidc,
              isCustom ? CUSTOM_SYMBOL_SID_INDEX : SID_INDEX,
              side.standardIdentity
            );
            scn.unitActions.updateUnit(id, dataUpdate);
          });
        });
      } else {
        scn.unitActions.updateUnit(unitId, dataUpdate);
      }
    }
  };

  const locateInOrbat = () => {
    // onUnitSelect is a listener hook, we need to trigger the event differently
    // For now, just focus on the unit in the ORBAT tree
    // TODO: Implement proper unit selection event
  };

  if (!unit) return null;

  return (
    <div className="@container" key={unit.id}>
      {unit.media?.[0] && !isMultiMode && <ItemMedia media={unit.media[0]} />}

      <header className="-mx-4 px-2 pt-2">
        {!isMultiMode ? (
          <div className="flex">
            <button
              ref={elRef}
              type="button"
              className="mr-2 inline-flex w-16 justify-start"
              onClick={handleChangeSymbol}
            >
              <UnitSymbol
                className="w-16"
                sidc={getUnitRuntimeState(unit.id)?.sidc || unit.sidc}
                size={34}
                options={{ ...scn.unitActions.getCombinedSymbolOptions(unit), outlineWidth: 8 }}
              />
            </button>
            <div className="-mt-1.5 flex-auto pr-4">
              {!isLocked ? (
                <EditableLabel
                  value={unitName}
                  onChange={setUnitName}
                  onUpdateValue={(val) => scn.unitActions.updateUnit(unitId, { name: val })}
                />
              ) : (
                <div className="text-base font-semibold">{unitName}</div>
              )}
              {!isLocked ? (
                <EditableLabel
                  className="relative -top-4"
                  value={shortName}
                  onChange={setShortName}
                  onUpdateValue={(val) => scn.unitActions.updateUnit(unitId, { shortName: val })}
                  textClass="text-sm text-muted-foreground"
                />
              ) : (
                <div className="relative -top-4 text-sm text-muted-foreground">{shortName}</div>
              )}
            </div>
            {isLocked && <Lock className="text-muted-foreground size-5" />}
            {unitStatus && <Badge className="ml-2 h-fit">{unitStatus}</Badge>}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <p className="font-medium">{selectedUnitIds.size} units selected</p>
              <Button size="sm" variant="outline" onClick={clearSelection}>Clear</Button>
            </div>
            {/* Logic render list selected units tương tự Vue */}
          </div>
        )}

        

        <nav className="-mt-2 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            <IconButton title="Zoom to" onClick={handleZoom}><ZoomIcon size={20}/></IconButton>
            <IconButton 
              title="Edit unit" 
              onClick={() => { setIsEditMode(!isEditMode); setIsEditMediaMode(false); }}
              disabled={isMultiMode || isLocked}
            >
              <EditIcon size={20}/>
            </IconButton>
            <IconButton 
              title="Locate in ORBAT" 
              onClick={locateInOrbat} 
              disabled={isMultiMode}
            >
              <FolderTree size={20}/>
            </IconButton>
            <div className="ml-1">
              <SplitButton 
                items={[]} /* buttonItems logic */
              />
            </div>
          </div>
          <DotsMenu items={[]} /* unitMenuItems logic */ />
        </nav>
      </header>

      <div className="-mx-4 border-t">
        <ScrollTabs 
          value={tabStore.unitDetailsTab.toString()} 
          onValueChange={(v) => tabStore.setUnitDetailsTab(Number(v))}
          items={[
            { label: "Details", value: "0" },
            { label: "Map symbol", value: "1" },
            { label: "Unit state", value: "2" },
            { label: "TO&E/S", value: "3" },
            { label: "Map display", value: "4" },
            { label: "Properties", value: "5" },
            { label: "Transform", value: "6" },
          ]}
        >
          <TabsContent value="0" className="mx-4 pt-4">
            {isEditMode ? (
              <EditMetaForm 
                item={unit} 
                onUpdate={(upd) => { scn.unitActions.updateUnit(unitId, upd); setIsEditMode(false); }} 
                onCancel={() => setIsEditMode(false)} 
              />
            ) : isEditMediaMode ? (
              <EditMediaForm 
                media={unit.media?.[0]} 
                onCancel={() => setIsEditMediaMode(false)} 
                onUpdate={(upd) => { /* logic update media */ }} 
              />
            ) : (
              <div className="space-y-4">
                <DescriptionItem label="Name">{unit.name}</DescriptionItem>
                {unit.description && (
                  <div 
                    className="prose prose-sm dark:prose-invert" 
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(unit.description) }} 
                  />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="1" className="mx-4 pt-4">
            <UnitDetailsSymbol unit={unit} isMultiMode={isMultiMode} isLocked={isLocked} />
          </TabsContent>

          <TabsContent value="2" className="mx-4 pt-4">
            <UnitPanelState unit={unit} isLocked={isLocked} />
          </TabsContent>

          <TabsContent value="3" className="mx-4 pt-4">
            <UnitDetailsToe unit={unit} isLocked={isLocked} />
          </TabsContent>

          <TabsContent value="4" className="mx-4 pt-4">
            <UnitDetailsMapDisplay unit={unit} isLocked={isLocked} />
          </TabsContent>

          <TabsContent value="5" className="mx-4 pt-4">
            <UnitDetailsProperties unit={unit} isLocked={isLocked} />
          </TabsContent>

          <TabsContent value="6" className="mx-4 pt-4">
            <FeatureTransformations unitMode />
          </TabsContent>
        </ScrollTabs>
      </div>
    </div>
  );
}