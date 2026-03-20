"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Triangle } from "lucide-react";
import { utcDay, utcHour } from "d3-time";
import { utcFormat } from "d3-time-format";
import { interpolateOranges } from "d3-scale-chromatic";
import { scaleSequential } from "d3-scale";
import { throttle } from "lodash";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { useStore } from "zustand";
import { useStoreWithEqualityFn } from "zustand/traditional";

// Project Imports
import { useActiveScenario } from "@/hooks/scenarioUtils";
import { type NScenarioEvent } from "@/types/internalModels";
import { useTimeFormatStore } from "@/stores/timeFormatStore";
import TimelineContextMenu from "@/components/TimelineContextMenu"; // Giả định đã convert
import { useSelectedItems } from "@/stores/selectedStore";
import { cn } from "@/lib/utils";

// --- Constants ---
const MS_PER_HOUR = 3600 * 1000;

dayjs.extend(utc);
dayjs.extend(timezone);

// --- Helper Hook: useElementSize ---
function useElementSize<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}

// --- Formatters ---
const hourFormatter = utcFormat("%H");

function getMinorFormatter(majorWidth: number) {
  if (majorWidth < 50) return () => "";
  return hourFormatter;
}

function getMajorFormatter(majorWidth: number) {
  if (majorWidth < 100) return utcFormat("%d %b");
  return utcFormat("%a %d %b");
}

// --- Types ---
interface Tick {
  label: string;
  timestamp: number;
}

// --- Main Component ---
export default function ScenarioTimeline() {
  // --- Hooks ---
  const {
    time: {
      setCurrentTime,
      timeZone,
      computeTimeHistogram,
      goToScenarioEvent,
      addScenarioEvent,
    },
    store,
  } = useActiveScenario();
  
  const fmt = useTimeFormatStore();
  const { setActiveScenarioEventId } = useSelectedItems();
  const currentScenarioTimestamp = useStoreWithEqualityFn(
    store._store,
    (s) => s.currentTime,
    Object.is,
  );
  const currentScenarioDayAnchor = useStore(
    store._store,
    (s) => +utcDay.floor(new Date(s.currentTime)),
  );
  const unitStateCounter = useStore(store._store, (s) => s.unitStateCounter);
  const featureStateCounter = useStore(store._store, (s) => s.featureStateCounter);
  const events = useStore(store._store, (s) => s.events);
  const eventMap = useStore(store._store, (s) => s.eventMap);

  // --- Element & Size ---
  const { ref: elRef, width } = useElementSize();

  // --- Local State ---
  const [isDraggingUi, setIsDraggingUi] = useState(false);
  const [jumpOffset, setJumpOffset] = useState(0);
  const [previewTimestamp, setPreviewTimestamp] = useState<number | null>(null);
  const [majorWidth, setMajorWidth] = useState(100);
  
  const [hoveredX, setHoveredX] = useState(0);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [showHoverMarker, setShowHoverMarker] = useState(false);
  
  const [animate, setAnimate] = useState(false);

  // --- Derived State (Computed) ---
  
  const scenarioTime = useMemo(
    () => dayjs(currentScenarioTimestamp).tz(timeZone || "UTC"),
    [currentScenarioTimestamp, timeZone],
  );
  const tzOffset = useMemo(() => scenarioTime.utcOffset(), [scenarioTime]);

  // Histogram Data (Compute on updates)
  const { histogram, max: maxCount } = useMemo(() => {
    // Trigger histogram re-calc only when state counters change.
    const _trigger = unitStateCounter + featureStateCounter;
    return computeTimeHistogram();
  }, [unitStateCounter, featureStateCounter, computeTimeHistogram]);

  const countColor = useMemo(
    () => scaleSequential(interpolateOranges).domain([1, maxCount]),
    [maxCount]
  );

  // Steps & Widths
  const minorStep = useMemo(() => {
    if (majorWidth < 100) return 12;
    if (majorWidth < 180) return 6;
    if (majorWidth < 300) return 4;
    if (majorWidth < 500) return 2;
    return 1;
  }, [majorWidth]);

  const minorWidth = majorWidth / (24 / minorStep);

  // --- Core Calculation: Tick/Grid Geometry ---
  const timelineGrid = useMemo(() => {
    if (!width) return { 
        majorTicks: [], 
        minorTicks: [], 
        timelineWidth: 0, 
        startTs: 0,
        endTs: 0,
    };

    // Keep grid stable while currentTime moves within the same UTC day.
    const centerTime = new Date(currentScenarioDayAnchor);
    const dayPadding = Math.ceil((width * 2) / majorWidth);
    const currentUtcDay = utcDay.floor(centerTime);
    const start = utcDay.offset(currentUtcDay, -dayPadding);
    const end = utcDay.offset(currentUtcDay, dayPadding);

    const majorFormatter = getMajorFormatter(majorWidth);
    const minorFormatter = getMinorFormatter(majorWidth);

    const majorTicks: Tick[] = utcDay.range(start, end).map((d) => ({
      label: majorFormatter(d),
      timestamp: +d,
    }));

    const minorTicks: Tick[] = utcHour.range(start, end, minorStep).map((d) => ({
      label: minorFormatter(d),
      timestamp: +d,
    }));

    return {
      majorTicks,
      minorTicks,
      timelineWidth: majorTicks.length * majorWidth,
      startTs: +start,
      endTs: +end,
    };
  }, [
    width,
    majorWidth,
    minorStep,
    currentScenarioDayAnchor,
  ]);

  const eventsWithX = useMemo(() => {
    const { startTs, endTs } = timelineGrid;
    if (!startTs && !endTs) return [];

    const msPerPixel = majorWidth / (MS_PER_HOUR * 24);
    return events
      .map((id: string) => eventMap[id])
      .filter((e: any) => e && e.startTime >= startTs && e.startTime <= endTs)
      .map((event: any) => ({
        x: (event.startTime - startTs + tzOffset * 60 * 1000) * msPerPixel,
        event,
      }));
  }, [timelineGrid, majorWidth, events, eventMap, tzOffset]);

  const binsWithX = useMemo(() => {
    const { startTs, endTs } = timelineGrid;
    if (!startTs && !endTs) return [];

    const msPerPixel = majorWidth / (MS_PER_HOUR * 24);
    return histogram
      .filter((bin) => bin.t >= startTs && bin.t <= endTs)
      .map((bin) => ({
        x: (bin.t - startTs + tzOffset * 60 * 1000) * msPerPixel,
        count: bin.count,
      }));
  }, [timelineGrid, majorWidth, histogram, tzOffset]);

  const displayTimestamp = previewTimestamp ?? currentScenarioTimestamp;

  const baseXOffset = useMemo(() => {
    if (!width) return 0;
    const tt = new Date(displayTimestamp);
    const pixelsPerMinute = majorWidth / (24 * 60);
    const timeInMinutes =
      tt.getUTCHours() * 60 + tt.getUTCMinutes() + tzOffset + tt.getUTCSeconds() / 60;
    return timeInMinutes * pixelsPerMinute * -1;
  }, [width, displayTimestamp, majorWidth, tzOffset]);

  const totalXOffset = baseXOffset + jumpOffset;

  const { majorTicks, minorTicks, timelineWidth } = timelineGrid;

  // --- Interaction Logic ---

  // Calculate Date from Pixel X
  const calculatePixelDate = useCallback((x: number) => {
    if (!width) return { date: new Date(), diff: 0 };
    const center = width / 2;
    const msPerPixel = (MS_PER_HOUR * 24) / majorWidth;
    
    const baseTime = currentScenarioTimestamp;
    
    const diff = x - center;
    const newDateTs = baseTime + diff * msPerPixel;
    const date = new Date(newDateTs);
    date.setUTCSeconds(0, 0);
    return { date, diff };
  }, [width, majorWidth, currentScenarioTimestamp]);

  // Throttled Time Update
  const throttledSetCurrentTime = useCallback(
    throttle((ts: number) => {
      setCurrentTime(ts);
    }, 16), // ~60fps
    [setCurrentTime]
  );

  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startTimestamp: 0,
    didDrag: false,
  });
  const isPointerInteractionRef = useRef(false);

  const onPointerDown = (evt: React.PointerEvent) => {
    // Keep right-click free for Radix ContextMenu trigger.
    if (evt.button === 2) return;

    const el = elRef.current;
    if (!el) return;

    throttledSetCurrentTime.cancel();
    
    dragStateRef.current.startX = evt.clientX;
    dragStateRef.current.startTimestamp = currentScenarioTimestamp;
    dragStateRef.current.didDrag = false;
    dragStateRef.current.isDragging = false;
    setPreviewTimestamp(currentScenarioTimestamp);
    setJumpOffset(0);
    
    el.setPointerCapture(evt.pointerId);
    isPointerInteractionRef.current = true;
    setIsDraggingUi(false);
    setAnimate(false); // Disable transition during drag
  };

  const onPointerMove = (evt: React.PointerEvent) => {
    if (isPointerInteractionRef.current) {
      const diff = evt.clientX - dragStateRef.current.startX;

      if (!dragStateRef.current.didDrag && Math.abs(diff) < 5) {
        setIsDraggingUi(false);
        return;
      } else {
        dragStateRef.current.didDrag = true;
        dragStateRef.current.isDragging = true;
        setIsDraggingUi(true);
      }

      const msPerPixel = (MS_PER_HOUR * 24) / majorWidth;
      const newTs = Math.floor(dragStateRef.current.startTimestamp - diff * msPerPixel);
      setPreviewTimestamp(newTs);
      throttledSetCurrentTime(newTs);
    }
  };

  const onPointerUp = (evt: React.PointerEvent) => {
    if (!isPointerInteractionRef.current) return;

    const el = elRef.current;
    if (el?.hasPointerCapture(evt.pointerId)) {
      el.releasePointerCapture(evt.pointerId);
    }

    const finalDiff = evt.clientX - dragStateRef.current.startX;
    const didDrag = dragStateRef.current.didDrag || Math.abs(finalDiff) >= 5;

    if (!didDrag && evt.button !== 2) {
      // Click interaction (Jump to time)
      const { date, diff } = calculatePixelDate(evt.clientX);
      
      setAnimate(true); // Enable transition for jump
      setPreviewTimestamp(null);
      setJumpOffset(-diff); // Visual offset adjustment

      // Round to nearest 15 mins
      date.setUTCMinutes(Math.round(date.getUTCMinutes() / 15) * 15);
      setCurrentTime(date.valueOf());
    } else {
        const msPerPixel = (MS_PER_HOUR * 24) / majorWidth;
        const finalTs = Math.floor(dragStateRef.current.startTimestamp - finalDiff * msPerPixel);

        throttledSetCurrentTime.cancel();
        setCurrentTime(finalTs);

        setAnimate(false);
        setPreviewTimestamp(finalTs);
        setJumpOffset(0);
    }

    isPointerInteractionRef.current = false;
    setIsDraggingUi(false);
    dragStateRef.current.isDragging = false;
    dragStateRef.current.didDrag = false;
  };

  const onPointerCancel = (evt: React.PointerEvent) => {
    if (!isPointerInteractionRef.current) return;

    const el = elRef.current;
    if (el?.hasPointerCapture(evt.pointerId)) {
      el.releasePointerCapture(evt.pointerId);
    }

    throttledSetCurrentTime.cancel();
    setAnimate(false);
    setPreviewTimestamp(null);
    setJumpOffset(0);
    isPointerInteractionRef.current = false;
    setIsDraggingUi(false);
    dragStateRef.current.isDragging = false;
    dragStateRef.current.didDrag = false;
  };

  // Reset Animation after jump
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setAnimate(false);
        setJumpOffset(0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [animate]);

  useEffect(() => {
    return () => {
      throttledSetCurrentTime.cancel();
    };
  }, [throttledSetCurrentTime]);

  useEffect(() => {
    if (!isDraggingUi && previewTimestamp !== null && previewTimestamp === currentScenarioTimestamp) {
      setPreviewTimestamp(null);
    }
  }, [isDraggingUi, previewTimestamp, currentScenarioTimestamp]);

  const onHover = (e: React.MouseEvent) => {
    const { date } = calculatePixelDate(e.clientX);
    date.setUTCMinutes(Math.round(date.getUTCMinutes() / 15) * 15);
    setHoveredX(e.clientX);
    setHoveredDate(date);
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      setMajorWidth((prev) => Math.max(prev - 40, 55));
    } else {
      setMajorWidth((prev) => prev + 40);
    }
  };

  const onContextMenuAction = (action: string) => {
    if (action === "zoomIn") {
      setMajorWidth((prev) => prev + 40);
    } else if (action === "zoomOut") {
      setMajorWidth((prev) => Math.max(prev - 40, 55));
    } else if (action === "addScenarioEvent" && hoveredDate) {
      const day = hoveredDate.getDate();
      const eventId = addScenarioEvent({
        title: `Event ${day}`,
        startTime: +hoveredDate,
      });
      // Giả định store.selectedItems có method setActiveScenarioEventId
      if (setActiveScenarioEventId) setActiveScenarioEventId(eventId);
    }
  };

  const formattedHoveredDate = hoveredDate
    ? (fmt as any).formatScenarioTime?.(+hoveredDate) ?? new Date(+hoveredDate).toLocaleString()
    : "";

  return (
    <TimelineContextMenu
      onAction={onContextMenuAction}
      formattedHoveredDate={formattedHoveredDate}
    >
      <div
        ref={elRef}
        className="bg-background border-border relative w-full transform overflow-x-hidden border-t text-sm transition-all select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerMove={onPointerMove}
        onWheel={onWheel}
        onMouseMove={onHover}
        onMouseEnter={() => setShowHoverMarker(true)}
        onMouseLeave={() => setShowHoverMarker(false)}
      >
          {/* Center Indicator */}
          <div className="bg-background flex h-3.5 items-center justify-center overflow-clip">
            <Triangle className="h-4 w-4 rotate-180 fill-red-900 text-red-900" />
          </div>

          {/* Scrolling Container */}
          <div
            className={cn(
              "touch-none text-sm select-none",
              animate ? "transition-all duration-100 ease-out" : "transition-none"
            )}
            style={{ transform: `translate(${totalXOffset}px, 0)` }}
          >
            {/* Histogram & Events */}
            <div className="flex justify-center">
              <div
                className="relative h-4 flex-none text-center"
                style={{ width: `${timelineWidth}px` }}
              >
                {/* Histogram Bars */}
                {binsWithX.map(({ x, count }: { x: number; count: number }, idx: number) => (
                  <div
                    key={`bin-${x}-${idx}`}
                    className="absolute top-1 h-2 w-4 rounded border border-gray-500"
                    style={{
                      left: `${x}px`,
                      width: `${Math.max(majorWidth / 24, 8)}px`,
                      backgroundColor: countColor(count) as unknown as string,
                    }}
                    onMouseMove={(e) => e.stopPropagation()}
                    title={`${count} unit events`}
                  />
                ))}

                {/* Events Dots */}
                {eventsWithX.map(({ x, event }: { x: number; event: any }) => (
                  <div
                    key={event.id}
                    role="button"
                    className="absolute h-4 w-4 -translate-x-1/2 cursor-pointer rounded-full border border-orange-600 hover:bg-red-900"
                    style={{ left: `${x}px`, backgroundColor: '#f59e0b' }}
                    onMouseMove={(e) => e.stopPropagation()}
                    title={event.title}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToScenarioEvent(event);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Spacer */}
            <div className="flex justify-center">
              <div
                className="relative flex-none text-center"
                style={{ width: `${timelineWidth}px` }}
              />
            </div>

            {/* Major Ticks */}
            <div className="border-muted-foreground flex justify-center">
              {majorTicks.map((tick) => (
                <div
                  key={`major-${tick.timestamp}`}
                  className="border-muted-foreground flex-none border-r border-b pl-0.5"
                  style={{ width: `${majorWidth}px` }}
                >
                  {tick.label}
                </div>
              ))}
            </div>

            {/* Minor Ticks */}
            <div className="flex justify-center text-xs">
              {minorTicks.map((tick) => (
                <div
                  key={`minor-${tick.timestamp}`}
                  className="text-muted-foreground border-muted-foreground min-h-[1rem] flex-none border-r pl-0.5"
                  style={{ width: `${minorWidth}px` }}
                >
                  {tick.label}
                </div>
              ))}
            </div>
          </div>

          {/* Hover Marker */}
          {showHoverMarker && !isDraggingUi && (
            <p className="absolute top-0 right-1 hidden p-0 text-xs text-red-900 select-none sm:block dark:text-red-600">
              {formattedHoveredDate}
            </p>
          )}
          {showHoverMarker && (
            <div
              className="hover-hover:flex absolute top-0 bottom-0 w-0.5 bg-red-900/50 dark:bg-red-600/50 pointer-events-none"
              style={{ left: `${hoveredX}px` }}
            />
          )}
        </div>
    </TimelineContextMenu>
  );
}