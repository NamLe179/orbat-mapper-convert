"use client";

import React, { useState, useMemo } from "react";
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { useEquipmentTableStore } from "@/stores/tableStores";
import { useToeEditableItems } from "@/hooks/toeUtils";
import { useUiStore } from "@/stores/uiStore";

// Components
import TableHeader from "@/components/TableHeader";
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import ToeGrid from "@/modules/grid/ToeGrid";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import AddNameDescriptionForm from "@/modules/scenarioeditor/AddNameDescriptionForm";

// Types
import type { NEquipmentData } from "@/types/internalModels";
import type { ColumnDef } from "@tanstack/react-table";

export default function ScenarioInfoEquipment() {
  const scn = useActiveScenario();
  const { send } = useNotifications();
  const tableStore = useEquipmentTableStore();
  const uiStore = useUiStore();

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
  } = useToeEditableItems<NEquipmentData>();

  // --- Local State ---
  const [addForm, setAddForm] = useState<Omit<NEquipmentData, "id">>({
    name: "",
    description: "",
  });

  // --- Computed (useMemo) ---
  const equipment = useMemo(() => {
    // Phụ thuộc vào counter state của store để cập nhật dữ liệu mới nhất
    return Object.values(scn.store.state.equipmentMap);
  }, [scn.store.state.equipmentMap, scn.store.state.settingsStateCounter]);

  // --- Table Columns Definition ---
  const columns = useMemo<ColumnDef<NEquipmentData>[]>(
    () => [
      { id: "name", header: "Name", accessorKey: "name", size: 200 },
      { id: "description", header: "Description", accessorKey: "description" },
    ],
    []
  );

  // --- Handlers ---
  const onSubmit = (e: NEquipmentData) => {
    const { id, ...rest } = e;
    scn.unitActions.updateEquipment(id, rest);

    if (uiStore.goToNextOnSubmit) {
      const currentIndex = equipment.findIndex((sc) => sc.id === id);
      if (currentIndex < equipment.length - 1) {
        setEditedId(equipment[currentIndex + 1].id);
      } else {
        setEditedId(null);
      }
    } else {
      setEditedId(null);
    }
    triggerRerender();
  };

  const cancelEdit = () => setEditedId(null);

  const onAddSubmit = (formData: Omit<NEquipmentData, "id">) => {
    if (equipment.find((e) => e.name === formData.name)) {
      send({
        type: "error",
        message: "Equipment category with this name already exists.",
      });
      return;
    }
    scn.unitActions.addEquipment({ ...formData });
    setAddForm({ name: "", description: "" });
    setShowAddForm(false);
  };

  const onDelete = () => {
    const notDeletedItems: NEquipmentData[] = [];
    scn.store.groupUpdate(() => {
      selectedItems.forEach((e) => {
        const success = scn.unitActions.deleteEquipment(e.id);
        if (!success) {
          send({
            type: "error",
            message: `${e.name}: Cannot delete an equipment category that is in use.`,
          });
          notDeletedItems.push(e);
        }
      });
    });
    setEditMode(false);
    setSelectedItems(notDeletedItems);
  };

  return (
    <div className="scenario-info-equipment">
      <TableHeader description="A list of equipment categories available in this scenario." />

      

      <ToeGridHeader
        editMode={editMode}
        setEditMode={setEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        editLabel="Edit equipment"
        selectedCount={selectedItems.length}
        hideEdit={equipment.length === 0}
        onDelete={onDelete}
      />

      {showAddForm && (
        <AddNameDescriptionForm
          value={addForm}
          onCancel={() => setShowAddForm(false)}
          onSubmit={onAddSubmit}
        />
      )}

      {equipment.length > 0 ? (
        <ToeGrid
          columns={columns}
          data={equipment}
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
                  onSubmit={(data) => onSubmit(data as NEquipmentData)}
                  onCancel={cancelEdit}
                  heading="Edit equipment category"
                  showNextToggle
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      ) : (
        <p className="prose prose-sm dark:prose-invert italic text-muted-foreground mt-4">
          Use the <kbd className="font-sans">Add</kbd> button to add equipment categories to this scenario.
        </p>
      )}
    </div>
  );
}