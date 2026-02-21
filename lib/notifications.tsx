"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type AlertSeverity = "info" | "warning" | "critical";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  severity: AlertSeverity;
  timestamp: number;
  read: boolean;
  zone?: string;
  source?: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  push: (n: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  notifications: [],
  unreadCount: 0,
  push: () => {},
  markRead: () => {},
  markAllRead: () => {},
  clear: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

let nextId = 0;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const push = useCallback(
    (n: Omit<AppNotification, "id" | "timestamp" | "read">) => {
      const id = `notif-${++nextId}`;
      setNotifications((prev) => [
        { ...n, id, timestamp: Date.now(), read: false },
        ...prev.slice(0, 49),
      ]);
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, push, markRead, markAllRead, clear }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}
