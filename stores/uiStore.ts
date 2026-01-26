import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TAB_ORBAT } from "@/types/constants";

// -----------------------------------------------------------------------------
// 1. UI Store
// -----------------------------------------------------------------------------

interface UiState {
  // --- Ephemeral State (Reset on reload) ---
  modalOpen: boolean;
  editToolbarActive: boolean;
  measurementActive: boolean;
  getLocationActive: boolean;
  activeItem: any | null; // Replace 'any' with specific type if available
  activeStateItem: any | null; // Replace 'any' with specific type if available
  mobilePanelOpen: boolean;
  layersPanelActive: boolean;
  activeTabIndex: number; // Assuming TAB_ORBAT is number based on usage
  showSearch: boolean;
  searchGeoMode: boolean;
  mapLayersPanelOpen: boolean;
  showToolbar: boolean;
  showLeftPanel: boolean;
  toeTabIndex: number;
  prevToeIncludeSubordinates: boolean | undefined;
  prevSuppliesIncludeSubordinates: boolean | undefined;
  popperCounter: number;

  // --- Persisted State (Saved to LocalStorage) ---
  debugMode: boolean;
  showFps: boolean;
  showTimeline: boolean;
  showOrbatBreadcrumbs: boolean;
  goToNextOnSubmit: boolean;
  toeIncludeSubordinates: boolean;

  // --- Actions ---
  setModalOpen: (v: boolean) => void;
  setEditToolbarActive: (v: boolean) => void;
  setMeasurementActive: (v: boolean) => void;
  setGetLocationActive: (v: boolean) => void;
  setActiveItem: (item: any | null) => void;
  setActiveStateItem: (item: any | null) => void;
  setDebugMode: (v: boolean) => void;
  setShowFps: (v: boolean) => void;
  setMobilePanelOpen: (v: boolean) => void;
  setLayersPanelActive: (v: boolean) => void;
  setActiveTabIndex: (index: number) => void;
  setShowSearch: (v: boolean) => void;
  setSearchGeoMode: (v: boolean) => void;
  setMapLayersPanelOpen: (v: boolean) => void;
  setShowToolbar: (v: boolean) => void;
  setShowTimeline: (v: boolean) => void;
  setShowLeftPanel: (v: boolean) => void;
  setShowOrbatBreadcrumbs: (v: boolean) => void;
  setGoToNextOnSubmit: (v: boolean) => void;
  setToeTabIndex: (index: number) => void;
  setToeIncludeSubordinates: (v: boolean) => void;
  
  // Logic for Popper Counter
  incrementPopper: () => void;
  decrementPopper: () => void;

  // --- Getters (Computed) ---
  getShortcutsEnabled: () => boolean;
  getEscEnabled: () => boolean;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      // Initial State
      modalOpen: false,
      editToolbarActive: false,
      measurementActive: false,
      getLocationActive: false,
      activeItem: null,
      activeStateItem: null,
      debugMode: false,
      showFps: false,
      mobilePanelOpen: false,
      layersPanelActive: false,
      activeTabIndex: TAB_ORBAT,
      showSearch: false,
      searchGeoMode: false,
      mapLayersPanelOpen: true,
      showToolbar: true,
      showTimeline: true,
      showLeftPanel: true,
      showOrbatBreadcrumbs: true,
      goToNextOnSubmit: true,
      toeTabIndex: 0,
      toeIncludeSubordinates: true,
      prevToeIncludeSubordinates: undefined,
      prevSuppliesIncludeSubordinates: undefined,
      popperCounter: 0,

      // Setters
      setModalOpen: (v) => set({ modalOpen: v }),
      setEditToolbarActive: (v) => set({ editToolbarActive: v }),
      setMeasurementActive: (v) => set({ measurementActive: v }),
      setGetLocationActive: (v) => set({ getLocationActive: v }),
      setActiveItem: (item) => set({ activeItem: item }),
      setActiveStateItem: (item) => set({ activeStateItem: item }),
      setDebugMode: (v) => set({ debugMode: v }),
      setShowFps: (v) => set({ showFps: v }),
      setMobilePanelOpen: (v) => set({ mobilePanelOpen: v }),
      setLayersPanelActive: (v) => set({ layersPanelActive: v }),
      setActiveTabIndex: (v) => set({ activeTabIndex: v }),
      setShowSearch: (v) => set({ showSearch: v }),
      setSearchGeoMode: (v) => set({ searchGeoMode: v }),
      setMapLayersPanelOpen: (v) => set({ mapLayersPanelOpen: v }),
      setShowToolbar: (v) => set({ showToolbar: v }),
      setShowTimeline: (v) => set({ showTimeline: v }),
      setShowLeftPanel: (v) => set({ showLeftPanel: v }),
      setShowOrbatBreadcrumbs: (v) => set({ showOrbatBreadcrumbs: v }),
      setGoToNextOnSubmit: (v) => set({ goToNextOnSubmit: v }),
      setToeTabIndex: (v) => set({ toeTabIndex: v }),
      setToeIncludeSubordinates: (v) => set({ toeIncludeSubordinates: v }),

      incrementPopper: () => set((s) => ({ popperCounter: s.popperCounter + 1 })),
      decrementPopper: () => set((s) => ({ popperCounter: Math.max(0, s.popperCounter - 1) })),

      // Getters logic
      getShortcutsEnabled: () => !get().modalOpen,
      getEscEnabled: () => {
        const s = get();
        return !(
          s.modalOpen ||
          s.editToolbarActive ||
          s.measurementActive ||
          s.getLocationActive ||
          s.popperCounter > 0
        );
      },
    }),
    {
      name: "ui-storage",
      // Only persist fields that were wrapped in useLocalStorage in the original file
      partialize: (state) => ({
        debugMode: state.debugMode,
        showFps: state.showFps,
        showTimeline: state.showTimeline,
        showOrbatBreadcrumbs: state.showOrbatBreadcrumbs,
        goToNextOnSubmit: state.goToNextOnSubmit,
        toeIncludeSubordinates: state.toeIncludeSubordinates,
      }),
    }
  )
);

// -----------------------------------------------------------------------------
// 2. Width Store
// -----------------------------------------------------------------------------

interface WidthState {
  // State
  orbatPanelWidth: number;
  detailsWidth: number;

  // Actions
  setOrbatPanelWidth: (width: number) => void;
  setDetailsWidth: (width: number) => void;
  resetOrbatPanelWidth: () => void;
  resetDetailsWidth: () => void;
}

export const useWidthStore = create<WidthState>()(
  persist(
    (set) => ({
      orbatPanelWidth: 400,
      detailsWidth: 400,

      setOrbatPanelWidth: (w) => set({ orbatPanelWidth: w }),
      setDetailsWidth: (w) => set({ detailsWidth: w }),

      resetOrbatPanelWidth: () => set({ orbatPanelWidth: 400 }),
      resetDetailsWidth: () => set({ detailsWidth: 400 }),
    }),
    {
      name: "panel-width-storage",
      // Both fields were persisted, so we don't need partialize (defaults to all)
    }
  )
);

// Optional: Keep the external variable if logic elsewhere depends on it, 
// though generally better to keep state within the store.
// export let prevToeIncludeSubordinates: boolean | undefined = undefined;