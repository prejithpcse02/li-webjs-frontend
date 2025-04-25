import api from "./api";

export const notificationsAPI = {
  getNotifications: async (unreadOnly = false) => {
    const response = await api.get(
      `/api/notifications_new/?unread=${unreadOnly}`
    );
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/api/notifications_new/unread-count/");
    return response.data.unread_count;
  },

  markAsRead: async (notificationId) => {
    await api.post(`/api/notifications_new/mark-read/${notificationId}/`);
  },

  markAllAsRead: async () => {
    await api.post("/api/notifications_new/mark-all-read/");
  },

  registerDevice: async (token, deviceType = "web") => {
    await api.post("/api/notifications_new/register-device/", {
      token,
      device_type: deviceType,
    });
  },

  unregisterDevice: async (token) => {
    await api.post("/api/notifications_new/unregister-device/", {
      token,
    });
  },
};
