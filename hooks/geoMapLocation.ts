import { useState, useRef, useCallback, useEffect } from "react";
import OLMap from "ol/Map";
import { unByKey } from "ol/Observable";
import { MapBrowserEvent } from "ol";
import { toLonLat } from "ol/proj";
import type { EventsKey } from "ol/events";
import type { Position } from "geojson";

// Giả định bạn đã convert store này sang Zustand
import { useMapSelectStore } from "@/stores/mapSelectStore";

export interface UseGetMapLocationOptions {
  cancelOnClickOutside?: boolean;
  stopPropagationOnClickOutside?: boolean;
  // React-way: Truyền callback vào options thay vì return event hook
  onGetLocation?: (location: Position) => void;
  onCancel?: () => void;
  onStart?: () => void;
}

export function useGetMapLocation(
  olMap: OLMap | null, 
  options: UseGetMapLocationOptions = {}
) {
  const { 
    cancelOnClickOutside = true, 
    stopPropagationOnClickOutside = true,
    onGetLocation,
    onCancel,
    onStart
  } = options;

  const [isActive, setIsActive] = useState(false);
  const mapSelectStore = useMapSelectStore();
  
  // Refs để lưu trữ trạng thái cleanup và giá trị cũ mà không gây re-render
  const cleanupRef = useRef<(() => void) | null>(null);
  const prevCursorRef = useRef<string>("");
  const prevHoverValueRef = useRef<boolean>(true);

  // Lưu options vào ref để tránh stale closure trong event listener
  const callbacksRef = useRef({ onGetLocation, onCancel, onStart });
  useEffect(() => {
    callbacksRef.current = { onGetLocation, onCancel, onStart };
  }, [onGetLocation, onCancel, onStart]);

  const cleanUp = useCallback(() => {
    if (!olMap) return;
    
    // 1. Khôi phục cursor
    const el = olMap.getTargetElement();
    if (el) {
      el.style.cursor = prevCursorRef.current;
    }

    // 2. Reset state
    setIsActive(false);

    // 3. Khôi phục store
    // Lưu ý: Cần đảm bảo store có action setHoverEnabled hoặc gán trực tiếp nếu dùng Immer/Zustand
    // mapSelectStore.hoverEnabled = prevHoverValueRef.current; 
    // Nếu Zustand: 
    useMapSelectStore.setState({ hoverEnabled: prevHoverValueRef.current });

    // 4. Chạy hàm cleanup listeners (nếu có)
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, [olMap]);

  const cancel = useCallback(() => {
    if (!isActive) return; // Chỉ cancel khi đang active
    cleanUp();
    callbacksRef.current.onCancel?.();
  }, [isActive, cleanUp]);

  const start = useCallback(() => {
    if (!olMap) return;

    // Trigger start callback
    callbacksRef.current.onStart?.();
    setIsActive(true);

    // Lưu trạng thái cũ
    const el = olMap.getTargetElement();
    prevCursorRef.current = el.style.cursor;
    prevHoverValueRef.current = mapSelectStore.hoverEnabled;

    // Tắt hover & đổi cursor
    useMapSelectStore.setState({ hoverEnabled: false });
    el.style.cursor = "crosshair";

    // --- SETUP LISTENERS ---

    // 1. Map Click Handler
    const handleMapClickEvent = (event: MapBrowserEvent<PointerEvent>) => {
      event.stopPropagation();
      // Lấy tọa độ trước khi cleanup
      const coords = toLonLat(event.coordinate, olMap.getView().getProjection());
      
      cleanUp(); // Cleanup trước
      
      callbacksRef.current.onGetLocation?.(coords);
    };

    // @ts-ignore: OpenLayers types đôi khi conflict với DOM event types
    const clickEventKey: EventsKey = olMap.once("click", handleMapClickEvent);

    // 2. Escape Key Handler
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", handleEsc);

    // 3. Click Outside Handler
    let removeClickOutside: (() => void) | undefined;
    if (cancelOnClickOutside) {
      const handleClickOutside = (e: Event) => {
        const target = e.target as Node;
        // Nếu click không nằm trong map element
        if (el && !el.contains(target)) {
          if (stopPropagationOnClickOutside) {
            e.stopPropagation();
            e.preventDefault();
          }
          cancel();
        }
      };
      
      // Dùng pointerdown hoặc mousedown để bắt sự kiện sớm hơn click
      document.addEventListener("pointerdown", handleClickOutside, { capture: true });
      
      removeClickOutside = () => {
        document.removeEventListener("pointerdown", handleClickOutside, { capture: true });
      };
    }

    // --- REGISTER CLEANUP ---
    cleanupRef.current = () => {
      unByKey(clickEventKey);
      window.removeEventListener("keydown", handleEsc);
      if (removeClickOutside) removeClickOutside();
    };

  }, [olMap, mapSelectStore.hoverEnabled, cancelOnClickOutside, stopPropagationOnClickOutside, cancel, cleanUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanUp();
      }
    };
  }, [cleanUp]);

  return {
    isActive,
    start,
    cancel,
  };
}