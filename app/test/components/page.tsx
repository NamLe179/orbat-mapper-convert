"use client";

import { useState } from "react";
import BaseButton from "@/components/BaseButton";
import FormCard from "@/components/FormCard";
import NumberInputGroup from "@/components/NumberInputGroup";
import InputGroup from "@/components/InputGroup";
import SimpleCombo from "@/components/SimpleCombo";
import AccordionPanel from "@/components/AccordionPanel";
import ChevronPanel from "@/components/ChevronPanel";
import SettingsPanel from "@/components/SettingsPanel";
import ToggleField from "@/components/ToggleField";
import CheckboxDropdown from "@/components/CheckboxDropdown";
import DotsMenu from "@/components/DotsMenu";
import type { ButtonGroupItem, MenuItemData } from "@/components/types";
import type { ScenarioActions } from "@/types/constants";
import LinkButton from "@/components/LinkButton";
import TestCoordinateInput from "./_components/TestCoordinateInput";
import SplitButton from "@/components/SplitButton";

export default function ComponentsTestPage() {
  const [num, setNum] = useState(1);
  const [v, setV] = useState("Test");
  const [v2, setV2] = useState(1);
  const values = ["Hello", "Test", "Another"];
  const items = [
    { label: "Hello", value: 1 },
    { label: "Test", value: 2 },
    { label: "Another", value: 3 },
  ];

  const [sel, setSel] = useState<string[]>([]);
  const [toggle, setToggle] = useState(true);

  const scenarioMenuItems: MenuItemData<ScenarioActions>[] = [
    { label: "Add new side", action: "addSide" },
    { label: "Save to local storage", action: "save" },
    { label: "Load from local storage", action: "load" },
    { label: "Load scenario", action: "loadNew" },
    { label: "Download as JSON", action: "exportJson" },
    { label: "Copy to clipboard", action: "exportToClipboard" },
    { label: "Export scenario", action: "export" },
    { label: "Import", action: "import" },
  ];

  const mapLayerButtonItems: ButtonGroupItem[] = [
    {
      label: "Add feature layer",
      onClick: () => {
        console.log("Add feature layer");
      },
    },
    {
      label: "Add image layer",
      onClick: () => console.log("Add image layer"),
    },
    {
      label: "Add XYZ tile layer",
      onClick: () => console.log("Add XYZ tile layer"),
    },
    {
      label: "Add TileJSON layer",
      onClick: () => console.log("Add TileJSON layer"),
    },
  ];

  function onClick(e: React.MouseEvent) {
    console.log(e.target);
  }

  return (
    <div className="min-h-full">
      <div className="py-10">
        <header>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold leading-tight text-foreground">
              Test components
            </h1>
          </div>
        </header>
        <main className="mt-4">
          <div className="mx-auto max-w-7xl space-y-4 sm:px-6 lg:px-8">
            <section>
              <h3 className="border-b text-lg">Coordinate input widgets</h3>
              <TestCoordinateInput />
            </section>

            <section className="space-y-4" onClick={onClick}>
              <h3 className="border-b text-lg">Basic button</h3>
              <p className="flex items-start space-x-2">
                <BaseButton small>Basic small</BaseButton>
                <BaseButton>Basic default</BaseButton>
                <BaseButton large>Basic large</BaseButton>
                <BaseButton huge>Basic huge</BaseButton>
              </p>
              <p className="flex items-start space-x-2">
                <BaseButton primary small>
                  Primary small
                </BaseButton>
                <BaseButton primary>Primary default</BaseButton>
                <BaseButton primary large>
                  Primary large
                </BaseButton>
              </p>
            </section>

            {/* Add more test sections as needed */}
          </div>
        </main>
      </div>
    </div>
  );
}
