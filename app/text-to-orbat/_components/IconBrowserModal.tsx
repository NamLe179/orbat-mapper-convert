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
import NewMilitarySymbol from "@/components/NewMilitarySymbol";
import { ICON_CODE_TO_NAME, ICON_PATTERNS } from "../_lib/textToOrbat";

interface IconEntry {
  name: string;
  code: string;
  sidc: string;
}

interface IconBrowserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Build SIDC from entity code
function buildSidc(entityCode: string): string {
  // Format: version(2) context(1) standard_identity(1) symbol_set(2) status(1) hq/TF(1) echelon(2) entity(10)
  // Use friendly standard identity and land unit symbol set with unspecified echelon
  return `1003${10}0000${entityCode}`;
}

function friendlyNameFromVar(varName: string) {
  return varName
    .replace(/^ICON_/, "")
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

export default function IconBrowserModal({ open, onOpenChange }: IconBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const icons: IconEntry[] = useMemo(() => {
    return Object.entries(ICON_CODE_TO_NAME)
      .map(([entityCode, varName]) => {
        const patternLabel = ICON_PATTERNS.find((p) => p.code === entityCode)?.label;
        const name = patternLabel ?? friendlyNameFromVar(varName);
        return { name, code: varName, sidc: buildSidc(entityCode) } as IconEntry;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const filteredIcons = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return icons;
    return icons.filter(
      (icon) =>
        icon.name.toLowerCase().includes(query) || icon.code.toLowerCase().includes(query)
    );
  }, [icons, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="md:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Icon mappings</DialogTitle>
          <DialogDescription>
            Browse available ICON_XXX entity codes and their symbols
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="Search by name or code..."
            className="w-full"
          />

          <div className="grid max-h-[60vh] grid-cols-2 gap-4 overflow-y-auto md:grid-cols-3">
            {filteredIcons.map((icon) => (
              <div
                key={icon.code}
                className="flex flex-col items-center gap-2 rounded border p-3 transition-colors hover:bg-muted"
              >
                <div className="flex h-12 w-12 items-center justify-center">
                  <NewMilitarySymbol
                    sidc={icon.sidc}
                    size={40}
                    options={{ outlineWidth: 8, outlineColor: "white" }}
                  />
                </div>
                <div className="text-center text-sm">
                  <div className="truncate" title={icon.name}>
                    {icon.name}
                  </div>
                  <div className="font-mono text-xs leading-6 text-amber-600 dark:text-amber-400">
                    {icon.code.slice(5)}
                  </div>
                  <div className="font-mono text-sm tracking-wider">
                    {icon.sidc.slice(10)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
