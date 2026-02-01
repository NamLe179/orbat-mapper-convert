"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";

// Internal Components
import OrbatPanel from "@/modules/scenarioeditor/OrbatPanel";
import OrbatChart from "@/modules/charteditor/OrbatChart";
import SimpleBreadcrumbs from "@/components/SimpleBreadcrumbs";
import OrbatChartSettings from "@/modules/charteditor/OrbatChartSettings";
import ToggleField from "@/components/ToggleField";
import ResizablePanel from "@/components/ResizablePanel";
import DotsMenu from "@/components/DotsMenu";

// Logic & Stores
import { symbolGenerator } from "@/symbology/milsymbwrapper";
import {
  useChartSettingsStore,
  useRootUnitStore,
  useSelectedChartElementStore,
  useSpecificChartOptionsStore,
} from "@/modules/charteditor/chartSettingsStore";
import { sizeToWidthHeight } from "@/modules/charteditor/orbatchart/sizes";
import { useActiveScenario } from "@/components/injects";
import { useSearchActions } from "@/hooks/searchActions";
import { useSelectedItems } from "@/stores/selectedStore";
import { saveBlobToLocalFile } from "@/utils/files";
import { ChartTabs, type ChartTab } from "@/modules/charteditor/constants";

// Types
import type {
  OnBranchClickCallback,
  OnLevelClickCallback,
  RenderedUnitNode,
} from "@/modules/charteditor/orbatchart";
import type { BreadcrumbItem } from "@/components/types";

const ORBAT_TAB = "0";
const SETTINGS_TAB = "1";

export default function ChartEditView() {
  const scn = useActiveScenario();
  const { unitActions, helpers } = scn;
  
  const rootUnitStore = useRootUnitStore();
  const options = useChartSettingsStore();
  const specificOptions = useSpecificChartOptionsStore();
  const currentChartElements = useSelectedChartElementStore();
  const { activeUnitId } = useSelectedItems();
  const { onUnitSelect } = useSearchActions();

  // --- State ---
  const [selectedTab, setSelectedTab] = useState(ORBAT_TAB);
  const [isInteractive, setIsInteractive] = useState(true);
  const [panelWidth, setPanelWidth] = useState<number>(400); // ResizablePanel requires number, not undefined
  const [debug, setDebug] = useState(false);
  const [currentTab, setCurrentTab] = useState<ChartTab>(ChartTabs.Chart);

  // --- Computed (useMemo) ---
  const activeUnit = useMemo(() => {
    if (!activeUnitId) return null;
    const unit = helpers.getUnitById(activeUnitId);
    return unit ? unitActions.expandUnitWithSymbolOptions(unit) : null;
  }, [activeUnitId, helpers, unitActions, scn.store.state]);

  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    if (!activeUnitId || !activeUnit) return [];
    const { side, sideGroup, parents } = unitActions.getUnitHierarchy(activeUnitId);
    return [
      { name: side.name, static: true },
      { name: sideGroup?.name ?? "Root", static: true },
      ...parents.map((e) => ({ name: e.name, static: true })),
      { name: activeUnit.name, static: true },
    ];
  }, [activeUnitId, activeUnit, unitActions]);

  const { width, height } = useMemo(() => 
    sizeToWidthHeight(options.paperSize), 
    [options.paperSize]
  );

  // --- Effects ---
  useEffect(() => {
    const cleanup = onUnitSelect(({ unitId }) => {
      // activeUnitId is a string, not a ref
      // We need to use setActiveUnitId from useSelectedItems to update it
    });
    return cleanup;
  }, [onUnitSelect]);

  // --- Chart Handlers ---
  const handleUnitClick = useCallback((unitNode: any) => {
    currentChartElements.selectUnit(unitNode);
    setSelectedTab(SETTINGS_TAB);
    // setTimeout thay cho nextTick để đảm bảo tab đã chuyển trước khi set tab nội bộ
    setTimeout(() => setCurrentTab(ChartTabs.Unit), 0);
  }, [currentChartElements]);

  const handleLevelClick: OnLevelClickCallback = useCallback((levelNumber) => {
    currentChartElements.selectLevel(levelNumber);
    setSelectedTab(SETTINGS_TAB);
    setCurrentTab(ChartTabs.Level);
  }, [currentChartElements]);

  const handleBranchClick: OnBranchClickCallback = useCallback((parentId, levelNumber) => {
    currentChartElements.selectBranch(parentId, levelNumber);
    setSelectedTab(SETTINGS_TAB);
    setCurrentTab(ChartTabs.Branch);
  }, [currentChartElements]);

  // --- Export Logic ---
  const downloadSvgAsPng = useCallback((elementId: string, w: number, h: number) => {
    const svgElement = document.getElementById(elementId);
    if (!svgElement) return;

    const savedWidth = svgElement.getAttribute("width") || "";
    const savedHeight = svgElement.getAttribute("height") || "";
    const scaleFactor = 2;

    svgElement.setAttribute("width", `${w * scaleFactor}px`);
    svgElement.setAttribute("height", `${h * scaleFactor}px`);
    
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const canvas = document.createElement("canvas");
    canvas.width = w * scaleFactor;
    canvas.height = h * scaleFactor;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) saveBlobToLocalFile(blob, "orbat-chart.png");
        URL.revokeObjectURL(url);
        svgElement.setAttribute("width", savedWidth);
        svgElement.setAttribute("height", savedHeight);
      });
    };
    image.src = url;
  }, []);

  const doSVGDownload = async () => {
    setIsInteractive(false);
    setTimeout(async () => {
      const svgElement = document.getElementById("chartId");
      if (svgElement) {
        const data = new XMLSerializer().serializeToString(svgElement);
        await saveBlobToLocalFile(
          new Blob([data], { type: "image/svg+xml" }),
          "orbat-chart.svg"
        );
      }
      setTimeout(() => setIsInteractive(true), 1000);
    }, 0);
  };

  const doPNGDownload = async () => {
    setIsInteractive(false);
    setTimeout(() => {
      downloadSvgAsPng("chartId", width, height);
      setTimeout(() => setIsInteractive(true), 1000);
    }, 0);
  };

  const menuItems = useMemo(() => [
    { label: "Download as SVG", action: doSVGDownload },
    { label: "Download as PNG", action: doPNGDownload },
  ], [width, height]);

  return (
    <div className="relative flex min-h-0 flex-auto bg-background">
      <div className="bg-muted dark:bg-background relative z-10 flex h-full flex-col justify-between overflow-visible border-r-2 print:hidden">
        <ResizablePanel
          width={panelWidth}
          onWidthChange={setPanelWidth}
        >
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex h-full flex-col">
          <TabsList className="flex w-full rounded-none border-b border-gray-200 bg-transparent p-0">
            <TabsTrigger
              value={ORBAT_TAB}
              className="data-[state=active]:border-primary data-[state=active]:text-primary flex-1 rounded-none border-b-2 border-transparent bg-transparent py-4 text-sm font-medium shadow-none hover:border-gray-300"
            >
              ORBAT
            </TabsTrigger>
            <TabsTrigger
              value={SETTINGS_TAB}
              className="data-[state=active]:border-primary data-[state=active]:text-primary flex-1 rounded-none border-b-2 border-transparent bg-transparent py-4 text-sm font-medium shadow-none hover:border-gray-300"
            >
              Chart settings
            </TabsTrigger>
          </TabsList>
          
          <div className="min-h-0 flex-auto overflow-auto">
            <TabsContent value={ORBAT_TAB} className="mt-0 h-full">
              <OrbatPanel hideFilter />
            </TabsContent>
            <TabsContent value={SETTINGS_TAB} className="mt-0 h-full">
              <OrbatChartSettings chartMode tab={currentTab} onTabChange={setCurrentTab} />
            </TabsContent>
          </div>
        </Tabs>
        </ResizablePanel>
      </div>

      <main className="bg-muted/50 relative h-full flex-auto overflow-hidden">
        

        <div className="bg-opacity-80 bg-background absolute top-2 left-2 z-10 print:hidden rounded px-2">
          <SimpleBreadcrumbs items={breadcrumbItems} />
        </div>
        
        <nav className="bg-background absolute top-2 right-4 z-10 rounded-full print:hidden">
          <DotsMenu items={menuItems} />
        </nav>

        <div className="absolute right-2 bottom-2 z-10 print:hidden">
          <ToggleField 
            checked={debug} 
            onCheckedChange={setDebug}
          >
            Debug mode
          </ToggleField>
        </div>

        {!activeUnit ? (
          <div className="flex h-full items-center justify-center p-8">
            <p className="text-muted-foreground italic">Select a root unit in the sidebar</p>
          </div>
        ) : (
          <OrbatChart
            unit={activeUnit}
            width={width}
            height={height}
            symbolGenerator={symbolGenerator}
            chartId="chartId"
            options={options}
            specificOptions={specificOptions}
            enablePanZoom
            interactive={isInteractive}
            onUnitClick={handleUnitClick}
            onLevelClick={handleLevelClick}
            onBranchClick={handleBranchClick}
            debug={debug}
          />
        )}
      </main>
    </div>
  );
}