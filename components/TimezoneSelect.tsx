"use client";

import React, { useMemo } from "react";
import { timeZonesNames } from "@vvo/tzdb";
import SimpleSelect from "@/components/SimpleSelect";
import { MILITARY_TIME_ZONE_NAMES } from "@/utils/militaryTimeZones";

// Khai báo props
interface TimezoneSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  label?: string;
}

// Tạo danh sách timezones tĩnh để tối ưu hiệu năng
const rawTimeZones = [...timeZonesNames, "UTC", ...MILITARY_TIME_ZONE_NAMES];

export default function TimezoneSelect({
  value = "UTC", // Default value từ Vue
  onValueChange,
  className,
  label,
}: TimezoneSelectProps) {

  // Chuyển đổi mảng string sang dạng { label, value } mà Select thường dùng
  const items = useMemo(() => {
    return rawTimeZones.map((tz) => ({
      label: tz,
      value: tz,
    }));
  }, []);

  return (
    <SimpleSelect
      label={label}
      className={className}
      items={items}
      value={value}
      // Ép kiểu vì SimpleSelect có thể trả về string | number | null
      onValueChange={(val) => onValueChange?.(val as string)}
    />
  );
}