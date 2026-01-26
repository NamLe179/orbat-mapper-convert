import { useEffect } from "react";
import OLMap from "ol/Map";

// Project imports (Assume these are converted to React Hooks/Zustand Stores)
import { useActiveScenario } from "@/hooks/scenarioUtils";
import { useGeoStore } from "@/stores/geoStore";

export function useScenarioEvents(olMap: OLMap | null) {
  const {
    time: { onGoToScenarioEventEvent },
    helpers: { getUnitById },
  } = useActiveScenario();
  
  const geoStore = useGeoStore();

  useEffect(() => {
    if (!olMap) return;

    // Register event listener
    // Assuming onGoToScenarioEventEvent returns a cleanup/unsubscribe function
    const handleBusAction = ({ event }: any) => {
      const where = event.where;
      if (!where) return;

      const { maxZoom } = where;

      if (where.type === "units") {
        const units = where.units
          .map((u: string) => getUnitById(u))
          .filter((u: any) => u !== undefined && u !== null);

        if (units.length > 0) {
          geoStore.zoomToUnits(units, { duration: 900, maxZoom });
        }
      } else if (where.type === "geometry") {
        geoStore.zoomToGeometry(where.geometry, { duration: 900, maxZoom });
      }
    };

    // SỬA LỖI Ở ĐÂY:
    // 1. Ép kiểu 'as any' để TypeScript không báo lỗi 'never'
    const listenerHandle = onGoToScenarioEventEvent(handleBusAction) as any;

    // Cleanup listener on unmount
    return () => {
      // 2. Kiểm tra runtime: 
      // Nếu trả về object có hàm .off() (Pattern của EventHook/VueUse cũ)
      if (listenerHandle && typeof listenerHandle.off === "function") {
        listenerHandle.off();
      } 
      // Nếu trả về function (Pattern chuẩn React)
      else if (typeof listenerHandle === "function") {
        listenerHandle();
      }
    };
  }, [olMap, onGoToScenarioEventEvent, getUnitById, geoStore]);
}