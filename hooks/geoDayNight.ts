/**
 * Chức năng: Tạo Layer hiển thị đường phân chia ngày và đêm trên bản đồ.
 */

"use client";

import { useEffect, useMemo } from "react";
import DayNight from "ol-ext/source/DayNight";
import VectorLayer from "ol/layer/Vector";
import Style from "ol/style/Style";
import CircleStyle from "ol/style/Circle";
import { Fill } from "ol/style";
import { useStore } from "zustand";

import { useMapSettingsStore } from "@/stores/mapSettingsStore";

import { useActiveScenario } from "@/components/injects"; 

// Tạo VectorLayer từ ol-ext/DayNight, cập nhật theo thời gian scenario
export function useDayNightLayer() {
  // 1. Lấy state từ Context và Store
  const { store } = useActiveScenario();
  const currentTime = useStore(store._store, (s) => s.currentTime);
  const showDayNightTerminator = useMapSettingsStore((s) => s.showDayNightTerminator);

  // 2. Khởi tạo Layer và Source (Memoize để giữ nguyên instance)
  const { layer, source } = useMemo(() => {
    const vectorSource = new DayNight();
    
    const vectorLayer = new VectorLayer({
      properties: { title: "Day/Night" },
      source: vectorSource,
      visible: false, // Sẽ được cập nhật bởi effect
      style: new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({ color: "red" }),
        }),
        fill: new Fill({
          color: [0, 0, 50, 0.4],
        }),
      }),
    });

    return { layer: vectorLayer, source: vectorSource };
  }, []);

  // 3. Effect: Xử lý Bật/Tắt Layer (Tương đương watch showDayNightTerminator)
  useEffect(() => {
    layer.setVisible(showDayNightTerminator);
  }, [showDayNightTerminator, layer]);

  // 4. Effect: Cập nhật thời gian (Tương đương watchPausable)
  // Logic: Khi thời gian thay đổi, cập nhật source
  useEffect(() => {
    // "Pause" logic: Nếu layer đang ẩn, không cần tính toán update time
    if (!showDayNightTerminator) return;

    if (currentTime) {
      source.setTime(new Date(currentTime));
    }
  }, [currentTime, showDayNightTerminator, source]);

  return layer;
}