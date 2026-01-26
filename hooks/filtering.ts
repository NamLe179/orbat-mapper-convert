import { useMemo } from "react";
import type { NUnit } from "@/types/internalModels";
import type { EntityId } from "@/types/base";

export interface NOrbatItemData {
  unit: NUnit;
  children: NOrbatItemData[];
}

/**
 * Hàm lọc đơn vị đệ quy (Logic gốc).
 * Lưu ý: Hàm này có "side-effect" là thay đổi thuộc tính `_isOpen` của unit 
 * để tự động mở rộng cây khi tìm kiếm.
 */
export function filterUnits(
  units: EntityId[],
  unitMap: Record<EntityId, NUnit>,
  query: string = "",
  locationFilter = false,
  resetOpen = true,
): NOrbatItemData[] {
  const filteredUnits: NOrbatItemData[] = [];
  // Tạo RegExp an toàn, escape các ký tự đặc biệt nếu cần (ở đây dùng logic gốc đơn giản)
  const re = new RegExp(query, "i");

  function helper(currentUnitId: EntityId, parentMatched: boolean) {
    const currentUnit = unitMap[currentUnitId];
    if (!currentUnit) return [];

    const oi: NOrbatItemData = {
      unit: currentUnit,
      children: [],
    };

    // Logic tự động mở node khi search
    if (query && resetOpen) {
      // Lưu ý: Trong React, việc mutate trực tiếp object state (unit._isOpen) 
      // đôi khi không trigger re-render nếu không update reference cha.
      // Tuy nhiên, vì hàm này trả về cấu trúc mảng mới (filteredUnits),
      // component hiển thị cây thường sẽ nhận prop mới và re-render.
      if (currentUnit._isOpen !== true) {
        currentUnit._isOpen = true; 
      }
    }

    let matched = false;
    let childMatched = false;
    const hasPosition = Boolean(currentUnit?._state?.location);
    const children: NOrbatItemData[] = [];

    // Kiểm tra match text
    if (currentUnit.name.search(re) >= 0) {
      matched = locationFilter ? hasPosition : true;
    } else if (parentMatched && resetOpen) {
      // Nếu cha match nhưng con không match, có thể đóng con lại cho gọn
      if (currentUnit._isOpen !== false) {
        currentUnit._isOpen = false;
      }
    }

    // Đệ quy con
    if (currentUnit.subUnits?.length) {
      for (const subUnit of currentUnit.subUnits) {
        const su = helper(subUnit, matched || parentMatched);
        if (su.length) {
          childMatched = true;
          oi.children.push(...su);
        }
      }
    }

    // Quyết định có giữ node này lại không
    if (matched || childMatched || (parentMatched && !locationFilter)) {
      children.push(oi);
    }
    return children;
  }

  for (const unitId of units) {
    filteredUnits.push(...helper(unitId, false));
  }
  
  return filteredUnits;
}

/**
 * React Hook wrapper để tối ưu hiệu năng.
 * Chỉ chạy lại logic lọc khi data thay đổi hoặc từ khóa tìm kiếm thay đổi.
 */
export function useUnitFilter(
  units: EntityId[],
  unitMap: Record<EntityId, NUnit>,
  query: string,
  locationFilter: boolean = false
) {
  return useMemo(() => {
    return filterUnits(units, unitMap, query, locationFilter);
  }, [units, unitMap, query, locationFilter]);
}