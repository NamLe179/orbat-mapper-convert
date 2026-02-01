"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { 
  Image as ImageIcon, 
  Maximize2 as ZoomIcon, 
  Palette as StyleIcon, 
  Pencil as EditIcon 
} from "lucide-react";
import { useDebounceCallback, useEventListener } from "usehooks-ts";

// UI Components (Shadcn/Custom)
import { TabsContent } from "@/components/ui/tabs";
import ScrollTabs from "@/components/ScrollTabs";
import IconButton from "@/components/IconButton";
import { Button } from "@/components/ui/button";
import EditableLabel from "@/components/EditableLabel";
import PanelDataGrid from "@/components/PanelDataGrid";

// Feature Settings Components
import ScenarioFeatureMarkerSettings from "./ScenarioFeatureMarkerSettings";
import ScenarioFeatureStrokeSettings from "./ScenarioFeatureStrokeSettings";
import ScenarioFeatureFillSettings from "./ScenarioFeatureFillSettings";
import ScenarioFeatureTextSettings from "./ScenarioFeatureTextSettings";
import ScenarioFeatureVisibilitySettings from "./ScenarioFeatureVisibilitySettings";
import ScenarioFeatureState from "./ScenarioFeatureState";
import ScenarioFeatureDropdownMenu from "./ScenarioFeatureDropdownMenu";
import EditMetaForm from "./EditMetaForm";
import EditMediaForm from "./EditMediaForm";
import ItemMedia from "./ItemMedia";

// Logic & Stores
import { 
  useActiveScenario, 
  useActiveMap, 
  useActiveFeatureSelectInteraction 
} from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";
import { useUiStore } from "@/stores/uiStore";
import { useTabStore } from "@/stores/tabStore";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import { useScenarioFeatureActions } from "@/hooks/scenarioActions";
import { renderMarkdown } from "@/hooks/formatting";
import { getGeometryIcon } from "./featureLayerUtils";
import { inputEventFilter } from "@/components/helpers";
import { cn } from "@/lib/utils";

// Lazy Load
const FeatureTransformations = dynamic(() => import("./FeatureTransformations"), { ssr: false });

interface Props {
  selectedIds: Set<string>; // Giả định SelectedScenarioFeatures là Set
}

export default function ScenarioFeatureDetails({ selectedIds }: Props) {
  const { geo, store: { groupUpdate } } = useActiveScenario();
  const olMap = useActiveMap();
  const featureSelectInteraction = useActiveFeatureSelectInteraction();
  
  const featureActions = useScenarioFeatureActions();
  const { selectedFeatureIds, clear: clearSelection } = useSelectedItems();
  const uiStore = useUiStore();
  const tabStore = useTabStore();
  const toolbarStore = useMainToolbarStore();

  // --- Local State ---
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditMediaMode, setIsEditMediaMode] = useState(false);
  const [featureName, setFeatureName] = useState("");
  const [featureDescription, setFeatureDescription] = useState("");

  // --- Computed ---
  const feature = useMemo(() => {
    if (selectedIds.size === 1) {
      return geo.getFeatureById(Array.from(selectedIds)[0])?.feature;
    }
    return null;
  }, [selectedIds, geo]);

  const hDescription = useMemo(() => 
    renderMarkdown(feature?.meta.description || ""), 
  [feature]);

  const geometryType = feature?.meta.type;
  const isMultiMode = selectedFeatureIds.size > 1;

  // --- Watch: Sync form data ---
  useEffect(() => {
    if (feature) {
      setFeatureName(feature.meta.name || "");
      setFeatureDescription(feature.meta.description || "");
    }
  }, [feature]);

  // --- Handlers ---
  const debouncedResetMap = useDebounceCallback(() => {
    featureSelectInteraction?.setMap(olMap);
  }, 3000);

  const doUpdateFeature = (data: any) => {
    const ids = isMultiMode ? Array.from(selectedFeatureIds) : [feature?.id];
    featureSelectInteraction?.setMap(null);

    if (isMultiMode) {
      groupUpdate(() => ids.forEach(id => id && geo.updateFeature(id, data)));
    } else if (feature?.id) {
      geo.updateFeature(feature.id, data);
    }

    if (feature) {
      toolbarStore.setCurrentDrawStyle({ ...feature.style });
    }
    debouncedResetMap();
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setIsEditMediaMode(false);
    if (!isEditMode) tabStore.setFeatureDetailsTab(1);
  };

  // Shortcut handler
  useEventListener("keyup", (e) => {
    if (uiStore.getShortcutsEnabled() && inputEventFilter(e as any) && e.key === "e") {
      toggleEditMode();
    }
  });

  const tabList = useMemo(() => {
    const base = [
      { label: "Style", value: "0" },
      { label: "Details", value: "1" },
      { label: "State", value: "2" },
      { label: "Transform", value: "3" },
    ];
    if (uiStore.debugMode) base.push({ label: "Debug", value: "4" });
    return base;
  }, [uiStore.debugMode]);

  const media = feature?.media?.[0] || null;
  const GeometryIcon = feature ? getGeometryIcon(feature) : null;

  return (
    <div className="scenario-feature-details">
      {media && <ItemMedia media={media} />}

      <header className="px-4 py-2">
        {isMultiMode && (
          <div className="mt-6 mb-2 flex items-center justify-between">
            <p className="font-medium">{selectedFeatureIds.size} features selected</p>
            <Button variant="outline" size="sm" onClick={clearSelection}>Clear</Button>
          </div>
        )}

        {feature && (
          <EditableLabel 
            value={featureName} 
            onChange={setFeatureName}
            onUpdateValue={(val) => geo.updateFeature(feature.id, { meta: { name: val } })} 
          />
        )}

        

        <nav className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1">
            {GeometryIcon && <GeometryIcon className="text-muted-foreground mr-2 size-6" />}
            
            <IconButton onClick={() => featureActions.onFeatureAction(Array.from(selectedIds), "zoom")} title="Zoom">
              <ZoomIcon className="size-5" />
            </IconButton>
            
            <IconButton onClick={() => tabStore.setFeatureDetailsTab(0)} title="Style">
              <StyleIcon className="size-5" />
            </IconButton>

            <IconButton onClick={toggleEditMode} title="Edit Data">
              <EditIcon className="size-5" />
            </IconButton>

            <IconButton onClick={() => { setIsEditMediaMode(!isEditMediaMode); setIsEditMode(false); tabStore.setFeatureDetailsTab(1); }} title="Media">
              <ImageIcon className="size-5" />
            </IconButton>
          </div>
          
          <ScenarioFeatureDropdownMenu onAction={(act) => featureActions.onFeatureAction(Array.from(selectedIds), act)} />
        </nav>
      </header>

      <div className="-mx-4">
        <ScrollTabs 
          items={tabList} 
          value={tabStore.featureDetailsTab.toString()} 
          onValueChange={(v) => tabStore.setFeatureDetailsTab(Number(v))}
        >
          {/* Tab 0: Style */}
          <TabsContent value="0" className="mx-4">
            <PanelDataGrid className="mt-4">
              {feature && (
                <>
                  <ScenarioFeatureVisibilitySettings feature={feature} onUpdate={doUpdateFeature} />
                  {(feature.meta.type === 'Point' || feature.meta.type === 'GeometryCollection') && (
                    <ScenarioFeatureMarkerSettings feature={feature} onUpdate={doUpdateFeature} />
                  )}
                  {feature.meta.type !== 'Point' && (
                    <ScenarioFeatureStrokeSettings feature={feature} onUpdate={doUpdateFeature} />
                  )}
                  {!['Point', 'LineString'].includes(feature.meta.type) && (
                    <ScenarioFeatureFillSettings feature={feature} onUpdate={doUpdateFeature} />
                  )}
                  {feature.meta.type !== 'Circle' && (
                    <ScenarioFeatureTextSettings feature={feature} onUpdate={doUpdateFeature} />
                  )}
                </>
              )}
            </PanelDataGrid>
          </TabsContent>

          {/* Tab 1: Details */}
          <TabsContent value="1" className="mx-4">
            {!isEditMode && !isEditMediaMode ? (
              <div className="prose prose-sm dark:prose-invert mt-4" dangerouslySetInnerHTML={{ __html: hDescription }} />
            ) : isEditMode ? (
              <EditMetaForm 
                item={feature} 
                onUpdate={(data) => { doUpdateFeature({ meta: data }); setIsEditMode(false); }} 
                onCancel={() => setIsEditMode(false)} 
              />
            ) : (
              <EditMediaForm 
                media={media} 
                onCancel={() => setIsEditMediaMode(false)} 
                onUpdate={(upd) => { geo.updateFeature(feature!.id, { media: [{ ...media, ...upd }] }); setIsEditMediaMode(false); }} 
              />
            )}
          </TabsContent>

          {/* Tab 2: State */}
          <TabsContent value="2" className="mx-4">
            {feature && <ScenarioFeatureState feature={feature} />}
          </TabsContent>

          {/* Tab 3: Transform */}
          <TabsContent value="3" className="mx-4">
            <div className="mt-4">
              <FeatureTransformations />
            </div>
          </TabsContent>

          {/* Tab 4: Debug */}
          {uiStore.debugMode && (
            <TabsContent value="4" className="mx-4 max-w-none overflow-auto">
              <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(feature, null, 2)}</pre>
            </TabsContent>
          )}
        </ScrollTabs>
      </div>
    </div>
  );
}