import React from "react";
import MilSymbol from "./MilSymbol";
import { type UnitSearchResult } from "./types";

interface SearchUnitHitProps {
  unit: UnitSearchResult;
}

export default function SearchUnitHit({ unit }: SearchUnitHitProps) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center">
          <MilSymbol
            size={20}
            sidc={unit.sidc}
            className="inline self-center"
            modifiers={unit.symbolOptions}
          />
        </div>
        
        {unit.highlight ? (
          <p dangerouslySetInnerHTML={{ __html: unit.highlight }} />
        ) : (
          <p>{unit.name}</p>
        )}
        {/* <p className="ml-2 text-xs">{unit.score}</p> */}
      </div>

      {unit.parent && (
        <div className="text-muted-foreground flex self-start text-xs items-center">
          <MilSymbol
            size={12}
            sidc={unit.parent.sidc}
            modifiers={unit.parent.symbolOptions}
            className="mr-1 opacity-80"
          />
          <span>{unit.parent.name}</span>
        </div>
      )}
    </div>
  );
}