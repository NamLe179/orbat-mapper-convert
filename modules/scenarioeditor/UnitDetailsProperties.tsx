"use client";

import React, { useState, useMemo } from "react";
import { useActiveScenario } from "@/components/injects";

// Types
import type { NUnit, UnitPropertyUpdate } from "@/types/internalModels";
import type { SpeedUnitOfMeasure, UnitProperty } from "@/types/scenarioModels";

// Components (Giả định đã convert)
import PropertyInput from "@/components/PropertyInput";

interface UnitDetailsPropertiesProps {
  unit: NUnit;
  isLocked?: boolean;
}

// Helper function (Pure)
function formatSpeed({
  value,
  uom,
}: {
  value: number;
  uom: SpeedUnitOfMeasure;
}): string {
  switch (uom) {
    case "km/h":
      return value.toFixed(1) + " km/h";
    case "knots":
      return value.toFixed(1) + " knots";
    case "mph":
      return value.toFixed(1) + " mph";
    case "ft/s":
      return value.toFixed(1) + " ft/s";
    default:
      return value.toFixed(1) + " m/s";
  }
}

export default function UnitDetailsProperties({
  unit,
  isLocked = false,
}: UnitDetailsPropertiesProps) {
  // --- Hooks ---
  const { unitActions } = useActiveScenario();

  // --- State ---
  const [showMax, setShowMax] = useState(false);
  const [showAverage, setShowAverage] = useState(false);

  // --- Computed (useMemo) ---
  const maxSpeed = useMemo(() => {
    const v = unit.properties?.maxSpeed;
    if (v === undefined) return "Not set";
    return formatSpeed(v);
  }, [unit.properties?.maxSpeed]);

  const averageSpeed = useMemo(() => {
    const v = unit.properties?.averageSpeed;
    if (v === undefined) return "Not set";
    return formatSpeed(v);
  }, [unit.properties?.averageSpeed]);

  // --- Handlers ---

  const updateMaxSpeed = (data: UnitPropertyUpdate) => {
    setShowMax(false);
    
    // @ts-ignore
    if (isNaN(data.value)) return;

    if (data.value === null || data.value === "" || data.value === undefined) {
      unitActions.updateUnitProperties(unit.id, {
        maxSpeed: undefined,
      });
      return;
    }
    
    unitActions.updateUnitProperties(unit.id, {
      maxSpeed: data as UnitProperty,
    });
  };

  const updateAverageSpeed = (data: UnitPropertyUpdate) => {
    setShowAverage(false);

    // @ts-ignore
    if (isNaN(data.value)) return;

    if (data.value === null || data.value === "" || data.value === undefined) {
      unitActions.updateUnitProperties(unit.id, {
        averageSpeed: undefined,
      });
      return;
    } else {
      unitActions.updateUnitProperties(unit.id, {
        averageSpeed: data as UnitProperty,
      });
    }
  };

  return (
    <section className="prose text-foreground dark:prose-invert mt-4">
      <table className="divide-border w-full divide-y">
        <thead>
          <tr>
            <th>Unit property</th>
            <th className="w-36">Value</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {/* Average Speed Row */}
          <tr>
            <td>Average speed</td>
            <td
              className="flex cursor-pointer items-center justify-start"
              onClick={() => {
                if (!isLocked) setShowAverage(true);
              }}
            >
              {!isLocked && showAverage ? (
                <div className="w-32" onClick={(e) => e.stopPropagation()}>
                  <PropertyInput
                    property={unit.properties?.averageSpeed}
                    onUpdateValue={updateAverageSpeed}
                  />
                </div>
              ) : (
                <span>{averageSpeed}</span>
              )}
            </td>
          </tr>

          {/* Max Speed Row */}
          <tr>
            <td>Maximum speed</td>
            <td
              className="flex cursor-pointer items-center justify-start"
              onClick={() => {
                if (!isLocked) setShowMax(true);
              }}
            >
              {!isLocked && showMax ? (
                <div className="w-32" onClick={(e) => e.stopPropagation()}>
                   {/* Giả định PropertyInput có prop onUpdateValue tương ứng với emit update-value */}
                  <PropertyInput
                    onUpdateValue={updateMaxSpeed}
                    // Có thể cần truyền property hiện tại vào nếu PropertyInput cần init value
                    property={unit.properties?.maxSpeed} 
                  />
                </div>
              ) : (
                <span>{maxSpeed}</span>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}