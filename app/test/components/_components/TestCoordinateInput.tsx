"use client";

import { useState } from "react";
import CoordinateInput, { type CoordinateInputFormat } from "@/components/CoordinateInput";
import type { Position } from "geojson";
import { formatPosition } from "@/geo/utils";
import InputGroupTemplate from "@/components/InputGroupTemplate";

export default function TestCoordinateInput() {
  const [position, setPosition] = useState<Position>([13.369, 37.598]);
  const [format, setFormat] = useState<CoordinateInputFormat>("LonLat");

  return (
    <div className="mt-4 space-y-4">
      <div className="flex gap-8">
        <CoordinateInput
          value={position}
          onChange={setPosition}
          format={format}
          className="max-w-sm"
        />
        <InputGroupTemplate label="Label">
          <CoordinateInput
            value={position}
            onChange={setPosition}
            format={format}
            onFormatChange={(newFormat) => console.log("update format to", newFormat)}
          />
        </InputGroupTemplate>
      </div>
      <div className="grid grid-cols-4">
        <div>{JSON.stringify(position)}</div>
        <div>{formatPosition(position, { format: "DecimalDegrees" })}</div>
        <div>{formatPosition(position, { format: "DegreeMinuteSeconds" })}</div>
        <div>{formatPosition(position, { format: "MGRS" })}</div>
      </div>
    </div>
  );
}
