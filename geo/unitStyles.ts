import { Icon, Style } from "ol/style";
import type { CustomSymbol, UnitSymbolOptions } from "@/types/scenarioModels";
import { symbolGenerator } from "@/symbology/milsymbwrapper";
import type { Symbol as MilSymbol } from "milsymbol";
import type { SymbolSettingsState } from "@/stores/settingsStore";
import type { NUnit } from "@/types/internalModels";
import { hashObject, wordWrap } from "@/utils";
import type { MapSettingsState } from "@/stores/mapSettingsStore";
import type { TScenario } from "@/scenariostore";
import { CUSTOM_SYMBOL_PREFIX, CUSTOM_SYMBOL_SLICE } from "@/config/constants";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

export type UnitLabelData = {
  yOffset: number;
  text: string;
};
export const unitStyleCache = new Map<string, Style>();
export const selectedUnitStyleCache = new Map<string, Style>();
export const labelStyleCache = new Map<string, UnitLabelData>();

export function clearUnitStyleCache() {
  unitStyleCache.clear();
  selectedUnitStyleCache.clear();
  labelStyleCache.clear();
}

export function invalidateUnitStyle(cacheKey: string) {
  unitStyleCache.delete(cacheKey);
  selectedUnitStyleCache.delete(cacheKey);
  labelStyleCache.delete(cacheKey);
}

function createMilSymbolStyle(milSymbol: MilSymbol) {
  const { x, y } = milSymbol.getAnchor();
  const image = new Icon({
    scale: 1 / (window.devicePixelRatio || 1),
    anchor: [x, y],
    anchorXUnits: "pixels",
    anchorYUnits: "pixels",
    img: milSymbol.asCanvas(),
  });
  return new Style({
    image,
  });
}

function createCustomSymbolStyle(
  customSymbol: CustomSymbol,
  size: number,
  color?: string,
): Style {
  const image = new Icon({
    anchor: customSymbol.anchor ?? [0.5, 0.5],
    src: customSymbol.src,
    width: size,
    crossOrigin: "anonymous",
    color,
  });
  return new Style({
    image,
  });
}

export function createUnitStyle(
  unit: NUnit,
  symbolOptions: UnitSymbolOptions,
  scenario: TScenario,
  mapSettings: MapSettingsState,
  symbolSettings: SymbolSettingsState,
  color?: string,
): { style: Style; cacheKey: string } {
  const { name = "", shortName = "" } = unit;
  const runtimeState = getUnitRuntimeState(unit.id);
  const sidc = runtimeState?.sidc || unit.sidc;

  const { uniqueDesignation = shortName || name, ...textAmplifiers } =
    unit.textAmplifiers || {};

  if (sidc.startsWith(CUSTOM_SYMBOL_PREFIX)) {
    const customSymbolId = sidc.slice(CUSTOM_SYMBOL_SLICE);
    const cacheKey = customSymbolId;
    const customSymbol = scenario.store.state.customSymbolMap[customSymbolId];
    return {
      style: customSymbol
        ? createCustomSymbolStyle(
            customSymbol,
            mapSettings.mapIconSize * (mapSettings.mapCustomIconScale || 1.7),
            color,
          )
        : new Style(),
      cacheKey,
    };
  }
  const options = {
    size: mapSettings.mapIconSize * (window.devicePixelRatio || 1),
    uniqueDesignation: mapSettings.mapUnitLabelBelow ? "" : uniqueDesignation,
    outlineColor: "white",
    outlineWidth: 8,
    ...textAmplifiers,
    ...symbolSettings.getSymbolOptions,
    ...symbolOptions,
  };

  const milSymbol = symbolGenerator(sidc, options);
  return {
    style: createMilSymbolStyle(milSymbol),
    cacheKey: sidc + hashObject(options),
  };
}

type UnitLabelOptions = {
  wrapLabels?: boolean;
  wrapWidth?: number;
};
export function createUnitLabelData(
  unit: NUnit,
  unitStyle: Style | undefined,
  { wrapLabels = true, wrapWidth = 20 }: UnitLabelOptions = {},
): UnitLabelData {
  const label = unit.shortName || unit.name || "";
  const anchor = unitStyle?.getImage()?.getAnchor() ?? [0, 0];
  const iconHeight = unitStyle?.getImage()?.getSize()?.[1] || 0;
  const scale = (unitStyle?.getImage()?.getScale() as number) || 1;
  const yOffset = (iconHeight - anchor[1]) * scale + 5;

  return {
    yOffset: unitStyle ? yOffset : 20,
    text: wrapLabels ? wordWrap(label, { width: wrapWidth }) : label,
  };
}
