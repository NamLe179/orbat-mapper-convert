"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MyTabItem } from "@/components/types"; // Giả định type đã có

// --- Helper Hook: Thay thế useElementVisibility ---
function useIsVisible(ref: React.RefObject<HTMLElement | null>, initialValue = true) {
  const [isVisible, setIsVisible] = useState(initialValue);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.99 } // Trigger khi hiển thị gần như trọn vẹn
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
}

// --- Component ---

interface ScrollTabsProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  items: MyTabItem[];
  rightContent?: React.ReactNode; // Thay cho slot "right"
  className?: string;
}

export default function ScrollTabs({
  items,
  className,
  rightContent,
  children,
  value,
  onValueChange,
  defaultValue,
  ...props
}: ScrollTabsProps) {
  // 1. Normalizing Items
  const tabItems = useMemo(() => {
    return items.map((tab, index) => {
      if (typeof tab === "string") {
        return {
          label: tab,
          value: index.toString(),
          disabled: false,
        };
      } else {
        return {
          label: tab.label,
          value: tab.value ?? index.toString(),
          disabled: tab.disabled ?? false,
        };
      }
    });
  }, [items]);

  // 2. Scroll Logic Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTargetRef = useRef<HTMLDivElement>(null);
  const endTargetRef = useRef<HTMLDivElement>(null);

  // 3. Visibility State (để ẩn/hiện nút scroll)
  const startMarkerIsVisible = useIsVisible(startTargetRef, true);
  const endMarkerIsVisible = useIsVisible(endTargetRef, true);

  // 4. Handle Scroll Buttons
  const handleScroll = (offset: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  // 5. Auto-scroll to Active Tab (Logic tương đương watch modelValue)
  // Xác định value hiện tại (controlled hoặc uncontrolled)
  const currentTabValue = value; 

  useEffect(() => {
    if (!scrollRef.current) return;

    // Tìm tab đang active trong DOM
    const activeTab = scrollRef.current.querySelector(
      '[data-state="active"]'
    ) as HTMLElement;

    if (!activeTab) return;

    const container = scrollRef.current;
    const containerWidth = container.offsetWidth;
    const scrollLeft = container.scrollLeft;

    const leftBuffer = 40;
    const rightBuffer = 40;

    const tabLeft = activeTab.offsetLeft;
    const tabRight = tabLeft + activeTab.offsetWidth;

    // Logic tính toán vị trí scroll
    if (tabLeft < scrollLeft + leftBuffer) {
      container.scrollTo({ left: tabLeft - leftBuffer, behavior: "smooth" });
    } else if (tabRight > scrollLeft + containerWidth - rightBuffer) {
      container.scrollTo({
        left: tabRight - containerWidth + rightBuffer,
        behavior: "smooth",
      });
    }
  }, [currentTabValue, items]); // Chạy lại khi value đổi hoặc items đổi

  return (
    <TabsPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      className={cn("flex h-full flex-col", className)}
      {...props}
    >
      <div className="border-b-primary/20 flex shrink-0 items-center justify-between border-b">
        <div className="relative flex min-w-0 flex-1 overflow-hidden">
          {/* Button Scroll Left */}
          <button
            type="button"
            className="hover:text-foreground bg-muted/80 absolute inset-y-0 left-0 z-10 flex cursor-pointer items-center justify-center px-1 disabled:pointer-events-none disabled:opacity-0 transition-opacity"
            disabled={startMarkerIsVisible}
            aria-label="Scroll left"
            onClick={() => handleScroll(-120)}
          >
            <ChevronLeft className="text-muted-foreground size-6" />
          </button>

          {/* Scroll Container */}
          {/* Class 'no-scrollbar' cần được define trong globals.css hoặc dùng plugin tailwind-scrollbar-hide */}
          <div
            ref={scrollRef}
            className="no-scrollbar flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none]"
          >
            <TabsPrimitive.List className="relative flex w-max gap-0 px-2">
              {/* Start Sentinel */}
              <div
                ref={startTargetRef}
                className="absolute top-0 bottom-0 left-0 w-px pointer-events-none"
              />

              {/* Tab Items */}
              {tabItems.map(({ value: itemValue, label, disabled }) => (
                <TabsPrimitive.Trigger
                  key={itemValue}
                  value={itemValue}
                  disabled={disabled}
                  className={cn(
                    "data-[state=active]:text-primary hover:text-primary/90 text-muted-foreground",
                    "data-[state=active]:border-b-primary border-b-2 border-transparent",
                    "px-3 py-4 text-sm font-medium whitespace-nowrap",
                    "focus-visible:outline-1 focus-visible:outline-dashed",
                    "disabled:pointer-events-none disabled:opacity-50 sm:py-3.5"
                  )}
                >
                  {label}
                </TabsPrimitive.Trigger>
              ))}

              {/* End Sentinel */}
              <div ref={endTargetRef} className="w-4 flex-none pointer-events-none" />
            </TabsPrimitive.List>
          </div>

          {/* Button Scroll Right */}
          <button
            type="button"
            className="hover:text-foreground bg-muted/80 absolute inset-y-0 right-0 z-10 flex cursor-pointer items-center justify-center px-1 disabled:pointer-events-none disabled:opacity-0 transition-opacity"
            disabled={endMarkerIsVisible}
            aria-label="Scroll right"
            onClick={() => handleScroll(120)}
          >
            <ChevronRight className="text-muted-foreground size-6" />
          </button>
        </div>

        {/* Right Content Slot */}
        {rightContent}
      </div>

      <div className="flex-auto overflow-y-auto">
        {children}
      </div>
    </TabsPrimitive.Root>
  );
}