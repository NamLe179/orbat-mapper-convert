"use client";

import React, { useState, useMemo, useEffect } from "react";
import type OLMap from "ol/Map";
import { toLonLat } from "ol/proj";
import type { Position } from "geojson";
import {
  Crosshair,
  Copy,
  MapPin,
  Pause,
  Play,
  FastForward,
  Rewind,
  Clock,
  ExternalLink,
} from "lucide-react";

// UI Components (Shadcn/Radix)
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

// Stores & Hooks
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useBaseLayersStore } from "@/stores/baseLayersStore";
import { useUiStore } from "@/stores/uiStore";
import { useMeasurementsStore } from "@/stores/geoStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { usePlaybackStore } from "@/stores/playbackStore";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { useActiveUnit } from "@/stores/dragStore";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";
import { useActiveSidc } from "@/hooks/mainToolbarData";
import { useNotifications } from "@/hooks/notifications";
import {
  useActiveScenario,
  useSearchActions,
  useActiveLayer,
} from "@/components/injects"; // Giả định hooks

// Utils & Helpers
import { getCoordinateFormatFunction } from "@/utils/geoConvert";
import { getGeometryIcon } from "@/modules/scenarioeditor/featureLayerUtils"; // Cần convert hàm này trả về Icon Component React
import { nanoid } from "@/utils";
import { cn } from "@/lib/utils";

// Components
import MilitarySymbol from "@/components/MilitarySymbol";
import UnitSymbol from "@/components/UnitSymbol";

// --- Custom Hook: useMediaQuery (Thay thế useBreakpoints) ---
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  return matches;
}

// --- Helper Functions ---
function returnMapProviders(lonLat: Position, zoomLevel: number) {
  return [
    {
      name: "Bing Maps",
      url: `https://www.bing.com/maps?cp=${lonLat[1]}~${lonLat[0]}&lvl=${zoomLevel}`,
    },
    {
      name: "Geohack",
      url: `https://geohack.toolforge.org/geohack.php?params=${lonLat[1]}_N_${lonLat[0]}_E`,
    },
    {
      name: "Google Maps",
      url: `https://www.google.com/maps/@${lonLat[1]},${lonLat[0]},${zoomLevel}z`,
    },
    {
      name: "OpenStreetMap",
      url: `https://www.openstreetmap.org/#map=15/${lonLat[1]}/${lonLat[0]}`,
    },
  ];
}

// --- Types ---
import type { NScenarioFeature, NUnit } from "@/types/internalModels";
import type { ScenarioFeature } from "@/types/scenarioGeoModels";

interface MapContextMenuProps {
  mapRef?: React.MutableRefObject<OLMap | null>;
  children: React.ReactNode;
}

export default function MapContextMenu({ mapRef, children }: MapContextMenuProps) {
  // --- Hooks ---
  const { store, unitActions, geo, helpers } = useActiveScenario();
  const activeLayerContext = useActiveLayer();
  const searchActions = useSearchActions();
  const { send } = useNotifications();

  const isMobile = useMediaQuery("(max-width: 768px)");

  // Stores
  const mapSettingsStore = useMapSettingsStore();
  const baseLayersStore = useBaseLayersStore();
  const uiSettings = useUiStore();
  const measurementsStore = useMeasurementsStore();
  const playback = usePlaybackStore();
  const tm = useTimeFormatters();
  const mainToolbarStore = useMainToolbarStore();
  
  const { 
    activeUnitId, setActiveUnitId, 
    activeFeatureId, setActiveFeatureId, 
    selectedUnitIds, setSelectedUnitIds, 
    selectedFeatureIds, setSelectedFeatureIds 
  } = useSelectedItems();
  
  const { activeParent } = useActiveUnit();
  const { sidc, symbolOptions } = useActiveSidc();

  // --- State ---
  const [dropPosition, setDropPosition] = useState<Position>([0, 0]);
  const [pixelPosition, setPixelPosition] = useState<number[] | null>(null);
  const [clickedUnits, setClickedUnits] = useState<NUnit[]>([]);
  const [clickedFeatures, setClickedFeatures] = useState<NScenarioFeature[]>([]);
  const [mapZoomLevel, setMapZoomLevel] = useState(0);

  // --- Computed ---
  const formattedPosition = useMemo(
    () => getCoordinateFormatFunction(mapSettingsStore.coordinateFormat)(dropPosition),
    [mapSettingsStore.coordinateFormat, dropPosition]
  );

  // --- Handlers ---

  const handleContextMenu = (e: React.MouseEvent) => {
    // Lưu ý: Radix UI ContextMenuTrigger sẽ chặn sự kiện mặc định.
    // Chúng ta dùng hàm này để lấy dữ liệu từ OLMap trước khi menu hiện lên.
    const map = mapRef?.current;
    if (!map) {
      console.warn("No map ref");
      return;
    }

    setMapZoomLevel(map.getView()?.getZoom() ?? 0);
    
    // Reset lists
    const units: NUnit[] = [];
    const features: NScenarioFeature[] = [];
    
    // Get Coordinates & Pixel
    // React Event e.nativeEvent contains standard MouseEvent props
    const pixel = map.getEventPixel(e.nativeEvent);
    const coord = map.getEventCoordinate(e.nativeEvent);
    
    setPixelPosition(pixel);
    setDropPosition(toLonLat(coord));

    map.forEachFeatureAtPixel(pixel, (feature, layer) => {
      const layerType = layer?.get("layerType");
      if (layerType === "UNITS") {
        const unitId = feature.getId() as string;
        const unit = helpers.getUnitById(unitId);
        if (unit) units.push(unit);
      } else if (layerType === "SCENARIO_FEATURE") {
        const featureId = feature.getId() as string;
        const { feature: scenarioFeature } = geo.getFeatureById(featureId);
        if (scenarioFeature) features.push(scenarioFeature);
      }
    });

    setClickedUnits(units);
    setClickedFeatures(features);
  };

  const onContextMenuUpdate = (open: boolean) => {
    if (!open) {
      setPixelPosition(null);
    }
  };

  const onExport = async () => {
    if (searchActions?.onScenarioAction) {
      searchActions.onScenarioAction({ action: "exportToImage" });
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedPosition);
      send({ message: `Copied ${formattedPosition} to the clipboard` });
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const onUnitSelect = (unit: NUnit, event: React.MouseEvent) => {
    if (event.shiftKey) {
      const newSet = new Set(selectedUnitIds);
      if (newSet.has(unit.id)) newSet.delete(unit.id);
      else newSet.add(unit.id);
      setSelectedUnitIds(newSet);
    } else {
      setActiveUnitId(unit.id);
    }
  };

  const onFeatureSelect = (feature: NScenarioFeature, event: React.MouseEvent) => {
    if (event.shiftKey) {
      const newSet = new Set(selectedFeatureIds);
      if (newSet.has(feature.id)) newSet.delete(feature.id);
      else newSet.add(feature.id);
      setSelectedFeatureIds(newSet);
    } else {
      setActiveFeatureId(feature.id);
    }
  };

  const onAddUnit = () => {
    store.groupUpdate(() => {
      if (!activeParent || unitActions.isUnitLocked(activeParent.id)) return;

      const name = `${(activeParent.subUnits?.length ?? 0) + 1}`;
      const unitId = unitActions.createSubordinateUnit(activeParent.id, {
        sidc,
        name,
      });
      if (unitId) geo.addUnitPosition(unitId, dropPosition);
    });
  };

  const onAddPoint = () => {
    const activeLayerId = activeLayerContext?.activeLayerId;
    const activeLayer = geo.getLayerById(activeLayerId ?? geo.layers[0]?.id);
    if (!activeLayer) return;
    const name = `Point ${(activeLayer.features.length ?? 0) + 1}`;

    const newFeature: ScenarioFeature = {
      type: "Feature",
      id: nanoid(),
      meta: { type: "Point", name },
      geometry: { type: "Point", coordinates: dropPosition },
      style: mainToolbarStore.currentDrawStyle ?? {},
      properties: {},
    };
    geo.addFeature(newFeature, activeLayer.id);
  };

  // Logic handle BaseMap change (Radio Group)
  const handleBaseMapChange = (value: string) => {
    store.update((s: any) => {
      s.mapSettings.baseMapId = value;
      // mapSettingsStore.setBaseLayerName(value); // Nếu dùng Zustand sync
    });
    // mapSettingsStore update nếu không sync qua store.update
    if(mapSettingsStore.setBaseLayerName) mapSettingsStore.setBaseLayerName(value);
    
    baseLayersStore.selectLayer(value);
  };

  // --- Render ---
  return (
    <ContextMenu onOpenChange={onContextMenuUpdate}>
      <ContextMenuTrigger asChild onContextMenu={handleContextMenu}>
        <div className="absolute inset-0">
          {children}
          
          {/* Click Target Indicator */}
          {pixelPosition && (
            <div
              className="absolute flex items-center justify-center pointer-events-none"
              style={{ left: pixelPosition[0], top: pixelPosition[1] }}
            >
              <Crosshair className="-ml-4 -mt-4 absolute h-8 w-8 text-yellow-500" />
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-64">
        {/* Copy Coordinates */}
        <ContextMenuItem onSelect={onCopy}>
          <Copy className="mr-2 h-4 w-4" />
          <span>{formattedPosition}</span>
        </ContextMenuItem>
        
        <ContextMenuSeparator />

        {/* Units Submenu */}
        {clickedUnits.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>
              <span>Units</span>
              <span className="ml-2 text-muted-foreground font-medium">
                ({clickedUnits.length})
              </span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
              {clickedUnits.map((unit) => (
                <ContextMenuItem
                  key={unit.id}
                  onClick={(e) => onUnitSelect(unit, e)}
                  onSelect={(e) => e.preventDefault()} // Prevent closing to allow multiple selection logic
                >
                  <div className="flex items-center">
                    <span className="flex w-7 items-center">
                      <UnitSymbol
                        sidc={unit.sidc}
                        className="w-6"
                        options={unitActions.getCombinedSymbolOptions(unit)}
                      />
                    </span>
                    <span
                      className={cn(
                        selectedUnitIds.has(unit.id) && "font-semibold"
                      )}
                    >
                      {unit.name}
                    </span>
                  </div>
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {/* Features Submenu */}
        {clickedFeatures.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger inset>
              <span>Features</span>
              <span className="ml-2 text-muted-foreground font-medium">
                ({clickedFeatures.length})
              </span>
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-[300px] overflow-y-auto">
              {clickedFeatures.map((feature) => {
                 // Giả định getGeometryIcon trả về Component hoặc element
                 const Icon = getGeometryIcon(feature);
                 return (
                  <ContextMenuItem
                    key={feature.id}
                    onClick={(e) => onFeatureSelect(feature, e)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center">
                      {Icon && <Icon className="text-muted-foreground mr-1 h-5 w-5" />}
                      <span
                        className={cn(
                          selectedFeatureIds.has(feature.id) && "font-semibold"
                        )}
                      >
                        {feature.meta.name}
                      </span>
                    </div>
                  </ContextMenuItem>
                 )
              })}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}

        {(clickedFeatures.length > 0 || clickedUnits.length > 0) && (
          <ContextMenuSeparator />
        )}

        {/* Add Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Add</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={onAddUnit}>
              <div className="mr-2 flex items-center justify-center w-8">
                 <MilitarySymbol
                    sidc={sidc}
                    options={symbolOptions}
                    size={15}
                  />
              </div>
              Unit
            </ContextMenuItem>
            <ContextMenuItem onSelect={onAddPoint}>
              <MapPin className="mr-2 h-4 w-4" />
              Point/marker
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Export Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Export</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={onExport}>Map as image</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Base Layer Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Map base layer</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              value={store.state.mapSettings.baseMapId}
              onValueChange={handleBaseMapChange}
            >
              {baseLayersStore.layers.map((layer: any) => (
                <ContextMenuRadioItem
                  key={layer.name}
                  value={layer.name}
                  onSelect={(e) => e.preventDefault()}
                >
                  {layer.title}
                </ContextMenuRadioItem>
              ))}
              <ContextMenuRadioItem value="None" onSelect={(e) => e.preventDefault()}>
                No base map
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Map Settings Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Map settings</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {/* Coordinate Format */}
            <ContextMenuSub>
              <ContextMenuSubTrigger inset>Coordinate format</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuRadioGroup
                  value={mapSettingsStore.coordinateFormat}
                  onValueChange={(val) => mapSettingsStore.setCoordinateFormat(val as any)}
                >
                  <ContextMenuRadioItem value="dms">Degrees, minutes, seconds</ContextMenuRadioItem>
                  <ContextMenuRadioItem value="dd">Decimal degrees</ContextMenuRadioItem>
                  <ContextMenuRadioItem value="MGRS">MGRS</ContextMenuRadioItem>
                </ContextMenuRadioGroup>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuCheckboxItem
              checked={mapSettingsStore.showDayNightTerminator}
              onCheckedChange={mapSettingsStore.setShowDayNightTerminator}
            >
              Day/night terminator
            </ContextMenuCheckboxItem>

            {/* Units of Measure */}
            <ContextMenuSub>
              <ContextMenuSubTrigger inset>Measurement units</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuRadioGroup
                  value={measurementsStore.measurementUnit}
                  onValueChange={(val) => measurementsStore.setMeasurementUnit(val as any)}
                >
                  <ContextMenuRadioItem value="metric">Metric</ContextMenuRadioItem>
                  <ContextMenuRadioItem value="imperial">Imperial</ContextMenuRadioItem>
                  <ContextMenuRadioItem value="nautical">Nautical</ContextMenuRadioItem>
                </ContextMenuRadioGroup>
              </ContextMenuSubContent>
            </ContextMenuSub>

            <ContextMenuCheckboxItem
              checked={mapSettingsStore.showLocation}
              onCheckedChange={mapSettingsStore.setShowLocation}
            >
              Pointer location
            </ContextMenuCheckboxItem>
            
            <ContextMenuCheckboxItem
              checked={mapSettingsStore.showScaleLine}
              onCheckedChange={mapSettingsStore.setShowScaleLine}
            >
              Scale line
            </ContextMenuCheckboxItem>

            <ContextMenuSeparator />
            
            <ContextMenuCheckboxItem
              checked={mapSettingsStore.mapUnitLabelBelow}
              onCheckedChange={mapSettingsStore.setMapUnitLabelBelow}
            >
              Unit labels below icons
            </ContextMenuCheckboxItem>
            
            {mapSettingsStore.mapUnitLabelBelow && (
              <ContextMenuCheckboxItem
                checked={mapSettingsStore.mapWrapUnitLabels}
                onCheckedChange={mapSettingsStore.setMapWrapUnitLabels}
              >
                Wrap long unit labels
              </ContextMenuCheckboxItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Open In Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Open in</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {returnMapProviders(dropPosition, mapZoomLevel).map(({ name, url }) => (
              <ContextMenuItem key={url} inset asChild>
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center">
                  {name} <ExternalLink className="ml-2 h-3 w-3" />
                </a>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Playback Submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger inset>Playback</ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onSelect={(e) => { e.preventDefault(); playback.togglePlayback(); }}>
              {playback.playbackRunning ? (
                <Pause className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              <span>{playback.playbackRunning ? "Pause" : "Play"}</span>
              <ContextMenuShortcut>k, alt+p</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onSelect={(e) => { e.preventDefault(); playback.increaseSpeed(); }}>
              <FastForward className="mr-2 h-4 w-4" />
              <span>Speed up</span>
              <ContextMenuShortcut>&gt;</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuItem onSelect={(e) => { e.preventDefault(); playback.decreaseSpeed(); }}>
              <Rewind className="mr-2 h-4 w-4" />
              <span>Slow down</span>
              <ContextMenuShortcut>&lt;</ContextMenuShortcut>
            </ContextMenuItem>
            
            <ContextMenuSeparator />
            
            <ContextMenuCheckboxItem
              checked={playback.playbackLooping}
              onCheckedChange={playback.toggleLooping}
            >
              Loop playback
            </ContextMenuCheckboxItem>

            <ContextMenuItem
              inset
              onSelect={(e) => { e.preventDefault(); playback.addMarker(store.state.currentTime); }}
            >
              Add marker
              <span className="ml-1">
                ({(playback.startMarker && playback.endMarker) ? 2 : (playback.startMarker || playback.endMarker) ? 1 : 0}/2)
              </span>
            </ContextMenuItem>

            <ContextMenuItem
              inset
              onSelect={(e) => { e.preventDefault(); playback.clearMarkers(); }}
              disabled={!playback.startMarker && !playback.endMarker}
            >
              Clear markers
            </ContextMenuItem>

            {playback.startMarker !== undefined && (
              <ContextMenuItem disabled>
                <Clock className="mr-2 h-4 w-4" />
                <span>{tm.scenarioFormatter.format(playback.startMarker)}</span>
              </ContextMenuItem>
            )}
            
            {playback.endMarker !== undefined && (
              <ContextMenuItem disabled>
                 {/* Giả định IconClockEnd là icon Clock + gì đó, ở đây dùng tạm Clock */}
                <Clock className="mr-2 h-4 w-4" />
                <span>{tm.scenarioFormatter.format(playback.endMarker)}</span>
              </ContextMenuItem>
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        {/* UI Toggles */}
        <ContextMenuCheckboxItem
          checked={uiSettings.showToolbar}
          onCheckedChange={uiSettings.setShowToolbar}
        >
          Map toolbar
        </ContextMenuCheckboxItem>
        
        {!isMobile && (
          <ContextMenuCheckboxItem
            checked={uiSettings.showLeftPanel}
            onCheckedChange={uiSettings.setShowLeftPanel}
          >
            ORBAT panel
          </ContextMenuCheckboxItem>
        )}
        
        <ContextMenuCheckboxItem
          checked={uiSettings.showTimeline}
          onCheckedChange={uiSettings.setShowTimeline}
        >
          Timeline
        </ContextMenuCheckboxItem>
        
        <ContextMenuCheckboxItem
          checked={uiSettings.showOrbatBreadcrumbs}
          onCheckedChange={uiSettings.setShowOrbatBreadcrumbs}
        >
          Unit breadcrumbs
        </ContextMenuCheckboxItem>

      </ContextMenuContent>
    </ContextMenu>
  );
}