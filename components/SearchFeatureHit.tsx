import React from "react";
import { type LayerFeatureSearchResult } from "./types";
import { getItemsIcon } from "@/modules/scenarioeditor/featureLayerUtils";
import { cn } from "@/lib/utils"; // Optional: dùng để merge class nếu cần sau này

interface SearchFeatureHitProps {
  feature: LayerFeatureSearchResult;
}

export default function SearchFeatureHit({ feature }: SearchFeatureHitProps) {
  // Lấy component icon dựa trên type
  // Lưu ý: getItemsIcon cần trả về một React Component (VD: Lucide Icon)
  const IconComponent = getItemsIcon(feature.type);

  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center"> 
          {/* Đổi thẻ p bao ngoài icon thành div để chuẩn semantic hơn, 
              nhưng nếu CSS của bạn target thẻ p thì hãy đổi lại thành p */}
          {IconComponent && (
            <IconComponent className="text-muted-foreground h-6 w-6" />
          )}
        </div>

        {/* Xử lý v-html và v-else */}
        {feature.highlight ? (
          <p dangerouslySetInnerHTML={{ __html: feature.highlight }} />
        ) : (
          <p>{feature.name}</p>
        )}
      </div>
    </div>
  );
}