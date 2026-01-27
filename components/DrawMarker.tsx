"use client";

import React, { useRef, useEffect } from "react";
import Point from "ol/geom/Point";
import { toContext } from "ol/render";
import { Style } from "ol/style";
import { createMarkerSymbol, type MarkerSymbol } from "@/geo/simplestyle";
import { cn } from "@/lib/utils"; // Giả định có utility này

interface DrawMarkerProps {
  marker?: MarkerSymbol;
  size?: number;
  color?: string;
  className?: string;
}

export default function DrawMarker({
  marker = "circle",
  size = 10,
  color = "red",
  className,
}: DrawMarkerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Logic vẽ marker
    const drawSymbol = () => {
      // Lấy 2D context từ canvas
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Tạo vectorContext từ OpenLayers để vẽ geometry lên canvas
      // toContext với options 'size' sẽ tự động resize canvas và clear nó
      const vectorContext = toContext(ctx, {
        size: [size * 2, size * 2],
        pixelRatio: 1, // Đảm bảo độ nét
      });

      const style = new Style({
        image: createMarkerSymbol(marker, "medium", color),
      });

      vectorContext.setStyle(style);
      
      // Vẽ điểm tại tâm của canvas (size, size)
      // Vue gốc để [10, 10] (tương ứng với default size 10), ở đây dùng biến size để linh hoạt hơn
      vectorContext.drawGeometry(new Point([size, size]));
    };

    drawSymbol();
  }, [marker, size, color]); // Re-run effect khi props thay đổi

  return <canvas ref={canvasRef} className={cn(className)} />;
}