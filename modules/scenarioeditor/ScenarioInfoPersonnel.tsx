"use client";

import React, { useState, useMemo } from "react";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { usePersonnelTableStore } from "@/stores/tableStores";
import { useToeEditableItems } from "@/hooks/toeUtils";
import { useUiStore } from "@/stores/uiStore";

// Components
import TableHeader from "@/components/TableHeader";
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import ToeGrid from "@/modules/grid/ToeGrid";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import AddNameDescriptionForm from "@/modules/scenarioeditor/AddNameDescriptionForm";

// Types
import type { NPersonnelData } from "@/types/internalModels";
import type { ColumnDef } from "@tanstack/react-table";

export default function ScenarioInfoPersonnel() {
  const scn = useActiveScenario();
  const { send } = useNotifications();
  const tableStore = usePersonnelTableStore();
  const uiStore = useUiStore();

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
  } = useToeEditableItems<NPersonnelData>();

  // --- Local State ---
  const [addForm, setAddForm] = useState<Omit<NPersonnelData, "id">>({
    name: "",
    description: "",
  });

  // --- Computed ---
  const personnel = useMemo(() => {
    // Trong React, việc truy cập state từ store (Zustand/Context) 
    // sẽ tự động trigger re-render mà không cần triggerRef thủ công.
    return Object.values(scn.store.state.personnelMap);
  }, [scn.store.state.personnelMap, scn.store.state.settingsStateCounter]);

  const columns = useMemo<ColumnDef<NPersonnelData>[]>(() => [
    { id: "name", header: "Name", accessorKey: "name", size: 200 },
    { id: "description", header: "Description", accessorKey: "description" },
  ], []);

  // --- Handlers ---
  const onSubmit = (e: NPersonnelData) => {
    const { id, ...rest } = e;
    scn.unitActions.updatePersonnel(id, rest);

    if (uiStore.goToNextOnSubmit) {
      const currentIndex = personnel.findIndex((sc) => sc.id === id);
      if (currentIndex < personnel.length - 1) {
        setEditedId(personnel[currentIndex + 1].id);
      } else {
        setEditedId(null);
      }
    } else {
      setEditedId(null);
    }
    triggerRerender();
  };

  const cancelEdit = () => setEditedId(null);

  const onAddSubmit = (formData: Omit<NPersonnelData, "id">) => {
    // Check if name exists
    if (personnel.find((e) => e.name === formData.name)) {
      send({
        type: "error",
        message: "Personnel category with this name already exists.",
      });
      return;
    }
    scn.unitActions.addPersonnel({ ...formData });
    setAddForm({ name: "", description: "" });
    setShowAddForm(false);
  };

  const onDelete = () => {
    const notDeletedItems: NPersonnelData[] = [];
    scn.store.groupUpdate(() => {
      selectedItems.forEach((e) => {
        const success = scn.unitActions.deletePersonnel(e.id);
        if (!success) {
          send({
            type: "error",
            message: `${e.name}: Cannot delete a personnel category that is in use.`,
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
      <TableHeader description="A list of personnel categories available in this scenario." />

      

      <ToeGridHeader
        editMode={editMode}
        setEditMode={setEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        editLabel="Edit personnel"
        selectedCount={selectedItems.length}
        hideEdit={personnel.length === 0}
        onDelete={onDelete}
      />

      {showAddForm && (
        <AddNameDescriptionForm
          value={addForm}
          onCancel={() => setShowAddForm(false)}
          onSubmit={onAddSubmit}
          heading="Add new personnel category"
        />
      )}

      {personnel.length > 0 ? (
        <ToeGrid
          columns={columns}
          data={personnel}
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
                  onSubmit={(data) => onSubmit(data as NPersonnelData)}
                  onCancel={cancelEdit}
                  heading="Edit personnel category"
                  showNextToggle
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      ) : (
        <p className="prose prose-sm dark:prose-invert italic text-muted-foreground">
          Use the <kbd className="font-sans">Add</kbd> button to add personnel categories to this scenario.
        </p>
      )}
    </div>
  );
}