"use client";

import React, { useState, useMemo } from "react";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useToeEditableItems } from "@/hooks/toeUtils";
import { useFillColorTableStore } from "@/stores/tableStores";
import { useNotifications } from "@/hooks/notifications";

// Components
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import ToeGrid from "@/modules/grid/ToeGrid";
import AddSymbolFillColorForm from "@/modules/scenarioeditor/AddSymbolFillColorForm";

// Types
import type { ColumnDef } from "@tanstack/react-table";
import type { NSymbolFillColor } from "@/types/internalModels";
import type { SymbolFillColor } from "@/config/colors";

export default function ScenarioSymbolColorSettings() {
  const scn = useActiveScenario();
  const { store } = scn;
  const { send } = useNotifications();
  const tableStore = useFillColorTableStore();

  // --- Editable Logic (Custom Hook) ---
  const {
    editMode,
    setEditMode,
    editedId,
    setEditedId,
    showAddForm,
    setShowAddForm,
    selectedItems: selectedColors,
    setSelectedItems: setSelectedColors,
    triggerRerender,
  } = useToeEditableItems<NSymbolFillColor>();

  // --- Local State ---
  const [addForm, setAddForm] = useState<SymbolFillColor>({
    code: "#ffaabb",
    text: "",
  });

  // --- Computed (useMemo) ---
  const colors = useMemo(() => {
    // React tự động trigger re-render khi store state thay đổi
    return Object.values(store.state.symbolFillColorMap);
  }, [store.state.symbolFillColorMap, store.state.settingsStateCounter]);

  // --- Column Definitions ---
  const columns = useMemo<ColumnDef<NSymbolFillColor>[]>(() => [
    { id: "text", header: "Name", accessorKey: "text", size: 200 },
    {
      id: "color",
      header: "Color",
      accessorKey: "code",
      enableSorting: false,
      cell: ({ getValue }) => (
        <div
          className="size-8 border border-black"
          style={{ backgroundColor: getValue() as string }}
        />
      ),
      size: 100,
    },
    { id: "code", header: "Value", accessorKey: "code" },
  ], []);

  // --- Handlers ---
  const onDelete = () => {
    store.groupUpdate(() => {
      selectedColors.forEach((e) => {
        scn.settings.deleteSymbolFillColor(e.id);
      });
    });
    setSelectedColors([]);
  };

  const onAddSubmit = (formData: SymbolFillColor) => {
    // Check if color value exists
    if (colors.find((e) => e.code === formData.code)) {
      send({
        type: "error",
        message: "Color with same value already exists.",
      });
      return;
    }
    scn.settings.addSymbolFillColor({ ...formData });
    setAddForm({ ...formData, code: "#ffaabb", text: "" });
    setShowAddForm(false);
  };

  const cancelEdit = () => setEditedId(null);

  const onSubmit = (e: NSymbolFillColor) => {
    const { id, ...rest } = e;
    scn.settings.updateSymbolFillColor(id, rest);
    cancelEdit();
    triggerRerender();
  };

  return (
    <div className="flex flex-col space-y-4">
      <p className="text-muted-foreground text-sm font-medium">
        Additional symbol fill colors
      </p>

      

      <ToeGridHeader
        editMode={editMode}
        setEditMode={setEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        editLabel="Edit Colors"
        selectedCount={selectedColors.length}
        hideEdit={colors.length === 0}
        onDelete={onDelete}
      />

      {showAddForm && (
        <AddSymbolFillColorForm
          value={addForm}
          onCancel={() => setShowAddForm(false)}
          onSubmit={onAddSubmit}
          heading="Add new symbol fill color"
        />
      )}

      {colors.length > 0 ? (
        <ToeGrid
          columns={columns}
          data={colors}
          editedId={editedId}
          onEditedIdChange={setEditedId}
          select={editMode}
          selectedItems={selectedColors}
          onSelectedItemsChange={setSelectedColors}
          editMode={editMode}
          onEditModeChange={setEditMode}
          renderInlineForm={(row) => (
            <div className="pr-6">
              <InlineFormWrapper>
                <AddSymbolFillColorForm
                  value={row}
                  onSubmit={(data) => onSubmit(data as NSymbolFillColor)}
                  onCancel={cancelEdit}
                  heading="Edit symbol fill color"
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      ) : (
        <p className="prose prose-sm dark:prose-invert italic text-muted-foreground">
          Use the <kbd className="font-sans">Add</kbd> button to add additional symbol fill colors to this scenario.
        </p>
      )}
    </div>
  );
}