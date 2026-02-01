"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Menu } from "lucide-react";

// Types & Constants
import { type TScenario } from "@/scenariostore";
import { 
  type UnitNodeInfo, 
  type OnLevelClickCallback, 
  type OnBranchClickCallback 
} from "./orbatchart";
import { ORBAT1 } from "./orbatchart/test/testorbats";
import { type ChartTab, ChartTabs } from "@/modules/charteditor/constants";

// Hooks & Stores
import { 
  useChartSettingsStore, 
  useRootUnitStore, 
  useSelectedChartElementStore, 
  useSpecificChartOptionsStore 
} from "./chartSettingsStore";
import { sizeToWidthHeight } from "./orbatchart/sizes";
import { symbolGenerator } from "@/symbology/milsymbwrapper";
import { saveBlobToLocalFile } from "@/utils/files";

// Components
import OrbatChart from "./OrbatChart";
import ToggleField from "@/components/ToggleField";
import DotsMenu from "@/components/DotsMenu";
import SlideOver from "@/components/SlideOver";
import OrbatChartSettings from "./OrbatChartSettings";

interface OrbatChartViewProps {
  activeScenario: TScenario;
}

export default function OrbatChartView({ activeScenario }: OrbatChartViewProps) {
  // --- Refs & State ---
  const chartId = "OrbatChart";
  const [debug, setDebug] = useState(false);
  const [isInteractive, setIsInteractive] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<ChartTab>(ChartTabs.Chart);

  // --- Stores ---
  const rootUnitStore = useRootUnitStore();
  const options = useChartSettingsStore();
  const specificOptions = useSpecificChartOptionsStore();
  const currentChartElements = useSelectedChartElementStore();

  // --- Initialization ---
  useEffect(() => {
    const rootUnit = activeScenario.unitActions.getUnitByName("TG 317.1 LG") || ORBAT1;
    rootUnitStore.setUnit(rootUnit);
  }, [activeScenario]);

  // --- Computed (useMemo) ---
  const { width, height } = useMemo(() => 
    sizeToWidthHeight(options.paperSize), 
    [options.paperSize]
  );

  // --- Chart Interaction Handlers ---
  const onUnitClick = (unitNode: UnitNodeInfo) => {
    currentChartElements.selectUnit(unitNode as any);
    setCurrentTab(ChartTabs.Unit);
  };

  const onLevelClick: OnLevelClickCallback = (levelNumber: number) => {
    currentChartElements.selectLevel(levelNumber);
    setCurrentTab(ChartTabs.Level);
  };

  const onBranchClick: OnBranchClickCallback = (parentId, levelNumber) => {
    currentChartElements.selectBranch(parentId, levelNumber);
    setCurrentTab(ChartTabs.Branch);
  };

  // --- Export Logic ---
  const downloadElementAsSVG = useCallback((elementId: string) => {
    const svgElement = document.getElementById(elementId);
    if (!svgElement) return;
    const blob = new Blob([new XMLSerializer().serializeToString(svgElement)], {
      type: "image/svg+xml",
    });
    saveBlobToLocalFile(blob, "orbat-chart.svg");
  }, []);

  const downloadSvgAsPng = useCallback((elementId: string, w: number, h: number) => {
    const svgElement = document.getElementById(elementId);
    if (!svgElement) return;

    const savedWidth = svgElement.getAttribute("width") || "";
    const savedHeight = svgElement.getAttribute("height") || "";
    const scaleFactor = 2;

    svgElement.setAttribute("width", `${w * scaleFactor}px`);
    svgElement.setAttribute("height", `${h * scaleFactor}px`);

    const svgBlob = new Blob([new XMLSerializer().serializeToString(svgElement)], {
      type: "image/svg+xml",
    });

    const canvas = document.createElement("canvas");
    canvas.width = w * scaleFactor;
    canvas.height = h * scaleFactor;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const objectURL = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      ctx.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) saveBlobToLocalFile(blob, "orbat-chart.png");
      });
      URL.revokeObjectURL(objectURL);
      svgElement.setAttribute("width", savedWidth);
      svgElement.setAttribute("height", savedHeight);
    };
    image.src = objectURL;
  }, []);

  const doSVGDownload = async () => {
    setIsInteractive(false);
    // Giả lập nextTick bằng setTimeout
    setTimeout(() => {
      downloadElementAsSVG(chartId);
      setTimeout(() => setIsInteractive(true), 1000);
    }, 0);
  };

  const doPNGDownload = async () => {
    setIsInteractive(false);
    setTimeout(() => {
      downloadSvgAsPng(chartId, width, height);
      setTimeout(() => setIsInteractive(true), 1000);
    }, 0);
  };

  const menuItems = [
    { label: "Download SVG", action: doSVGDownload },
    { label: "Download PNG", action: doPNGDownload },
  ];

  return (
    <div className="relative flex h-full w-screen overflow-hidden bg-background">
      {/* Sidebar Desktop */}
      <aside className="bg-muted/50 hidden lg:flex lg:w-[20rem] lg:shrink-0 lg:border-r lg:border-gray-200 print:hidden">
        <div className="print:hidden">
          <OrbatChartSettings 
            tab={currentTab} 
            onTabChange={setCurrentTab}
          />
        </div>
      </aside>

      {/* Sidebar Mobile (SlideOver) */}
      <SlideOver 
        open={isMenuOpen} 
        onOpenChange={setIsMenuOpen} 
        left 
        title="Chart layout settings"
      >
        <OrbatChartSettings tab={currentTab} onTabChange={setCurrentTab} />
      </SlideOver>

      {/* Main Chart Area */}
      <main className="relative min-w-0 flex-auto print:block">
        

        <OrbatChart
          unit={rootUnitStore.unit}
          debug={debug}
          width={width}
          height={height}
          symbolGenerator={symbolGenerator}
          onUnitClick={onUnitClick}
          onLevelClick={onLevelClick}
          onBranchClick={onBranchClick}
          interactive={isInteractive}
          chartId={chartId}
          options={options}
          specificOptions={specificOptions}
          enablePanZoom
        />

        {/* Toolbar Overlay */}
        <div className="absolute top-4 left-4 flex items-center space-x-4 print:hidden">
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="text-muted-foreground focus:ring-ring border-r border-gray-200 p-2 focus:ring-2 focus:outline-none lg:hidden"
          >
            <span className="sr-only">Open sidebar</span>
            <Menu className="h-6 w-6" />
          </button>

          <ToggleField checked={debug} onCheckedChange={(v: boolean) => setDebug(v)}>
            Debug mode
          </ToggleField>
          
          <ToggleField checked={isInteractive} onCheckedChange={(v: boolean) => setIsInteractive(v)}>
            Interactive
          </ToggleField>

          <DotsMenu items={menuItems} />
        </div>
      </main>
    </div>
  );
}