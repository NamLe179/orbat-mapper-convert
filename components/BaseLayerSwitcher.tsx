"use client";

import React from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import OpacityInput from "@/components/OpacityInput";
import { type LayerInfo } from "@/components/LayersPanel"; // Giả định đường dẫn import type

interface BaseLayerSwitcherProps {
  settings: LayerInfo<any>[];
  defaultLayerName?: string;
  
  // Thay thế cho defineModel('selected')
  selectedLayer?: LayerInfo<any> | null;
  onSelectLayer?: (layer: LayerInfo<any> | undefined) => void;

  // Thay thế cho emit('update:layerOpacity')
  onLayerOpacityChange?: (layer: LayerInfo<any>, opacity: number) => void;
}

export default function BaseLayerSwitcher({
  settings,
  defaultLayerName,
  selectedLayer,
  onSelectLayer,
  onLayerOpacityChange,
}: BaseLayerSwitcherProps) {

  // Logic convert từ Object Layer sang ID string cho RadioGroup
  const currentId = selectedLayer?.id ?? "__NULL__";

  // Logic xử lý khi chọn Radio -> tìm Object tương ứng và trả về cha
  const handleValueChange = (val: string) => {
    if (val === "__NULL__") {
      const nullLayer = settings.find((s) => s.id === null);
      onSelectLayer?.(nullLayer);
    } else {
      const foundLayer = settings.find((s) => s.id === val);
      onSelectLayer?.(foundLayer);
    }
  };

  return (
    <RadioGroup 
      value={currentId} 
      onValueChange={handleValueChange} 
      className="block"
    >
      <Label className="sr-only">Select base map layer</Label>
      
      <div className="divide-border border-border bg-card divide-y overflow-hidden rounded-md border">
        {settings.map((setting) => {
          const itemId = `layer-${setting.id ?? "null"}`;
          const itemValue = setting.id ?? "__NULL__";

          return (
            <div
              key={setting.title} // Dùng title làm key nếu id có thể null/trùng (theo Vue gốc)
              className="hover:bg-muted/50 flex items-start gap-3 p-4 transition-colors"
            >
              <RadioGroupItem
                value={itemValue}
                id={itemId}
                className="mt-1"
              />
              
              <div className="flex min-w-0 flex-auto flex-col text-sm">
                <div className="flex items-center justify-between font-medium">
                  <Label
                    htmlFor={itemId}
                    className="flex-auto truncate font-medium cursor-pointer"
                  >
                    {setting.title}
                    
                    {defaultLayerName && setting.id === defaultLayerName && (
                      <span className="border-border/60 bg-muted ml-1 inline-flex items-center rounded-full border px-1.5 py-0.5 text-xs font-medium">
                        Default
                      </span>
                    )}
                  </Label>

                  {setting.title === "None" ? (
                    <span />
                  ) : (
                    <OpacityInput
                      opacity={setting.opacity}
                      onOpacityChange={(val) => onLayerOpacityChange?.(setting, val)}
                      className="text-foreground shrink-0"
                    />
                  )}
                </div>
                
                <Label
                  htmlFor={itemId}
                  className="text-muted-foreground block text-sm font-normal cursor-pointer"
                >
                  {setting.description || ""}
                </Label>
              </div>
            </div>
          );
        })}
      </div>
    </RadioGroup>
  );
}