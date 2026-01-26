import { create } from "zustand";

interface GeoEditorViewState {
  // State
  panelWidthA: number;
  detailsPanelWidth: number;
  detailsRight: boolean;
  showDetailsPanel: boolean;

  // Actions
  setPanelWidthA: (width: number) => void;
  setDetailsPanelWidth: (width: number) => void;
  setDetailsRight: (isRight: boolean) => void;
  setShowDetailsPanel: (show: boolean) => void;
  toggleDetailsPanel: () => void;
}

export const useGeoEditorViewStore = create<GeoEditorViewState>((set) => ({
  // Initial State
  panelWidthA: 382,
  detailsPanelWidth: 382,
  detailsRight: true,
  showDetailsPanel: true,

  // Actions
  setPanelWidthA: (width) => set({ panelWidthA: width }),
  setDetailsPanelWidth: (width) => set({ detailsPanelWidth: width }),
  setDetailsRight: (isRight) => set({ detailsRight: isRight }),
  setShowDetailsPanel: (show) => set({ showDetailsPanel: show }),
  toggleDetailsPanel: () => set((state) => ({ showDetailsPanel: !state.showDetailsPanel })),
}));