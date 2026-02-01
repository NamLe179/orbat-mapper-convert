"use client";

import React, { useState, useMemo } from "react";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { useSupplyClassTableStore } from "@/stores/tableStores";
import { useToeEditableItems } from "@/hooks/toeUtils";

// Components
import TableHeader from "@/components/TableHeader";
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import ToeGrid from "@/modules/grid/ToeGrid";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import AddNameDescriptionForm from "@/modules/scenarioeditor/AddNameDescriptionForm";

// Types
import type { NSupplyClass } from "@/types/internalModels";
import type { ColumnDef } from "@tanstack/react-table";

export default function ScenarioInfoSupplyClasses() {
  const scn = useActiveScenario();
  const { send } = useNotifications();
  const tableStore = useSupplyClassTableStore();

  // --- Editable Items Logic (Custom Hook) ---
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
  } = useToeEditableItems<NSupplyClass>();

  // --- Local State ---
  const [addForm, setAddForm] = useState<Omit<NSupplyClass, "id">>({
    name: "",
    description: "",
  });

  // --- Computed (useMemo) ---
  const supplyClasses = useMemo(() => {
    // Phụ thuộc vào counter state của store để cập nhật dữ liệu mới nhất
    return Object.values(scn.store.state.supplyClassMap);
  }, [scn.store.state.supplyClassMap, scn.store.state.settingsStateCounter]);

  // --- Table Columns Definition ---
  const columns = useMemo<ColumnDef<NSupplyClass>[]>(() => [
    { id: "name", header: "Name", accessorKey: "name" },
    { id: "description", header: "Description", accessorKey: "description" },
  ], []);

  // --- Handlers ---
  const onSubmit = (e: NSupplyClass) => {
    const { id, ...rest } = e;
    scn.unitActions.updateSupplyClass(id, rest);
    setEditedId(null);
    triggerRerender();
  };

  const cancelEdit = () => setEditedId(null);

  const onAddSubmit = (formData: Omit<NSupplyClass, "id">) => {
    if (supplyClasses.find((e) => e.name === formData.name)) {
      send({
        type: "error",
        message: "Supply class with this name already exists.",
      });
      return;
    }
    scn.unitActions.addSupplyClass({ ...formData });
    setAddForm({ name: "", description: "" });
    setShowAddForm(false);
  };

  const onDelete = () => {
    const notDeletedItems: any[] = [];
    scn.store.groupUpdate(() => {
      selectedItems.forEach((e) => {
        const success = scn.unitActions.deleteSupplyClass(e.id);
        if (!success) {
          send({
            type: "error",
            message: `${e.name}: Cannot delete a supply class that is in use.`,
          });
          notDeletedItems.push(e);
        }
      });
    });
    setEditMode(false);
    setSelectedItems(notDeletedItems);
  };

  return (
    <div className="flex flex-col space-y-4">
      <TableHeader description="A list of supply classes available in this scenario." />

      

      <ToeGridHeader
        editMode={editMode}
        setEditMode={setEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        editLabel="Edit supply classes"
        selectedCount={selectedItems.length}
        hideEdit={supplyClasses.length === 0}
        onDelete={onDelete}
      />

      {showAddForm && (
        <AddNameDescriptionForm
          value={addForm}
          onCancel={() => setShowAddForm(false)}
          onSubmit={onAddSubmit}
        />
      )}

      {supplyClasses.length > 0 ? (
        <ToeGrid
          columns={columns}
          data={supplyClasses}
          editedId={editedId}
          onEditedIdChange={setEditedId}
          select={editMode}
          selectedItems={selectedItems}
          onSelectedItemsChange={setSelectedItems}
          editMode={editMode}
          onEditModeChange={setEditMode}
          renderInlineForm={(row) => (
            <div className="pr-6">
              <InlineFormWrapper>
                <AddNameDescriptionForm
                  value={row}
                  onSubmit={(data) => onSubmit(data as NSupplyClass)}
                  onCancel={cancelEdit}
                  heading="Edit supply class"
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      ) : (
        <p className="prose prose-sm dark:prose-invert italic text-muted-foreground">
          Use the <kbd className="font-sans">Add</kbd> button to add supply classes to this scenario.
        </p>
      )}
    </div>
  );
}