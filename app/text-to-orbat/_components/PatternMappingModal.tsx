"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import {
  ECHELON_PATTERNS,
  ICON_CODE_TO_NAME,
  ICON_PATTERNS,
} from "../_lib/textToOrbat";
import ToggleField from "@/components/ToggleField";

interface PatternMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Build SIDC for icon patterns (using battalion echelon for display)
function buildIconSidc(entityCode: string): string {
  return `1003100000${entityCode}`;
}

// Build SIDC for echelon patterns (using infantry as base icon)
function buildEchelonSidc(echelonCode: string): string {
  return `10031000${echelonCode}1211000000`;
}

// Extract keywords from regex pattern for display
function extractKeywords(pattern: RegExp): string[] {
  const source = pattern.source;
  const cleaned = source
    .replace(/\\b/g, "")
    .replace(/\\s\*/g, " ")
    .replace(/\[- ]\??/g, "-")
    .replace(/\(\?:/g, "(")
    .replace(/\?/g, "")
    .replace(/s\?/g, "(s)")
    .replace(/\\/g, "");

  return cleaned
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

interface PatternEntry {
  label: string;
  keywords: string[];
  sidc: string;
  originalPattern: string;
  constantName?: string;
  code?: string;
}

export default function PatternMappingModal({
  open,
  onOpenChange,
}: PatternMappingModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDebug, setShowDebug] = useState(false);

  const echelonEntries = useMemo<PatternEntry[]>(() => {
    return ECHELON_PATTERNS.map((p) => ({
      label: p.label,
      keywords: extractKeywords(p.pattern),
      sidc: buildEchelonSidc(p.code),
      originalPattern: p.pattern.source,
    }));
  }, []);

  const iconEntries = useMemo<PatternEntry[]>(() => {
    return ICON_PATTERNS.map((p) => ({
      label: p.label,
      keywords: extractKeywords(p.pattern),
      sidc: buildIconSidc(p.code),
      originalPattern: p.pattern.source,
      constantName: ICON_CODE_TO_NAME[p.code],
      code: p.code,
    }));
  }, []);

  const filteredEchelonEntries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return echelonEntries;
    return echelonEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(query) ||
        entry.keywords.some((kw) => kw.toLowerCase().includes(query))
    );
  }, [echelonEntries, searchQuery]);

  const filteredIconEntries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return iconEntries;
    return iconEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(query) ||
        entry.keywords.some((kw) => kw.toLowerCase().includes(query)) ||
        entry.constantName?.toLowerCase().includes(query)
    );
  }, [iconEntries, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pattern Mappings</DialogTitle>
          <DialogDescription>
            View how text patterns are mapped to echelons and unit types
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              type="text"
              placeholder="Search patterns..."
              className="flex-1"
            />
            <ToggleField checked={showDebug} onCheckedChange={setShowDebug}>
              Debug
            </ToggleField>
          </div>

          <Tabs defaultValue="echelons" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="echelons">Echelons</TabsTrigger>
              <TabsTrigger value="icons">Unit Types</TabsTrigger>
            </TabsList>

            <TabsContent value="echelons" className="mt-4">
              <div className="grid max-h-[50vh] grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2">
                {filteredEchelonEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded border p-3 hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <NewMilitarySymbol
                        sidc={entry.sidc}
                        size={32}
                        options={{ outlineWidth: 6, outlineColor: "white" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{entry.label}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.keywords.slice(0, 6).map((kw, i) => (
                          <span
                            key={i}
                            className="rounded bg-muted px-1.5 py-0.5 text-xs"
                          >
                            {kw}
                          </span>
                        ))}
                        {entry.keywords.length > 6 && (
                          <span className="text-xs text-muted-foreground">
                            +{entry.keywords.length - 6} more
                          </span>
                        )}
                      </div>
                      {showDebug && (
                        <div className="mt-1 truncate font-mono text-xs text-muted-foreground">
                          {entry.originalPattern}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="icons" className="mt-4">
              <div className="grid max-h-[50vh] grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2">
                {filteredIconEntries.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 rounded border p-3 hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <NewMilitarySymbol
                        sidc={entry.sidc}
                        size={32}
                        options={{ outlineWidth: 6, outlineColor: "white" }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{entry.label}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.keywords.slice(0, 4).map((kw, i) => (
                          <span
                            key={i}
                            className="rounded bg-muted px-1.5 py-0.5 text-xs"
                          >
                            {kw}
                          </span>
                        ))}
                        {entry.keywords.length > 4 && (
                          <span className="text-xs text-muted-foreground">
                            +{entry.keywords.length - 4} more
                          </span>
                        )}
                      </div>
                      {showDebug && (
                        <>
                          <div className="mt-1 font-mono text-xs text-amber-600 dark:text-amber-400">
                            {entry.constantName}
                          </div>
                          <div className="truncate font-mono text-xs text-muted-foreground">
                            {entry.code}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
