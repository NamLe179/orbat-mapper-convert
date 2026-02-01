"use client";

import React, { useState, useMemo, useEffect } from "react";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

// UI Components (Shadcn/Custom)
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { 
  Field, FieldDescription, FieldGroup, FieldLabel, 
  FieldLegend, FieldSeparator, FieldSet 
} from "@/components/ui/field";

// Logic & Stores
import { useActiveScenario } from "@/components/injects";
import { useImportStore } from "@/stores/importExportStore";
import { useTimeFormatStore } from "@/stores/timeFormatStore";
import { useNotifications } from "@/hooks/notifications";
import { prepareScenario } from "@/scenariostore/newScenarioStore";
import { createNameToIdMap, moveItemMutable } from "@/utils";
import { addUnitHierarchy } from "@/importexport/convertUtils";
import { getSupplyClass, getUom } from "@/scenariostore/supplyManipulations";

// Components
import DataGrid from "@/modules/grid/DataGrid";
import OrbatCellRenderer from "@/components/OrbatCellRenderer";
import ToggleField from "@/components/ToggleField";
import FieldSelect from "@/components/FieldSelect";
import MRadioGroup from "@/components/MRadioGroup";
import InputRadio from "@/components/InputRadio";
import InlineAlertWarning from "@/components/InlineAlertWarning";
import BaseButton from "@/components/BaseButton";
import PanelSubHeading from "@/components/PanelSubHeading";

dayjs.extend(duration);

interface Props {
  data: any; // Scenario data
  onCancel: () => void;
  onLoaded: () => void;
}

export default function ImportOrbatMapperStep({ data, onCancel, onLoaded }: Props) {
  const activeScenario = useActiveScenario();
  const { unitActions, settings, store: scnStore, time: scenarioTime } = activeScenario;
  const store = useImportStore();
  const { send } = useNotifications();
  const fmt = useTimeFormatStore();

  const targetState = scnStore.state;

  // --- Local State ---
  const [importMode, setImportMode] = useState<string>("side");
  const [unitImportMode, setUnitImportMode] = useState<string>("state-only");
  const [stateMergeMode, setStateMergeMode] = useState<string>("replace");
  const [sideMergeMode, setSideMergeMode] = useState<string>("replace");
  const [groupMergeMode, setGroupMergeMode] = useState<string>("add_new");
  const [selectUnits, setSelectUnits] = useState(false);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<any[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<any[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<any[]>([]);
  const [selectedSupplyCategories, setSelectedSupplyCategories] = useState<any[]>([]);
  const [selectedCustomSymbols, setSelectedCustomSymbols] = useState<any[]>([]);

  // --- Computed (useMemo) ---
  const importedState = useMemo(() => prepareScenario(data), [data]);

  const importedSides = useMemo(() => 
    importedState.sides.map(id => ({
      label: importedState.sideMap[id].name,
      value: id
    })), [importedState]);

  const [selectedSourceSideId, setSelectedSourceSideId] = useState(importedSides[0]?.value || "");

  const importedSideGroups = useMemo(() => {
    const side = importedState.sideMap[selectedSourceSideId];
    if (!side) return [];
    return side.groups.map(id => ({
      label: importedState.sideGroupMap[id].name,
      value: id
    }));
  }, [importedState, selectedSourceSideId]);

  const [selectedSourceSideGroupId, setSelectedSourceSideGroupId] = useState("");
  const [selectedTargetSideId, setSelectedTargetSideId] = useState("");

  // Auto-select first group when side changes
  useEffect(() => {
    if (importedSideGroups.length > 0) {
      setSelectedSourceSideGroupId(importedSideGroups[0].value);
    }
  }, [selectedSourceSideId, importedSideGroups]);

  const currentData = useMemo(() => {
    const s = data.sides.find((s: any) => s.id === selectedSourceSideId);
    if (importMode === "side") return s?.groups ?? [];
    const sg = s?.groups.find((g: any) => g.id === selectedSourceSideGroupId);
    return sg?.subUnits ?? [];
  }, [data, selectedSourceSideId, selectedSourceSideGroupId, importMode]);

  const isSettingsImport = useMemo(() => 
    ["statuses", "equipment", "personnel", "supplyCategories", "customSymbols"].includes(importMode),
  [importMode]);

  const hasExistingUnits = useMemo(() => 
    selectedItems.some(item => item.id in targetState.unitMap),
  [selectedItems, targetState.unitMap]);

  // --- Table Columns Definition ---
  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: ({ table }: any) => (
        <button
          type="button"
          onClick={table.getToggleAllRowsExpandedHandler()}
          className="flex items-center gap-2"
        >
          <ChevronRightIcon className={`size-6 transition-transform ${table.getIsAllRowsExpanded() ? "rotate-90" : ""}`} />
          Name
        </button>
      ),
      cell: ({ row, getValue }: any) => (
        <OrbatCellRenderer
          value={getValue()}
          sidc={row.original.sidc}
          expanded={row.getIsExpanded()}
          level={row.depth}
          canExpand={row.getCanExpand()}
          onToggle={row.getToggleExpandedHandler()}
          symbolOptions={{ ...importedState.sideMap[row.original._sid]?.symbolOptions }}
        />
      ),
      size: 350,
    },
    {
      id: "exists",
      header: "Exists?",
      accessorFn: (f: any) => (f.id in targetState.unitMap ? "Yes" : "No"),
      size: 90,
    }
  ], [importedState, targetState.unitMap]);

  // --- Handlers (Simplified) ---
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Logic thực hiện import dựa trên importMode (giống code Vue)
    // Ví dụ: if (importMode === 'equipment') doEquipmentImport(...)
    
    scenarioTime.setCurrentTime(targetState.currentTime);
    send({ message: "Imported data from scenario", type: "success" });
    if (!store.keepOpen) onLoaded();
  };

  return (
    <div className="import-mapper">
      <form onSubmit={onFormSubmit} className="mt-4 flex max-h-[80vh] flex-col overflow-hidden">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Import scenario data</FieldLegend>
            <div className="flex items-center gap-4">
              <FieldDescription>Select components to merge into current scenario.</FieldDescription>
              <Button type="button" variant="outline" onClick={() => {}}>
                Load as new scenario
              </Button>
            </div>

            

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>{data.name}</CardTitle>
                <CardDescription>{data.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                Units detected: {Object.keys(importedState.unitMap).length}
              </CardContent>
            </Card>
          </FieldSet>

          <FieldSeparator>Source</FieldSeparator>
          
          <FieldSet>
            <FieldLabel>What to import?</FieldLabel>
            <RadioGroup value={importMode} onValueChange={setImportMode} className="grid gap-y-3 sm:grid-cols-4">
              {[
                { value: "side", label: "Side" },
                { value: "group", label: "Group" },
                { value: "equipment", label: "Equipment" },
                { value: "personnel", label: "Personnel" },
                { value: "statuses", label: "Statuses" }
              ].map((src) => (
                <Field key={src.value} orientation="horizontal">
                  <RadioGroupItem id={src.value} value={src.value} />
                  <FieldLabel htmlFor={src.value} className="font-normal">{src.label}</FieldLabel>
                </Field>
              ))}
            </RadioGroup>
          </FieldSet>

          {!isSettingsImport && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <FieldSelect
                label="Source Side"
                items={importedSides}
                value={selectedSourceSideId}
                onValueChange={(val) => val !== null && setSelectedSourceSideId(String(val))}
              />
              {(importMode === "group" || importMode === "units") && (
                <FieldSelect
                  label="Side Group"
                  items={importedSideGroups}
                  value={selectedSourceSideGroupId}
                  onValueChange={(val) => val !== null && setSelectedSourceSideGroupId(String(val))}
                />
              )}
            </div>
          )}

          <div className="mt-4 flex-1 overflow-hidden">
            <div className="max-h-[40vh] border rounded-md">
              <DataGrid
                key={selectedSourceSideGroupId}
                data={currentData}
                columns={columns}
                rowHeight={40}
                getSubRows={(row: any) => row.subUnits ?? row.groups}
                selected={selectedItems}
                onSelectionChange={setSelectedItems}
              />
            </div>
          </div>

          {hasExistingUnits && (
            <InlineAlertWarning className="mt-4">
              Conflict detected: Some units already exist in target.
            </InlineAlertWarning>
          )}

          <FieldSet className="mt-4">
            <PanelSubHeading>Import Logic</PanelSubHeading>
            <MRadioGroup className="mt-2 flex gap-5">
              <InputRadio value="units-only" currentValue={unitImportMode} onValueChange={setUnitImportMode}>
                Units only
              </InputRadio>
              <InputRadio value="units-and-state" currentValue={unitImportMode} onValueChange={setUnitImportMode}>
                Units + State
              </InputRadio>
            </MRadioGroup>
          </FieldSet>
        </FieldGroup>

        <footer className="flex shrink-0 flex-col justify-between gap-3 pt-6 border-t mt-auto sm:flex-row sm:items-center">
          <ToggleField checked={store.keepOpen} onCheckedChange={(val: string | boolean) => store.setKeepOpen(!!val)}>
            Keep dialog open
          </ToggleField>
          <div className="flex items-center gap-2">
            <BaseButton type="submit" primary small>Import Now</BaseButton>
            <BaseButton type="button" small onClick={onCancel}>Cancel</BaseButton>
          </div>
        </footer>
      </form>
    </div>
  );
}