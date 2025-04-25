"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

// Create the context
const PushNotificationContext = createContext();

// Custom hook to use the push notification context
export const usePushNotifications = () => useContext(PushNotificationContext);

// Provider component
export const PushNotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [pushToken, setPushToken] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isBrowserSupported, setIsBrowserSupported] = useState(false);
  const [webPushService, setWebPushService] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if browser has basic notification support before loading Firebase
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasBasicSupport =
        "Notification" in window &&
        "serviceWorker" in navigator &&
        "PushManager" in window;

      setIsBrowserSupported(hasBasicSupport);

      if (!hasBasicSupport) {
        console.log(
          "This browser does not support basic notification features"
        );
        setIsLoading(false);
      }
    }
  }, []);

  // Load Firebase dynamically on the client side
  useEffect(() => {
    if (typeof window !== "undefined" && isBrowserSupported) {
      setIsLoading(true);
      // Only import the web push service on the client
      import("@/services/webPushService")
        .then((module) => {
          setWebPushService(module.default);
          setLoadError(null);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error loading web push service:", error);
          setLoadError(error);
          setIsBrowserSupported(false);
          setIsLoading(false);
        });
    }
  }, [isBrowserSupported]);

  // Check notification permission status
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Initialize push notifications when user logs in and webPushService is loaded
  useEffect(() => {
    // If not authenticated, webPushService not loaded, or browser doesn't support notifications, return
    if (
      !isAuthenticated ||
      !user ||
      !webPushService ||
      !isBrowserSupported ||
      isLoading
    ) {
      return;
    }

    let unsubscribe = null;

    const initializePushNotifications = async () => {
      try {
        // Register for push notifications
        const token = await webPushService.registerForPushNotifications();
        setPushToken(token);

        // Set up listener for foreground notifications
        if (token) {
          unsubscribe = await webPushService.setupNotificationListener(
            (payload) => {
              // Update unread count or perform other UI updates
              setUnreadCount((prev) => prev + 1);

              // You can add custom handlers based on notification type
              if (payload.data?.type === "seller_message") {
                // Play a sound for seller messages
                try {
                  const audio = new Audio("/notification-sound.mp3");
                  audio
                    .play()
                    .catch((e) => console.log("Error playing sound:", e));
                } catch (e) {
                  console.log("Error with audio:", e);
                }
              }
            }
          );
        }
      } catch (error) {
        console.error("Error setting up notifications:", error);
      }
    };

    initializePushNotifications();

    // When user logs out, unregister token
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }

      if (!isAuthenticated && pushToken && webPushService) {
        webPushService.unregisterPushToken().catch((error) => {
          console.error("Error unregistering token:", error);
        });
      }
    };
  }, [
    isAuthenticated,
    user,
    webPushService,
    isBrowserSupported,
    pushToken,
    isLoading,
  ]);

  // Request permission for notifications
  const requestNotificationPermission = async () => {
    if (!isBrowserSupported || !webPushService) return "unsupported";

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);

      if (permission === "granted") {
        const token = await webPushService.registerForPushNotifications();
        setPushToken(token);
      }

      return permission;
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return "denied";
    }
  };

  // Reset unread count (e.g., when opening notifications panel)
  const resetUnreadCount = () => {
    setUnreadCount(0);
  };

  // Export the context value
  const contextValue = {
    notificationPermission,
    requestNotificationPermission,
    unreadCount,
    resetUnreadCount,
    pushToken,
    isBrowserSupported,
    loadError,
    isLoading,
  };

  return (
    <PushNotificationContext.Provider value={contextValue}>
      {children}
    </PushNotificationContext.Provider>
  );
};

export default PushNotificationProvider;
