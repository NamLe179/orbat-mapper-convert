import { create } from "zustand";
import { nanoid } from "nanoid"; 
// Nếu project bạn dùng custom util cho id thì đổi thành: import { nanoid } from "@/utils/ids";

export interface UiNotification {
  id: string;
  title?: string;
  message?: string;
  duration?: number;
  type?: string; // 'success' | 'error' | 'warning' | 'info'
}

interface NotificationStore {
  notifications: UiNotification[];
  send: (notification: Partial<UiNotification>) => void;
  clear: () => void;
  deleteNotification: (id: string) => void;
}

/**
 * Hook quản lý Notification toàn cục (Global State).
 * Thay thế cho Vue global ref.
 */
export const useNotifications = create<NotificationStore>((set) => ({
  notifications: [],

  send: (notification) =>
    set((state) => {
      const newNotification = { id: nanoid(), ...notification };
      return {
        notifications: [...state.notifications, newNotification],
      };
    }),

  clear: () => set({ notifications: [] }),

  deleteNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));