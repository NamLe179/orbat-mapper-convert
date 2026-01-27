"use client";

import React, { useRef, useEffect } from "react";
import { toContext } from "ol/render";
import Circle from "ol/geom/Circle";
import { createSimpleStyle } from "@/geo/simplestyle";
import type { RangeRingStyle } from "@/types/scenarioGeoModels";
import { cn } from "@/lib/utils";

interface DrawRangeRingMarkerProps {
  styling: RangeRingStyle;
  size?: number;
  color?: string; // Giữ lại để tương thích, dù logic chính dùng 'styling'
  className?: string;
}

export default function DrawRangeRingMarker({
  styling,
  size = 20,
  color = "red",
  className,
}: DrawRangeRingMarkerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // OpenLayers toContext logic
    const vectorContext = toContext(ctx, {
      size: [size * 2, size * 2],
      pixelRatio: 1, // Đảm bảo hiển thị sắc nét
    });

    const style = createSimpleStyle(styling);
    vectorContext.setStyle(style);

    // Vẽ hình tròn. 
    // Vue gốc: [20, 20] với bán kính 10.
    // React convert: Tự động tính toán dựa trên size để tâm luôn ở giữa.
    // Nếu size = 20 -> Center [20, 20], Radius 10.
    const radius = size / 2;
    vectorContext.drawGeometry(new Circle([size, size], radius));

  }, [styling, size]); // Re-draw khi style hoặc size thay đổi

  return <canvas ref={canvasRef} className={cn(className)} />;
}