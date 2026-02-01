"use client";

import React, { useState, useEffect, useMemo } from "react";

// Types
import type { ColumnProperties } from "@/modules/grid/gridTypes";
import type { NUnit } from "@/types/internalModels";
import type { MenuItemData } from "@/components/types";
import { type SideAction, SideActions } from "@/types/constants";

// Hooks & Store
import { useScenario } from "@/scenariostore";

// Components
import OrbatGrid from "@/modules/grid/OrbatGrid";
import ToggleField from "@/components/ToggleField";
import BaseButton from "@/components/BaseButton";

interface ExtendedUnit extends NUnit {
  sideName: string;
  sideId: string;
}

const SIDE_MENU_ITEMS: MenuItemData<SideAction>[] = [
  { label: "Edit", action: SideActions.Edit },
  { label: "Add group", action: SideActions.AddGroup },
  { label: "Delete side", action: SideActions.Delete },
  { label: "Move up", action: SideActions.MoveUp },
  { label: "Move down", action: SideActions.MoveDown },
];

export default function GridTestView() {
  const { scenario, isReady } = useScenario();

  // --- State ---
  const [data, setData] = useState<ExtendedUnit[]>([]);
  const [selected, setSelected] = useState<ExtendedUnit[]>([]);
  const [doSelect, setDoSelect] = useState(true);

  // --- Column Configuration ---
  const columns = useMemo<ColumnProperties<ExtendedUnit>[]>(() => [
    { field: "sidc", label: "Icon", type: "sidc", width: 65, resizable: false },
    { field: "name", label: "Name", sortable: true },
    { field: "shortName", label: "Short name", sortable: true },
    { field: "externalUrl", label: "URL" },
    { field: "sideName", label: "Side", rowGroup: true, sortable: true },
    { field: "id", label: "id" },
    // Truy cập nested property theo pattern dot-notation (tùy vào triển khai OrbatGrid)
    { field: "state.0.location" as any, label: "p[0]" },
  ], []);

  // --- Load Initial Data (onMounted) ---
  useEffect(() => {
    const loadDemo = async () => {
      if (!scenario) return;
      
      await scenario.io.loadDemoScenario("falkland82");

      const { sideMap } = scenario.store.state;
      const unitData: ExtendedUnit[] = [];

      Object.keys(sideMap).forEach((sideId) => {
        scenario.unitActions.walkSide(
          sideId,
          (unit: any, level: any, parent: any, sideGroup: any, side: any) => {
            unitData.push({ 
              ...unit, 
              sideId: side.id, 
              sideName: side?.name || "" 
            } as ExtendedUnit);
          }
        );
      });

      setData(unitData);
    };

    if (isReady) {
      loadDemo();
    }
  }, [isReady, scenario]);

  // --- Handlers ---
  const onAction = (action: string, payload: { data: any; index: number }) => {
    console.log("on action", action, payload.data, payload.index);
  };

  const mutateData = () => {
    // Xóa 5 phần tử bắt đầu từ index 10 (React style - Immutability)
    setData((prevData) => {
      const newData = [...prevData];
      newData.splice(10, 5);
      return newData;
    });
  };

  return (
    <main className="h-full pt-10 sm:p-10 bg-background text-foreground">
      {/* Control Bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center gap-4 p-2 bg-muted/80 backdrop-blur-sm border-b">
        <ToggleField 
          checked={doSelect} 
          onCheckedChange={(val: string | boolean) => setDoSelect(!!val)}
        >
          Select Mode
        </ToggleField>

        {doSelect && (
          <span className="text-sm font-medium">
            Selected: {selected.length}
          </span>
        )}

        <BaseButton onClick={mutateData}>
          Mutate Data
        </BaseButton>
      </div>

      

      {/* Grid Container */}
      <section className="h-full mt-4">
        {isReady && data.length > 0 ? (
          <OrbatGrid
            data={data as any}
            columns={columns as any}
            onAction={onAction}
            select={doSelect}
            selected={selected}
            onSelectionChange={setSelected}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading scenario data...
          </div>
        )}
      </section>
    </main>
  );
}