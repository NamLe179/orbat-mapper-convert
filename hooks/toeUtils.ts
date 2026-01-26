import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { EUnitEquipment, EUnitPersonnel, EUnitSupply } from "@/types/internalModels";

/**
 * Hook quản lý trạng thái chỉnh sửa của bảng TOE
 */
export function useToeEditableItems<T>() {
  const [editMode, setEditMode] = useState(false);
  const [editedId, setEditedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Dùng để force render lại component con (nếu cần thiết, thường dùng key prop)
  const [rerenderKey, setRerenderKey] = useState(0); 
  
  const [selectedItems, setSelectedItems] = useState<T[]>([]);

  const triggerRerender = () => setRerenderKey(prev => prev + 1);

  return {
    editMode,
    setEditMode,
    editedId,
    setEditedId,
    showAddForm,
    setShowAddForm,
    rerenderKey,
    triggerRerender,
    selectedItems,
    setSelectedItems,
  };
}

/**
 * Hàm Helper tính phần trăm
 */
export function asPercent(item: EUnitSupply | EUnitEquipment | EUnitPersonnel) {
  if (!item.count) return "0%";
  return Math.floor(((item.onHand ?? 1) / item.count) * 100) + "%";
}

/**
 * Định nghĩa cột cho TanStack Table (React version)
 */
export function createToeTableColumns(): ColumnDef<EUnitEquipment | EUnitPersonnel>[] {
  const columns: ColumnDef<EUnitEquipment | EUnitPersonnel>[] = [
    {
      id: "name",
      header: "Name",
      accessorKey: "name",
      size: 120,
    },
    {
      id: "assigned",
      header: "Asgd.",
      accessorKey: "count",
      size: 80,
      meta: { align: "right" }, // Meta này sẽ được component hiển thị đọc để class 'text-right'
    },
    {
      id: "onHand",
      header: "Avail.",
      accessorKey: "onHand",
      size: 80,
      meta: { align: "right" },
    },
    {
      id: "percentage",
      header: "%",
      accessorFn: (row) => asPercent(row),
      size: 80,
      meta: { align: "right" },
    },
  ];
  return columns;
}