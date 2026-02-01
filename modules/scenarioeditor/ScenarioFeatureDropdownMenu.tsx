"use client";

import React from "react";
import { EllipsisVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { type ScenarioFeatureActions } from "@/types/constants";

interface ScenarioFeatureDropdownMenuProps {
  onAction: (action: ScenarioFeatureActions) => void;
}

export default function ScenarioFeatureDropdownMenu({
  onAction,
}: ScenarioFeatureDropdownMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <EllipsisVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="min-w-52" align="end">
        <DropdownMenuItem inset onSelect={() => onAction("zoom")}>
          <span>Zoom to</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem inset onSelect={() => onAction("duplicate")}>
          <span>Duplicate</span>
        </DropdownMenuItem>
        
        <DropdownMenuItem inset onSelect={() => onAction("delete")}>
          <span>Delete</span>
          <DropdownMenuShortcut>Del</DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuItem inset onSelect={() => onAction("removeMedia")}>
          <span>Remove image</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}