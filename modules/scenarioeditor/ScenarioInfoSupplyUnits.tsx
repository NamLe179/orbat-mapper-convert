"use client";

import React, { useState, useMemo } from "react";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { useSupplyUoMTableStore } from "@/stores/tableStores";
import { useToeEditableItems } from "@/hooks/toeUtils";

// Components
import TableHeader from "@/components/TableHeader";
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import ToeGrid from "@/modules/grid/ToeGrid";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import AddSupplyUoMForm from "@/modules/scenarioeditor/AddSupplyUoMForm";

// Types
import type { NSupplyUoM } from "@/types/internalModels";
import type { ColumnDef } from "@tanstack/react-table";

export default function ScenarioInfoSupplyUnits() {
  const scn = useActiveScenario();
  const { send } = useNotifications();
  const tableStore = useSupplyUoMTableStore();

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
  } = useToeEditableItems<NSupplyUoM>();

  // --- Local State ---
  const [addForm, setAddForm] = useState<Omit<NSupplyUoM, "id">>({
    name: "",
    code: "",
    description: "",
    type: "",
  });

  // --- Computed (useMemo) ---
  const supplyUnits = useMemo(() => {
    // Phụ thuộc vào counter state của store để cập nhật dữ liệu mới nhất
    return Object.values(scn.store.state.supplyUomMap);
  }, [scn.store.state.supplyUomMap, scn.store.state.settingsStateCounter]);

  const columns = useMemo<ColumnDef<NSupplyUoM>[]>(() => [
    { id: "name", header: "Name", accessorKey: "name", size: 100 },
    { id: "code", header: "Abbrev.", accessorKey: "code", size: 80 },
    { id: "type", header: "Type", accessorKey: "type", size: 100 },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      size: 100,
    },
  ], []);

  // --- Handlers ---
  const onSubmit = (e: NSupplyUoM) => {
    const { id, ...rest } = e;
    scn.unitActions.updateSupplyUom(id, rest);
    setEditedId(null);
    triggerRerender();
  };

  const cancelEdit = () => setEditedId(null);

  const onAddSubmit = (formData: Omit<NSupplyUoM, "id">) => {
    // Check if name exists
    if (supplyUnits.find((e) => e.name === formData.name)) {
      send({
        type: "error",
        message: "Unit of measure/issue with this name already exists.",
      });
      return;
    }
    scn.unitActions.addSupplyUom({ ...formData });
    setAddForm((prev) => ({ ...prev, name: "", code: "", description: "" }));
    setShowAddForm(false);
  };

  const onDelete = () => {
    const notDeletedItems: NSupplyUoM[] = [];
    scn.store.groupUpdate(() => {
      selectedItems.forEach((e) => {
        const success = scn.unitActions.deleteSupplyUom(e.id);
        if (!success) {
          send({
            type: "error",
            message: `${e.name}: Cannot delete an item that is in use.`,
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
      <TableHeader description="A list of unit of measures/issues available in this scenario." />

      

      <ToeGridHeader
        editMode={editMode}
        setEditMode={setEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        editLabel="Edit UoM/UI"
        selectedCount={selectedItems.length}
        hideEdit={supplyUnits.length === 0}
        onDelete={onDelete}
      />

      {showAddForm && (
        <AddSupplyUoMForm
          modelValue={addForm}
          onCancel={() => setShowAddForm(false)}
          onSubmit={onAddSubmit}
          heading="Add new unit of measure/issue"
        />
      )}

      {supplyUnits.length > 0 ? (
        <ToeGrid
          columns={columns}
          data={supplyUnits}
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
                <AddSupplyUoMForm
                  modelValue={row}
                  onSubmit={(data) => onSubmit(data as NSupplyUoM)}
                  onCancel={cancelEdit}
                  heading="Edit unit of measure/issue"
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      ) : (
        <p className="prose prose-sm dark:prose-invert italic text-muted-foreground mt-4">
          Use the <kbd className="font-sans">Add</kbd> button to add a new unit of measure/issue to this scenario.
        </p>
      )}
    </div>
  );
}