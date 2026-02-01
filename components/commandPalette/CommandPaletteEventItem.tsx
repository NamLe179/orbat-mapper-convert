"use client";

import React from "react";
import { type EventSearchResult } from "@/components/types";
import { CalendarClock } from "lucide-react";
import { useActiveScenario } from "@/components/injects"; 
import { formatDateString } from "@/geo/utils";

interface CommandPaletteEventItemProps {
  item: EventSearchResult;
}

export default function CommandPaletteEventItem({ item }: CommandPaletteEventItemProps) {
  // Lấy data từ Context (tương đương injectStrict)
  const { time } = useActiveScenario();
  const { timeZone } = time;

  return (
    <>
      <div className="flex w-7 justify-center">
        <CalendarClock className="text-muted-foreground h-6 w-6" />
      </div>
      
      <p
        className="ml-3 flex-auto truncate"
        dangerouslySetInnerHTML={{
          __html: item.highlight ? item.highlight : item.name,
        }}
      />
      
      <p className="shrink-0 text-xs font-medium">
        {formatDateString(item.startTime, timeZone).split("T")[0]}
      </p>
    </>
  );
}