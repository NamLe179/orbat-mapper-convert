"use client";

import React from "react";
import { useWidthStore } from "@/stores/uiStore";

interface InlineFormWrapperProps {
  detailsPanel?: boolean;
  children?: React.ReactNode;
}

export default function InlineFormWrapper({
  detailsPanel,
  children,
}: InlineFormWrapperProps) {
  
  // Hook lấy state width
  // Nếu dùng Zustand, cách tốt hơn là select từng field để tránh re-render thừa:
  // const { detailsWidth, orbatPanelWidth } = useWidthStore();
  // Nhưng để giữ logic giống Vue gốc (w.abc), tôi sẽ gọi hook lấy toàn bộ state hoặc giả định store trả về object đó.
  const w = useWidthStore();

  return (
    <div
      className="sticky left-0 p-4"
      style={{
        maxWidth: `${detailsPanel ? w.detailsWidth : w.orbatPanelWidth}px`,
      }}
    >
      {children}
    </div>
  );
}