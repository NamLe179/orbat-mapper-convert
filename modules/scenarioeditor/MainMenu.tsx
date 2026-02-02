"use client";

import React from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@heroicons/react/20/solid";

// UI Components
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Stores & Hooks
import { useUiStore } from "@/stores/uiStore";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useMeasurementsStore } from "@/stores/geoStore";
import { useActiveScenario } from "@/components/injects";
import { useMediaQuery } from "@/hooks/mediaQuery"; // Giả định hook này
import { LANDING_PAGE_ROUTE } from "@/router/name";
import type { ScenarioActions, UiAction } from "@/types/constants";
import { type CoordinateFormatType } from "@/hooks/geoShowLocation";

// Types
interface MainMenuProps {
  onAction?: (action: ScenarioActions) => void;
  onUiAction?: (action: UiAction) => void;
}

export default function MainMenu({ onAction, onUiAction }: MainMenuProps) {
  // --- Hooks & Stores ---
  
  // Undo/Redo từ Active Scenario
  const { store } = useActiveScenario();
  const { undo, redo, canRedo, canUndo } = store; // Giả định store trả về functions/values này

  // UI Store
  const uiSettings = useUiStore();
  // Giả định uiStore có các setter: setProp(name, value) hoặc các hàm cụ thể like setShowToolbar(val)
  // Để code gọn, tôi sẽ viết kiểu gọi hàm setter giả định:
  
  // Map Settings Store
  const mapSettings = useMapSettingsStore();
  
  // Measurements Store
  const measurementsStore = useMeasurementsStore();

  // Responsive check (md = 768px typically)
  const isMobile = useMediaQuery("(max-width: 768px)");

  // --- Helpers ---
  // Helper để xử lý action click cho gọn
  const handleAction = (action: ScenarioActions) => {
    onAction?.(action);
  };

  const handleUiAction = (action: UiAction) => {
    onUiAction?.(action);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="group flex items-center outline-none">
          <svg
            className="block h-7 w-auto shrink-0 fill-[#aab074]/90 stroke-gray-900 dark:fill-gray-700 dark:stroke-gray-300"
            stroke="currentColor"
            viewBox="41 41 118 118"
          >
            <path d="m100 45 55 25v60l-55 25-55-25V70z" strokeWidth="6" />
            <path d="m45 70 110 60m-110 0 110-60" strokeWidth="6" />
            <circle cx="100" cy="70" r="10" className="fill-gray-900 dark:fill-gray-300" />
          </svg>
          <span className="ml-2 hidden font-medium tracking-tight sm:inline-flex">
            ORBAT-Mapper
          </span>
          <ChevronDownIcon
            className="text-muted-foreground group-hover:text-muted-foreground/80 ml-1 h-5 w-5"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={10} className="w-56">
        {/* Navigation */}
        <DropdownMenuItem asChild>
          <Link href={LANDING_PAGE_ROUTE || "/"} className="font-medium">
            Home
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onSelect={() => handleUiAction("showSearch")}>
          Search
          <DropdownMenuShortcut className="ml-4">Ctrl+K</DropdownMenuShortcut>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* FILE SUBMENU */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>File</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={() => handleAction("exportJson")}>
              Download scenario
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("exportEncrypted")}>
              Download encrypted scenario...
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("save")}>
              Save scenario
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("loadNew")}>
              Load scenario...
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("createNew")}>
              New scenario...
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onSelect={() => handleAction("share")}>
              Share scenario online...
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("shareAsUrl")}>
              Share scenario as URL...
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("export")}>
              Export scenario data...
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("exportToImage")}>
              Export as image
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("import")}>
              Import data...
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("exportToClipboard")}>
              Copy scenario to clipboard
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem onSelect={() => handleAction("duplicate")}>
              Duplicate scenario
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleAction("showInfo")}>
              Show scenario info
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* EDIT SUBMENU */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><span>Edit</span></DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem 
              onSelect={() => handleAction("undo")} 
              disabled={!canUndo}
            >
              Undo
              <DropdownMenuShortcut className="ml-4">Ctrl+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={() => handleAction("redo")} 
              disabled={!canRedo}
            >
              Redo
              <DropdownMenuShortcut className="ml-4">Ctrl+Shift+Z</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* VIEW SUBMENU */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger><span className="mr-4">View</span></DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {/* UI Settings Toggles */}
            <DropdownMenuCheckboxItem
              checked={uiSettings.showToolbar}
              onCheckedChange={(v) => uiSettings.setShowToolbar?.(v)} 
            >
              Map toolbar
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              checked={uiSettings.showTimeline}
              onCheckedChange={(v) => uiSettings.setShowTimeline?.(v)}
            >
              Timeline
            </DropdownMenuCheckboxItem>

            {!isMobile && (
              <DropdownMenuCheckboxItem
                checked={uiSettings.showLeftPanel}
                onCheckedChange={(v) => uiSettings.setShowLeftPanel?.(v)}
              >
                ORBAT panel
              </DropdownMenuCheckboxItem>
            )}

            <DropdownMenuCheckboxItem
              checked={uiSettings.showOrbatBreadcrumbs}
              onCheckedChange={(v) => uiSettings.setShowOrbatBreadcrumbs?.(v)}
            >
              Unit breadcrumbs
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            {/* Map Settings Toggles */}
            <DropdownMenuCheckboxItem
              checked={mapSettings.showScaleLine}
              onCheckedChange={(v) => mapSettings.setShowScaleLine?.(v)}
            >
              Scale line
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              checked={mapSettings.showLocation}
              onCheckedChange={(v) => mapSettings.setShowLocation?.(v)}
            >
              Pointer location
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuCheckboxItem
              checked={mapSettings.showDayNightTerminator}
              onCheckedChange={(v) => mapSettings.setShowDayNightTerminator?.(v)}
            >
              Day/night terminator
            </DropdownMenuCheckboxItem>

            <DropdownMenuCheckboxItem
              checked={mapSettings.mapUnitLabelBelow}
              onCheckedChange={(v) => mapSettings.setMapUnitLabelBelow?.(v)}
            >
              Unit labels below icons
            </DropdownMenuCheckboxItem>

            {mapSettings.mapUnitLabelBelow && (
              <DropdownMenuCheckboxItem
                checked={mapSettings.mapWrapUnitLabels}
                onCheckedChange={(v) => mapSettings.setMapWrapUnitLabels?.(v)}
              >
                Wrap long unit labels
              </DropdownMenuCheckboxItem>
            )}

            {/* Measurement Units */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>
                <span className="pr-4">Measurement units</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup 
                  value={measurementsStore.measurementUnit}
                  onValueChange={(v) => measurementsStore.setMeasurementUnit?.(v as any)}
                >
                  <DropdownMenuRadioItem value="metric">Metric</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="imperial">Imperial</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="nautical">Nautical</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Coordinate Format */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger inset>Coordinate format</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup 
                  value={mapSettings.coordinateFormat}
                  onValueChange={(v) => mapSettings.setCoordinateFormat?.(v as CoordinateFormatType)}
                >
                  <DropdownMenuRadioItem value="dms">Degrees, minutes, seconds</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dd">Decimal degrees</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="MGRS">MGRS</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* TOOLS SUBMENU */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Tools</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={() => handleAction("browseSymbols")}>
              Browse symbols
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* HELP SUBMENU */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Help</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem asChild>
              <a
                href={
                  // @ts-ignore: route meta might not be typed fully
                  "https://docs.orbat-mapper.app/guide/about-orbat-mapper"
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleUiAction("showKeyboardShortcuts")}>
              Keyboard shortcuts
              <DropdownMenuShortcut className="ml-4">?</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

      </DropdownMenuContent>
    </DropdownMenu>
  );
}