"use client";

import React, { useState, useCallback } from "react";
import { type Scenario } from "@/types/scenarioModels";
import { cn } from "@/lib/utils"; // Giả định có hàm này để merge class

interface LoadScenarioPanelProps {
  // Thay thế emit("loaded", data)
  onLoaded?: (data: Scenario) => void;
  // emit("update:modelValue") được define trong Vue nhưng không thấy dùng trong script logic, 
  // nên tôi tạm bỏ qua, hoặc bạn có thể thêm onUpdate nếu cần.
}

export default function LoadScenarioPanel({ onLoaded }: LoadScenarioPanelProps) {
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const [isError, setIsError] = useState(false);

  // --- Logic xử lý file ---
  const readFile = (file: File) => {
    const reader = new FileReader();

    reader.onload = function (evt) {
      const content = evt?.target?.result as string;

      try {
        const scenarioData = JSON.parse(content) as Scenario;
        if (
          scenarioData?.type === "ORBAT-mapper" ||
          scenarioData?.type === "ORBAT-mapper-encrypted"
        ) {
          setIsError(false);
          onLoaded?.(scenarioData);
        } else {
          console.error("Failed to load", file.name);
          setIsError(true);
        }
      } catch (e) {
        console.error("Failed to load", file.name);
        setIsError(true);
      }
    };
    reader.readAsText(file);
  };

  const onFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    readFile(files[0]);
  };

  // --- Native Drag & Drop Handlers (Thay thế useDropZone) ---
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOverDropZone(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOverDropZone(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOverDropZone(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      readFile(files[0]);
    }
  }, []);

  return (
    <div
      className={cn(
        "border-border hover:border-border/80 relative w-full rounded-lg border-2 border-dashed p-4 ring-offset-2 focus-within:ring-2",
        isOverDropZone ? "border-primary cursor-crosshair" : ""
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload" // Đổi ID thành 'file-upload' để tránh trùng lặp
        onChange={onFileLoad}
        className="absolute h-[0.1px] w-[0.1px] opacity-0"
      />
      
      <label
        htmlFor="file-upload"
        className="text-foreground hover:text-muted-foreground flex h-full w-full cursor-pointer flex-col items-center justify-center text-sm font-medium"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1"
          stroke="currentColor"
          className="text-muted-foreground h-12 w-12"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>

        <span className="mt-2 block text-center">
          Drag a file here or click to select local file
        </span>
      </label>

      {isError && (
        <p className="text-destructive-foreground absolute bottom-2 left-0 w-full text-center text-base">
          Please select a valid scenario file.
        </p>
      )}
    </div>
  );
}