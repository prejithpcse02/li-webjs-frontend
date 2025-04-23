"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

// Client component that uses useSearchParams
function ChatListContent() {
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
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
            </div>
            <h1 className="text-xl font-semibold text-gray-800">
              {listing ? `Chats for ${listing.title}` : "Your Chats"}
            </h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Chat List */}
        <div className="divide-y">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No conversations found</p>
            </div>
          ) : (
            filteredConversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/chat/${conversation.id}`}
                className="block hover:bg-gray-50 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {conversation.other_participant?.avatar ? (
                        <Image
                          src={conversation.other_participant.avatar}
                          alt={conversation.other_participant.nickname}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500">
                            {conversation.other_participant?.nickname
                              ?.charAt(0)
                              .toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.other_participant?.nickname ||
                          "Unknown User"}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.listing?.title || "No listing"}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
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

// Main page component with Suspense boundary
export default function ChatListPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="text-center px-4">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-100 border-t-gray-600 mx-auto mb-4" />
            <p className="text-gray-800 font-medium">Loading...</p>
          </div>
        </div>
      }
    >
      <ChatListContent />
    </Suspense>
  );
}
