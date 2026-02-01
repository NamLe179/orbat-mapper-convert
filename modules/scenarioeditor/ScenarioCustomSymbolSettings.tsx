"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpRight } from "lucide-react";

// Types
import type { CustomSymbol } from "@/types/scenarioModels";
import type { ColumnDef } from "@tanstack/react-table";

// Context & Stores
import { useActiveScenario } from "@/components/injects";
import { useToeEditableItems } from "@/hooks/toeUtils";
import { useNotifications } from "@/hooks/notifications";
import { useCustomSymbolTableStore } from "@/stores/tableStores";

// UI Components
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import ToeGrid from "@/modules/grid/ToeGrid";
import AddCustomSymbolForm from "@/modules/scenarioeditor/AddCustomSymbolForm";
import MilitarySymbol from "@/components/NewMilitarySymbol";
import { Button } from "@/components/ui/button";

// Utils
import { clearUnitStyleCache } from "@/geo/unitStyles";

export default function ScenarioCustomSymbolSettings() {
  const scn = useActiveScenario();
  const { send } = useNotifications();
  const tableStore = useCustomSymbolTableStore();

  // --- Local State ---
  const [addForm, setAddForm] = useState<Omit<CustomSymbol, "id">>({
    name: "Name",
    src: "",
    sidc: "10031000001100000000",
  });

  // --- Editable Logic (Custom Hook) ---
  const {
    editMode,
    setEditMode,
    editedId,
    setEditedId,
    showAddForm,
    setShowAddForm,
    selectedItems,
    setSelectedItems,
    triggerRerender,
  } = useToeEditableItems<CustomSymbol>();

  // --- Computed ---
  const icons = useMemo(() => {
    // Trong React, component tự re-render khi scn.store.state thay đổi 
    // nếu nó được bọc trong một Observer hoặc dùng selector hook phù hợp.
    return Object.values(scn.store.state.customSymbolMap) || [];
  }, [scn.store.state.customSymbolMap, scn.store.state.settingsStateCounter]);

  // --- Column Definitions ---
  const columns = useMemo<ColumnDef<CustomSymbol>[]>(() => [
    {
      id: "src",
      header: "Icon",
      accessorKey: "src",
      enableSorting: false,
      cell: ({ getValue }) => (
        <img
          className="w-full contain-content"
          src={getValue() as string}
          alt="Symbol"
        />
      ),
      size: 100,
    },
    { id: "name", header: "Name", accessorKey: "name", size: 200 },
    {
      id: "sidcIcon",
      header: "SIDC",
      accessorKey: "sidc",
      enableSorting: false,
      cell: ({ getValue }) => (
        <div className="flex items-center justify-center">
          <MilitarySymbol
            sidc={getValue() as string}
            size={40}
            options={{ monoColor: "#7a7575" }}
          />
        </div>
      ),
      size: 80,
    },
    { id: "sidc", header: "SIDC Code", accessorKey: "sidc", size: 200 },
    { id: "id", header: "Id", accessorKey: "id", size: 100 },
  ], []);

  // --- Handlers ---
  const cancelEdit = () => setEditedId(null);

  const onSubmit = (e: CustomSymbol) => {
    const { id, ...rest } = e;
    scn.settings.updateCustomSymbol(id, rest);
    cancelEdit();
    triggerRerender();
    clearUnitStyleCache();
  };

  const onDelete = () => {
    const notDeletedItems: CustomSymbol[] = [];
    scn.store.groupUpdate(() => {
      selectedItems.forEach((e) => {
        const success = scn.settings.deleteCustomSymbol(e.id);
        if (!success) {
          send({
            type: "error",
            message: `${e.name}: Cannot delete a symbol that is in use.`,
          });
          notDeletedItems.push(e);
        }
      });
    });

    setEditMode(false);
    setSelectedItems(notDeletedItems);
  };

  const onAddSubmit = (formData: Omit<CustomSymbol, "id">) => {
    if (icons.find((e) => e.name === formData.name)) {
      send({
        type: "error",
        message: "Custom symbol with this name already exists.",
      });
      return;
    }
    scn.settings.addCustomSymbol({ ...formData });
    setAddForm({ name: "Name", src: "", sidc: "10031000001100000000" });
    clearUnitStyleCache();
    setShowAddForm(false);
  };

  return (
    <div className="space-y-4">
      

      <ToeGridHeader
        editMode={editMode}
        setEditMode={setEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        editLabel="Edit symbols"
        selectedCount={selectedItems.length}
        hideEdit={icons.length === 0}
        onDelete={onDelete}
      />

      {showAddForm && (
        <AddCustomSymbolForm
          modelValue={addForm}
          onCancel={() => setShowAddForm(false)}
          onSubmit={onAddSubmit}
          heading="Add new symbol"
        />
      )}

      {icons.length > 0 ? (
        <ToeGrid
          columns={columns}
          data={icons}
          editedId={editedId}
          onEditedIdChange={setEditedId}
          select={editMode}
          selectedItems={selectedItems}
          onSelectedItemsChange={setSelectedItems}
          editMode={editMode}
          onEditModeChange={setEditMode}
          initialState={{ columnVisibility: { id: false } }}
          renderInlineForm={(row) => (
            <div className="pr-6">
              <InlineFormWrapper>
                <AddCustomSymbolForm
                  modelValue={row}
                  onSubmit={(formData) => onSubmit(formData as CustomSymbol)}
                  onCancel={cancelEdit}
                  heading="Edit custom symbol"
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      ) : (
        <p className="prose prose-sm dark:prose-invert italic text-muted-foreground">
          Use the <kbd className="font-sans">Add</kbd> button to add additional symbols to this scenario.
        </p>
      )}

      <div className="mt-6 text-center border-t pt-4">
        <Button variant="link" asChild className="text-muted-foreground" size="sm">
          <a
            href="https://docs.orbat-mapper.app/guide/custom-symbols"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1"
          >
            Documentation
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}