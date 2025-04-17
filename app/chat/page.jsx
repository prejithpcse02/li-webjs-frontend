"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function ChatListPage() {
  const [conversations, setConversations] = useState([]);
  const [listing, setListing] = useState(null);
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = searchParams.get("listing");

  useEffect(() => {
    if (user) {
      // Fetch conversations
      api
        .get("/api/chat/conversations/")
        .then((res) => setConversations(res.data))
        .catch((err) => console.error("Failed to load chats", err));

      // If listing ID is provided, fetch listing details
      if (listingId) {
        api
          .get(`/api/listings/${listingId}/`)
          .then((res) => setListing(res.data))
          .catch((err) => console.error("Failed to load listing", err));
      }
    }
  }, [user, listingId]);

  // Filter conversations if listing ID is provided
  const filteredConversations = listingId
    ? conversations.filter((conv) => conv.listing.product_id === listingId)
    : conversations;

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            {listingId && (
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-semibold">
              {listing ? `Chats for ${listing.title}` : "Your Chats"}
            </h1>
          </div>
        </div>

        {/* Conversations List */}
        <div className="space-y-3">
          {filteredConversations.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
              {listing
                ? "No conversations found for this listing"
                : "No conversations yet"}
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <Link key={conv.id} href={`/chat/${conv.id}`}>
                <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={
                          conv.listing.main_image || "/placeholder-image.jpg"
                        }
                        alt={conv.listing.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {conv.listing.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        with {conv.other_participant?.nickname}
                      </p>
                      {conv.last_message && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {conv.last_message.sender.nickname}:{" "}
                          {conv.last_message.content}
                        </p>
                      )}
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
