import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type {
  ChartUnit,
  PartialOrbChartOptions,
  RenderedUnitNode,
  SpecificOptions,
} from "./orbatchart/types"; // Đã sửa đường dẫn import cho đúng context
import { DEFAULT_OPTIONS, LevelLayouts } from "./orbatchart/defaults"; // Đã sửa đường dẫn import

// --- TYPES ---

export interface State {
  maxLevels: number;
  symbolSize: number;
  fontSize: number;
}

export interface SelectedState {
  node: RenderedUnitNode | null;
  level: number | null;
  branch: { level: number; parent: string | number } | null;
}

export interface RootUnitState {
  unit: ChartUnit | null | undefined;
}

export interface ChartSettingsState extends PartialOrbChartOptions {
  paperSize: string;
}

// --- STORES ---

// 1. Root Unit Store
interface RootUnitStore extends RootUnitState {
  setUnit: (unit: ChartUnit | null | undefined) => void;
}

export const useRootUnitStore = create<RootUnitStore>()((set) => ({
  unit: null,
  setUnit: (unit) => set({ unit }),
}));

// 2. Chart Settings Store
interface ChartSettingsAction {
  setOption: <K extends keyof ChartSettingsState>(key: K, value: ChartSettingsState[K]) => void;
  setOptions: (options: Partial<ChartSettingsState>) => void;
}

export const useChartSettingsStore = create<ChartSettingsState & ChartSettingsAction>()(
  (set) => ({
    paperSize: "4:3",
    maxLevels: 4,
    symbolSize: DEFAULT_OPTIONS.symbolSize,
    fontSize: DEFAULT_OPTIONS.fontSize,
    lastLevelLayout: LevelLayouts.TreeRight,
    connectorOffset: DEFAULT_OPTIONS.connectorOffset,
    levelPadding: 160,
    treeOffset: DEFAULT_OPTIONS.treeOffset,
    stackedOffset: DEFAULT_OPTIONS.stackedOffset,
    lineWidth: DEFAULT_OPTIONS.lineWidth,
    useShortName: true,
    unitLevelDistance: DEFAULT_OPTIONS.unitLevelDistance,
    labelOffset: DEFAULT_OPTIONS.labelOffset,
    fontWeight: "normal",
    fontStyle: "normal",
    lineColor: DEFAULT_OPTIONS.lineColor,
    hideLabel: false,
    fontColor: DEFAULT_OPTIONS.fontColor,
    labelPlacement: "below",
    showEquipment: false,
    showPersonnel: false,

    // Actions
    setOption: (key, value) => set((state) => ({ ...state, [key]: value })),
    setOptions: (options) => set((state) => ({ ...state, ...options })),
  })
);

// 3. Selected Chart Element Store
interface SelectedChartElementActions {
  clear: () => void;
  selectUnit: (unit: RenderedUnitNode) => void;
  selectLevel: (levelNumber: number) => void;
  selectBranch: (parentId: string | number, level: number) => void;
}

export const useSelectedChartElementStore = create<SelectedState & SelectedChartElementActions>()(
  (set) => ({
    node: null,
    level: null,
    branch: null,

    clear: () => set({ node: null, level: null, branch: null }),

    selectUnit: (unit) =>
      set({
        node: unit,
        level: unit.level,
        branch: unit.parent
          ? { parent: unit.parent.unit.id, level: unit.level }
          : null,
      }),

    selectLevel: (levelNumber) =>
      set({
        level: levelNumber,
        node: null,
        branch: null,
      }),

    selectBranch: (parentId, level) =>
      set({
        branch: { level, parent: parentId },
        level: level,
        node: null,
      }),
  })
);

// 4. Specific Chart Options Store
interface SpecificChartOptionsActions {
  clear: () => void;
  setSpecificLevelOption: (level: number, options: PartialOrbChartOptions) => void;
  setSpecificBranchOption: (branchId: string | number, options: PartialOrbChartOptions) => void;
  setSpecificUnitOption: (unitId: string | number, options: PartialOrbChartOptions) => void;
}

export const useSpecificChartOptionsStore = create<Required<SpecificOptions> & SpecificChartOptionsActions>()(
  (set) => ({
    level: {},
    branch: {},
    unit: {},

    clear: () => set({ level: {}, branch: {}, unit: {} }),

    // Helper actions to update deep state (replacing Vue's direct mutation)
    setSpecificLevelOption: (lvl, options) =>
      set((state) => ({
        level: {
          ...state.level,
          [lvl]: { ...state.level[lvl], ...options },
        },
      })),
      
    setSpecificBranchOption: (branchId, options) =>
      set((state) => ({
        branch: {
          ...state.branch,
          [branchId]: { ...state.branch[branchId], ...options },
        },
      })),

    setSpecificUnitOption: (unitId, options) =>
      set((state) => ({
        unit: {
          ...state.unit,
          [unitId]: { ...state.unit[unitId], ...options },
        },
      })),
  })
);

// --- HOOKS (Replacing Computed Getters) ---

/**
 * Custom Hook thay thế cho `useMergedChartOptionsStore` của Pinia.
 * Hook này sẽ tính toán options hợp nhất dựa trên các store khác.
 */
export const useMergedChartOptions = () => {
  const chartSettings = useChartSettingsStore();
  const selected = useSelectedChartElementStore();
  const specific = useSpecificChartOptionsStore();

  // 1. Computed Level Options
  const levelOptions = (() => {
    const spec = selected.level !== null ? specific.level[selected.level] || {} : {};
    // Extract state from chartSettings (excluding functions)
    const { setOption, setOptions, ...settings } = chartSettings;
    return { ...settings, ...spec };
  })();

  // 2. Computed Branch Options
  const branchOptions = (() => {
    const spec =
      selected.branch !== null ? specific.branch[selected.branch.parent] || {} : {};
    return { ...levelOptions, ...spec };
  })();

  // 3. Computed Unit Options
  const unitOptions = (() => {
    const spec = selected.node ? specific.unit[selected.node.unit.id] || {} : {};
    return { ...branchOptions, ...spec };
  })();

  return {
    level: levelOptions,
    branch: branchOptions,
    unit: unitOptions,
  };
};