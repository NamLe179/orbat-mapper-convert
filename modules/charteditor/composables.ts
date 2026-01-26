import { useMemo } from "react";
import { type ChartItemType, ChartItemTypes, type ChartUnit } from "./orbatchart/types"; // Adjusted path to parent types
import {
  useChartSettingsStore,
  useMergedChartOptions,
  useSelectedChartElementStore,
  useSpecificChartOptionsStore,
} from "./chartSettingsStore";

export function useChartSettings(chartElementType: ChartItemType) {
  // 1. Hook into Stores
  const chartSettings = useChartSettingsStore();
  const selectedElement = useSelectedChartElementStore();
  const specificOptionsStore = useSpecificChartOptionsStore();
  const mOptions = useMergedChartOptions();

  // 2. Computed: Merged Options
  const mergedOptions = useMemo(() => {
    switch (chartElementType) {
      case ChartItemTypes.Level:
        return mOptions.level;
      case ChartItemTypes.Branch:
        return mOptions.branch;
      case ChartItemTypes.Unit:
        return mOptions.unit;
      case ChartItemTypes.Chart:
        // Exclude actions from the store object to just return state
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { setOption, setOptions, ...rest } = chartSettings;
        return rest;
      default:
        return {};
    }
  }, [chartElementType, mOptions, chartSettings]);

  // 3. Computed: Current Selected Element Identifier
  const currentElement = useMemo(() => {
    switch (chartElementType) {
      case ChartItemTypes.Level:
        return selectedElement.level;
      case ChartItemTypes.Branch:
        return selectedElement.branch?.parent || null;
      case ChartItemTypes.Unit:
        return selectedElement.node?.unit || null;
      default:
        return null;
    }
  }, [chartElementType, selectedElement.level, selectedElement.branch, selectedElement.node]);

  // 4. Computed: Element Specific Options
  const elementOptions = useMemo(() => {
    if (currentElement === null && chartElementType !== ChartItemTypes.Chart)
      return null;

    switch (chartElementType) {
      case ChartItemTypes.Level:
        return specificOptionsStore.level[currentElement as number] || {};
      case ChartItemTypes.Branch:
        return specificOptionsStore.branch[currentElement as string | number] || {};
      case ChartItemTypes.Unit:
        return specificOptionsStore.unit[(currentElement as ChartUnit).id] || {};
      case ChartItemTypes.Chart:
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { setOption, setOptions, ...rest } = chartSettings;
        return rest;
      default:
        return null;
    }
  }, [chartElementType, currentElement, specificOptionsStore, chartSettings]);

  // 5. Action: Set Value
  function setValue(name: string, value: any) {
    if (currentElement === null) {
      if (chartElementType !== ChartItemTypes.Chart) return;
    }

    // In Zustand (from previous file), setters act as merge. 
    // So we just need to pass the partial object.
    const partialOption = { [name]: value };

    switch (chartElementType) {
      case ChartItemTypes.Level:
        specificOptionsStore.setSpecificLevelOption(
          currentElement as number,
          partialOption
        );
        break;
      case ChartItemTypes.Branch:
        specificOptionsStore.setSpecificBranchOption(
          currentElement as string | number,
          partialOption
        );
        break;
      case ChartItemTypes.Unit:
        specificOptionsStore.setSpecificUnitOption(
          (currentElement as ChartUnit).id,
          partialOption
        );
        break;
      case ChartItemTypes.Chart:
        chartSettings.setOption(name as any, value);
        break;
    }
  }

  // 6. Action: Clear Specific Options
  function clearSpecificOptions() {
    if (currentElement === null) return;
    
    // To clear in a "Merge" strategy store, we ideally need a 'replace' action.
    // Assuming the store supports overwriting or we unset by passing undefined/defaults.
    // Here we construct an object that explicitly undefines the current keys to simulate clearing
    // if the store logic is a simple spread merge.
    
    const keysToClear = Object.keys(elementOptions || {});
    const clearObj = keysToClear.reduce((acc, key) => ({ ...acc, [key]: undefined }), {});

    switch (chartElementType) {
      case ChartItemTypes.Level:
        specificOptionsStore.setSpecificLevelOption(
          currentElement as number,
          clearObj
        );
        break;
      case ChartItemTypes.Branch:
        specificOptionsStore.setSpecificBranchOption(
          currentElement as string | number,
          clearObj
        );
        break;
      case ChartItemTypes.Unit:
        specificOptionsStore.setSpecificUnitOption(
          (currentElement as ChartUnit).id,
          clearObj
        );
        break;
    }
  }

  // 7. Computed: Used Options Set
  const usedOptions = useMemo(
    () => new Set(Object.keys(elementOptions || {})),
    [elementOptions]
  );

  return { setValue, clearSpecificOptions, usedOptions, mergedOptions };
}