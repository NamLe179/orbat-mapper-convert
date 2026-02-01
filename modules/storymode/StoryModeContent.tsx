"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import scrollama, { type ScrollamaInstance } from "scrollama";

// Project imports
import { renderMarkdown } from "../../hooks/formatting";
import { actions, content } from "../../testdata/testStory";
import { useMediaQuery } from "@/hooks/mediaQuery"; // Sử dụng hook đã tạo ở bước trước

interface StoryModeContentProps {
  // Thay thế emit("update-state")
  onUpdateState?: (action: any) => void;
}

export default function StoryModeContent({ onUpdateState }: StoryModeContentProps) {
  // --- State & Refs ---
  const [sIndex, setSIndex] = useState(-1);
  const scrollerRef = useRef<ScrollamaInstance | null>(null);

  // Vue logic: breakpoints.greater("md") -> Tailwind md thường là 768px
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // --- Computed ---
  const renderedContent = useMemo(() => {
    return renderMarkdown(content);
  }, []);

  // --- Effects ---

  // 1. Initialize Scrollama
  useEffect(() => {
    const scroller = scrollama();
    scrollerRef.current = scroller;

    scroller
      .setup({
        step: ".scroll-step",
      })
      .onStepEnter(({ element, index }) => {
        setSIndex(index);
        if (actions[index]) {
          onUpdateState?.(actions[index]);
        }
        element.classList.add("bg-red-50");
      })
      .onStepExit(({ element }) => {
        element.classList.remove("bg-red-50");
      });

    // SỬA LỖI TẠI ĐÂY: Ép kiểu (scroller as any)
    const isMd = window.matchMedia("(min-width: 768px)").matches;
    if (isMd) {
       (scroller as any).offset("100px");
    } else {
       (scroller as any).offset(0.5);
    }

    return () => {
      scroller.destroy();
    };
  }, [onUpdateState]);

  // 2. Watch Resize / Breakpoint change
  useEffect(() => {
    if (!scrollerRef.current) return;

    // SỬA LỖI TẠI ĐÂY: Ép kiểu (scrollerRef.current as any)
    if (isDesktop) {
      (scrollerRef.current as any).offset("100px");
    } else {
      (scrollerRef.current as any).offset(0.5);
    }
    
    scrollerRef.current.resize();
  }, [isDesktop]);

  return (
    <div>
      {/* Debug Indicator */}
      <p className="bg-background fixed right-2 bottom-2 z-40 border p-2">
        {sIndex}
      </p>

      {/* Rendered Markdown Content */}
      <div
        className="prose prose-sm dark:prose-invert p-4"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
    </div>
  );
}