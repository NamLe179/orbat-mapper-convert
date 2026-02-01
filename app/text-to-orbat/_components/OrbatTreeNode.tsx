"use client";

import { useMemo } from "react";
import MilSymbol from "@/components/NewMilitarySymbol";
import {
  ECHELON_CODE_TO_NAME,
  ICON_CODE_TO_NAME,
  type ParsedUnit,
} from "../_lib/textToOrbat";

interface OrbatTreeNodeProps {
  unit: ParsedUnit;
  showDebug?: boolean;
}

// Map echelon codes (from SIDC positions 8-9) to labels
const echelonCodeLabels: Record<string, string> = {
  "00": "Unspecified",
  "11": "Team/Crew",
  "12": "Squad",
  "13": "Section",
  "14": "Platoon",
  "15": "Company",
  "16": "Battalion",
  "17": "Regiment",
  "18": "Brigade",
  "21": "Division",
  "22": "Corps",
  "23": "Army",
  "24": "Army Group",
  "25": "Region",
  "26": "Command",
};

export default function OrbatTreeNode({ unit, showDebug = false }: OrbatTreeNodeProps) {
  const echelonCode = useMemo(() => unit.sidc.substring(8, 10), [unit.sidc]);
  const entityCode = useMemo(() => unit.sidc.substring(10, 20), [unit.sidc]);

  const echelonLabel = useMemo(() => {
    return echelonCodeLabels[echelonCode] ?? "Unit";
  }, [echelonCode]);

  const echelonVarName = useMemo(() => {
    return ECHELON_CODE_TO_NAME[echelonCode] ?? echelonCode;
  }, [echelonCode]);

  const entityVarName = useMemo(() => {
    return ICON_CODE_TO_NAME[entityCode] ?? entityCode;
  }, [entityCode]);

  return (
    <li>
      <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50">
        <MilSymbol
          sidc={unit.sidc}
          size={24}
          options={{ outlineColor: "white", outlineWidth: 8 }}
        />
        <span className="text-sm">{unit.name}</span>
        {showDebug && (
          <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
            [{echelonVarName} | {entityVarName}]
          </span>
        )}
      </div>
      {unit.children.length > 0 && (
        <ul className="ml-6 mt-1 space-y-1 border-l pl-2">
          {unit.children.map((child) => (
            <OrbatTreeNode key={child.id} unit={child} showDebug={showDebug} />
          ))}
        </ul>
      )}
    </li>
  );
}
