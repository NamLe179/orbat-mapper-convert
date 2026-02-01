"use client";

import React from "react";
import Link from "next/link";
import DotsMenu from "@/components/DotsMenu";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { type ScenarioMetadata } from "@/scenariostore/localdb";
import { type MenuItemData } from "@/components/types";
import { type StoredScenarioAction } from "@/types/constants";
import { MAP_EDIT_MODE_ROUTE } from "@/router/name"; // Giả định file constants

// Helper format time (Thay thế @vueuse/core formatTimeAgo)
// Bạn có thể thay bằng date-fns: formatDistanceToNow(new Date(timestamp), { addSuffix: true })
function formatTimeAgo(timestamp: number | Date): string {
  const diff = (new Date(timestamp).getTime() - new Date().getTime()) / 1000;
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  
  if (Math.abs(diff) < 60) return formatter.format(Math.round(diff), "second");
  if (Math.abs(diff) < 3600) return formatter.format(Math.round(diff / 60), "minute");
  if (Math.abs(diff) < 86400) return formatter.format(Math.round(diff / 3600), "hour");
  if (Math.abs(diff) < 2592000) return formatter.format(Math.round(diff / 86400), "day");
  return formatter.format(Math.round(diff / 2592000), "month");
}

interface ScenarioLinkCardProps {
  data: ScenarioMetadata;
  noLink?: boolean;
  routeName?: string;
  // Events
  onAction?: (action: StoredScenarioAction) => void;
}

const menuItems: MenuItemData<StoredScenarioAction>[] = [
  { label: "Open", action: "open" },
  { label: "Delete ...", action: "delete" },
  { label: "Download", action: "download" },
  { label: "Duplicate", action: "duplicate" },
];

export default function ScenarioLinkCard({
  data,
  noLink = false,
  routeName = MAP_EDIT_MODE_ROUTE, // Giá trị mặc định
  onAction,
}: ScenarioLinkCardProps) {
  
  const handleOpenClick = () => {
    onAction?.("open");
  };

  // Xử lý tạo URL cho Next.js
  // Giả sử routeName là 'map-edit', URL sẽ là /map-edit/{id}
  // Nếu bạn dùng App Router, hãy đảm bảo routeName khớp với cấu trúc thư mục
  const href = `/${routeName}/${data.id}`;

  return (
    <Card className="hover:bg-card-foreground/5 ring-ring relative focus-within:ring-2 transition-colors">
      {/* Overlay Link/Button */}
      {noLink ? (
        <button
          type="button"
          onClick={handleOpenClick}
          draggable="false"
          className="absolute inset-0 outline-none w-full h-full cursor-pointer text-left"
        >
          <span className="sr-only">Open scenario</span>
        </button>
      ) : (
        <Link
          href={href}
          draggable="false"
          className="absolute inset-0 outline-none"
        >
          <span className="sr-only">Open scenario</span>
        </Link>
      )}

      <CardContent className="flex-auto pt-6">
        <p className="text-sm font-medium">{data.name}</p>
        <p className="text-muted-foreground mt-2 line-clamp-4 text-sm">
          {data.description}
        </p>
      </CardContent>

      <CardFooter className="flex items-center justify-between pb-6">
        <div className="text-muted-foreground text-sm">
          <p>Modified {formatTimeAgo(data.modified)}</p>
          <p>Created {formatTimeAgo(data.created)}</p>
        </div>
        
        {/* z-10 để đảm bảo menu nằm trên overlay link */}
        <div className="z-10 relative">
          <DotsMenu 
            items={menuItems} 
            onAction={(action) => onAction?.(action as StoredScenarioAction)}
          />
        </div>
      </CardFooter>
    </Card>
  );
}