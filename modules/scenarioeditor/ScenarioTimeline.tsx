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

// Project Imports
import { useActiveScenario } from "@/hooks/scenarioUtils";
import { type NScenarioEvent } from "@/types/internalModels";
import { useTimeFormatStore } from "@/stores/timeFormatStore";
import TimelineContextMenu from "@/components/TimelineContextMenu"; // Giả định đã convert
import { useSelectedItems } from "@/stores/selectedStore";
import { cn } from "@/lib/utils";

// --- Constants ---
const MS_PER_HOUR = 3600 * 1000;

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
  const { activeScenarioEventId, setActiveScenarioEventId } = useSelectedItems();

  // --- Element & Size ---
  const { ref: elRef, width } = useElementSize();

  // --- Local State ---
  const [isPointerInteraction, setIsPointerInteraction] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedDiff, setDraggedDiff] = useState(0);
  const [majorWidth, setMajorWidth] = useState(100);
  
  const [hoveredX, setHoveredX] = useState(0);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [showHoverMarker, setShowHoverMarker] = useState(false);
  
  const [animate, setAnimate] = useState(false);

  // --- Derived State (Computed) ---
  
  const currentScenarioTimestamp = store.state.currentTime;
  const scenarioTime = useMemo(() => {
    const dayjs = require('dayjs');
    const utc = require('dayjs/plugin/utc');
    const timezone = require('dayjs/plugin/timezone');
    dayjs.extend(utc);
    dayjs.extend(timezone);
    return dayjs(currentScenarioTimestamp).tz(timeZone || 'UTC');
  }, [currentScenarioTimestamp, timeZone]);
  const tzOffset = useMemo(() => scenarioTime.utcOffset(), [scenarioTime]);

  // Histogram Data (Compute on updates)
  const { histogram, max: maxCount } = useMemo(() => {
    // Dependency vào unitStateCounter/featureStateCounter để trigger recalculate
    const _trigger = store.state.unitStateCounter + store.state.featureStateCounter;
    return computeTimeHistogram();
  }, [store.state.unitStateCounter, store.state.featureStateCounter, computeTimeHistogram]);

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

  // --- Core Calculation: Ticks ---
  // Tính toán Ticks dựa trên centerTime hiện tại và width container
  // React Strategy: Tính toán trực tiếp trong render/memo thay vì watchEffect update state riêng lẻ
  const timelineCalculations = useMemo(() => {
    if (!width) return { 
        majorTicks: [], 
        minorTicks: [], 
        eventsWithX: [], 
        binsWithX: [], 
        timelineWidth: 0, 
        totalXOffset: 0,
        minDate: new Date(),
        maxDate: new Date(),
        centerTimeStamp: 0
    };

    // 1. Calculate Center & Offset
    // Nếu đang drag, offset sẽ được cộng thêm draggedDiff. 
    // Tuy nhiên, logic Vue gốc dùng xOffset tĩnh + draggedDiff động.
    
    // Tính toán lại xOffset chuẩn dựa trên currentTime (nếu không drag)
    const tt = new Date(currentScenarioTimestamp);
    
    // Công thức từ Vue:
    // (Total Minutes + Offset + Seconds) * (Pixels Per Minute) * -1
    const pixelsPerMinute = majorWidth / (24 * 60);
    const timeInMinutes = tt.getUTCHours() * 60 + tt.getUTCMinutes() + tzOffset + tt.getUTCSeconds() / 60;
    
    const calculatedXOffset = timeInMinutes * pixelsPerMinute * -1;
    
    // Trong React, ta dùng giá trị này làm base, cộng thêm drag
    const totalXOffset = calculatedXOffset + draggedDiff;

    // 2. Generate Ticks
    // Dùng chính thời gian hiện tại làm center để tạo ticks xung quanh
    const centerTime = new Date(currentScenarioTimestamp);
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

    // 3. Map Events & Histogram to X coordinates
    const minTs = +start;
    const maxTs = +end;
    const msPerPixel = majorWidth / (MS_PER_HOUR * 24);

    const eventsList = store.state.events.map((id: string) => store.state.eventMap[id]);
    
    const eventsWithX = eventsList
      .filter((e: any) => e.startTime >= minTs && e.startTime <= maxTs)
      .map((event: any) => ({
        x: (event.startTime - minTs + tzOffset * 60 * 1000) * msPerPixel,
        event,
      }));

    const binsWithX = histogram
      .filter((bin) => bin.t >= minTs && bin.t <= maxTs)
      .map((bin) => ({
        x: (bin.t - minTs + tzOffset * 60 * 1000) * msPerPixel,
        count: bin.count,
      }));

    return {
      majorTicks,
      minorTicks,
      eventsWithX,
      binsWithX,
      timelineWidth: majorTicks.length * majorWidth,
      totalXOffset,
      minDate: start,
      maxDate: end,
      centerTimeStamp: currentScenarioTimestamp
    };
  }, [
    width, 
    majorWidth, 
    minorStep, 
    currentScenarioTimestamp, 
    tzOffset, 
    store.state.events, 
    store.state.eventMap, 
    histogram, 
    draggedDiff
  ]);

  const { 
      majorTicks, 
      minorTicks, 
      eventsWithX, 
      binsWithX, 
      timelineWidth, 
      totalXOffset,
      centerTimeStamp // Snapshot thời điểm render để tính ngược tọa độ drag
  } = timelineCalculations;

  // --- Interaction Logic ---

  // Calculate Date from Pixel X
  const calculatePixelDate = useCallback((x: number) => {
    if (!width) return { date: new Date(), diff: 0 };
    const center = width / 2;
    const msPerPixel = (MS_PER_HOUR * 24) / majorWidth;
    
    // Vue logic uses centerTimeStamp ref which updates on render. 
    // Here use the one from calculation or current
    const baseTime = centerTimeStamp; 
    
    const diff = x - center;
    const newDateTs = baseTime + diff * msPerPixel;
    const date = new Date(newDateTs);
    date.setUTCSeconds(0, 0);
    return { date, diff };
  }, [width, majorWidth, centerTimeStamp]);

  // Throttled Time Update
  const throttledSetCurrentTime = useCallback(
    throttle((ts: number) => {
      setCurrentTime(ts);
    }, 16), // ~60fps
    [setCurrentTime]
  );

  // Pointer Refs needed for drag calculation preservation between renders
  const dragRef = useRef({ startX: 0, startTimestamp: 0, accumulatedDrag: 0 });

  const onPointerDown = (evt: React.PointerEvent) => {
    const el = elRef.current;
    if (!el) return;
    
    dragRef.current.startX = evt.clientX;
    dragRef.current.startTimestamp = scenarioTime.valueOf();
    dragRef.current.accumulatedDrag = 0;
    
    el.setPointerCapture(evt.pointerId);
    setIsPointerInteraction(true);
    setIsDragging(false);
    setAnimate(false); // Disable transition during drag
  };

  const onPointerMove = (evt: React.PointerEvent) => {
    if (isPointerInteraction) {
      const diff = evt.clientX - dragRef.current.startX;
      dragRef.current.accumulatedDrag += Math.abs(diff);

      if (dragRef.current.accumulatedDrag < 5) {
        setIsDragging(false);
        return;
      } else {
        setIsDragging(true);
      }

      setDraggedDiff(diff);

      const msPerPixel = (MS_PER_HOUR * 24) / majorWidth;
      const newTs = Math.floor(dragRef.current.startTimestamp - diff * msPerPixel);
      throttledSetCurrentTime(newTs);
    }
  };

  const onPointerUp = (evt: React.PointerEvent) => {
    if (!isDragging && evt.button !== 2) {
      // Click interaction (Jump to time)
      const { date, diff } = calculatePixelDate(evt.clientX);
      
      setAnimate(true); // Enable transition for jump
      setDraggedDiff(-diff); // Visual offset adjustment

      // Round to nearest 15 mins
      date.setUTCMinutes(Math.round(date.getUTCMinutes() / 15) * 15);
      setCurrentTime(date.valueOf());
    } else {
        // End Drag
        setAnimate(false);
        setDraggedDiff(0);
    }

    setIsPointerInteraction(false);
    setIsDragging(false);
    dragRef.current.accumulatedDrag = 0;
  };

  // Reset Animation after jump
  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setAnimate(false);
        setDraggedDiff(0);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [animate]);

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
                  <button
                    key={event.id}
                    type="button"
                    className="absolute h-4 w-4 -translate-x-1/2 rounded-full border border-gray-500 bg-amber-500 hover:bg-red-900"
                    style={{ left: `${x}px` }}
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
          {showHoverMarker && !isDragging && (
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