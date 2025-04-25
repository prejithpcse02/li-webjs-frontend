"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { FiBell } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const router = useRouter();

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

  const handleNotificationClick = async (notification) => {
    await markAsRead(notification.id);
    setIsOpen(false);

    // Navigate based on notification type
    if (
      (notification.notification_type === "like" ||
        notification.notification_type === "price_update" ||
        notification.notification_type === "review" ||
        notification.notification_type === "item_sold") &&
      notification.object_id
    ) {
      router.push(`/listings/${notification.object_id}`);
    } else if (
      notification.notification_type === "message" ||
      notification.notification_type === "offer"
    ) {
      if (notification.content_type === "chat.conversation") {
        router.push(`/chat/${notification.object_id}`);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No notifications
                </p>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 ${
                      !notification.is_read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-500">
                          {notification.sender?.nickname
                            ?.charAt(0)
                            .toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-medium">
                            {getNotificationIcon(
                              notification.notification_type
                            )}
                          </span>{" "}
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 text-center">
              <button
                onClick={() => {
                  router.push("/notifications");
                  setIsOpen(false);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all notifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
