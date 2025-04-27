"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notificationsAPI } from "@/services/notificationsAPI";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Image from "next/image";
import { FiBell } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect if not logged in
    if (!isLoading && !user) {
      router.replace("/auth/signin");
      return;
    }

    const fetchNotifications = async () => {
      if (!user) return;

      try {
        const data = await notificationsAPI.getNotifications();
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchNotifications();
    }
  }, [user, isLoading, router]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      // Update local state
      setNotifications(
        notifications.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if not already read
    if (!notification.is_read) {
      try {
        await notificationsAPI.markAsRead(notification.id);
        // Update local state
        setNotifications(
          notifications.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // Navigate based on notification type
    if (
      (notification.notification_type === "like" ||
        notification.notification_type === "price_update" ||
        notification.notification_type === "review" ||
        notification.notification_type === "item_sold" ||
        notification.notification_type === "offer" ||
        notification.notification_type === "message") &&
      notification.object_id
    ) {
      // Split the object_id to get slug and product_id
      const [slug, product_id] = notification.object_id.split(":");
      if (slug && product_id) {
        router.push(`/listings/${slug}/${product_id}`);
      } else {
        console.error("Invalid object_id format:", notification.object_id);
      }
    }
  };

  if (isLoading || (loading && user)) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex justify-center items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case "like":
        return "♥️";
      case "offer":
        return "💰";
      case "message":
        return "💬";
      case "review":
        return "⭐";
      case "price_update":
        return "💲";
      case "item_sold":
        return "🛒";
      default:
        return "📌";
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h1 className="text-xl font-bold">Notifications</h1>
              {notifications.some((n) => !n.is_read) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center">
                <FiBell className="mx-auto text-gray-300 text-6xl mb-3" />
                <h2 className="text-lg font-medium text-gray-500">
                  No notifications yet
                </h2>
                <p className="text-gray-400 mt-1">
                  When you get notifications, they'll appear here
                </p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationPress(notification)}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition ${
                      notification.is_read ? "bg-white" : "bg-blue-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                        <span className="text-lg font-semibold text-gray-500">
                          {notification.sender?.nickname
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-800">
                          <span className="font-medium">
                            {getNotificationIcon(
                              notification.notification_type
                            )}
                          </span>{" "}
                          {notification.message}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
