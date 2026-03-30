"use client";

import React, { useState, useMemo, useEffect } from "react";

// Types
import type {
  EUnitEquipment,
  EUnitPersonnel,
  NUnit,
  NUnitEquipment,
  NUnitPersonnel,
  NUnitSupply,
  ToeMode,
} from "@/types/internalModels";
import type { StateAdd } from "@/types/scenarioModels";
import type { EntityId } from "@/types/base";

// UI Components (Shadcn)
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

// Internal Components
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import ToeGrid from "@/modules/grid/ToeGrid";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import ModifyUnitToeItemForm from "@/modules/scenarioeditor/ModifyUnitToeItemForm";
import AddUnitToeItemForm from "@/modules/scenarioeditor/AddUnitToeItemForm";
import UnitDetailsSupplies from "@/modules/scenarioeditor/UnitDetailsSupplies";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";
import { useEquipmentEditStore, usePersonnelEditStore } from "@/stores/toeStore";
import { useUiStore } from "@/stores/uiStore";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";
import { useUnitEquipmentTableStore, useUnitPersonnelTableStore } from "@/stores/tableStores";
import { createToeTableColumns, useToeEditableItems } from "@/hooks/toeUtils";

interface UnitDetailsToeProps {
  unit: NUnit;
  isLocked?: boolean;
}

export default function UnitDetailsToe({ unit, isLocked = false }: UnitDetailsToeProps) {
  const {
    store: { state, onUndoRedo, groupUpdate },
    unitActions: {
      walkSubUnits,
      updateUnitEquipment,
      updateUnitPersonnel,
      updateUnitState,
      addUnitStateEntry,
    },
    time,
  } = useActiveScenario();

  const { equipmentMap, personnelMap, unitMap } = state;
  const uiStore = useUiStore();
  const selectedItemsStore = useSelectedItems();
  const equipmentEditStore = useEquipmentEditStore();
  const personnelEditStore = usePersonnelEditStore();

  const equipmentTableStore = useUnitEquipmentTableStore();
  const personnelTableStore = useUnitPersonnelTableStore();

  // --- Local State ---
  const [addFormData, setAddFormData] = useState<NUnitEquipment | NUnitPersonnel>({ id: "", count: 1 });

  const {
    editedId: editedEquipmentId,
    setEditedId: setEditedEquipmentId,
    selectedItems: selectedEquipment,
    setSelectedItems: setSelectedEquipment
  } = useToeEditableItems<EUnitEquipment>();

  const {
    editedId: editedPersonnelId,
    setEditedId: setEditedPersonnelId,
    selectedItems: selectedPersonnel,
    setSelectedItems: setSelectedPersonnel
  } = useToeEditableItems<EUnitPersonnel>();

  // --- Computed (useMemo) ---
  const isMultiMode = selectedItemsStore.selectedUnitIds.size > 1;
  const isEditMode = equipmentEditStore.isEditMode;
  const includeSubordinates = uiStore.toeIncludeSubordinates;

  const equipmentColumns = useMemo(() => createToeTableColumns(), []);
  const personnelColumns = useMemo(() => createToeTableColumns(), []);

  // --- Watcher: Edit Mode logic ---
  useEffect(() => {
    if (isEditMode) {
      uiStore.prevToeIncludeSubordinates = includeSubordinates;
      uiStore.setToeIncludeSubordinates(false);
    } else {
      if (uiStore.prevToeIncludeSubordinates !== undefined) {
        uiStore.setToeIncludeSubordinates(uiStore.prevToeIncludeSubordinates);
      }
    }
  }, [isEditMode]);

  // --- Aggregation Logic (Replacing Vue Watch) ---
  const { aggregatedEquipment, aggregatedPersonnel } = useMemo(() => {
    const aggEquipment: Record<string, { count: number; onHand: number }> = {};
    const aggPersonnel: Record<string, { count: number; onHand: number }> = {};
    const allUnitIds = new Set<EntityId>();

    selectedItemsStore.selectedUnitIds.forEach((unitId) => {
      if (includeSubordinates) {
        walkSubUnits(unitId, (u) => { allUnitIds.add(u.id); }, { includeParent: true });
      } else {
        allUnitIds.add(unitId);
      }
    });

    allUnitIds.forEach((unitId) => {
      const u = unitMap[unitId];
      if (!u) return;
      const runtimeState = getUnitRuntimeState(u.id);
      const equip = runtimeState?.equipment ?? u.equipment ?? [];
      const pers = runtimeState?.personnel ?? u.personnel ?? [];

      equip.forEach((e) => {
        const curr = aggEquipment[e.id] || { count: 0, onHand: 0 };
        aggEquipment[e.id] = { count: curr.count + e.count, onHand: curr.onHand + (e?.onHand ?? e.count) };
      });
      pers.forEach((p) => {
        const curr = aggPersonnel[p.id] || { count: 0, onHand: 0 };
        aggPersonnel[p.id] = { count: curr.count + p.count, onHand: curr.onHand + (p?.onHand ?? p.count) };
      });
    });

    return {
      aggregatedEquipment: Object.entries(aggEquipment).map(([id, { count, onHand }]) => ({
        id,
        name: equipmentMap[id]?.name ?? id,
        description: equipmentMap[id]?.description ?? "",
        count,
        onHand,
      })),
      aggregatedPersonnel: Object.entries(aggPersonnel).map(([id, { count, onHand }]) => ({
        id,
        name: personnelMap[id]?.name ?? id,
        description: personnelMap[id]?.description ?? "",
        count,
        onHand,
      }))
    };
  }, [selectedItemsStore.selectedUnitIds, includeSubordinates, time.getScenarioTime(), state.settingsStateCounter, unitMap, equipmentMap, personnelMap, walkSubUnits]);

  // --- Handlers ---
  const handleNextEditedId = (mode: ToeMode, itemId: string) => {
    if (!uiStore.goToNextOnSubmit) {
      mode === "equipment" ? setEditedEquipmentId(null) : setEditedPersonnelId(null);
      return;
    }
    const list = mode === "equipment" ? aggregatedEquipment : aggregatedPersonnel;
    const setter = mode === "equipment" ? setEditedEquipmentId : setEditedPersonnelId;
    const currentIndex = list.findIndex((e) => e.id === itemId);
    
    if (currentIndex < list.length - 1) {
      setter(list[currentIndex + 1].id);
    } else {
      setter(null);
    }
  };

  const updateItemCount = (mode: ToeMode, item: NUnitEquipment | NUnitPersonnel) => {
    groupUpdate(() => {
      selectedItemsStore.selectedUnitIds.forEach((unitId) => {
        mode === "equipment" 
          ? updateUnitEquipment(unitId, item.id, { count: item.count })
          : updateUnitPersonnel(unitId, item.id, { count: item.count });
      });
    });
    handleNextEditedId(mode, item.id);
  };

  const onAddSubmit = (mode: ToeMode, formData: any) => {
    groupUpdate(() => {
      selectedItemsStore.selectedUnitIds.forEach((unitId) => {
        mode === "equipment"
          ? updateUnitEquipment(unitId, formData.id, { count: formData.count, onHand: formData.onHand })
          : updateUnitPersonnel(unitId, formData.id, { count: formData.count, onHand: formData.onHand });
      });
    });
    setAddFormData({ id: "", count: 1 });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      
      
      <Tabs 
        value={uiStore.toeTabIndex.toString()} 
        onValueChange={(v) => uiStore.setToeTabIndex(parseInt(v))} 
        className="w-full gap-0"
      >
        <div className="-mx-4">
          <TabsList className="border-border h-12 w-full rounded-none border-b px-4 py-1 bg-transparent">
            <TabsTrigger value="0">Equipment</TabsTrigger>
            <TabsTrigger value="1">Personnel</TabsTrigger>
            <TabsTrigger value="2">Supplies</TabsTrigger>
          </TabsList>
        </div>

        {/* Equipment Tab */}
        <TabsContent value="0">
          <ToeGridHeader
            editMode={isEditMode}
            setEditMode={equipmentEditStore.setIsEditMode}
            addMode={equipmentEditStore.showAddForm}
            setAddMode={equipmentEditStore.setShowAddForm}
            includeSubordinates={includeSubordinates}
            setIncludeSubordinates={uiStore.setToeIncludeSubordinates}
            selectedCount={selectedEquipment.length}
            onDelete={() => { /* logic delete */ }}
            isLocked={isLocked}
          />
          
          {equipmentEditStore.showAddForm && (
            <AddUnitToeItemForm
              mode="equipment"
              usedItems={isMultiMode ? [] : aggregatedEquipment}
              onCancel={() => equipmentEditStore.setShowAddForm(false)}
              onSubmit={(data) => onAddSubmit('equipment', data)}
            />
          )}

          {aggregatedEquipment.length > 0 && (
            <ToeGrid
              columns={equipmentColumns}
              data={aggregatedEquipment}
              editMode={isEditMode}
              onEditModeChange={equipmentEditStore.setIsEditMode}
              editedId={editedEquipmentId}
              onEditedIdChange={setEditedEquipmentId}
              select={isEditMode}
              selectedItems={selectedEquipment}
              onSelectedItemsChange={setSelectedEquipment}
              isLocked={isLocked}
              renderInlineForm={(row) => (
                <div className="pr-6">
                  <InlineFormWrapper detailsPanel>
                    <ModifyUnitToeItemForm
                      itemData={row}
                      editStore={equipmentEditStore}
                      onCancel={() => equipmentEditStore.setIsEditMode(false)}
                      onDiffOnHand={(data) => {}}
                      onUpdateOnHand={(data) => {}}
                      onUpdateCount={(data) => updateItemCount('equipment', data)}
                    />
                  </InlineFormWrapper>
                </div>
              )}
            />
          )}
        </TabsContent>

        {/* Personnel Tab */}
        <TabsContent value="1">
          <ToeGridHeader
            editMode={isEditMode}
            setEditMode={personnelEditStore.setIsEditMode}
            addMode={personnelEditStore.showAddForm}
            setAddMode={personnelEditStore.setShowAddForm}
            includeSubordinates={includeSubordinates}
            setIncludeSubordinates={uiStore.setToeIncludeSubordinates}
            selectedCount={selectedPersonnel.length}
            onDelete={() => { /* logic delete */ }}
            isLocked={isLocked}
          />
          {personnelEditStore.showAddForm && (
            <AddUnitToeItemForm
              mode="personnel"
              usedItems={isMultiMode ? [] : aggregatedPersonnel}
              onCancel={() => personnelEditStore.setShowAddForm(false)}
              onSubmit={(data) => onAddSubmit('personnel', data)}
            />
          )}
          {aggregatedPersonnel.length > 0 && (
            <ToeGrid
              columns={personnelColumns}
              data={aggregatedPersonnel}
              editMode={isEditMode}
              onEditModeChange={personnelEditStore.setIsEditMode}
              editedId={editedPersonnelId}
              onEditedIdChange={setEditedPersonnelId}
              select={isEditMode}
              selectedItems={selectedPersonnel}
              onSelectedItemsChange={setSelectedPersonnel}
              isLocked={isLocked}
              renderInlineForm={(row) => (
                <div className="pr-6">
                  <InlineFormWrapper detailsPanel>
                    <ModifyUnitToeItemForm
                      itemData={row}
                      editStore={personnelEditStore}
                      onCancel={() => personnelEditStore.setIsEditMode(false)}
                      onDiffOnHand={(data) => {}}
                      onUpdateOnHand={(data) => {}}
                      onUpdateCount={(data) => updateItemCount('personnel', data)}
                    />
                  </InlineFormWrapper>
                </div>
              )}
            />
          )}
        </TabsContent>

        <TabsContent value="2">
          <UnitDetailsSupplies unit={unit} isLocked={isLocked} />
        </TabsContent>
      </Tabs>

      <div className="prose dark:prose-invert p-4">
        {!aggregatedEquipment.length && !aggregatedPersonnel.length && (
          <p className="text-muted-foreground text-sm italic">
            {includeSubordinates 
              ? "No data about equipment or personnel available" 
              : "This unit does not have any equipment or personnel"}
          </p>
        )}
      </div>
    </div>
  );
}