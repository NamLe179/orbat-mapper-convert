"use client";

import React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveScenario } from "@/components/injects";
import { getGeometryIcon } from "@/modules/scenarioeditor/featureLayerUtils";
import type { FeatureId } from "@/types/scenarioGeoModels";

interface ScenarioFeatureSelectProps {
  layerMode?: boolean;
  value?: string | FeatureId;
  onValueChange?: (value: string | FeatureId) => void;
}

export default function ScenarioFeatureSelect({
  layerMode = false,
  value,
  onValueChange,
}: ScenarioFeatureSelectProps) {
  const { geo } = useActiveScenario();
  const { layers } = geo;

  return (
    <Select 
      // Chuyển value hiện tại sang string để khớp với Select của Shadcn
      value={value?.toString()} 
      onValueChange={onValueChange}
    >
      <SelectTrigger className="w-full">
        <SelectValue
          placeholder={layerMode ? "Select layer" : "Select feature"}
        />
      </SelectTrigger>

      <SelectContent className="border-border">
        {layerMode ? (
          <SelectGroup>
            <SelectLabel>Layers</SelectLabel>
            {layers.map((layer) => (
              <SelectItem 
                key={layer.id} 
                value={String(layer.id)}
              >
                {layer.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : (
          layers.map((layer) => (
            <SelectGroup key={layer.id}>
              <SelectLabel>{layer.name}</SelectLabel>
              {layer.features.map((feature) => {
                const IconComponent = getGeometryIcon(feature);

                return (
                  <SelectItem 
                    key={feature.id} 
                    value={String(feature.id)}
                  >
                    <div className="flex items-center gap-2">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      <span>
                        {feature.meta.name || feature.type || feature.geometry.type}
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))
        )}
      </SelectContent>
    </Select>
  );
}