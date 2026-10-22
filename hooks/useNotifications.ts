"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
};

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50); // Reasonable limit for in-app

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter((n) => !n.is_read).length);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    // Supabase Real-time Subscription
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((count) => count + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updatedNotification = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updatedNotification.id ? updatedNotification : n))
          );
          // Re-calculate unread count in case it changed
          setUnreadCount((current) => {
            // Need latest state to accurately count, so we'll just trigger a refetch
            // or we could do it functionally but fetch is safer to keep in sync
            fetchNotifications();
            return current; 
          });
        }
      )
      .subscribe();

    // Fallback polling (30 seconds)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [userId, fetchNotifications, supabase]);

  const markAsRead = async (id: string) => {
    if (!userId) return;

    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to mark as read:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Failed to mark all as read:", error);
      // Revert on error
      fetchNotifications();
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
}
