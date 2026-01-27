"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { ArrowUpRightIcon, Shapes as ShapesIcon } from "lucide-react";
import { useActiveScenario } from "@/components/injects"; // Hook context
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { CUSTOM_SYMBOL_SLICE } from "@/config/constants"; // Giả định file config
import { cn } from "@/lib/utils";

// --- Helper Hook: useDebounce (Nếu dự án chưa có hook này) ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// --- Component ---

interface SymbolPickerCustomSymbolProps {
  initialSidc?: string | null;
  onUpdateSidc: (sidc: string) => void; // Thay thế emit
}

export default function SymbolPickerCustomSymbol({
  initialSidc,
  onUpdateSidc,
}: SymbolPickerCustomSymbolProps) {
  const { store } = useActiveScenario();
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 100);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter Logic
  const filteredIcons = useMemo(() => {
    // Giả định store.state.customSymbolMap là object
    // Cần cast type hoặc đảm bảo store đã được type đúng trong project
    const icons = Object.values((store.state as any).customSymbolMap || {});
    
    if (!debouncedQuery.trim()) {
      return icons as any[];
    }
    
    const query = debouncedQuery.toLowerCase();
    return (icons as any[]).filter((icon: any) =>
      icon.name.toLowerCase().includes(query)
    );
  }, [store.state, debouncedQuery]);

  // Handlers
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape" && searchQuery.length) {
      e.stopPropagation();
      setSearchQuery("");
    }
  };

  return (
    <div className="flex px-0.5">
      {filteredIcons.length > 0 ? (
        <div className="flex-auto">
          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon
              className="text-muted-foreground pointer-events-none absolute top-3.5 left-0 h-5 w-5"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="text"
              className="text-foreground placeholder:text-muted-foreground h-12 w-full border-0 bg-transparent pr-4 pl-7 focus:ring-0 sm:text-sm outline-none"
              placeholder="Search custom symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Icons Grid */}
          <div className="mt-4 max-h-[40vh] overflow-auto sm:max-h-[50vh]">
            <div className="mt-4 grid grid-cols-3 gap-x-2 gap-y-4 p-1">
              {filteredIcons.map(({ id, name, src }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdateSidc(id)}
                  className="flex w-full scroll-m-12 flex-col items-center justify-center rounded border border-transparent p-3 hover:border-gray-500 transition-colors"
                >
                  <span className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={name}
                      className="w-24 flex-auto object-contain"
                    />
                  </span>
                  <p
                    className={cn(
                      "mt-1 max-w-full shrink-0 overflow-hidden text-center text-sm font-medium break-words",
                      id === initialSidc?.slice(CUSTOM_SYMBOL_SLICE)
                        ? "text-red-900"
                        : "text-foreground"
                    )}
                  >
                    {name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <Empty className="border border-dashed w-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShapesIcon className="h-10 w-10 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No custom symbols available</EmptyTitle>
            <EmptyDescription>
              Go to <span className="font-medium">Settings -&gt; Custom unit symbols</span>{" "}
              in the ORBAT panel to add new symbols/icons to your scenario.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="link" asChild className="text-muted-foreground" size="sm">
            <a
              href="https://docs.orbat-mapper.app/guide/custom-symbols"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1"
            >
              Documentation <ArrowUpRightIcon className="h-4 w-4" />
            </a>
          </Button>
        </Empty>
      )}
    </div>
  );
}