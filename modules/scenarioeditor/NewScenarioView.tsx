"use client";

import React, { useState, useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Components
import FormCard from "@/components/FormCard";
import InputGroup from "@/components/InputGroup";
import SimpleMarkdownInput from "@/components/SimpleMarkdownInput";
import TimezoneSelect from "@/components/TimezoneSelect";
import RadioGroupList from "@/components/RadioGroupList";
import BaseButton from "@/components/BaseButton";
import ToggleField from "@/components/ToggleField";
import StandardIdentitySelect from "@/components/StandardIdentitySelect";
import SimpleDivider from "@/components/SimpleDivider";
import SymbolCodeSelect from "@/components/SymbolCodeSelect";
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import { Button } from "@/components/ui/button";

// Logic & Types
import { useScenario } from "@/scenariostore";
import { createEmptyScenario } from "@/scenariostore/io";
import { useYMDElements } from "@/hooks/scenarioTime";
import { SID } from "@/symbology/values";
import { nanoid } from "@/utils";
import { Sidc } from "@/symbology/sidc";
import { echelonItems } from "@/symbology/helpers";
import { getIndexedDb } from "@/scenariostore/localdb";
import { MAP_EDIT_MODE_ROUTE } from "@/router/name";
import { CUSTOM_SYMBOL_PREFIX } from "@/config/constants";

// --- Constants ---
const STANDARD_SETTINGS = [
  { value: "app6", name: "APP-6", description: "NATO version" },
  { value: "2525", name: "MIL-STD-2525D", description: "US version" },
];

const ICONS = [
  { code: "000000", text: "Unspecified" },
  { code: "110000", text: "Command and Control" },
  { code: "121100", text: "Infantry" },
  { code: "121000", text: "Combined Arms" },
  { code: "121102", text: "Mechanized" },
  { code: "130300", text: "Artillery" },
  { code: "120500", text: "Armor" },
  { code: "160600", text: "Combat Service Support" },
];

export default function NewScenarioView() {
  const router = useRouter();
  const { scenario } = useScenario();

  // --- State ---
  const [noInitialOrbat, setNoInitialOrbat] = useState(false);
  const [baseScenario, setBaseScenario] = useState(() => 
    createEmptyScenario({ addGroups: true, symbologyStandard: "app6" })
  );
  const [timeZone, setTimeZone] = useState(baseScenario.timeZone || "UTC");
  
  const [form, setForm] = useState({
    name: "New scenario",
    description: "",
    sides: [
      {
        name: "Side 1",
        standardIdentity: SID.Friend,
        symbolOptions: {},
        units: [{ rootUnitName: "HQ", rootUnitEchelon: "18", rootUnitIcon: "121100" }],
      },
      {
        name: "Side 2",
        standardIdentity: SID.Hostile,
        symbolOptions: {},
        units: [{ rootUnitName: "HQ", rootUnitEchelon: "18", rootUnitIcon: "121100" }],
      },
    ],
  });

  // --- Time Logic ---
  const { year, setYear, month, setMonth, day, setDay, hour, setHour, minute, setMinute, resDateTime } = useYMDElements({
    timestamp: baseScenario.startTime!,
    isLocal: true,
    timeZone,
  });

  // --- Helpers ---
  const iconItems = (sid: string) => 
    ICONS.map((icon) => ({
      code: icon.code,
      text: icon.text,
      sidc: `100${sid}100000${icon.code}0000`,
    }));

  const getUnitSidc = (unit: any, sideIdentity: string) => 
    `100${sideIdentity}1000${unit.rootUnitEchelon}${unit.rootUnitIcon}0000`;

  // --- Handlers ---
  const addSide = () => {
    setForm(prev => ({
      ...prev,
      sides: [...prev.sides, {
        name: "Side",
        standardIdentity: SID.Friend,
        symbolOptions: {},
        units: [{ rootUnitName: "HQ", rootUnitEchelon: "18", rootUnitIcon: "121000" }],
      }]
    }));
  };

  const removeSide = (idx: number) => {
    setForm(prev => ({
      ...prev,
      sides: prev.sides.filter((_, i) => i !== idx)
    }));
  };

  const addRootUnit = (sideIdx: number) => {
    const newSides = [...form.sides];
    newSides[sideIdx].units.push({ rootUnitName: "HQ", rootUnitEchelon: "18", rootUnitIcon: "121000" });
    setForm(prev => ({ ...prev, sides: newSides }));
  };

  const removeUnit = (sideIdx: number, unitIdx: number) => {
    const newSides = [...form.sides];
    newSides[sideIdx].units.splice(unitIdx, 1);
    setForm(prev => ({ ...prev, sides: newSides }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario) return;
    
    const startTime = resDateTime.valueOf();
    
    const finalScenario = {
      ...baseScenario,
      startTime,
      name: form.name,
      description: form.description,
      timeZone,
      layers: [{ name: "Features", id: nanoid(), features: [] }],
    };

    scenario.io.loadFromObject(finalScenario);
    scenario.time.setCurrentTime(startTime);
    
    const { unitActions, store } = scenario;

    if (!noInitialOrbat) {
      form.sides.forEach((sideData) => {
        const { units, ...rest } = sideData;
        const sideId = unitActions.addSide(rest as any, { markAsNew: false });
        
        // Access state directly after addSide to get the newly created side
        const side = store.state.sideMap[sideId];
        if (!side || !side.groups || side.groups.length === 0) {
          console.warn("Side not found or has no groups after creation:", sideId);
          return;
        }
        const parentId = side.groups[0];
        
        units.forEach((u) => {
          const sidc = new Sidc("10031000000000000000");
          sidc.standardIdentity = sideData.standardIdentity;
          sidc.emt = u.rootUnitEchelon || "00";
          sidc.mainIcon = u.rootUnitIcon || "000000";
          
          unitActions.addUnit({
            id: nanoid(),
            name: u.rootUnitName ?? "HQ",
            sidc: sidc.toString(),
            subUnits: [],
            _pid: "nn", _sid: "nn", _gid: "nn",
            equipment: [], personnel: [],
          }, parentId);
        });
      });
    }
    
    // Note: clearUndoRedoStack is available from immerStore hook, not directly from scenario.store
    // If needed, it should be accessed through the store's update mechanism or a separate hook
    const { addScenario } = await getIndexedDb();
    const scenarioId = await addScenario(scenario.io.serializeToObject());
    router.push(`/${MAP_EDIT_MODE_ROUTE}/${scenarioId}`);
  };

  return (
    <div className="min-h-screen py-10 bg-background">
      <header className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold leading-tight">Create new scenario</h1>
        <div className="prose dark:prose-invert mt-4">
          <p>Provide initial data for your scenario. You can change these settings later.</p>
        </div>
      </header>

      

      <main className="mx-auto my-10 max-w-7xl sm:px-6 lg:px-8">
        <form className="mt-6 space-y-6" onSubmit={handleCreate}>
          <div className="flex items-center justify-between px-4 sm:px-0">
            <Button asChild variant="link">
              <a href="https://docs.orbat-mapper.app/guide/getting-started" target="_blank" rel="noreferrer">
                View documentation <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <BaseButton primary type="submit">Create scenario</BaseButton>
          </div>

          <FormCard label="Basic scenario info" description="Provide a name and description.">
            <InputGroup 
              label="Name" 
              value={form.name} 
              onChange={(e) => setForm(p => ({...p, name: e.target.value}))} 
              autoFocus 
            />
            <SimpleMarkdownInput
              label="Description"
              value={form.description}
              onValueChange={(v) => setForm(p => ({...p, description: v}))}
              description="Use markdown syntax"
            />
          </FormCard>

          <FormCard label="Initial ORBAT" description="Sides and root units.">
            <ToggleField checked={noInitialOrbat} onCheckedChange={(v: boolean) => setNoInitialOrbat(v)}>
              Add sides and root units later
            </ToggleField>

            {!noInitialOrbat && (
              <div className="space-y-6 mt-4">
                {form.sides.map((sideData, idx) => (
                  <div key={idx} className="relative rounded-md border p-4 bg-muted/20">
                    <div className="grid gap-4 md:grid-cols-2">
                      <InputGroup 
                        label="Side name" 
                        value={sideData.name} 
                        onChange={(e) => {
                          const n = [...form.sides]; n[idx].name = e.target.value; setForm(p=>({...p, sides: n}));
                        }} 
                      />
                    </div>
                    <StandardIdentitySelect
                      value={sideData.standardIdentity}
                      onValueChange={(v: string) => {
                        const n = [...form.sides]; n[idx].standardIdentity = v as any; setForm(p=>({...p, sides: n}));
                      }}
                      fillColor={(sideData.symbolOptions as any).fillColor}
                      onFillColorChange={(v) => {
                        const n = [...form.sides] as any; n[idx].symbolOptions.fillColor = v; setForm(p=>({...p, sides: n}));
                      }}
                    />

                    <SimpleDivider className="my-4">Root units</SimpleDivider>

                    <div className="space-y-6">
                      {sideData.units.map((unit, uIdx) => (
                        <div key={uIdx} className="space-y-4">
                          <div className="flex items-end gap-4 md:grid md:grid-cols-2">
                            <InputGroup 
                              label="Root unit name" 
                              value={unit.rootUnitName} 
                              onChange={(e) => {
                                const n = [...form.sides]; n[idx].units[uIdx].rootUnitName = e.target.value; setForm(p=>({...p, sides: n}));
                              }} 
                            />
                            <div className="flex justify-center p-2">
                              <NewMilitarySymbol
                                size={32}
                                sidc={getUnitSidc(unit, sideData.standardIdentity)}
                                options={{ ...sideData.symbolOptions, outlineWidth: 8 }}
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <SymbolCodeSelect
                              label="Main icon"
                              value={unit.rootUnitIcon}
                              onValueChange={(v: string | null) => {
                                const n = [...form.sides]; n[idx].units[uIdx].rootUnitIcon = v || "121000"; setForm(p=>({...p, sides: n}));
                              }}
                              items={iconItems(sideData.standardIdentity)}
                              symbolOptions={sideData.symbolOptions}
                            />
                            <SymbolCodeSelect
                              label="Echelon"
                              value={unit.rootUnitEchelon}
                              onValueChange={(v: string | null) => {
                                const n = [...form.sides]; n[idx].units[uIdx].rootUnitEchelon = v || "18"; setForm(p=>({...p, sides: n}));
                              }}
                              items={echelonItems(sideData.standardIdentity)}
                              symbolOptions={sideData.symbolOptions}
                            />
                          </div>
                          {uIdx < sideData.units.length - 1 && <SimpleDivider />}
                        </div>
                      ))}
                    </div>

                    <footer className="mt-6 flex justify-end gap-x-2 border-t pt-4">
                      <Button variant="link" size="sm" type="button" onClick={() => removeUnit(idx, sideData.units.length - 1)}>
                        Remove unit
                      </Button>
                      <Button variant="link" size="sm" type="button" onClick={() => addRootUnit(idx)}>
                        + Add root unit
                      </Button>
                    </footer>
                  </div>
                ))}
                
                <footer className="flex justify-between items-center px-2">
                  <Button variant="ghost" size="sm" type="button" onClick={() => removeSide(form.sides.length - 1)}>
                    Remove last side
                  </Button>
                  <Button variant="outline" size="sm" type="button" onClick={addSide}>
                    + Add side
                  </Button>
                </footer>
              </div>
            )}
          </FormCard>

          <FormCard label="Scenario start time" description="Select a start time and time zone.">
            <TimezoneSelect label="Time zone" value={timeZone} onValueChange={setTimeZone} />
            <div className="grid grid-cols-3 gap-6">
              <InputGroup label="Year" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              <InputGroup label="Month" type="number" value={month} onChange={(e) => setMonth(Number(e.target.value))} />
              <InputGroup label="Day" type="number" value={day} onChange={(e) => setDay(Number(e.target.value))} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <InputGroup label="Hour" type="number" value={hour} onChange={(e) => setHour(Number(e.target.value))} min={0} max={23} />
              <InputGroup label="Minute" type="number" value={minute} onChange={(e) => setMinute(Number(e.target.value))} min={0} max={59} />
            </div>
            <p className="text-muted-foreground font-mono bg-muted p-2 rounded">{resDateTime.toString()}</p>
          </FormCard>

          <FormCard label="Symbology standard" description="Select your preferred standard.">
            <RadioGroupList
              items={STANDARD_SETTINGS}
              value={baseScenario.symbologyStandard}
              onValueChange={(v: string) => setBaseScenario(p => ({...p, symbologyStandard: v as any}))}
            />
          </FormCard>

          <div className="flex justify-end space-x-3 px-4 sm:px-0 pt-6">
            <BaseButton primary type="submit">Create scenario</BaseButton>
            <Button asChild variant="secondary">
              <Link href="/">Cancel</Link>
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}