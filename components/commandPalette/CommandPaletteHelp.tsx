import React from "react";
import { LifebuoyIcon } from "@heroicons/react/20/solid";

export default function CommandPaletteHelp() {
  return (
    <div className="px-6 py-14 text-center text-sm sm:px-14">
      <LifebuoyIcon 
        className="text-muted-foreground mx-auto h-6 w-6" 
        aria-hidden="true" 
      />
      <p className="text-foreground mt-4 font-semibold">
        Help with searching
      </p>
      <p className="text-muted-foreground mt-2">
        Use the command palette to quickly search for units and features in the currently
        loaded scenario.
      </p>
    </div>
  );
}