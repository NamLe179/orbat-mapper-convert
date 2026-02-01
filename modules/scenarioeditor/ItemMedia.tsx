import React from "react";
import { type Media } from "@/types/scenarioModels";

interface ItemMediaProps {
  media?: Media;
}

export default function ItemMedia({ media }: ItemMediaProps) {
  // Tương đương v-if="media"
  if (!media) {
    return null;
  }

  return (
    // Lưu ý: Class '@-lg:...' yêu cầu plugin @tailwindcss/container-queries
    <div className="group @-lg:aspect-16/5 relative -mx-4 -mt-4 aspect-16/9">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        draggable="false"
        className="h-full w-full object-cover"
        src={media.url}
        alt={media.caption || "Media content"}
      />
      
      {/* Caption Overlay */}
      <p className="bg-background/75 text-foreground absolute right-0 bottom-0 left-0 hidden px-2 py-1 text-xs group-hover:block">
        {media.creditsUrl ? (
          <a
            href={media.creditsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {media.credits}
          </a>
        ) : (
          <span>{media.credits}</span>
        )}
      </p>
    </div>
  );
}