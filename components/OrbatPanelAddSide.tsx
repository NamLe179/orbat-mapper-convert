import React from "react";
import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "@/components/ui/button";

interface OrbatPanelAddSideProps {
  simple?: boolean;
  onAdd?: () => void; // Thay thế cho emit('add')
}

export default function OrbatPanelAddSide({
  simple = false,
  onAdd,
}: OrbatPanelAddSideProps) {
  return (
    <div className="text-center">
      {/* Logic v-if="!simple" */}
      {!simple && (
        <>
          <svg
            className="text-muted-foreground mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="text-foreground mt-2 text-sm font-medium">Side</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Get started by creating a side.
          </p>
        </>
      )}

      <div className="mt-6">
        <Button onClick={onAdd} type="button">
          <PlusIcon className="size-4 mr-2" aria-hidden="true" />
          Add Side
        </Button>
      </div>
    </div>
  );
}