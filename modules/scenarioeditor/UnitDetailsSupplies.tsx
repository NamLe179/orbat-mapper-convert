"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useActiveScenario } from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";
import { useEquipmentEditStore, useSuppliesEditStore } from "@/stores/toeStore";
import { useUiStore } from "@/stores/uiStore";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";
import { useUnitSupplyTableStore } from "@/stores/tableStores";
import { asPercent, useToeEditableItems } from "@/hooks/toeUtils";

// Types
import type { EUnitSupply, NUnit, NUnitSupply } from "@/types/internalModels";
import type { StateAdd } from "@/types/scenarioModels";
import type { EntityId } from "@/types/base";
import type { ColumnDef } from "@tanstack/react-table";

// Components
import ToeGrid from "@/modules/grid/ToeGrid";
import ToeGridHeader from "@/modules/scenarioeditor/ToeGridHeader";
import AddUnitSupplyForm from "@/modules/scenarioeditor/AddUnitSupplyForm";
import InlineFormWrapper from "@/modules/scenarioeditor/InlineFormWrapper";
import ModifyUnitSupplyForm from "@/modules/scenarioeditor/ModifyUnitSupplyForm";

interface Props {
  unit: NUnit;
  isLocked?: boolean;
}

export default function UnitDetailsSupplies({ unit, isLocked = false }: Props) {
  const {
    store: { state, onUndoRedo, groupUpdate },
    unitActions: { walkSubUnits, updateUnitSupply, updateUnitState, addUnitStateEntry },
    time,
  } = useActiveScenario();

  const { unitMap, supplyCategoryMap, supplyClassMap, supplyUomMap } = state;
  const { selectedUnitIds } = useSelectedItems();
  const uiStore = useUiStore();
  const equipmentEditStore = useEquipmentEditStore();
  const tableStore = useUnitSupplyTableStore();

  // --- Local State ---
  const [addFormData, setAddFormData] = useState<NUnitSupply>({ id: "", count: 1 });
  const [aggregatedSupplies, setAggregatedSupplies] = useState<EUnitSupply[]>([]);

  const {
    editedId,
    setEditedId,
    showAddForm,
    setShowAddForm,
    selectedItems: selectedSupplies,
    setSelectedItems: setSelectedSupplies,
  } = useToeEditableItems<EUnitSupply>();

  // Giả định isEditMode từ store
  const isSuppliesEditMode = equipmentEditStore.isEditMode;
  const includeSubordinates = uiStore.toeIncludeSubordinates;
  const isMultiMode = selectedUnitIds.size > 1;

  // --- Table Columns ---
  const columns = useMemo<ColumnDef<EUnitSupply>[]>(() => [
    { id: "name", header: "Name", accessorKey: "name", size: 100 },
    { id: "class", header: "Class", accessorKey: "supplyClass" },
    {
      id: "assigned",
      header: "Asgd.",
      accessorKey: "count",
      size: 80,
      meta: { align: "right" },
    },
    {
      id: "onHand",
      header: "Avail.",
      accessorKey: "onHand",
      size: 80,
      meta: { align: "right" },
    },
    { id: "uom", header: "Unit", accessorKey: "uom", size: 80 },
    {
      id: "percentage",
      header: "%",
      accessorFn: (f) => asPercent(f),
      size: 80,
      meta: { align: "right" },
    },
  ], []);

  // --- Watch: Aggregation Logic ---
  useEffect(() => {
    const aggSupplies: Record<string, { count: number; onHand: number }> = {};
    const allUnitIds = new Set<EntityId>();

    selectedUnitIds.forEach((unitId) => {
      if (includeSubordinates) {
        walkSubUnits(
          unitId,
          (u) => { allUnitIds.add(u.id); },
          { includeParent: true }
        );
      } else {
        allUnitIds.add(unitId);
      }
    });

    allUnitIds.forEach((unitId) => {
      const u = unitMap[unitId];
      if (!u) return;
      const supplies = getUnitRuntimeState(u.id)?.supplies ?? u.supplies ?? [];

      supplies.forEach((e) => {
        const current = aggSupplies[e.id] || { count: 0, onHand: 0 };
        aggSupplies[e.id] = {
          count: current.count + e.count,
          onHand: current.onHand + (e?.onHand ?? e.count),
        };
      });
    });

    const result = Object.entries(aggSupplies).map(([id, { count, onHand }]) => {
      const sc = supplyCategoryMap[id];
      const supplyClass = supplyClassMap[sc?.supplyClass ?? ""]?.name ?? "";
      const uomObj = supplyUomMap[sc?.uom ?? ""];
      const uom = uomObj?.code ?? uomObj?.name ?? "";
      return {
        id,
        name: sc?.name ?? id,
        description: sc?.description ?? "",
        supplyClass,
        count,
        onHand,
        uom,
      } as EUnitSupply;
    });

    setAggregatedSupplies(result);
  }, [selectedUnitIds, includeSubordinates, time.getScenarioTime(), state.settingsStateCounter, unitMap, supplyCategoryMap, supplyClassMap, supplyUomMap, walkSubUnits]);

  // --- Handlers ---
  const handleNextEditedId = (supplyId: string) => {
    if (uiStore.goToNextOnSubmit) {
      const currentIndex = aggregatedSupplies.findIndex((sc) => sc.id === supplyId);
      if (currentIndex < aggregatedSupplies.length - 1) {
        setEditedId(aggregatedSupplies[currentIndex + 1].id);
      } else {
        setEditedId(null);
      }
    } else {
      setEditedId(null);
    }
  };

  const updateSupplyCount = (supplyId: string, { count }: { count: number }) => {
    groupUpdate(() => {
      selectedUnitIds.forEach((unitId) => {
        updateUnitSupply(unitId, supplyId, { count });
      });
    });
    handleNextEditedId(supplyId);
  };

  const updateSupplyOnHand = (supplyId: string, { onHand }: NUnitSupply) => {
    groupUpdate(() => {
      selectedUnitIds.forEach((unitId) => {
        const u = unitMap[unitId];
        if (!u.supplies?.find((e) => e.id === supplyId)) return;
        const newState: StateAdd = {
          t: +time.getScenarioTime(),
          update: { supplies: [{ id: supplyId, onHand }] },
        };
        addUnitStateEntry(unitId, newState, true);
      });
    });
    handleNextEditedId(supplyId);
  };

  const onAddSubmit = (formData: NUnitSupply) => {
    groupUpdate(() => {
      selectedUnitIds.forEach((unitId) => {
        updateUnitSupply(unitId, formData.id, { count: formData.count, onHand: formData.onHand });
      });
    });
    setAddFormData({ id: "", count: 1 });
  };

  const onDelete = () => {
    groupUpdate(() => {
      selectedUnitIds.forEach((unitId) => {
        selectedSupplies.forEach((e) => {
          updateUnitSupply(unitId, e.id, { count: -1 });
        });
      });
    });
    setSelectedSupplies([]);
  };

  return (
    <div className="unit-details-supplies">
      <ToeGridHeader
        editMode={isSuppliesEditMode}
        setEditMode={equipmentEditStore.setIsEditMode}
        addMode={showAddForm}
        setAddMode={setShowAddForm}
        includeSubordinates={includeSubordinates}
        setIncludeSubordinates={uiStore.setToeIncludeSubordinates}
        selectedCount={selectedSupplies.length}
        onDelete={onDelete}
        isLocked={isLocked}
      />

      

      {showAddForm && (
        <AddUnitSupplyForm
          onCancel={() => setShowAddForm(false)}
          usedSupplies={isMultiMode ? [] : aggregatedSupplies}
          value={addFormData}
          onSubmit={onAddSubmit}
        />
      )}

      {aggregatedSupplies.length > 0 && (
        <ToeGrid
          columns={columns}
          data={aggregatedSupplies}
          editedId={editedId}
          onEditedIdChange={setEditedId}
          select={isSuppliesEditMode}
          selectedItems={selectedSupplies}
          onSelectedItemsChange={setSelectedSupplies}
          editMode={isSuppliesEditMode}
          onEditModeChange={equipmentEditStore.setIsEditMode}
          isLocked={isLocked}
          renderInlineForm={(row) => (
            <div className="pr-6">
              <InlineFormWrapper detailsPanel>
                <ModifyUnitSupplyForm
                  itemData={row}
                  onCancel={() => equipmentEditStore.setIsEditMode(false)}
                  onDiffOnHand={(id, data) => {
                     // logic diffOnHand tương tự update
                  }}
                  onUpdateCount={updateSupplyCount}
                  onUpdateOnHand={updateSupplyOnHand}
                />
              </InlineFormWrapper>
            </div>
          )}
        />
      )}
    </div>
  );
}