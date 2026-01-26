import { useState, useEffect, useRef, useCallback } from "react";

export function useTimer(
  cb: (...args: unknown[]) => void,
  delay: number = 4000
) {
  // UI State: Trigger re-render khi thay đổi
  const [isPending, setIsPending] = useState(true);

  // Mutable State: Giữ giá trị giữa các lần render mà không trigger update
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const timeRemainingRef = useRef<number>(delay);
  
  // Lưu callback mới nhất để tránh closure cũ
  const cbRef = useRef(cb);

  // Update callback ref mỗi khi cb thay đổi
  useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  // Hàm Stop (Dừng hẳn)
  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Hàm Pause (Tạm dừng)
  const pause = useCallback(() => {
    stop();
    // Tính toán thời gian còn lại
    // Date.now() - startedAt = thời gian đã trôi qua từ lúc start/resume gần nhất
    const elapsed = Date.now() - startedAtRef.current;
    timeRemainingRef.current -= elapsed;
  }, [stop]);

  // Hàm Resume (Tiếp tục / Bắt đầu)
  const resume = useCallback(() => {
    stop(); // Đảm bảo không chạy chồng chéo
    startedAtRef.current = Date.now();
    
    // Nếu thời gian còn lại <= 0, thực hiện ngay lập tức
    if (timeRemainingRef.current <= 0) {
      setIsPending(false);
      cbRef.current();
      return;
    }

    setIsPending(true);
    timerRef.current = setTimeout(() => {
      setIsPending(false);
      timerRef.current = null;
      cbRef.current();
    }, timeRemainingRef.current);
  }, [stop]);

  // Effect: Khởi chạy timer khi mount và cleanup khi unmount
  useEffect(() => {
    resume();

    // Cleanup function tương đương tryOnScopeDispose
    return () => stop();
  }, []); // Empty deps: Chỉ chạy 1 lần khi mount (giống behavior gốc)

  return { isPending, pause, resume, stop };
}