"use client";

import React, { useMemo } from "react";

// Stores & Hooks
import { useActiveScenario, useTimeModal } from "@/components/injects";
import { useTimeFormatters } from "@/stores/timeFormatStore";
import { useSelectedItems } from "@/stores/selectedStore";

// Types
import type { NScenarioEvent } from "@/types/internalModels";
import type { ScenarioEventAction } from "@/types/constants";

// Components
import PanelHeading from "@/components/PanelHeading";
import ScenarioEventDropdownMenu from "@/modules/scenarioeditor/ScenarioEventDropdownMenu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  selectOnly?: boolean;
  hideDropdown?: boolean;
  onEventClick?: (event: NScenarioEvent) => void;
}

export default function ScenarioEventsPanel({
  selectOnly = false,
  hideDropdown = false,
  onEventClick: emitEventClick,
}: Props) {
  // --- Context & Stores ---
  const {
    store,
    time: { goToScenarioEvent, deleteScenarioEvent, updateScenarioEvent, addScenarioEvent },
  } = useActiveScenario();
  
  const { getModalTimestamp } = useTimeModal();
  const { activeScenarioEventId } = useSelectedItems();
  const fmt = useTimeFormatters();

  // --- Computed (useMemo) ---
  const events = useMemo(() => {
    return store.state.events.map((id) => store.state.eventMap[id]);
  }, [store.state.events, store.state.eventMap]);

  const t = store.state.currentTime;

  // --- Handlers ---
  const handleEventClick = (event: NScenarioEvent) => {
    if (!selectOnly) {
      goToScenarioEvent(event);
    }
    emitEventClick?.(event);
  };

  const onAction = async (action: ScenarioEventAction, eventId: string) => {
    const scenarioEvent = store.state.eventMap[eventId];
    if (!scenarioEvent) return;

    switch (action) {
      case "changeTime":
        const newTimestamp = await getModalTimestamp(scenarioEvent.startTime, {
          timeZone: store.state.info.timeZone,
          title: "Set scenario event time",
        });
        if (newTimestamp !== undefined) {
          updateScenarioEvent(eventId, { startTime: newTimestamp });
        }
        break;
      case "delete":
        deleteScenarioEvent(eventId);
        break;
      default:
        break;
    }
  };

  const addEvent = () => {
    const day = new Date(t).getDate();
    const newEventId = addScenarioEvent({
      title: `Event ${day}`,
      startTime: t,
    });
    // Giả định activeScenarioEventId là một writable atom/state
    // activeScenarioEventId.value = newEventId; 
  };

  return (
    <div className="p-0.5">
      <PanelHeading>Scenario events</PanelHeading>

      

      <div className="flow-root">
        <ul className="mt-4">
          {events.map((event, eventIdx) => (
            <li key={event.id} className="group flex">
              <div className="relative flex-auto pb-4">
                {/* Timeline Connector Line */}
                {eventIdx !== events.length - 1 && (
                  <span
                    className="bg-muted-foreground/30 absolute top-2 left-2 -ml-px h-full w-0.5"
                    aria-hidden="true"
                  />
                )}
                
                <div className="relative flex space-x-4">
                  {/* Timeline Dot Indicator */}
                  <button
                    onClick={() => handleEventClick(event)}
                    className={cn(
                      "z-10 mt-1 flex size-4 items-center justify-center rounded-full ring-2 ring-orange-300 transition-colors bg-orange-400",
                      event.startTime > t && "!bg-amber-300",
                      event.startTime < t && "!bg-orange-500",
                      event.startTime === t && "!bg-orange-600"
                     )}
                  />

                  {/* Event Content */}
                  <div
                    className="min-w-0 flex-1 cursor-pointer text-sm"
                    onClick={() => handleEventClick(event)}
                  >
                    <p className="text-muted-foreground text-xs font-medium">
                      {fmt.scenarioDateFormatter.format(event.startTime)}
                    </p>
                    <p className="font-medium">{event.title}</p>
                    {event.subTitle && (
                      <p className="text-muted-foreground text-xs">{event.subTitle}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Menu */}
              {!hideDropdown && (
                <div className="opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
                  <ScenarioEventDropdownMenu 
                    hideEdit 
                    onAction={(action) => onAction(action, event.id)} 
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {!selectOnly && (
        <Button
          size="sm"
          variant="secondary"
          onClick={addEvent}
          className="mt-4 w-full sm:w-auto"
        >
          Add scenario event
        </Button>
      )}
    </div>
  );
}