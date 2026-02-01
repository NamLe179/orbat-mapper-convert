"use client";

import React, { useEffect, useMemo } from "react";
import NotificationItem from "./NotificationItem";
// Trong React, thư mục composables thường được đổi tên thành hooks
import { useNotifications } from "@/hooks/notifications"; 

export default function AppNotifications() {
  const { notifications, deleteNotification, clear } = useNotifications();

  // 1. Computed: Đảo ngược danh sách hiển thị
  // Dùng useMemo để chỉ chạy lại khi notifications thay đổi
  const notificationsReversed = useMemo(() => {
    return [...notifications].reverse();
  }, [notifications]);

  // 2. Lifecycle: Cleanup khi unmount
  useEffect(() => {
    // Return function này sẽ chạy khi component unmount
    return () => {
      clear();
    };
  }, [clear]);

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex items-end px-2 py-6 sm:items-start sm:py-16"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {notificationsReversed.map((notification) => (
          <NotificationItem
            key={notification.id}
            title={notification.title}
            message={notification.message}
            duration={notification.duration}
            onClose={() => deleteNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}