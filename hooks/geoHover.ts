import { useEffect } from "react";
import type OLMap from "ol/Map";
import { unByKey } from "ol/Observable";
import type { MapBrowserEvent } from "ol";

export function useMapHover(olMap: OLMap | null, enabled: boolean = true) {
  useEffect(() => {
    if (!olMap) return;

    const isTouch = window.matchMedia("(hover: none)").matches;
    
    if (isTouch || !enabled) {
      return;
    }

    // --- SỬA TẠI ĐÂY: Thay UIEvent bằng any ---
    const pointerMoveKey = olMap.on("pointermove", (e: MapBrowserEvent<any>) => {
      const pixel = olMap.getEventPixel(e.originalEvent);
      
      const hit = olMap.hasFeatureAtPixel(pixel);
      
      const target = olMap.getTargetElement();
      if (target) {
        target.style.cursor = hit ? "pointer" : "";
      }
    });

    return () => {
      unByKey(pointerMoveKey);
      const target = olMap.getTargetElement();
      if (target) {
        target.style.cursor = "";
      }
    };
  }, [olMap, enabled]);
}