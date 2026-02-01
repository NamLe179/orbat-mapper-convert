import React from "react";
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import { type UnitSymbolOptions } from "@/types/scenarioModels";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Omit 'size' từ ButtonProps gốc để override lại thành number cho Symbol
interface PanelSymbolButtonProps extends Omit<ButtonProps, "size"> {
  sidc: string;
  active?: boolean;
  size?: number; // Kích thước pixel cho symbol
  symbolOptions?: UnitSymbolOptions;
}

export default function PanelSymbolButton({
  sidc,
  active = false,
  size = 24,
  symbolOptions,
  className,
  children,
  ...props
}: PanelSymbolButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn("p-1", active && "invert", className)}
      {...props}
    >
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <NewMilitarySymbol
          sidc={sidc}
          size={size}
          options={{ ...symbolOptions, square: true }}
        />
      </div>
      {children}
    </Button>
  );
}