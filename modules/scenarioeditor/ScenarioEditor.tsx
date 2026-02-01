"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import NProgress from "nprogress";
import { 
  Globe, 
  Table as TableIcon, 
  Search as SearchIcon, 
  Menu as MenuIcon,
  Undo2, Redo2, Keyboard, Sun, MoonStar, HelpCircle, Network
} from "lucide-react";
import { useEventListener } from "usehooks-ts";

// UI Components (Shadcn)
import { Button } from "@/components/ui/button";

// Internal Components
import MainMenu from "./MainMenu";
import PlaybackMenu from "./PlaybackMenu";
import MainViewSlideOver from "@/components/MainViewSlideOver";
import CommandPalette from "@/components/commandPalette/CommandPalette";
import AppNotifications from "@/components/AppNotifications";
import ShortcutsModal from "@/components/ShortcutsModal";
import DebugInfo from "@/components/DebugInfo";

// Hooks & Stores
import { useActiveScenario, ActiveLayerContext, TimeModalContext, SidcModalContext } from "@/components/injects";
import { useUiStore } from "@/stores/uiStore";
import { useTabStore } from "@/stores/tabStore";
import { useMapSettingsStore } from "@/stores/mapSettingsStore";
import { useSelectedItems } from "@/stores/selectedStore";
import { useDateModal, useSidcModal } from "@/hooks/modals";
import { useFileDropZone } from "@/hooks/filedragdrop";
import { useScenarioShare } from "@/hooks/scenarioShare";
import { useNotifications } from "@/hooks/notifications";

// Types & Constants
import { MAP_EDIT_MODE_ROUTE, GRID_EDIT_ROUTE, CHART_EDIT_MODE_ROUTE, NEW_SCENARIO_ROUTE } from "@/router/name";
import { TAB_LAYERS } from "@/types/constants";
import type { FeatureId } from "@/types/scenarioGeoModels";

// Lazy Loaded Modals
const LoadScenarioDialog = dynamic(() => import("./LoadScenarioDialog"), { ssr: false });
const SymbolPickerModal = dynamic(() => import("@/components/SymbolPickerModal"), { ssr: false });
const InputDateModal = dynamic(() => import("@/components/InputDateModal"), { ssr: false });
const ExportScenarioModal = dynamic(() => import("@/components/ExportScenarioModal"), { ssr: false });
const ImportModal = dynamic(() => import("@/components/ImportModal"), { ssr: false });

export default function ScenarioEditor({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const scn = useActiveScenario();
  const { send } = useNotifications();

  // --- Refs & Dropzone ---
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { isOverDropZone } = useFileDropZone(dropZoneRef, (files) => {
    if (files?.length) {
      // Logic xử lý file drop
      setShowImportModal(true);
    }
  });

  // --- Local UI State ---
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [shortcutsVisible, setShortcutsVisible] = useState(false);
  const [activeLayerId, setActiveLayerId] = useState<FeatureId | null>(null);

  // --- Stores ---
  const uiStore = useUiStore();
  const tabStore = useTabStore();
  const mapStore = useMapSettingsStore();
  const selectedItems = useSelectedItems();
  const { state, undo, redo, canRedo, canUndo } = scn.store;

  // --- Active Layer Context Value ---
  const activeLayerContextValue = useMemo(() => ({
    activeLayerId,
    setActiveLayerId: (id: FeatureId | null | undefined) => setActiveLayerId(id ?? null)
  }), [activeLayerId]);

  // --- Modals Logic ---
  const dateModal = useDateModal();
  const sidcModal = useSidcModal();
  const { shareScenario } = useScenarioShare();

  // --- Context values for modals ---
  const timeModalContextValue = useMemo(() => ({
    getModalTimestamp: dateModal.getModalTimestamp
  }), [dateModal.getModalTimestamp]);

  const sidcModalContextValue = useMemo(() => ({
    getModalSidc: sidcModal.getModalSidc
  }), [sidcModal.getModalSidc]);

  // --- Effects ---
  useEffect(() => {
    document.title = state.info.name;
    mapStore.setBaseLayerName(state.mapSettings.baseMapId);
  }, [state.info.name, state.mapSettings.baseMapId]);

  useEffect(() => {
    if (tabStore.activeScenarioTab === TAB_LAYERS) {
      NProgress.start();
      NProgress.done();
    }
  }, [tabStore.activeScenarioTab]);

  // --- Handlers ---
  const onScenarioAction = async (action: string) => {
    switch (action) {
      case "save":
        const newId = await scn.io.saveToIndexedDb();
        send({ message: "Scenario saved" });
        if (state.id !== newId) router.push(`/${MAP_EDIT_MODE_ROUTE}/${newId}`);
        break;
      case "loadNew": setShowLoadModal(true); break;
      case "export": setShowExportModal(true); break;
      case "import": setShowImportModal(true); break;
      case "showInfo": 
        selectedItems.clear(); 
        selectedItems.setShowScenarioInfo(true); 
        break;
      // ... các action khác tương tự
    }
  };

  // --- Global Keyboard Shortcuts ---
  useEventListener("keydown", (e) => {
    if (uiStore.modalOpen) return;
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      uiStore.setShowSearch(true);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.shiftKey ? redo() : undo();
    }
  });

  return (
    <ActiveLayerContext.Provider value={activeLayerContextValue}>
      <TimeModalContext.Provider value={timeModalContextValue}>
        <SidcModalContext.Provider value={sidcModalContextValue}>
          <div className="fixed inset-0 bg-background flex flex-col overflow-hidden" ref={dropZoneRef}>
        {/* Top Navigation Bar */}
        <nav className="flex shrink-0 items-center justify-between py-1 pr-4 pl-6 border-b print:hidden">
        <div className="flex min-w-0 flex-auto items-center gap-2">
          <MainMenu onAction={onScenarioAction} onUiAction={(act) => act === 'showSearch' && uiStore.setShowSearch(true)} />
          <Button 
            variant="ghost" 
            className="hidden truncate font-medium sm:inline-flex" 
            onClick={() => onScenarioAction("showInfo")}
          >
            {state.info.name}
          </Button>
        </div>

        <div className="flex shrink-0 items-center space-x-1 sm:space-x-2">
          {pathname.includes(MAP_EDIT_MODE_ROUTE) && <PlaybackMenu />}
          
          <Button variant="ghost" size="icon" onClick={() => uiStore.setShowSearch(true)}>
            <SearchIcon className="size-5 text-muted-foreground" />
          </Button>

          {/* Mode Switcher */}
          <div className="bg-muted flex items-center rounded-lg p-1 gap-1">
            <ModeLink href="" scenarioId={state.id} title="Map"><Globe className="size-5" /></ModeLink>
            <ModeLink href="grid-edit" scenarioId={state.id} title="Grid"><TableIcon className="size-5" /></ModeLink>
            <ModeLink href="chart-edit" scenarioId={state.id} title="Chart"><Network className="size-5" /></ModeLink>
          </div>

          {/* History Controls */}
          <div className="flex items-center border-l pl-2">
            <Button variant="ghost" size="icon" onClick={() => undo()} disabled={!canUndo} title="Undo (Ctrl+Z)">
              <Undo2 className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => redo()} disabled={!canRedo} title="Redo">
              <Redo2 className="size-5" />
            </Button>
          </div>

          <Button variant="ghost" size="icon" onClick={() => setIsSlideOverOpen(true)}>
            <MenuIcon className="size-6" />
          </Button>
        </div>
      </nav>

      {/* Main Content Area (Next.js Children/Pages) */}
      <main className="relative flex-1 min-h-0">
        {children}
      </main>

      

      {/* Overlays & Modals */}
      <CommandPalette 
        open={uiStore.showSearch} 
        onOpenChange={uiStore.setShowSearch}
        onSelectUnit={(id) => selectedItems.setActiveUnitId(id)}
        onSelectLayer={(id) => {}}
        onSelectFeature={(id) => {}}
        onSelectPlace={(item) => {}}
        onSelectEvent={(item) => {}}
        onSelectAction={(action) => onScenarioAction(action)}
        onSelectImageLayer={(id) => {}}
      />

      <MainViewSlideOver open={isSlideOverOpen} onOpenChange={setIsSlideOverOpen} />
      
      <ShortcutsModal open={shortcutsVisible} onOpenChange={setShortcutsVisible} />

      {showLoadModal && <LoadScenarioDialog open={showLoadModal} onOpenChange={setShowLoadModal} />}
      
      {dateModal.showDateModal && (
        <InputDateModal
          open={dateModal.showDateModal}
          onOpenChange={dateModal.setShowDateModal}
          timestamp={dateModal.initialDateModalValue}
          onUpdateTimestamp={dateModal.confirmDateModal}
          dialogTitle={dateModal.dateModalTitle}
        />
      )}

      {sidcModal.showSidcModal && (
        <SymbolPickerModal
          isVisible={sidcModal.showSidcModal}
          onIsVisibleChange={sidcModal.setShowSidcModal}
          initialSidc={sidcModal.initialSidcModalValue}
          onUpdateSidc={sidcModal.confirmSidcModal}
          onCancel={() => sidcModal.setShowSidcModal(false)}
        />
      )}

      {showImportModal && <ImportModal open={showImportModal} onOpenChange={setShowImportModal} />}

      {/* File Drop Overlay */}
      {isOverDropZone && (
        <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="bg-card border-2 border-dashed border-primary p-8 rounded-xl animate-in zoom-in-95">
            <p className="text-xl font-bold">Drop files to import scenario data</p>
          </div>
        </div>
      )}

      <AppNotifications />
      {uiStore.debugMode && <DebugInfo />}
          </div>
        </SidcModalContext.Provider>
      </TimeModalContext.Provider>
    </ActiveLayerContext.Provider>
  );
}

// Helper component for mode switching
function ModeLink({ href, scenarioId, title, children }: { href: string, scenarioId: string, title: string, children: React.ReactNode }) {
  const pathname = usePathname();
  // Build full href: /scenario/[scenarioId] or /scenario/[scenarioId]/[subroute]
  const fullHref = href ? `/scenario/${scenarioId}/${href}` : `/scenario/${scenarioId}`;
  
  // Check if current path matches this mode
  const isActive = href 
    ? pathname.includes(`/${href}`) 
    : pathname === fullHref || (pathname.includes('/scenario/') && !pathname.includes('/grid-edit') && !pathname.includes('/chart-edit'));
  
  return (
    <Link 
      href={fullHref} 
      title={title}
      className={`p-1.5 rounded-md transition-colors ${isActive ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-background/50'}`}
    >
      {children}
    </Link>
  );
}