"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import { FiBell } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const router = useRouter();
  const notificationRef = useRef(null);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    // Add event listener when the dropdown is open
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    // Clean up
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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

  // Sort notifications by created_at in descending order
  const sortedNotifications = [...notifications].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <div className="relative" ref={notificationRef}>
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
        <div className="absolute right-0 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium">Notifications</h3>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {sortedNotifications.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No notifications
                </p>
              ) : (
                sortedNotifications.slice(0, 5).map((notification) => (
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
                          {notification.text || notification.message}
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
