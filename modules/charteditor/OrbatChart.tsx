"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { OrbatChart } from "./orbatchart";
import type {
  PartialOrbChartOptions,
  SpecificOptions,
  SymbolGenerator,
  ChartUnit,
  UnitNodeInfo,
} from "./orbatchart";
import BaseToolbar from "@/components/BaseToolbar";
import ToolbarButton from "@/components/ToolbarButton";
import { cn } from "@/lib/utils"; // Giả định có utility cn

interface OrbatChartProps {
  unit?: ChartUnit | null;
  debug?: boolean;
  options?: PartialOrbChartOptions;
  specificOptions?: SpecificOptions;
  interactive?: boolean;
  highlightedLevels?: number[];
  width?: number;
  height?: number;
  symbolGenerator?: SymbolGenerator;
  chartId?: string;
  enablePanZoom?: boolean;
  hideToolbar?: boolean;

  // Events
  onUnitClick?: (unit: UnitNodeInfo) => void;
  onLevelClick?: (levelNumber: number) => void;
  onBranchClick?: (parentId: string | number, levelNumber: number) => void;
}

export default function OrbatChartWrapper({
  unit,
  debug = false,
  options,
  specificOptions,
  interactive = false,
  highlightedLevels = [],
  width = 600,
  height = 600,
  symbolGenerator,
  chartId,
  enablePanZoom = false,
  hideToolbar = false,
  onUnitClick,
  onLevelClick,
  onBranchClick,
}: OrbatChartProps) {
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<OrbatChart | null>(null);

  // --- Handlers ---

  // Sử dụng useCallback để giữ reference ổn định cho các function truyền vào class
  const handleUnitClick = useCallback((u: UnitNodeInfo) => {
    onUnitClick?.(u);
  }, [onUnitClick]);

  const handleLevelClick = useCallback((level: number) => {
    onLevelClick?.(level);
  }, [onLevelClick]);

  const handleBranchClick = useCallback((parentId: string | number, level: number) => {
    onBranchClick?.(parentId, level);
  }, [onBranchClick]);

  // --- Main Effect (Replacement for watchEffect) ---
  
  useEffect(() => {
    if (!containerRef.current || !unit) return;

    // 1. Lưu trạng thái Pan/Scale cũ nếu có
    let panScaleCopy: { pan: { x: number; y: number }; scale: number } | null | undefined;
    if (chartInstanceRef.current) {
      panScaleCopy = chartInstanceRef.current.getPanScale();
      chartInstanceRef.current.cleanup();
    }

    // 2. Khởi tạo Chart mới
    const chart = new OrbatChart(
      unit,
      {
        ...options,
        symbolGenerator: symbolGenerator,
        debug: debug,
        onClick: handleUnitClick,
        onLevelClick: handleLevelClick,
        onBranchClick: handleBranchClick,
      },
      specificOptions || {}
    );

    // 3. Render SVG
    chart.toSVG(containerRef.current, {
      width: width,
      height: height,
      elementId: chartId,
      enablePanZoom: enablePanZoom,
    });

    // 4. Config Interactive
    if (interactive) chart.makeInteractive();

    // 5. Khôi phục Pan/Scale
    if (panScaleCopy) {
      chart.setPanScale(
        { x: panScaleCopy.pan.x, y: panScaleCopy.pan.y },
        panScaleCopy.scale
      );
    }

    // 6. Xử lý Highlight (nếu logic này cần chạy ngay khi init)
    if (highlightedLevels.length > 0) {
      chart.highlightLevels([...highlightedLevels]);
    }

    // Lưu instance vào ref
    chartInstanceRef.current = chart;

    // Cleanup function (onBeforeUnmount)
    return () => {
      chart.cleanup();
      chartInstanceRef.current = null;
    };
  }, [
    // Dependencies: Khi bất kỳ prop nào thay đổi, effect này sẽ chạy lại (giống watchEffect)
    unit,
    options,
    specificOptions,
    width,
    height,
    debug,
    interactive,
    symbolGenerator,
    chartId,
    enablePanZoom,
    handleUnitClick,
    handleLevelClick,
    handleBranchClick,
    // highlightedLevels không được đưa vào đây để tránh re-render toàn bộ chart
    // Nếu muốn update highlight động mà không vẽ lại chart, dùng useEffect riêng bên dưới
  ]);

  // --- Effect riêng cho Highlight (Optional optimization) ---
  useEffect(() => {
    if (chartInstanceRef.current && highlightedLevels) {
      chartInstanceRef.current.highlightLevels([...highlightedLevels]);
    }
  }, [highlightedLevels]);


  // --- Toolbar Actions ---
  
  const handleZoomIn = () => chartInstanceRef.current?.zoomIn();
  const handleZoomOut = () => chartInstanceRef.current?.zoomOut();
  const handleResetZoom = () => chartInstanceRef.current?.resetZoom();

  return (
    <div className="relative h-full w-full">
      {/* Global Style cho D3 select rect (tương đương với style trong Vue SFC) */}
      <style jsx global>{`
        .select-rect {
          cursor: pointer;
        }
      `}</style>

      <div
        ref={containerRef}
        className={cn(
          "animate h-full w-full transition-opacity duration-300",
          unit ? "opacity-100" : "opacity-0"
        )}
      />

      {enablePanZoom && !hideToolbar && (
        <nav className="absolute bottom-4 left-4 print:hidden">
          <BaseToolbar>
            <ToolbarButton start onClick={handleZoomIn}>
              <ZoomIn className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton onClick={handleZoomOut}>
              <ZoomOut className="h-5 w-5" />
            </ToolbarButton>
            <ToolbarButton end onClick={handleResetZoom}>
              <Maximize className="h-5 w-5" />
            </ToolbarButton>
          </BaseToolbar>
        </nav>
      )}
    </div>
  );
}