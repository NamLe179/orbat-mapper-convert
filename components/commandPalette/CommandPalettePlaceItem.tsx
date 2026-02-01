"use client";

import React, { useMemo } from "react";
import { MapPin, SquareDashed } from "lucide-react";
import { getDistance } from "ol/sphere";
import { formatLength } from "@/geo/utils";
import { useMeasurementsStore } from "@/stores/geoStore";
import { type PhotonSearchResult } from "@/hooks/geosearching"; 
import { type GeoSearchProperties } from "@/types/search";
import { type Feature, type Point } from "geojson";

interface CommandPalettePlaceItemProps {
  item: PhotonSearchResult;
  center?: number[] | null;
}

export default function CommandPalettePlaceItem({
  item,
  center,
}: CommandPalettePlaceItemProps) {
  // Access Store
  const measurementsStore = useMeasurementsStore();

  // Logic tính khoảng cách (Tương đương getFromCenter)
  const distanceLabel = useMemo(() => {
    if (!center) return "";
    // item là PhotonSearchResult, geometry của nó là Point
    const distance = getDistance(center, item.geometry.coordinates);
    return distance
      ? formatLength(distance, measurementsStore.measurementUnit)
      : "";
  }, [center, item, measurementsStore.measurementUnit]);

  // Logic chọn Icon
  const IconComponent = item.properties.extent ? SquareDashed : MapPin;

  return (
    <>
      <div>
        <IconComponent
          className="text-muted-foreground h-5 w-5"
          aria-hidden="true"
        />
      </div>
      
      <div className="ml-4 flex-auto">
        <p className="text-sm font-medium">
          {item.properties.name}
        </p>
        
        <div className="flex justify-between text-sm">
          <div className="space-x-1">
            <span className="text-muted-foreground text-xs uppercase">
              {item.properties.category}
            </span>
            {item.properties.city && <span>{item.properties.city}</span>}
            {item.properties.state && <span>{item.properties.state}</span>}
            {item.properties.country && <span>{item.properties.country}</span>}
          </div>
          
          <span className="text-muted-foreground text-xs">
            {distanceLabel}
          </span>
        </div>
      </div>
    </>
  );
}