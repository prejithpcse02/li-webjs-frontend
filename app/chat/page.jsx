"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/services/api"; // your axios config
import { useAuth } from "@/context/AuthContext";

export default function ChatListPage() {
  const [conversations, setConversations] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      api
        .get("/api/chat/conversations/")
        .then((res) => setConversations(res.data))
        .catch((err) => console.error("Failed to load chats", err));
    }
  }, [user]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Your Chats</h2>
      {conversations.length === 0 && <p>No conversations yet.</p>}

      <div className="space-y-4">
        {conversations.map((conv) => (
          <Link key={conv.id} href={`/chat/${conv.id}`}>
            <div className="p-4 border rounded-md hover:bg-gray-50 flex items-center cursor-pointer">
              <img
                src={conv.listing.main_image || "/placeholder-image.jpg"}
                alt="Listing"
                className="w-16 h-16 object-cover rounded-md mr-4"
              />
              <div className="flex-1">
                <p className="font-bold">{conv.listing.title}</p>
                <p className="text-sm text-gray-600">
                  with {conv.other_participant?.username}
                </p>
                {conv.last_message && (
                  <p className="text-sm text-gray-400 truncate">
                    {conv.last_message.sender.username}:{" "}
                    {conv.last_message.content}
                  </p>
                )}
              </div>
              {conv.unread_count > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full ml-2">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
