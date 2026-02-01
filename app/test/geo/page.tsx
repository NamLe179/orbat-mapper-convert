"use client";

import { useState, useRef, useEffect } from "react";
import MapContainer from "@/components/MapContainer";
import MeasurementToolbar from "@/components/MeasurementToolbar";
import MapEditToolbar from "@/components/MapEditToolbar";
import BaseButton from "@/components/BaseButton";
import { formatPosition } from "@/geo/utils";
import { useGetMapLocation } from "@/hooks/geoMapLocation";
import type OLMap from "ol/Map";
import type VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import type Feature from "ol/Feature";

export default function GeoTestPage() {
  const [mapRef, setMapRef] = useState<OLMap | null>(null);
  const [loc, setLoc] = useState("");
  const [vectorLayer, setVectorLayer] = useState<VectorLayer<VectorSource> | null>(null);
  const locationHandler = useRef<ReturnType<typeof useGetMapLocation> | null>(null);

  useEffect(() => {
    if (mapRef) {
      // Dynamically import ol modules to avoid SSR issues
      import("ol/layer/Vector").then(({ default: VectorLayerClass }) => {
        const layer = new VectorLayerClass({
          source: new VectorSource(),
          properties: {
            title: "Test layer",
          },
        });
        mapRef.addLayer(layer);
        setVectorLayer(layer);

        locationHandler.current = useGetMapLocation(mapRef, {
          onGetLocation: (location) => {
            setLoc(formatPosition(location));
          },
        });
      });
    }
  }, [mapRef]);

  const onMapReady = (olMap: OLMap) => {
    setMapRef(olMap);
  };

  function onModify(features: Feature[]) {
    console.log("Modified feature(s)", features);
  }

  function onAdd(feature: Feature, layer: VectorLayer<any>) {
    console.log("Added feature", feature.getProperties(), layer.getProperties());
  }

  function doGetLocation() {
    locationHandler.current?.start();
  }

  return (
    <div className="h-full w-full">
      <MapContainer onReady={onMapReady} />

      {mapRef && vectorLayer && (
        <>
          <div className="absolute left-3 top-[150px]">
            <MapEditToolbar
              olMap={mapRef}
              layer={vectorLayer}
              onModify={onModify}
              onAdd={(feature) => onAdd(feature, vectorLayer)}
            />
          </div>
          <div className="absolute bottom-4 left-3">
            <MeasurementToolbar olMap={mapRef} />
          </div>
        </>
      )}

      {locationHandler.current && (
        <>
          <BaseButton
            className={`fixed left-2 top-20 ${locationHandler.current.isActive ? "bg-red-100" : ""}`}
            onClick={doGetLocation}
          >
            Get location
          </BaseButton>
          <p className="fixed bottom-5 left-20 rounded border bg-background bg-opacity-70 p-1 px-2">
            {loc}
          </p>
        </>
      )}
    </div>
  );
}
