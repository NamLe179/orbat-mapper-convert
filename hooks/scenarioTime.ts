import { useState, useEffect, useMemo } from "react";
import dayjs, { type Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { resolveTimeZone } from "@/utils/militaryTimeZones";

// Đảm bảo plugins được load (thường nên làm ở _app.tsx hoặc layout.tsx, nhưng để ở đây cho an toàn)
dayjs.extend(utc);
dayjs.extend(timezone);

interface UseDateElementsProps {
  timestamp: number;
  isLocal: boolean;
  timeZone?: string;
}

export function useDateElements({
  timestamp,
  isLocal,
  timeZone = "UTC",
}: UseDateElementsProps) {
  // UI State
  const [date, setDate] = useState("");
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  // 1. Sync State from Props (tương đương watch immediate)
  useEffect(() => {
    const tz = resolveTimeZone(timeZone);
    const dt = isLocal 
      ? dayjs.utc(timestamp).tz(tz) 
      : dayjs.utc(timestamp);

    setDate(dt.format("YYYY-MM-DD")); // Thay vì split('T')[0]
    setHour(dt.hour());
    setMinute(dt.minute());
  }, [timestamp, isLocal, timeZone]);

  // 2. Compute Result (tương đương computed resDateTime)
  const resDateTime = useMemo(() => {
    try {
      const tz = resolveTimeZone(timeZone);
      // Construct base string format YYYY-MM-DD HH:mm
      const dateStr = `${date} ${hour}:${minute}`;

      if (isLocal) {
        return dayjs.tz(dateStr, "YYYY-MM-DD H:m", tz);
      }
      return dayjs.utc(dateStr, "YYYY-MM-DD H:m");
    } catch (e) {
      return dayjs(0);
    }
  }, [date, hour, minute, isLocal, timeZone]);

  return {
    date,
    setDate,
    hour,
    setHour,
    minute,
    setMinute,
    resDateTime,
  };
}

interface UseYMDElementsProps {
  timestamp: number;
  isLocal: boolean;
  timeZone?: string;
}

export function useYMDElements({
  timestamp,
  isLocal,
  timeZone = "UTC",
}: UseYMDElementsProps) {
  // UI State
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(1); // Lưu ý: Dayjs month là 0-11, nhưng UI thường dùng logic này
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  // 1. Sync State from Props
  useEffect(() => {
    const tz = resolveTimeZone(timeZone);
    const dt = isLocal 
      ? dayjs.utc(timestamp).tz(tz) 
      : dayjs.utc(timestamp);

    setYear(dt.year());
    setMonth(dt.month()); // Dayjs trả về 0-11
    setDay(dt.date());
    setHour(dt.hour());
    setMinute(dt.minute());
  }, [timestamp, isLocal, timeZone]);

  // 2. Compute Result
  const resDateTime = useMemo(() => {
    try {
      const tz = resolveTimeZone(timeZone);
      
      // Sử dụng .set() an toàn hơn nối chuỗi, đặc biệt với tháng 0-11
      let baseObj = isLocal 
        ? dayjs().tz(tz) 
        : dayjs.utc();

      baseObj = baseObj
        .year(year)
        .month(month)
        .date(day)
        .hour(hour)
        .minute(minute)
        .second(0)
        .millisecond(0);

      return baseObj;
    } catch (e) {
      return dayjs(0);
    }
  }, [year, month, day, hour, minute, isLocal, timeZone]);

  return {
    year,
    setYear,
    month,
    setMonth,
    day,
    setDay,
    hour,
    setHour,
    minute,
    setMinute,
    resDateTime,
  };
}