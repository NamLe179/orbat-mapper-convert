"use client";

import React, { useState, useEffect, useRef } from "react";
import { useUiStore } from "@/stores/uiStore";

// --- Custom Hook: useFps (Thay thế @vueuse/core) ---
function useFps() {
  const [fps, setFps] = useState(0);
  const frameCount = useRef(0);
  const startTime = useRef(performance.now());
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      frameCount.current++;
      const now = performance.now();
      const elapsed = now - startTime.current;

      if (elapsed >= 1000) {
        setFps(Math.round((frameCount.current * 1000) / elapsed));
        frameCount.current = 0;
        startTime.current = now;
      }

      rafId.current = requestAnimationFrame(loop);
    };

    rafId.current = requestAnimationFrame(loop);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  return fps;
}

// --- Main Component ---
export default function DebugInfo() {
  const fps = useFps();
  
  // Giả định store dùng Zustand: lấy state showFps
  const showFps = useUiStore((state) => state.showFps);

  return (
    <div className="bg-opacity-70 bg-background text-foreground fixed right-10 bottom-2 z-50 flex items-center gap-1 rounded text-xs print:hidden">
      {/* Breakpoint Indicator */}
      <p className="p-2 font-bold">
        <span className="sm:hidden">mo</span>
        <span className="hidden sm:inline md:hidden">sm</span>
        <span className="hidden md:inline lg:hidden">md</span>
        <span className="hidden lg:inline xl:hidden">lg</span>
        <span className="hidden xl:inline 2xl:hidden">xl</span>
        <span className="3xl:hidden hidden 2xl:inline">2xl</span>
        <span className="3xl:inline 4xl:hidden hidden">3xl</span>
        <span className="4xl:inline hidden">4xl+</span>
      </p>

      {/* FPS Counter */}
      {showFps && (
        <p className="w-16 p-2">
          <span>FPS:</span> {fps}
        </p>
      )}
    </div>
  );
}