import React from "react";
import { ChevronRight } from "lucide-react";
import UnitSymbol from "@/components/UnitSymbol"; 
import { cn } from "@/lib/utils"; 

interface OrbatCellRendererProps {
  value: string;
  sidc?: string;
  expanded: boolean;
  level: number;
  symbolOptions?: Record<string, any>;
  canExpand?: boolean;
  onToggle?: () => void;
}

export default function OrbatCellRenderer({
  value,
  sidc,
  expanded,
  level,
  symbolOptions = {},
  canExpand = false,
  onToggle,
}: OrbatCellRendererProps) {
  return (
    <div
      className="flex items-center gap-2"
      style={{ paddingLeft: `${level * 1.5}rem` }}
    >
      <div className="size-6">
        {canExpand && (
          <button onClick={onToggle} type="button" className="flex items-center justify-center">
            <ChevronRight
              className={cn(
                "text-muted-foreground group-hover:text-foreground size-6 transform transition-transform",
                expanded && "rotate-90"
              )}
            />
          </button>
        )}
      </div>

      {sidc && (
        <UnitSymbol
          sidc={sidc}
          className="max-h-8"
          size={20}
          options={{
            outlineWidth: 8,
            outlineColor: "rgba(255,255,255,0.80)",
            ...symbolOptions,
          }}
        />
      )}

      <span className={cn(!sidc && "font-bold")}>{value}</span>
    </div>
  );
}