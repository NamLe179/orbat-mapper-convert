"use client";

import React, { useState, useMemo, useEffect, useId } from "react";
import { renderMarkdown } from "@/hooks/formatting"; // Giả định file này đã convert
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface SimpleMarkdownInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id?: string;
  label?: React.ReactNode;      // Thay cho slot 'label'
  description?: React.ReactNode; // Thay cho slot 'description'
  value?: string;               // Thay cho v-model
  onValueChange?: (value: string) => void;
}

export default function SimpleMarkdownInput({
  id,
  label,
  description,
  value = "",
  onValueChange,
  className,
  ...props // Các props còn lại (attrs) sẽ được truyền vào Textarea
}: SimpleMarkdownInputProps) {
  
  // 1. ID Generation
  const uniqueId = useId();
  const computedId = id ?? uniqueId;

  // 2. Tabs State
  const [currentTab, setCurrentTab] = useState<"write" | "preview">("write");
  const isPreview = currentTab === "preview";

  // 3. Markdown Rendering (Memoized)
  const renderedMarkdown = useMemo(() => {
    if (!isPreview) return "";
    return renderMarkdown(value || "");
  }, [value, isPreview]);

  // 4. Toggle Logic
  const togglePreview = () => {
    setCurrentTab((prev) => (prev === "write" ? "preview" : "write"));
  };

  // 5. Global Event Listener (Alt + P)
  useEffect(() => {
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        togglePreview();
      }
    };

    window.addEventListener("keyup", handleKeyUp);
    return () => window.removeEventListener("keyup", handleKeyUp);
  }, []);

  return (
    <div className={className}>
      <div className="flex items-end justify-between">
        <Label htmlFor={computedId}>
          {label}
        </Label>
        
        <ToggleGroup 
          type="single" 
          value={currentTab} 
          onValueChange={(val) => val && setCurrentTab(val as "write" | "preview")}
          variant="outline" 
          size="sm"
        >
          <ToggleGroupItem value="write" className="px-4">
            Write
          </ToggleGroupItem>
          <ToggleGroupItem value="preview" className="px-4">
            Preview
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="mt-1.5">
        {/* Write Mode: Textarea */}
        {/* Sử dụng class hidden thay vì unmount để giống hành vi v-show (giữ trạng thái focus/scroll tốt hơn nếu cần) */}
        <Textarea
          id={computedId}
          value={value}
          onChange={(e) => onValueChange?.(e.target.value)}
          className={cn(isPreview ? "hidden" : "block")}
          {...props}
        />

        {/* Preview Mode: Rendered HTML */}
        {isPreview && (
          <div
            className="dark:prose-invert prose prose-sm mt-4 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2"
            dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
          />
        )}
      </div>

      {/* Description */}
      {!isPreview && description && (
        <p className="text-muted-foreground mt-2 text-sm">
          {description}
        </p>
      )}
    </div>
  );
}