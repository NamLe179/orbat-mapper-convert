"use client";

import React, { useEffect } from "react";

// UI Components
import AccordionPanel from "@/components/AccordionPanel";
import LinkButton from "@/components/LinkButton";
import PanelHeading from "@/components/PanelHeading";
import HeadingDescription from "@/components/HeadingDescription";

// Feature Settings Components
import ScenarioInfoGroups from "./ScenarioInfoGroups";
import ScenarioInfoPersonnel from "./ScenarioInfoPersonnel";
import ScenarioInfoEquipment from "./ScenarioInfoEquipment";
import ScenarioInfoUnitStatuses from "./ScenarioInfoUnitStatuses";
import ScenarioMapSettings from "./ScenarioMapSettings";
import ScenarioInfoSupplies from "./ScenarioInfoSupplies";
import ScenarioInfoSupplyClasses from "./ScenarioInfoSupplyClasses";
import ScenarioInfoSupplyUnits from "./ScenarioInfoSupplyUnits";
import ScenarioSymbolColorSettings from "./ScenarioSymbolColorSettings";
import ScenarioCustomSymbolSettings from "./ScenarioCustomSymbolSettings";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useSelectedItems } from "@/stores/selectedStore";
import { useScenarioInfoPanelStore } from "@/stores/scenarioInfoPanelStore";

export default function ScenarioSettingsPanel() {
  const { store } = useActiveScenario();
  const selectedItems = useSelectedItems();
  const scenarioInfoPanelStore = useScenarioInfoPanelStore();

  // --- Undo/Redo Handler ---
  useEffect(() => {
    // Giả định onUndoRedo trả về một hàm hủy đăng ký (cleanup)
    const unsubscribe = store.onUndoRedo(() => {
      // Trong React, ta cập nhật thông qua store.update
      store.update((draft) => {
        draft.settingsStateCounter = draft.settingsStateCounter + 1;
      });
    });
    return () => unsubscribe();
  }, [store]);

  // --- Handlers ---
  const showScenarioInfo = () => {
    selectedItems.clear();
    selectedItems.setShowScenarioInfo(true);
  };

  return (
    <div className="flex flex-col space-y-2">
      <header className="flex items-center justify-between">
        <p></p>
        <LinkButton onClick={showScenarioInfo}>
          View scenario description <span aria-hidden="true"> &rarr;</span>
        </LinkButton>
      </header>

      <PanelHeading>Scenario settings</PanelHeading>
      <HeadingDescription>
        Scenario settings are saved as part of the scenario.
      </HeadingDescription>

      

      <div className="mt-4">
        {/* Equipment Categories */}
        <AccordionPanel
          label="Equipment categories"
          key={scenarioInfoPanelStore.tabIndex + 20}
        >
          <ScenarioInfoEquipment />
        </AccordionPanel>

        {/* Personnel Categories */}
        <AccordionPanel
          label="Personnel categories"
          key={scenarioInfoPanelStore.tabIndex + 40}
        >
          <ScenarioInfoPersonnel />
        </AccordionPanel>

        {/* Supply Categories */}
        <AccordionPanel
          label="Supply categories"
          key={scenarioInfoPanelStore.tabIndex + 50}
        >
          <ScenarioInfoSupplies />
        </AccordionPanel>

        <AccordionPanel label="Supply classes">
          <ScenarioInfoSupplyClasses />
        </AccordionPanel>

        <AccordionPanel label="Supply unit of measure/issue">
          <ScenarioInfoSupplyUnits />
        </AccordionPanel>

        {/* Sensor groups */}
        <AccordionPanel
          label="Sensor groups"
          key={scenarioInfoPanelStore.tabIndex + 60}
        >
          <ScenarioInfoGroups />
        </AccordionPanel>

        <AccordionPanel label="Unit statuses">
          <ScenarioInfoUnitStatuses />
        </AccordionPanel>

        <AccordionPanel label="Map settings">
          <ScenarioMapSettings />
        </AccordionPanel>

        <AccordionPanel label="Symbol fill colors">
          <ScenarioSymbolColorSettings />
        </AccordionPanel>

        <AccordionPanel label="Custom unit symbols">
          <ScenarioCustomSymbolSettings />
        </AccordionPanel>
      </div>
    </div>
  );
}