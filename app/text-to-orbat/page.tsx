"use client";

import { useState, useMemo, useEffect, KeyboardEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  Map as MapIcon,
  Moon,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import OrbatTreeNode from "./_components/OrbatTreeNode";
import ToggleField from "@/components/ToggleField";
import IconBrowserModal from "./_components/IconBrowserModal";
import PatternMappingModal from "./_components/PatternMappingModal";
import {
  convertParsedUnitsToOrbatMapperScenario,
  convertParsedUnitsToSpatialIllusions,
  INDENT_SIZE,
  parseTextToUnits,
} from "./_lib/textToOrbat";
import { useNotifications } from "@/hooks/notifications";
import { saveBlobToLocalFile } from "@/utils/files";
import { useScenario } from "@/scenariostore";
import { getIndexedDb } from "@/scenariostore/localdb";
import { useMediaQuery } from "@/hooks/mediaQuery";

export default function TextToOrbatPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const toggleDark = () => setTheme(isDark ? "light" : "dark");

  const isMobile = useMediaQuery("(max-width: 640px)");

  const [showDebug, setShowDebug] = useState(false);
  const [showIconBrowser, setShowIconBrowser] = useState(false);
  const [showPatternMapping, setShowPatternMapping] = useState(false);
  const [isOpeningScenario, setIsOpeningScenario] = useState(false);

  const [inputText, setInputText] = useState(
    "1st Infantry Division\n" +
      "  1st Brigade\n" +
      "    1st Tank Battalion\n" +
      "    2nd Art Battalion\n" +
      "  2nd Cdo Btn\n" +
      "    3rd RA\n" +
      "    4th Eng \n" +
      "  Artillery Coy"
  );

  // Indentation configuration
  const INDENT = " ".repeat(INDENT_SIZE);

  const handleTab = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue = inputText.substring(0, start) + INDENT + inputText.substring(end);
      setInputText(newValue);

      // Move cursor after the inserted indent
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + INDENT_SIZE;
      });
    },
    [inputText, INDENT]
  );

  const handleEnter = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = inputText;

      // Find start index of the current line
      const lastNewline = val.lastIndexOf("\n", start - 1);
      const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

      // Extract the text from lineStart up to cursor to detect leading whitespace
      const lineSlice = val.substring(lineStart, start);
      const indentMatch = lineSlice.match(/^[\t ]*/);
      const indent = indentMatch ? indentMatch[0] : "";

      // Replace selection with newline + indent
      const newValue = val.substring(0, start) + "\n" + indent + val.substring(end);
      setInputText(newValue);

      // Place cursor after the inserted indent
      requestAnimationFrame(() => {
        const pos = start + 1 + indent.length;
        textarea.selectionStart = textarea.selectionEnd = pos;
      });
    },
    [inputText]
  );

  const handleShiftTab = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      event.preventDefault();
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = inputText;

      // Determine the range of full lines to operate on
      const selLineStart =
        val.lastIndexOf("\n", start - 1) === -1 ? 0 : val.lastIndexOf("\n", start - 1) + 1;
      let selLineEndIdx = val.indexOf("\n", end);
      if (selLineEndIdx === -1) selLineEndIdx = val.length;

      const originalMiddle = val.substring(selLineStart, selLineEndIdx);
      const origLines = originalMiddle.split("\n");

      const removedPerLine: number[] = [];
      const newLines: string[] = origLines.map((line, idx) => {
        if (line.length === 0) {
          removedPerLine[idx] = 0;
          return line;
        }
        if (line.startsWith("\t")) {
          removedPerLine[idx] = 1;
          return line.substring(1);
        }
        const match = line.match(/^[ ]*/);
        const leadingSpaces = match ? match[0].length : 0;
        const remove = Math.min(leadingSpaces, INDENT_SIZE);
        removedPerLine[idx] = remove;
        return line.substring(remove);
      });

      const newMiddle = newLines.join("\n");
      const newValue =
        val.substring(0, selLineStart) + newMiddle + val.substring(selLineEndIdx);
      setInputText(newValue);

      // Calculate cursor/selection adjustment
      const posWithin = start - selLineStart;
      let pos = 0;
      let cursorLine = origLines.length - 1;
      let cursorCol = 0;
      for (let i = 0; i < origLines.length; i++) {
        const l = origLines[i].length;
        if (posWithin <= pos + l) {
          cursorLine = i;
          cursorCol = posWithin - pos;
          break;
        }
        pos += l + 1;
      }

      const removedBeforeCursor =
        removedPerLine.slice(0, cursorLine).reduce((a, b) => a + b, 0) +
        Math.min(removedPerLine[cursorLine] ?? 0, cursorCol);
      const totalRemoved = removedPerLine.reduce((a, b) => a + b, 0);

      const newStart = Math.max(0, start - removedBeforeCursor);
      const newEnd = Math.max(newStart, end - totalRemoved);

      requestAnimationFrame(() => {
        textarea.selectionStart = newStart;
        textarea.selectionEnd = newEnd;
      });
    },
    [inputText]
  );

  const parsedUnits = useMemo(() => parseTextToUnits(inputText), [inputText]);
  const spatialIllusionsOrbat = useMemo(
    () => convertParsedUnitsToSpatialIllusions(parsedUnits),
    [parsedUnits]
  );
  const orbatMapperScenario = useMemo(
    () => convertParsedUnitsToOrbatMapperScenario(parsedUnits),
    [parsedUnits]
  );

  const { send: sendNotification } = useNotifications();
  const { scenario } = useScenario();

  async function handleDownloadSpatialIllusions() {
    if (parsedUnits.length === 0) return;

    try {
      const payload = spatialIllusionsOrbat;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      await saveBlobToLocalFile(blob, "spatial-illusions-orbat.json", {
        mimeTypes: ["application/json"],
        extensions: [".json"],
      });
      sendNotification({ message: "Spatial Illusions JSON ready for download" });
    } catch (error) {
      sendNotification({
        message: "Failed to download Spatial Illusions JSON",
        type: "error",
      });
      console.error(error);
    }
  }

  async function handleDownloadOrbatMapperScenario() {
    if (parsedUnits.length === 0) return;

    try {
      const payload = orbatMapperScenario;
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      await saveBlobToLocalFile(blob, "orbat-mapper-scenario.json", {
        mimeTypes: ["application/json"],
        extensions: [".json"],
      });
      sendNotification({ message: "ORBAT Mapper scenario ready for download" });
    } catch (error) {
      sendNotification({
        message: "Failed to download ORBAT Mapper scenario",
        type: "error",
      });
      console.error(error);
    }
  }

  async function handleOpenScenario() {
    if (parsedUnits.length === 0 || isOpeningScenario || !scenario) return;

    setIsOpeningScenario(true);

    try {
      const payload = orbatMapperScenario;
      scenario.io.loadFromObject(payload);
      // clearUndoRedoStack doesn't exist on store

      const db = await getIndexedDb();
      const storedScenario = scenario.io.serializeToObject();
      const scenarioId = await db.addScenario(storedScenario, storedScenario.id);

      await router.push(`/scenario/${scenarioId}`);
      sendNotification({ message: "Scenario opened in editor" });
    } catch (error) {
      sendNotification({
        message: "Failed to open scenario",
        type: "error",
      });
      console.error(error);
    } finally {
      setIsOpeningScenario(false);
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Tab") {
      if (event.shiftKey) {
        handleShiftTab(event);
      } else {
        handleTab(event);
      }
    } else if (event.key === "Enter") {
      handleEnter(event);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b bg-muted px-4 py-2">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-lg font-semibold">Text to ORBAT</h1>
          <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            Experimental
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleDark} title="Toggle dark mode">
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </header>

      <ResizablePanelGroup
        direction={isMobile ? "vertical" : "horizontal"}
        className="flex-1"
      >
        {/* Left/Top: Text input */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="flex h-full flex-col">
            <div className="border-b bg-muted/50 px-4 py-2">
              <h2 className="text-sm font-medium text-muted-foreground">Text Input</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Enter unit hierarchy using indentation.
                <span className="hidden sm:inline">
                  {" "}
                  Each line is a unit name. Use tabs or spaces to indicate parent-child
                  relationships
                </span>
                .
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPatternMapping(true)}
                  title="View pattern mappings"
                >
                  <MapIcon className="mr-1 size-4" />
                  Patterns
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowIconBrowser(true)}
                  title="Browse icon codes"
                >
                  <BookOpen className="mr-1 size-4" />
                  Icons
                </Button>
              </div>
            </div>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 resize-none rounded-none border-0 font-mono text-sm focus-visible:ring-0"
              placeholder={`1st Infantry Division
  1st Brigade
    1st Battalion
    2nd Battalion
  2nd Brigade
    3rd Battalion
    4th Battalion
  Artillery Regiment`}
              onKeyDown={handleKeyDown}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right/Bottom: ORBAT display */}
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground">
                  Generated ORBAT
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {parsedUnits.length} top-level unit(s)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={parsedUnits.length === 0 || isOpeningScenario}
                  onClick={handleOpenScenario}
                  title="Open in Scenario Editor"
                >
                  <ExternalLink className="mr-1 size-4" />
                  Open
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={parsedUnits.length === 0}
                      title="Download ORBAT formats"
                    >
                      <Download className="mr-1 size-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleDownloadSpatialIllusions}>
                      Battle Staff Tools JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadOrbatMapperScenario}>
                      ORBAT Mapper Scenario
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <ToggleField checked={showDebug} onCheckedChange={setShowDebug}>
                  Debug info
                </ToggleField>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {parsedUnits.length === 0 ? (
                <div className="text-center text-muted-foreground">
                  <p>Enter text on the left to generate an ORBAT</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {parsedUnits.map((unit) => (
                    <OrbatTreeNode key={unit.id} unit={unit} showDebug={showDebug} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <IconBrowserModal open={showIconBrowser} onOpenChange={setShowIconBrowser} />
      <PatternMappingModal open={showPatternMapping} onOpenChange={setShowPatternMapping} />
    </div>
  );
}
