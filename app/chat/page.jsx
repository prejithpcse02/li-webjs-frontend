"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function ChatListPage() {
  const [conversations, setConversations] = useState([]);
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("Initializing...");
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const listingId = searchParams.get("listing");

  useEffect(() => {
    async function loadData() {
      if (!user) return;

      try {
        setIsLoading(true);
        setLoadingText("Loading your chats...");

        // Load conversations first
        const conversationsResponse = await api.get("/api/chat/conversations/");
        const loadedConversations = conversationsResponse.data;
        setConversations(loadedConversations);

        // If there's a specific listing
        if (listingId) {
          setLoadingText("Loading listing details...");
          const listingResponse = await api.get(`/api/listings/${listingId}/`);
          setListing(listingResponse.data);
        }

        // Load reviews for all conversations
        if (loadedConversations.length > 0) {
          setLoadingText("Loading reviews...");
          await Promise.all(
            loadedConversations.map(async (conv) => {
              if (conv.listing?.product_id) {
                try {
                  await api.get(
                    `/api/reviews/listing/${conv.listing.product_id}/`
                  );
                } catch (error) {
                  console.error("Error loading reviews for listing:", error);
                }
              }
            })
          );
        }

        setLoadingText("Preparing your chats...");
        // Small delay to ensure smooth transition
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user, listingId]);

  const filteredConversations = listingId
    ? conversations.filter((conv) => conv.listing.product_id === listingId)
    : conversations;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-100 border-t-gray-600 mx-auto mb-4" />
          <p className="text-gray-800 font-medium">{loadingText}</p>
          <p className="text-sm text-gray-500 mt-2">
            Please wait while we prepare everything
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="py-4 px-4 border-b bg-white sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="w-10">
              {listingId && (
                <button
                  onClick={() => router.back()}
                  className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                >
                  X
                </button>
              )}
            </div>
            <span className="font-semibold text-lg">All Chats</span>
            <div className="w-10" /> {/* For balance */}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <h1 className="text-lg font-semibold text-gray-800">
              <span className="text-blue-600">Chats for</span>
              {listing ? (
                <span className="text-gray-800 ml-1 line-clamp-1">
                  {listing.title}
                </span>
              ) : (
                " Your Chats"
              )}
            </h1>
          </div>
        </div>

        {/* Conversations List */}
        <div className="bg-white">
          {filteredConversations.length === 0 ? (
            <div className="py-16 text-center text-gray-500">
              <p className="text-lg">
                {listing
                  ? "No conversations found for this listing"
                  : "No conversations yet"}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {listing
                  ? "When someone messages about this listing, they'll appear here"
                  : "Your chat conversations will appear here"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredConversations.map((conv) => (
                <Link key={conv.id} href={`/chat/${conv.id}`}>
                  <div className="px-4 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 relative flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={
                            conv.listing.images[0].image_url ||
                            "/placeholder-image.jpg"
                          }
                          alt={conv.listing.title}
                          width={56}
                          height={56}
                          style={{ objectFit: "cover" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-medium text-gray-900 truncate">
                            {conv.listing.title}
                          </h3>
                          {conv.unread_count > 0 && (
                            <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full font-medium">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">
                          with{" "}
                          <span className="text-blue-600">
                            {conv.other_participant?.nickname}
                          </span>
                        </p>
                        {conv.last_message && (
                          <p className="text-sm text-gray-600 truncate mt-1">
                            {conv.last_message.sender.nickname}:{" "}
                            <span className="text-gray-500">
                              {conv.last_message.content}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
