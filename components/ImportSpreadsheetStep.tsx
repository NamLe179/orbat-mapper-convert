"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronRightIcon } from "@heroicons/react/20/solid";

// Libs & Utils
import { readSpreadsheet } from "@/extlib/xlsx-read-lazy";
import { detectSpreadsheetDialect } from "@/importexport/spreadsheets/utils";
import { type OdinUnitInfoRow, parseOdinDragon } from "@/importexport/spreadsheets/odinDragon";
import { addUnitHierarchy } from "@/importexport/convertUtils";
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { useRootUnits } from "@/hooks/scenarioUtils";
import { cn } from "@/lib/utils";

// Components
import BaseButton from "@/components/BaseButton";
import SymbolCodeSelect from "@/components/SymbolCodeSelect";
import InputCheckbox from "@/components/InputCheckbox";
import DataGrid from "@/modules/grid/DataGrid";
import OrbatCellRenderer from "@/components/OrbatCellRenderer";

// Types
import type { ImportedFileInfo } from "@/importexport/fileHandling";
import type { Unit } from "@/types/scenarioModels";

interface Props {
  fileInfo: ImportedFileInfo;
  onCancel: () => void;
  onLoaded: () => void;
}

export default function ImportSpreadsheetStep({ fileInfo, onCancel, onLoaded }: Props) {
  const scenario = useActiveScenario();
  const { send } = useNotifications();
  const { rootUnitItems } = useRootUnits();

  // --- Local State ---
  const [expandTemplates, setExpandTemplates] = useState(true);
  const [includeEquipment, setIncludeEquipment] = useState(true);
  const [includePersonnel, setIncludePersonnel] = useState(true);
  const [parentUnitId, setParentUnitId] = useState<string>(rootUnitItems[0]?.code || "");

  const [importedUnits, setImportedUnits] = useState<Unit[]>([]);
  const [rowMapTest, setRowMapTest] = useState<Map<number, OdinUnitInfoRow> | null>(null);

  // --- Spreadsheet Processing ---
  const { workbook, dialect } = useMemo(() => {
    const wb = readSpreadsheet(fileInfo.dataAsArrayBuffer);
    const d = detectSpreadsheetDialect(wb);
    return { workbook: wb, dialect: d };
  }, [fileInfo]);

  useEffect(() => {
    if (dialect === "ODIN_DRAGON") {
      const { rootUnits, rowMap } = parseOdinDragon(workbook, {
        rowsOnly: false,
        expandTemplates: false,
      });
      setImportedUnits(rootUnits);
      setRowMapTest(rowMap || null);
    }
  }, [workbook, dialect]);

  // --- Column Definition (React Table style) ---
  const columns = useMemo(() => [
    {
      id: "name",
      accessorFn: (f: Unit) => f.name,
      header: ({ table }: any) => (
        <button
          type="button"
          title="Expand/collapse all"
          onClick={table.getToggleAllRowsExpandedHandler()}
          className="flex items-center gap-2"
        >
          <ChevronRightIcon
            className={cn(
              "size-6 transform transition-transform text-muted-foreground",
              table.getIsAllRowsExpanded() ? "rotate-90" : ""
            )}
          />
          Unit
        </button>
      ),
      cell: ({ getValue, row }: any) => (
        <OrbatCellRenderer
          value={getValue()}
          sidc={row.original.sidc}
          expanded={row.getIsExpanded()}
          level={row.depth}
          canExpand={row.getCanExpand()}
          onToggle={row.getToggleExpandedHandler()}
          symbolOptions={{}}
        />
      ),
      size: 450,
    },
    {
      id: "template",
      header: "Template",
      accessorFn: (u: Unit) => rowMapTest?.get(Number(u.id))?.["TEMPLATE NAME"],
      size: 300,
    },
  ], [rowMapTest]);

  // --- Handlers ---
  const onLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dialect !== "ODIN_DRAGON") {
      send({
        message: "Invalid file format",
        type: "error",
      });
      return;
    }

    const { rootUnits } = parseOdinDragon(workbook, {
      expandTemplates,
      includeEquipment,
      includePersonnel,
    });

    rootUnits.forEach((unit) => {
      addUnitHierarchy(unit, parentUnitId, scenario);
    });

    onLoaded();
  };

  return (
    <div>
      <form onSubmit={onLoad} className="mt-4 flex max-h-[80vh] flex-col">
        <div className="shrink-0 overflow-auto">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              Import units exported from{" "}
              <a
                href="https://odin.tradoc.army.mil/DATEWORLD"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                ODIN DATEWORLD
              </a>
              . Only the DRAGON Excel export format is currently supported.
            </p>
          </div>

          

          <section className="mt-4 space-y-4 px-1">
            <div className="grid gap-4 sm:grid-cols-3">
              <InputCheckbox
                label="Expand unit templates"
                description="This will create a lot of units!"
                checked={expandTemplates}
                onCheckedChange={(val: string | boolean) => setExpandTemplates(!!val)}
              />
              {expandTemplates && (
                <>
                  <InputCheckbox
                    label="Include equipment"
                    checked={includeEquipment}
                    onCheckedChange={(val: string | boolean) => setIncludeEquipment(!!val)}
                  />
                  <InputCheckbox
                    label="Include personnel"
                    checked={includePersonnel}
                    onCheckedChange={(val: string | boolean) => setIncludePersonnel(!!val)}
                  />
                </>
              )}
            </div>
            <SymbolCodeSelect
              label="Select parent unit"
              items={rootUnitItems}
              value={parentUnitId}
              onValueChange={(val) => val !== null && setParentUnitId(val)}
            />
          </section>
        </div>

        <section className="mt-2 flex-auto min-h-0">
          <div className="max-h-[40vh] border rounded-md">
            <DataGrid
              data={importedUnits}
              columns={columns}
              rowHeight={40}
              showGlobalFilter
              initialState={{ expanded: true }}
              getSubRows={(row: any) => row.subUnits}
            />
          </div>
        </section>

        <footer className="flex shrink-0 items-center justify-end space-x-2 pt-4 border-t mt-4">
          <BaseButton type="submit" primary small>
            Import
          </BaseButton>
          <BaseButton type="button" small onClick={onCancel}>
            Cancel
          </BaseButton>
        </footer>
      </form>
    </div>
  );
}