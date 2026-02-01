"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown, Trash2Icon } from "lucide-react";
import InputGroupTemplate from "@/components/InputGroupTemplate";
import PanelSubHeading from "@/components/PanelSubHeading";
import NewSelect from "@/components/NewSelect";
import NumberInputGroup from "@/components/NumberInputGroup";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

// Types
import type { NewSelectItem } from "@/components/types";
import type {
  BufferOptions,
  SimplifyOptions,
  TransformationOperation,
  TransformationType,
} from "@/geo/transformations";
import type { Units } from "@turf/helpers";

interface TransformFormProps {
  unitMode?: boolean;
  value: TransformationOperation;
  onValueChange: (val: TransformationOperation) => void;
  onDelete: () => void;
}

const TRANSFORMATION_OPTIONS: NewSelectItem<TransformationType>[] = [
  { label: "Buffer", value: "buffer", description: "Calculates a buffer for input features for a given radius." },
  { label: "Bounding box", value: "boundingBox" },
  { label: "Convex hull", value: "convexHull" },
  { label: "Concave hull", value: "concaveHull" },
  { label: "Center (absolute)", value: "center" },
  { label: "Center of mass", value: "centerOfMass" },
  { label: "Centroid", value: "centroid" },
  { label: "Explode", value: "explode" },
  { label: "Simplify", value: "simplify" },
  { label: "Smooth", value: "smooth" },
  { label: "Union", value: "union" },
];

const UNIT_ITEMS: NewSelectItem<Units>[] = [
  { label: "Kilometers", value: "kilometers" },
  { label: "Meters", value: "meters" },
  { label: "Miles", value: "miles" },
  { label: "Feet", value: "feet" },
  { label: "Nautical miles", value: "nauticalmiles" },
];

export default function TransformForm({
  unitMode = false,
  value: currentOp,
  onValueChange,
  onDelete,
}: TransformFormProps) {
  // --- Local State ---
  const [isOpen, setIsOpen] = useState(currentOp.isOpen ?? true);
  const [transformation, setTransformation] = useState<TransformationType>(currentOp.transform);
  const [disabled, setDisabled] = useState(currentOp.disabled ?? false);

  const [bufferOptions, setBufferOptions] = useState<BufferOptions>(
    currentOp.transform === "buffer"
      ? (currentOp.options as BufferOptions)
      : { radius: 0, units: "kilometers", steps: 8 }
  );

  const [simplifyOptions, setSimplifyOptions] = useState<SimplifyOptions>(
    currentOp.transform === "simplify"
      ? (currentOp.options as SimplifyOptions)
      : { tolerance: 0.001 }
  );

  // --- Computed ---
  const transformationLabel = useMemo(() => {
    const selected = TRANSFORMATION_OPTIONS.find((o) => o.value === transformation);
    return selected ? selected.label : transformation;
  }, [transformation]);

  // --- Effect: Sync local state to parent (The "watchEffect" equivalent) ---
  useEffect(() => {
    let options = {};
    if (transformation === "buffer") options = bufferOptions;
    else if (transformation === "simplify") options = simplifyOptions;

    onValueChange({
      id: currentOp.id,
      transform: transformation,
      options,
      disabled,
      isOpen,
    } as TransformationOperation);
  }, [transformation, bufferOptions, simplifyOptions, disabled, isOpen]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted with transformation:", transformation);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-border -mx-2 rounded border">
      <header className="relative flex items-center justify-between rounded border-b p-2 px-4 bg-muted/20">
        <CollapsibleTrigger className="flex w-full items-center justify-between outline-none">
          <span className="text-sm font-bold">{transformationLabel}</span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        
        <div className="pointer-events-none absolute inset-0 flex justify-end px-4">
          <div className="pointer-events-auto flex items-center gap-1">
            <Switch 
              checked={!disabled} 
              onCheckedChange={(checked) => setDisabled(!checked)} 
            />
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
              <Trash2Icon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      

      <CollapsibleContent className="p-4">
        <form onSubmit={onSubmit} className="space-y-4">
          <NewSelect
            label="Transformation"
            items={TRANSFORMATION_OPTIONS}
            value={transformation}
            onValueChange={(val) => setTransformation(val as TransformationType)}
          />

          {transformation === "buffer" && (
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div className="col-span-1">
                <NumberInputGroup 
                  label="Radius" 
                  value={bufferOptions.radius} 
                  onValueChange={(val) => setBufferOptions(prev => ({ ...prev, radius: val }))} 
                />
              </div>
              <NewSelect 
                label="Units" 
                items={UNIT_ITEMS} 
                value={bufferOptions.units} 
                onValueChange={(val) => setBufferOptions(prev => ({ ...prev, units: val as Units }))} 
              />
              <NumberInputGroup 
                label="Steps" 
                value={bufferOptions.steps} 
                onValueChange={(val) => setBufferOptions(prev => ({ ...prev, steps: val }))} 
              />
            </div>
          )}

          {transformation === "simplify" && (
            <div>
              <PanelSubHeading>Simplify</PanelSubHeading>
              <div className="mt-4 grid grid-cols-1 gap-4">
                <InputGroupTemplate label="Tolerance">
                  <div className="space-y-4">
                    <Slider
                      value={[simplifyOptions.tolerance ?? 0]}
                      min={0}
                      max={0.15}
                      step={0.00001}
                      onValueChange={([val]) => setSimplifyOptions({ tolerance: val })}
                      className="mt-4"
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {simplifyOptions.tolerance?.toFixed(5)}
                    </div>
                  </div>
                </InputGroupTemplate>
              </div>
            </div>
          )}
        </form>
      </CollapsibleContent>
    </Collapsible>
  );
}