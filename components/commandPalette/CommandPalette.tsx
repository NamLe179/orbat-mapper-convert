"use client";

import React, { useState, useMemo, useEffect } from "react";
import { toLonLat } from "ol/proj";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useDebounceValue } from "usehooks-ts";

// Stores & Hooks
import { useGeoStore } from "@/stores/geoStore";
import { useUiStore } from "@/stores/uiStore";
import { useGeoSearch } from "@/hooks/geosearching";
import { useActionSearch, useScenarioSearch } from "@/hooks/searching";

// Components
import CommandPaletteDialog from "./CommandPaletteDialog";
import CommandPaletteInput from "./CommandPaletteInput";
import CommandPaletteFooter from "./CommandPaletteFooter";
import CommandPaletteUnitItem from "./CommandPaletteUnitItem";
import CommandPaletteLayerFeatureItem from "./CommandPaletteLayerFeatureItem";
import CommandPaletteEventItem from "./CommandPaletteEventItem";
import CommandPalettePlaceItem from "./CommandPalettePlaceItem";
import CommandPaletteActionItem from "./CommandPaletteActionItem";
import CommandPaletteImageLayerItem from "./CommandPaletteImageLayerItem";

// UI Primitive (Shadcn/Command)
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

// Types
import type {
  ActionSearchResult,
  EventSearchResult,
  LayerFeatureSearchResult,
  MapLayerSearchResult,
  UnitSearchResult,
} from "@/components/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUnit: (id: string) => void;
  onSelectLayer: (id: string) => void;
  onSelectFeature: (id: string) => void;
  onSelectPlace: (item: any) => void;
  onSelectEvent: (item: any) => void;
  onSelectAction: (action: any) => void;
  onSelectImageLayer: (id: string) => void;
}

export default function CommandPalette({
  open,
  onOpenChange,
  ...emits
}: Props) {
  const geoStore = useGeoStore();
  const uiStore = useUiStore();
  const { photonSearch } = useGeoSearch();
  const { searchActions, actionItems } = useActionSearch();
  const { search } = useScenarioSearch(searchActions);

  const [rawQuery, setRawQuery] = useState("");
  const [mapCenter, setMapCenter] = useState<number[] | null>(null);
  const [hitCount, setHitCount] = useState(0);
  const [groupedHits, setGroupedHits] = useState<any>(new Map());

  const query = useMemo(() => rawQuery.replace(/^[#@>]/, ""), [rawQuery]);
  const isGeoSearch = useMemo(() => uiStore.searchGeoMode || rawQuery.startsWith("@"), [uiStore.searchGeoMode, rawQuery]);
  const isActionSearch = useMemo(() => rawQuery.startsWith("#") || rawQuery.startsWith(">"), [rawQuery]);

  const [debouncedQuery] = useDebounceValue(query, 200);
  const [geoDebouncedQuery] = useDebounceValue(query, 500);

  // Lấy tâm bản đồ khi mở palette
  useEffect(() => {
    if (open && geoStore.olMap) {
      const center = geoStore.olMap.getView().getCenter();
      setMapCenter(center ? (toLonLat(center) as number[]) : null);
    }
  }, [open, geoStore.olMap]);

  // Logic tìm kiếm Scenario (Units, Features, Events)
  useEffect(() => {
    if (isGeoSearch || isActionSearch || !debouncedQuery.trim()) return;
    const { numberOfHits, groups } = search(debouncedQuery);
    setHitCount(numberOfHits);
    setGroupedHits(groups);
  }, [debouncedQuery, isGeoSearch, isActionSearch, search]);

  // Logic tìm kiếm Địa lý (Places)
  useEffect(() => {
    if (!isGeoSearch || !geoDebouncedQuery.trim()) return;
    const fetchPlaces = async () => {
      const data = await photonSearch(geoDebouncedQuery, { mapCenter });
      setGroupedHits(new Map([["Places", data.map((d: any) => ({ ...d, category: "Places" }))]]));
      setHitCount(data.length);
    };
    fetchPlaces();
  }, [geoDebouncedQuery, isGeoSearch, photonSearch, mapCenter]);

  // Logic tìm kiếm Hành động (Actions)
  useEffect(() => {
    if (!isActionSearch) return;
    const q = query.trim();
    const filteredActions = q ? searchActions(q) : actionItems;
    setGroupedHits(new Map([["Actions", filteredActions]]));
    setHitCount(filteredActions.length);
  }, [query, isActionSearch, searchActions, actionItems]);

  const onSelect = (item: any) => {
    const { category, id, type, action } = item;
    if (category === "Units") emits.onSelectUnit(id);
    else if (category === "Features") {
      type === "layer" ? emits.onSelectLayer(id) : emits.onSelectFeature(id);
    } else if (category === "Map layers") emits.onSelectImageLayer(id);
    else if (category === "Events") emits.onSelectEvent(item);
    else if (category === "Places") emits.onSelectPlace(item);
    else if (category === "Actions") emits.onSelectAction(action);
    
    onOpenChange(false);
    setRawQuery("");
  };

  return (
    <CommandPaletteDialog open={open} onOpenChange={onOpenChange}>
      <Command className="rounded-lg border shadow-md">
        <CommandPaletteInput value={rawQuery} onValueChange={setRawQuery} />
        
        

        <CommandList className="max-h-[60vh] overflow-y-auto">
          {hitCount === 0 && rawQuery !== "" && rawQuery !== "?" && (
            <div className="px-6 py-14 text-center text-sm">
              <ExclamationTriangleIcon className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-4">No results found</p>
            </div>
          )}

          {Array.from(groupedHits.entries() as Iterable<[string, any[]]>).map(([source, hits]) => (
            <CommandGroup key={source} heading={source}>
              {hits.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id || item.name || item.title}
                  onSelect={() => onSelect(item)}
                  className="aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  {item.category === "Units" && <CommandPaletteUnitItem item={item} />}
                  {item.category === "Features" && <CommandPaletteLayerFeatureItem item={item} />}
                  {item.category === "Map layers" && <CommandPaletteImageLayerItem item={item} />}
                  {item.category === "Events" && <CommandPaletteEventItem item={item} />}
                  {item.category === "Places" && <CommandPalettePlaceItem item={item} center={mapCenter} />}
                  {item.category === "Actions" && <CommandPaletteActionItem item={item} />}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        
        <div className="border-t">
          <CommandPaletteFooter
            rawQuery={rawQuery}
            onClickActions={() => setRawQuery(">")} />
        </div>
      </Command>
    </CommandPaletteDialog>
  );
}