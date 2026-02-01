"use client";

import React, { useMemo } from "react";
import { Crosshair } from "lucide-react";
import { cn } from "@/lib/utils";

// Types
import type { ScenarioFeature, ScenarioFeatureState } from "@/types/scenarioGeoModels";
import { type StateAction } from "@/types/constants";
import { type MenuItemData } from "@/components/types";

// Hooks & Stores
import { useActiveScenario } from "@/components/injects";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { useMainToolbarStore } from "@/stores/mainToolbarStore";

// Components
import PanelSubHeading from "@/components/PanelSubHeading";
import BaseButton from "@/components/BaseButton";
import IconButton from "@/components/IconButton";
import DotsMenu from "@/components/DotsMenu";

interface ScenarioFeatureStateProps {
  feature: ScenarioFeature;
}

const menuItems: MenuItemData<StateAction>[] = [{ label: "Delete", action: "delete" }];

export default function ScenarioFeatureStateComp({ feature }: ScenarioFeatureStateProps) {
  // --- Hooks ---
  const { store, time, geo } = useActiveScenario();
  const fmt = useTimeFormatters();
  // const st = useMainToolbarStore(); // Có import nhưng chưa thấy dùng trong template gốc

  // --- Computed ---
  const featureState = useMemo(() => feature.state ?? [], [feature.state]);

  // --- Logic ---
  
  // Hàm kiểm tra trạng thái active dựa trên thời gian hiện tại
  const isActive = (s: ScenarioFeatureState, index: number) => {
    if (!featureState.length) return false;
    
    const nextTimestamp = featureState[index + 1]?.t || Number.MAX_VALUE;
    // Lưu ý: store.state.currentTime cần trigger re-render
    const currentTime = store.state.currentTime; 
    
    return s.t <= currentTime && nextTimestamp > currentTime;
  };

  // --- Handlers ---

  const changeToState = (stateEntry: ScenarioFeatureState) => {
    time.setCurrentTime(stateEntry.t);
  };

  const onStateAction = async (index: number, action: StateAction) => {
    if (action === "delete") {
      geo.deleteFeatureStateEntry(feature.id, index);
    }
    // Giả định store hỗ trợ mutation trực tiếp (như Valtio/MobX) hoặc đây là logic từ Vue
    if (typeof store.state.featureStateCounter === 'number') {
        store.state.featureStateCounter++;
    }
  };

  const clearState = () => {
    geo.updateFeature(feature.id, { state: [] });
  };

  return (
    <div className="mt-4">
      <PanelSubHeading>Feature state</PanelSubHeading>

      <div className="flex justify-end">
        <BaseButton small onClick={clearState}>
          Clear state
        </BaseButton>
      </div>

      <ul className="mt-2 divide-y divide-gray-200 border-t border-b border-gray-200">
        {featureState.map((s, index) => (
          <li key={s.id} className="relative flex items-center py-4">
            <div className="flex min-w-0 flex-auto flex-col text-sm">
              <button
                className={cn(
                  "flex",
                  isActive(s, index)
                    ? "text-foreground font-bold"
                    : "text-muted-foreground font-medium"
                )}
                onClick={() => changeToState(s)} // Cho phép click vào text để jump luôn (UX optional)
              >
                {fmt.scenarioFormatter.format(s.t)}
              </button>
            </div>

            <div className="relative flex flex-0 items-center space-x-0">
              <IconButton
                title="Goto Time and Place"
                onClick={() => changeToState(s)}
                className="bg-muted/50"
              >
                <Crosshair className="h-5 w-5" aria-hidden="true" />
              </IconButton>
              
              <DotsMenu 
                items={menuItems} 
                onAction={(action) => onStateAction(index, action)} 
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}