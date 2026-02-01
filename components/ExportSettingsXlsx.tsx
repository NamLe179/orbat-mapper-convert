"use client";

import React, { useEffect, useMemo } from "react";
import type { ExportFormat, XlsxSettings } from "@/types/importExport";
import InputCheckbox from "@/components/InputCheckbox";
import InputGroupTemplate from "@/components/InputGroupTemplate";

// Định nghĩa kiểu dữ liệu cho Column Attribute
interface ColumnAttribute {
  label: string;
  field: string;
}

// Dữ liệu tĩnh (Static Config)
const rawAttributes: (string | { field: string; label: string })[] = [
  "id",
  "name",
  "shortName",
  "description",
  "url",
  "location",
  { label: "parent ID", field: "_pid" },
  { label: "side ID", field: "sideId" },
  { label: "side name", field: "sideName" },
];

// Helper pure function
function mapFieldLabel(
  items: ({ field: string; label: string } | string)[]
): ColumnAttribute[] {
  return items.map((i) =>
    typeof i === "string" ? { label: i, field: i } : { label: i.label, field: i.field }
  );
}

interface ExportSettingsXlsxProps {
  format: ExportFormat;
  // Controlled Settings State
  settings: XlsxSettings;
  onSettingsChange: (settings: XlsxSettings) => void;
}

export default function ExportSettingsXlsx({
  format,
  settings,
  onSettingsChange,
}: ExportSettingsXlsxProps) {

  // 1. Chuẩn bị danh sách attributes (dùng useMemo để không tính toán lại mỗi lần render)
  const mappedAttributes = useMemo(() => mapFieldLabel(rawAttributes), []);

  // 2. Initialization Logic (Tương đương code gốc Vue: settings.value.columns = ...)
  // Chỉ chạy 1 lần khi mount để set default columns nếu chưa có
  useEffect(() => {
    if (!settings.columns || settings.columns.length === 0) {
      onSettingsChange({
        ...settings,
        columns: [...mappedAttributes],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Update Helpers
  const updateSetting = (key: keyof XlsxSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleColumnToggle = (attr: ColumnAttribute, checked: boolean) => {
    const currentColumns = settings.columns || [];
    
    if (checked) {
      // Thêm vào mảng
      updateSetting("columns", [...currentColumns, attr]);
    } else {
      // Xóa khỏi mảng (so sánh dựa trên field vì object reference có thể khác)
      updateSetting(
        "columns",
        currentColumns.filter((c) => c.field !== attr.field)
      );
    }
  };

  // Helper check xem column đã được chọn chưa
  const isSelected = (field: string) => {
    return settings.columns?.some((c) => c.field === field) ?? false;
  };

  return (
    <fieldset className="space-y-4">
      <InputCheckbox
        label="Use one sheet per side"
        checked={settings.oneSheetPerSide}
        onCheckedChange={(val) => updateSetting("oneSheetPerSide", val === true)}
      />

      <InputGroupTemplate label="Unit attributes to export">
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {mappedAttributes.map((attr) => (
            <InputCheckbox
              key={attr.field}
              label={attr.label}
              // Logic checked và onChange cho mảng
              checked={isSelected(attr.field)}
              onCheckedChange={(checked) => handleColumnToggle(attr, checked === true)}
            />
          ))}
        </div>
      </InputGroupTemplate>
    </fieldset>
  );
}