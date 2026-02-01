"use client";

import React from "react";

// UI Components
import ScrollTabs from "@/components/ScrollTabs";
import { TabsContent } from "@/components/ui/tabs";

// Internal Components
import OrbatChartSettingsUnit from "./OrbatChartSettingsUnit";
import OrbatChartSettingsLevel from "./OrbatChartSettingsLevel";
import OrbatChartSettingsChart from "./OrbatChartSettingsChart";
import OrbatChartSettingsBranch from "./OrbatChartSettingsBranch";

// Constants & Types
import { type ChartTab, ChartTabs } from "@/modules/charteditor/constants";
import { cn } from "@/lib/utils";

interface OrbatChartSettingsProps {
  tab: ChartTab;
  onTabChange: (value: ChartTab) => void;
  chartMode?: boolean;
}

export default function OrbatChartSettings({
  tab,
  onTabChange,
  chartMode = false,
}: OrbatChartSettingsProps) {
  
  // Định nghĩa danh sách tab items tương đương bản Vue
  const tabItems = [
    { label: "Chart", value: ChartTabs.Chart.toString() },
    { label: "Level", value: ChartTabs.Level.toString() },
    { label: "Branch", value: ChartTabs.Branch.toString() },
    { label: "Units", value: ChartTabs.Unit.toString() }, // Sửa lỗi typo "Unitss" từ bản gốc
  ];

  return (
    <div className="flex w-full flex-col">
      {/* Tiêu đề chỉ hiển thị trên màn hình lớn khi không ở chế độ chartMode */}
      {!chartMode && (
        <h3 className="text-foreground hidden px-4 font-medium lg:block lg:p-4">
          Chart layout settings
        </h3>
      )}

      

      <ScrollTabs
        value={tab.toString()}
        onValueChange={(val) => onTabChange(val as unknown as ChartTab)}
        items={tabItems}
        className="min-h-0 flex-auto"
      >
        {/* Tab Content: Chart Settings */}
        <TabsContent value={ChartTabs.Chart.toString()} className="mt-6 px-4">
          {/* React giữ state tốt hơn nên việc kiểm tra tab hiện tại thường dùng để tránh load dữ liệu nặng */}
          {tab === ChartTabs.Chart && (
            <OrbatChartSettingsChart chartMode={chartMode} />
          )}
        </TabsContent>

        {/* Tab Content: Level Settings */}
        <TabsContent value={ChartTabs.Level.toString()} className="mt-6 px-4">
          <OrbatChartSettingsLevel />
        </TabsContent>

        {/* Tab Content: Branch Settings */}
        <TabsContent value={ChartTabs.Branch.toString()} className="mt-6 px-4">
          <OrbatChartSettingsBranch />
        </TabsContent>

        {/* Tab Content: Unit Settings */}
        <TabsContent value={ChartTabs.Unit.toString()} className="mt-6 px-4">
          <OrbatChartSettingsUnit />
        </TabsContent>
      </ScrollTabs>
    </div>
  );
}