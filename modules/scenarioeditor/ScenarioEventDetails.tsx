"use client";

import React, { useState, useMemo, useEffect } from "react";

// Types & Stores
import { type EntityId } from "@/types/base";
import { type ScenarioEventAction } from "@/types/constants";
import { type MediaUpdate, ScenarioEventUpdate } from "@/types/internalModels";
import { useUiStore } from "@/stores/uiStore";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { useSelectedItems } from "@/stores/selectedStore";

// Hooks & Utils
import { useActiveScenario, useTimeModal } from "@/components/injects";
import { renderMarkdown } from "@/hooks/formatting";

// Components
import EditableLabel from "@/components/EditableLabel";
import ScenarioEventDropdownMenu from "@/modules/scenarioeditor/ScenarioEventDropdownMenu";
import ItemMedia from "@/modules/scenarioeditor/ItemMedia";
import ScrollTabs from "@/components/ScrollTabs";
import { TabsContent } from "@/components/ui/tabs";
import EditMetaForm from "@/modules/scenarioeditor/EditMetaForm";
import EditMediaForm from "@/modules/scenarioeditor/EditMediaForm";
import DescriptionItem from "@/components/DescriptionItem";

interface Props {
  eventId: EntityId;
}

export default function ScenarioEventDetails({ eventId }: Props) {
  // --- Context & Stores ---
  const { time, store, unitActions } = useActiveScenario();
  const { getModalTimestamp } = useTimeModal();
  const ui = useUiStore();
  const fmt = useTimeFormatters();
  const { clear: clearSelected, setActiveScenarioEventId } = useSelectedItems();

  // --- Local State ---
  const [title, setTitle] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [isEditMediaMode, setIsEditMediaMode] = useState(false);
  const [selectedTab, setSelectedTab] = useState("0");

  // --- Computed (useMemo) ---
  const scenarioEvent = useMemo(() => time.getEventById(eventId), [time, eventId]);

  const formattedEventTime = useMemo(() => {
    return fmt.scenarioFormatter.format(scenarioEvent?.startTime ?? 0);
  }, [fmt.scenarioFormatter, scenarioEvent?.startTime]);

  const media = useMemo(() => scenarioEvent?.media?.[0], [scenarioEvent]);

  const hDescription = useMemo(() => 
    renderMarkdown(scenarioEvent?.description || ""), 
    [scenarioEvent?.description]
  );

  const tabList = useMemo(() => {
    const base = [{ label: "Details", value: "0" }];
    if (ui.debugMode) {
      base.push({ label: "Debug", value: "1" });
    }
    return base;
  }, [ui.debugMode]);

  // --- Watchers (useEffect) ---
  useEffect(() => {
    setTitle(scenarioEvent?.title ?? "");
  }, [eventId, scenarioEvent]);

  // Handle event subscription (onGoToScenarioEventEvent)
  useEffect(() => {
    const unsubscribe = time.onGoToScenarioEventEvent(({ event }) => {
      if (event.id !== eventId) {
        setActiveScenarioEventId(event.id);
      }
    });
    return () => {
      unsubscribe?.off();
    };
  }, [eventId, time, setActiveScenarioEventId]);

  // --- Handlers ---
  const onAction = async (action: ScenarioEventAction) => {
    switch (action) {
      case "changeTime":
        const newTimestamp = await getModalTimestamp(scenarioEvent.startTime, {
          timeZone: store.state.info.timeZone,
          title: "Set scenario event time",
        });
        if (newTimestamp !== undefined) {
          time.updateScenarioEvent(eventId, { startTime: newTimestamp });
        }
        break;
      case "delete":
        time.deleteScenarioEvent(eventId);
        clearSelected();
        break;
      case "editMeta":
        setIsEditMode(true);
        break;
      case "editMedia":
        setIsEditMediaMode(true);
        break;
    }
  };

  const updateMedia = (mediaUpdate: MediaUpdate) => {
    if (!mediaUpdate || !scenarioEvent) return;
    const { media: existingMedia = [] } = scenarioEvent;
    const newMedia = { ...existingMedia[0], ...mediaUpdate };
    time.updateScenarioEvent(eventId, { media: [newMedia] });
    setIsEditMediaMode(false);
  };

  const onFormSubmit = (eventUpdate: ScenarioEventUpdate) => {
    time.updateScenarioEvent(eventId, eventUpdate);
    setIsEditMode(false);
  };

  if (!scenarioEvent) return null;

  return (
    <div key={scenarioEvent.id} className="p-1">
      {media && <ItemMedia media={media} />}
      
      <header className="">
        <EditableLabel 
          value={title} 
          onChange={setTitle}
          onUpdateValue={(val) => time.updateScenarioEvent(eventId, { title: val })} 
        />
        <nav className="flex items-center justify-between">
          <div className="text-sm font-medium">{formattedEventTime}</div>
          <ScenarioEventDropdownMenu onAction={onAction} />
        </nav>
      </header>

      <div className="-mx-4">
        <ScrollTabs items={tabList} value={selectedTab} onValueChange={setSelectedTab}>
          <TabsContent value="0" className="mx-4 pt-4">
            {isEditMode ? (
              <EditMetaForm
                item={scenarioEvent}
                onUpdate={onFormSubmit}
                onCancel={() => setIsEditMode(false)}
              />
            ) : isEditMediaMode ? (
              <EditMediaForm
                media={media}
                onCancel={() => setIsEditMediaMode(false)}
                onUpdate={updateMedia}
              />
            ) : (
              <div className="">
                {scenarioEvent.description && (
                  <div 
                    className="prose prose-sm dark:prose-invert" 
                    dangerouslySetInnerHTML={{ __html: hDescription }} 
                  />
                )}
                {scenarioEvent.externalUrl && (
                  <DescriptionItem
                    label="External URL"
                    ddClass="truncate"
                    className="mt-4"
                  >
                    <a
                      target="_blank"
                      draggable={false}
                      className="underline"
                      href={scenarioEvent.externalUrl}
                    >
                      {scenarioEvent.externalUrl}
                    </a>
                  </DescriptionItem>
                )}
              </div>
            )}
          </TabsContent>
          
          {ui.debugMode && (
            <TabsContent value="1" className="mx-4">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(scenarioEvent, null, 2)}
              </pre>
            </TabsContent>
          )}
        </ScrollTabs>
      </div>
    </div>
  );
}