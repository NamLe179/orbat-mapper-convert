"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import * as fuzzysort from "fuzzysort";

// Types
import type { LayerFeatureSearchResult, UnitSearchResult } from "./types";
import type { NUnit } from "@/types/internalModels";

// Utils
import { groupBy, htmlTagEscape } from "../utils";
import { useActiveScenario } from "@/components/injects";
import { getUnitRuntimeState } from "@/scenariostore/runtimeState";

// Components
import SimpleModal from "./SimpleModal";
import SearchModalInput from "./SearchModalInput";
import SearchUnitHit from "./SearchUnitHit";
import SearchFeatureHit from "./SearchFeatureHit";
import ToggleField from "./ToggleField";

// Custom Hook Debounce
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectUnit?: (id: string) => void;
  onSelectLayer?: (id: string) => void;
  onSelectFeature?: (id: string, pid: string) => void;
}

export default function SearchModal({
  open,
  onOpenChange,
  onSelectUnit,
  onSelectLayer,
  onSelectFeature,
}: SearchModalProps) {
  // --- Hooks & Context ---
  const {
    unitActions,
    geo,
    helpers: { getUnitById },
  } = useActiveScenario();

  // --- State ---
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [currentHitIndex, setCurrentHitIndex] = useState(0);
  const [limitToPosition, setLimitToPosition] = useState(false);

  // --- Search Logic (Computed) ---

  const unitHits = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];

    const hits = fuzzysort.go(q, unitActions.units, {
      keys: ["name", "shortName"],
    });

    return hits
      .filter((h) => {
        if (limitToPosition) {
          const unit = getUnitById((h.obj as NUnit).id);
          return unit ? getUnitRuntimeState(unit.id)?.location : false;
        }
        return true;
      })
      .slice(0, 10)
      .map((u) => {
        const unit = u.obj as NUnit;
        const parent = unit._pid && ({ ...getUnitById(unit._pid) } as NUnit);
        if (parent) {
          parent.symbolOptions = unitActions.getCombinedSymbolOptions(parent);
        }
        return {
          name: unit.name,
          sidc: unit.sidc,
          id: unit.id,
          parent,
          highlight:
            u[0] &&
            fuzzysort.highlight({
              ...u[0],
              score: u.score,
              target: htmlTagEscape(u[0].target),
            }),
          score: u.score,
          category: "Units" as const,
          symbolOptions: unitActions.getCombinedSymbolOptions(unit),
          index: 0, // Will be set in hits computed
        };
      });
  }, [debouncedQuery, limitToPosition, unitActions, getUnitById]);

  const featureHits = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return [];

    const hits = fuzzysort.go(q, geo.itemsInfo, { key: ["name"] });

    return hits.slice(0, 10).map((u) => ({
      ...(u.obj as any),
      highlight: fuzzysort.highlight({
        ...u,
        target: htmlTagEscape(u.target),
      }),
      score: u.score,
      category: "Features" as const,
      index: 0, // Will be set in hits computed
    }));
  }, [debouncedQuery, geo.itemsInfo]);

  const hits = useMemo(() => {
    const combinedHits = [unitHits, featureHits].sort((a, b) => {
      const scoreA = a[0]?.score ?? -10000;
      const scoreB = b[0]?.score ?? -10000;
      return scoreB - scoreA;
    });

    setCurrentHitIndex(0); // Reset index when results change
    return [...combinedHits.flat()].map((e, index) => ({
      ...e,
      index,
    }));
  }, [unitHits, featureHits]);

  const groupedHits = useMemo(() => {
    const grouped = groupBy(hits, "category");
    return Object.fromEntries(grouped) as Record<string, typeof hits>;
  }, [hits]);

  // --- Handlers ---

  const onSelect = useCallback(
    (index?: number) => {
      const i = index === undefined ? currentHitIndex : index;
      if (!hits.length) return;
      const item = hits[i];

      if (item.category === "Units") {
        onSelectUnit?.(String(item.id));
      } else if (item.category === "Features") {
        if ("type" in item && item.type === "layer") {
          onSelectLayer?.(String(item.id));
        } else {
          onSelectFeature?.(String(item.id), String((item as any)._pid));
        }
      }

      onOpenChange(false);
    },
    [hits, currentHitIndex, onSelectUnit, onSelectLayer, onSelectFeature, onOpenChange]
  );

  const doKbd = useCallback(
    (direction: "up" | "down") => {
      const nHits = hits.length;
      if (nHits === 0) return;

      setCurrentHitIndex((prev) => {
        if (direction === "up") {
          return prev === 0 ? nHits - 1 : prev - 1;
        } else {
          return prev >= nHits - 1 ? 0 : prev + 1;
        }
      });
    },
    [hits.length]
  );

  // --- Global Keyboard Events ---
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        doKbd("down");
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        doKbd("up");
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, doKbd, onSelect]);

  return (
    <SimpleModal open={open} onOpenChange={onOpenChange}>
      <SearchModalInput value={query} onValueChange={setQuery} />
      
      <div className="my-4">
        <ToggleField
          checked={limitToPosition}
          onCheckedChange={setLimitToPosition}
        >
          Show only units with a position
        </ToggleField>
      </div>

      <main className="space-y-4">
        {Object.entries(groupedHits).map(([source, groupHits]) => (
          <section key={source}>
            <p className="text-muted-foreground font-medium">{source}</p>
            <ul className="space-y-1.5">
              {groupHits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center rounded border border-transparent p-2 hover:border-army hover:bg-red-100 focus:ring-2 transition-colors ${
                      hit.index === currentHitIndex ? "bg-blue-200" : "bg-muted"
                    }`}
                    onClick={() => onSelect(hit.index)}
                  >
                    {hit.category === "Units" ? (
                      <SearchUnitHit unit={hit as UnitSearchResult} />
                    ) : (
                      <SearchFeatureHit feature={hit as LayerFeatureSearchResult} />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </SimpleModal>
  );
}