import { create } from "zustand";

interface PlaybackState {
  // State
  playbackSpeed: number;
  startMarker: number | undefined;
  endMarker: number | undefined;
  playbackRunning: boolean;
  playbackLooping: boolean;

  // Actions
  increaseSpeed: () => void;
  decreaseSpeed: () => void;
  togglePlayback: (value?: boolean) => void;
  toggleLooping: (value?: boolean) => void;
  addMarker: (marker: number) => void;
  clearMarkers: () => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  // --- Initial State ---
  playbackSpeed: 1000 * 60 * 30, // 30 minutes
  startMarker: undefined,
  endMarker: undefined,
  playbackRunning: false,
  playbackLooping: false,

  // --- Actions ---

  increaseSpeed: () =>
    set((state) => ({ playbackSpeed: state.playbackSpeed * 2 })),

  decreaseSpeed: () =>
    set((state) => ({ playbackSpeed: state.playbackSpeed / 2 })),

  // Replaces useToggle(false)
  togglePlayback: (value) =>
    set((state) => ({
      playbackRunning: typeof value === "boolean" ? value : !state.playbackRunning,
    })),

  // Replaces useToggle(false)
  toggleLooping: (value) =>
    set((state) => ({
      playbackLooping: typeof value === "boolean" ? value : !state.playbackLooping,
    })),

  addMarker: (marker: number) =>
    set((state) => {
      let { startMarker, endMarker } = state;

      if (startMarker === undefined) {
        return { startMarker: marker };
      } else if (endMarker === undefined) {
        return { endMarker: marker };
      } else {
        if (marker < endMarker) {
          return { startMarker: marker };
        } else {
          return { endMarker: marker };
        }
      }
    }),

  clearMarkers: () =>
    set({
      startMarker: undefined,
      endMarker: undefined,
    }),
}));