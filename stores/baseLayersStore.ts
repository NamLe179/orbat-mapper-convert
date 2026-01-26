import { create } from "zustand";
import type { LayerConfig, LayerConfigFile } from "@/geo/layerConfigTypes";

export type StoredLayerConfig = LayerConfig & { opacity: number };

interface BaseLayersState {
  // State
  layers: StoredLayerConfig[];
  activeLayerName: string;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  selectLayer: (name: string) => void;
  setLayerOpacity: (name: string, opacity: number) => void;
}

export const useBaseLayersStore = create<BaseLayersState>((set, get) => ({
  // --- Initial State ---
  layers: [],
  activeLayerName: "osm",
  isInitialized: false,

  // --- Actions ---

  initialize: async () => {
    // Access current state via get()
    if (get().isInitialized) return;

    // Helper to set fallback layers
    const setFallbackLayers = () => {
      set({
        layers: [
          {
            title: "OSM",
            name: "osm",
            layerSourceType: "osm",
            sourceOptions: { crossOrigin: "anonymous" },
            layerType: "baselayer",
            opacity: 1,
          },
        ],
      });
    };

    try {
      // In Next.js, static files in 'public' are served at root '/'
      const res = await fetch("/config/mapConfig.json");
      
      if (!res.ok) throw new Error("Failed to load config");
      
      const config = (await res.json()) as LayerConfigFile;

      if (config && config.length > 0) {
        set({
          layers: config.map((l) => ({ ...l, opacity: 1 })),
        });
      } else {
        setFallbackLayers();
      }
    } catch (e) {
      console.error("Failed to fetch mapConfig.json", e);
      setFallbackLayers();
    } finally {
      set({ isInitialized: true });
    }
  },

  selectLayer: (name: string) => {
    set({ activeLayerName: name });
  },

  setLayerOpacity: (name: string, opacity: number) => {
    // React requires immutable updates. 
    // We map over the array and create a new object for the modified layer.
    set((state) => ({
      layers: state.layers.map((l) =>
        l.name === name ? { ...l, opacity } : l
      ),
    }));
  },
}));