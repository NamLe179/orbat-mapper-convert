"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { PlusIcon } from "lucide-react";
import { geometryCollection } from "@turf/helpers";
import { useDebounceCallback } from "usehooks-ts";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Feature as GeoJSONFeature } from "geojson";

// UI Components (Shadcn)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Custom Components
import BaseButton from "@/components/BaseButton";
import InputCheckbox from "@/components/InputCheckbox";
import ScenarioFeatureSelect from "@/components/ScenarioFeatureSelect";
import TransformForm from "@/modules/scenarioeditor/TransformForm";

// Hooks & Logic
import { useActiveScenario, useActiveLayer, useActiveMap } from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";
import { getFeatureRuntimeState } from "@/scenariostore/runtimeState";
import { useTransformSettingsStore } from "@/stores/transformStore";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { 
  createDefaultTransformationOperation, 
  doScenarioFeatureTransformation, 
  doUnitTransformations, 
  type TransformationOperation 
} from "@/geo/transformations";
import { drawGeoJsonLayer } from "@/hooks/openlayersHelpers";
import { nanoid } from "@/utils";

interface Props {
  unitMode?: boolean;
}

export default function FeatureTransformations({ unitMode = false }: Props) {
  const scn = useActiveScenario();
  const activeLayerId = useActiveLayer();
  const olMap = useActiveMap();
  const { scenarioFormatter } = useTimeFormatters();

  const { selectedFeatureIds, selectedUnitIds } = useSelectedItems();
  const { 
    showPreview, 
    transformations, 
    updateActiveFeature, 
    updateAtTime,
    setTransformations,
    setShowPreview,
    setUpdateActiveFeature,
    setUpdateAtTime
  } = useTransformSettingsStore();

  const [addActiveLayer, setAddActiveLayer] = useState(activeLayerId);
  const [toggleRedraw, setToggleRedraw] = useState(false);

  // --- OpenLayers Preview Layer ---
  const previewLayerRef = useRef<VectorLayer<VectorSource>>(
    new VectorLayer({
      source: new VectorSource({}),
      style: {
        "stroke-color": "red",
        "stroke-width": 3,
        "stroke-line-dash": [10, 10],
        "fill-color": "rgba(188,35,65,0.2)",
        "circle-radius": 5,
        "circle-fill-color": "red",
        "circle-stroke-color": "red",
      },
    })
  );

  useEffect(() => {
    const layer = previewLayerRef.current;
    if (!olMap) return;
    olMap.addLayer(layer);
    return () => {
      layer.getSource()?.clear();
      olMap.removeLayer(layer);
    };
  }, [olMap]);

  // --- Computed ---
  const formattedTime = useMemo(() => 
    scenarioFormatter.format(scn.time.getScenarioTime().valueOf()),
  [scenarioFormatter, scn.time]);

  const selectedItems = useMemo(() => {
    if (unitMode) {
      return Array.from(selectedUnitIds).map((id) => scn.helpers.getUnitById(id));
    }
    return Array.from(selectedFeatureIds).map(
      (id) => scn.geo.getFeatureById(id)?.feature
    );
  }, [unitMode, selectedUnitIds, selectedFeatureIds, scn]);

  const isMultiMode = selectedFeatureIds.size > 1;

  // --- Business Logic ---
  const calculatePreview = useDebounceCallback((items: any[], ops: TransformationOperation[]) => {
    const geometry = unitMode
      ? doUnitTransformations(items, ops)
      : doScenarioFeatureTransformation(items, ops);

    drawGeoJsonLayer(previewLayerRef.current, geometry);
  }, 200);

  useEffect(() => {
    if (showPreview && transformations.length > 0) {
      calculatePreview(selectedItems, transformations.filter(Boolean));
    } else {
      previewLayerRef.current.getSource()?.clear();
    }
  }, [showPreview, transformations, toggleRedraw, scn.store.state.unitStateCounter, scn.store.state.currentTime, selectedItems, calculatePreview]);

  // Redraw watcher for features
  useEffect(() => {
    if (!unitMode && selectedItems[0]) {
      setToggleRedraw(prev => !prev);
    }
  }, [
    unitMode,
    (selectedItems[0] as any)?.geometry,
    selectedItems[0] ? getFeatureRuntimeState((selectedItems[0] as any).id)?.geometry : undefined,
  ]);

  const onSubmit = (updateMode = false) => {
    if (selectedItems.length === 0) return;
    const activeFeature = selectedItems[0];
    const filteredTrans = transformations.filter(Boolean);
    if (filteredTrans.length === 0) return;

    let transformedFeature = unitMode
      ? doUnitTransformations(selectedItems as any, filteredTrans)
      : doScenarioFeatureTransformation(selectedItems as any, filteredTrans);

    if (!transformedFeature) return;

    if (transformedFeature.type === "FeatureCollection") {
      transformedFeature = geometryCollection(
        transformedFeature.features.map((f: any) => f.geometry) as any
      ) as any;
    }

    const scenarioFeature = {
      type: "Feature",
      id: nanoid(),
      properties: (transformedFeature as any).properties || {},
      geometry: (transformedFeature as any).geometry,
      meta: { type: (transformedFeature as any).geometry?.type || "Unknown", name: "New Feature" },
      style: {},
      _pid: updateMode ? -1 : (addActiveLayer as any),
    };

    if (updateMode && updateActiveFeature) {
      if (updateAtTime) {
        scn.geo.addFeatureStateGeometry(updateActiveFeature, scenarioFeature.geometry);
      } else {
        scn.geo.updateFeature(updateActiveFeature, { geometry: scenarioFeature.geometry });
      }
    } else {
      const activeFeatureName = unitMode ? (activeFeature as any).name : (activeFeature as any).meta.name;
      const featureName = isMultiMode ? "FeatureCollection" : activeFeatureName;
      scenarioFeature.meta.name = `${featureName} (${filteredTrans[0].transform})`;
      scn.geo.addFeature(scenarioFeature as any, addActiveLayer as any);
    }
    previewLayerRef.current.getSource()?.clear();
  };

  if (!selectedItems.length) {
    return (
      <div className="text-muted-foreground text-center text-sm py-4">
        Please select a feature to transform
      </div>
    );
  }

  return (
    <div className="pb-2">
      <div className="grid grid-cols-1 gap-1">
        {transformations.map((op, i) => (
          <TransformForm
            key={op.id}
            value={op}
            unitMode={unitMode}
            onValueChange={(newOp) => {
              const next = [...transformations];
              next[i] = newOp;
              setTransformations(next);
            }}
            onDelete={() => {
              const next = [...transformations];
              next.splice(i, 1);
              setTransformations(next);
            }}
          />
        ))}
      </div>

      

      <div className="mt-4 flex w-full items-center justify-between">
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          onClick={() => setTransformations([...transformations, createDefaultTransformationOperation()])}
        >
          <PlusIcon className="mr-2 h-4 w-4" /> Add
        </Button>
        <InputCheckbox 
          checked={showPreview} 
          onCheckedChange={(val: string | boolean) => setShowPreview(!!val)} 
          label="Show preview" 
        />
      </div>

      <Tabs defaultValue="add" className="border-border mt-4 border-t pt-4">
        <TabsList className="w-full">
          <TabsTrigger value="add">New feature</TabsTrigger>
          <TabsTrigger value="update">Update existing</TabsTrigger>
        </TabsList>

        <TabsContent value="add">
          <Label className="mt-2 pb-1.5 block">Select layer</Label>
          <ScenarioFeatureSelect 
            value={addActiveLayer as any} 
            onValueChange={(val) => setAddActiveLayer(val as any)} 
            layerMode 
          />
          <div className="mt-4 flex items-center justify-end">
            <BaseButton primary small onClick={() => onSubmit(false)}>
              Create feature
            </BaseButton>
          </div>
        </TabsContent>

        <TabsContent value="update">
          <Label className="mt-2 pb-1.5 block">Select feature</Label>
          <ScenarioFeatureSelect 
            value={updateActiveFeature} 
            onValueChange={setUpdateActiveFeature} 
          />
          <div className="mt-4">
            <InputCheckbox
              checked={updateAtTime}
              onCheckedChange={(val: string | boolean) => setUpdateAtTime(!!val)}
              label={`Update geometry at ${formattedTime}`}
            />
          </div>
          <div className="mt-4 flex items-center justify-end">
            <BaseButton
              primary
              small
              onClick={() => onSubmit(true)}
              disabled={!updateActiveFeature}
            >
              Update feature
            </BaseButton>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}