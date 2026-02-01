"use client";

import React, { useState, useMemo } from "react";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useNotifications } from "@/hooks/notifications";
import { useSupplyCategoryTableStore } from "@/stores/tableStores";
import { useToeEditableItems } from "@/hooks/toeUtils";
import { useUiStore } from "@/stores/uiStore";

// Utils
import { getSupplyClass, getUom } from "@/scenariostore/supplyManipulations";

// Components
import TableHeader from "@/components/TableHeader";
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import ToeGrid from "@/modules/grid/ToeGrid";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import AddSupplyCategoryForm from "@/modules/scenarioeditor/AddSupplyCategoryForm";

// Types
import type { NSupplyCategory } from "@/types/internalModels";
import type { ColumnDef } from "@tanstack/react-table";

export default function ScenarioInfoSupplies() {
  const { store, unitActions } = useActiveScenario();
  const { send } = useNotifications();
  const tableStore = useSupplyCategoryTableStore();
  const uiStore = useUiStore();

  // --- Editable Logic (Custom Hook) ---
  const {
    editMode,
    setEditMode,
    editedId,
    setEditedId,
    showAddForm,
    setShowAddForm,
    selectedItems: selectedSupplies,
    setSelectedItems: setSelectedSupplies,
    triggerRerender,
  } = useToeEditableItems<NSupplyCategory>();

  // --- Local State ---
  const [addForm, setAddForm] = useState<Omit<NSupplyCategory, "id">>({
    name: "",
    description: "",
    supplyClass: "",
    uom: "",
  });

  // --- Computed ---
  const supplies = useMemo(() => {
    // React tự động track scn.store.state nếu bọc trong context/observer
    return Object.values(store.state.supplyCategoryMap);
  }, [store.state.supplyCategoryMap, store.state.settingsStateCounter]);

  const columns = useMemo<ColumnDef<NSupplyCategory>[]>(() => [
    { id: "name", header: "Name", accessorKey: "name", size: 200 },
    { 
      id: "class", 
      header: "Class", 
      accessorFn: (f) => getSupplyClass(f, store.state) 
    },
    { 
      id: "unit", 
      header: "Unit", 
      accessorFn: (f) => getUom(f, store.state), 
      size: 80 
    },
    {
      id: "description",
      header: "Description",
      accessorKey: "description",
      size: 100,
    },
  ], [store.state]);

  // --- Handlers ---
  const onSubmit = (e: NSupplyCategory) => {
    const { id, ...rest } = e;
    unitActions.updateSupplyCategory(id, rest);
    
    if (uiStore.goToNextOnSubmit) {
      const currentIndex = supplies.findIndex((sc) => sc.id === id);
      if (currentIndex < supplies.length - 1) {
        setEditedId(supplies[currentIndex + 1].id);
      } else {
        setEditedId(null);
      }
    } else {
      setEditedId(null);
    }
    triggerRerender();
  };

  const onDelete = () => {
    const notDeletedItems: NSupplyCategory[] = [];
    store.groupUpdate(() => {
      selectedSupplies.forEach((e) => {
        const success = unitActions.deleteSupplyCategory(e.id);
        if (!success) {
          send({
            type: "error",
            message: `${e.name}: Cannot delete a supply category that is in use.`,
          });
          notDeletedItems.push(e);
        }
      });
    });
    setEditMode(false);
    setSelectedSupplies(notDeletedItems);
  };

  const cancelEdit = () => setEditedId(null);

  const onAddSubmit = (formData: Omit<NSupplyCategory, "id">) => {
    if (supplies.find((e) => e.name === formData.name)) {
      send({
        type: "error",
        message: "Supply category with this name already exists.",
      });
      return;
    }
    unitActions.addSupplyCategory({ ...formData });
    setAddForm({ ...formData, name: "", description: "" });
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col space-y-4">
      <TableHeader description="A list of supply categories available in this scenario." />

      

      <ToeGridHeader
        editMode={editMode}
        setEditMode={setEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        editLabel="Edit supply categories"
        selectedCount={selectedSupplies.length}
        hideEdit={supplies.length === 0}
        onDelete={onDelete}
      />

      {showAddForm && (
        <AddSupplyCategoryForm
          value={addForm}
          onCancel={() => setShowAddForm(false)}
          onSubmit={onAddSubmit}
        />
      )}

      {supplies.length > 0 ? (
        <ToeGrid
          columns={columns}
          data={supplies}
          editedId={editedId}
          onEditedIdChange={setEditedId}
          select={editMode}
          selectedItems={selectedSupplies}
          onSelectedItemsChange={setSelectedSupplies}
          editMode={editMode}
          onEditModeChange={setEditMode}
          renderInlineForm={(row) => (
            <div className="pr-6">
              <InlineFormWrapper>
                <AddSupplyCategoryForm
                  value={row}
                  onSubmit={(data) => onSubmit(data as NSupplyCategory)}
                  onCancel={cancelEdit}
                  heading="Edit supply category"
                  showNextToggle
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      ) : (
        <p className="prose prose-sm dark:prose-invert italic text-muted-foreground">
          Use the <kbd className="font-sans">Add</kbd> button to add supply categories to this scenario.
        </p>
      )}
    </div>
  );
}