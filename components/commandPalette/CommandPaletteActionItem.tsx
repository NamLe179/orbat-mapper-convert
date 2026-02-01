import React from "react";
import { type ActionSearchResult } from "@/components/types"; 
import {
  PlusCircle,
  Save,
  Download,
  Upload,
  Hexagon,
  Pause,
  Play,
  Share2,
  FastForward,
  Rewind,
} from "lucide-react";

// Mapping MDI icons -> Lucide icons
const iconMap: Record<string, React.ElementType> = {
  add: PlusCircle,
  upload: Upload,
  download: Download,
  save: Save,
  default: Hexagon,
  play: Play,
  pause: Pause,
  increaseSpeed: FastForward, // Thay cho IconSpeedometer
  decreaseSpeed: Rewind,      // Thay cho IconSpeedometerSlow
  share: Share2,
};

interface CommandPaletteActionItemProps {
  item: ActionSearchResult;
}

export default function CommandPaletteActionItem({ item }: CommandPaletteActionItemProps) {
  // Xác định icon component dựa trên key
  const IconComponent = iconMap[item.icon || "default"] || iconMap["default"];

  return (
    <>
      <div className="flex w-7 justify-center">
        <IconComponent className="text-muted-foreground h-8 w-8" />
      </div>
      <p
        className="ml-3 flex-auto truncate"
        // Tương đương v-html. Cần đảm bảo nội dung item.highlight đã được sanitize nếu đến từ nguồn không tin cậy.
        dangerouslySetInnerHTML={{
          __html: item.highlight ? item.highlight : item.name,
        }}
      />
    </>
  );
}