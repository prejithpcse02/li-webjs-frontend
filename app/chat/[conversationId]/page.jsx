"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import dayjs from "dayjs";
import Image from "next/image";

export default function ChatDetailPage() {
  const router = useRouter();
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const bottomRef = useRef(null);

  // Fetch conversation + messages and set initial offer amount
  useEffect(() => {
    if (conversationId) {
      setIsLoading(true);
      Promise.all([
        api.get(`/api/chat/conversations/${conversationId}/`),
        api.get(`/api/chat/conversations/${conversationId}/messages/`),
      ])
        .then(([convRes, msgRes]) => {
          setConversation(convRes.data);
          setMessages(msgRes.data);
          // Set initial offer amount to listing price
          setOfferAmount(convRes.data?.listing?.price?.toString() || "");
          // Find pending offer if exists
          const latestPendingOffer =
            msgRes.data
              .filter((msg) => msg.is_offer && msg.offer?.status === "Pending")
              .pop()?.offer || null;
          setPendingOffer(latestPendingOffer);
        })
        .catch((error) => {
          console.error("Failed to fetch chat data:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cancel offer
  const cancelOffer = async (offerId) => {
    try {
      await api.post(`/api/offers/${offerId}/cancel/`);
      // Refresh messages to show the updated offer status
      const refreshed = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );
      setMessages(refreshed.data);
      setPendingOffer(null);
    } catch (err) {
      console.error("Failed to cancel offer", err);
      alert(
        err.response?.data?.error || "Failed to cancel offer. Please try again."
      );
    }
  };

  // Validate offer amount
  const isValidOffer = (amount) => {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0;
  };

  // Amend offer
  const amendOffer = async (amount) => {
    try {
      // First cancel the existing offer
      await api.post(`/api/offers/${pendingOffer.id}/cancel/`);

      // Then create a new offer
      const res = await api.post("/api/chat/messages/", {
        conversation: parseInt(conversationId),
        sender_id: user?.id,
        content: `Updated offer: ₹${amount}`,
        message_type: "text",
        is_offer: true,
        price: parseFloat(amount),
      });

      setMessages((prev) => [...prev, res.data]);
      setPendingOffer(res.data.offer);
      setShowOfferInput(false);
    } catch (err) {
      console.error("Failed to amend offer", err);
      alert(
        err.response?.data?.error || "Failed to amend offer. Please try again."
      );
    }
  };

  // Submit a message (plain or offer)
  const sendMessage = async (isOffer = false, offerAmount = null) => {
    const trimmed = isOffer ? offerAmount : input.trim();
    if (!trimmed) return;

    try {
      if (isOffer) {
        if (!isValidOffer(offerAmount)) {
          alert("Please enter a valid offer amount greater than 0");
          return;
        }

        if (showOfferInput && pendingOffer) {
          // If we're amending an offer
          await amendOffer(offerAmount);
        } else {
          // Create new offer
          const res = await api.post("/api/chat/messages/", {
            conversation: parseInt(conversationId),
            sender_id: user?.id,
            content: `Made offer: ₹${offerAmount}`,
            message_type: "text",
            is_offer: true,
            price: parseFloat(offerAmount),
          });

          setMessages((prev) => [...prev, res.data]);
          setPendingOffer(res.data.offer);
          setShowOfferInput(false);
        }
      } else {
        // Create regular message
        const res = await api.post("/api/chat/messages/", {
          conversation: parseInt(conversationId),
          sender_id: user?.id,
          content: trimmed,
          message_type: "text",
          is_offer: false,
        });

        setMessages((prev) => [...prev, res.data]);
        setInput("");
      }
    } catch (err) {
      console.error("Send message failed", err);
      alert(
        err.response?.data?.error || "Failed to send message. Please try again."
      );
    }
  };

  // Respond to offer (accept/reject)
  const respondToOffer = async (offerId, action) => {
    try {
      // Check if user is the seller
      if (user?.id !== conversation?.listing?.seller_id) {
        throw new Error("Only the listing owner can respond to offers");
      }

      const endpoint = `/api/offers/${offerId}/${action.toLowerCase()}/`;
      console.log("Calling endpoint:", endpoint);

      const response = await api.post(endpoint);

      if (!response.data) {
        throw new Error("Failed to update offer status");
      }

      // Refresh messages to show the updated offer status
      const refreshed = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );
      setMessages(refreshed.data);
    } catch (err) {
      console.error("Failed to respond to offer", err);
      alert(
        err.response?.data?.error ||
          err.message ||
          "Failed to respond to offer. Please try again."
      );
    }
  };

  // Submit a review for the seller
  const submitReview = async () => {
    if (!conversation?.listing?.seller_id) return;

    try {
      setIsSubmittingReview(true);
      await api.post("/api/reviews/", {
        reviewed_user: conversation.listing.seller_id,
        reviewed_product: conversation.listing.id,
        rating: reviewRating,
        review_text: reviewText,
      });

      setShowReviewModal(false);
      setReviewRating(5);
      setReviewText("");

      // Show success message
      alert("Thank you for your review!");
    } catch (err) {
      console.error("Failed to submit review", err);
      alert(
        err.response?.data?.error ||
          "Failed to submit review. Please try again."
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const MessageBubble = ({ msg, isMe }) => {
    const isOffer = msg.is_offer && msg.offer;
    const isSeller = user?.id === conversation?.listing?.seller_id;

    if (isOffer && msg.offer) {
      const offer = msg.offer;
      const getStatusColor = () => {
        switch (offer?.status) {
          case "Accepted":
            return "bg-green-100 border-green-300 text-green-800";
          case "Rejected":
            return "bg-red-100 border-red-300 text-red-800";
          case "Cancelled":
            return "bg-gray-100 border-gray-300 text-gray-800";
          default:
            return "bg-yellow-100 border-yellow-300 text-yellow-800";
        }
      };

      return (
        <div className="flex justify-center my-4">
          <div
            className={`${getStatusColor()} border p-4 rounded-lg text-center shadow-sm max-w-sm w-full`}
          >
            <p className="text-md font-bold mb-1">Offer: ₹{offer?.price}</p>
            <p className="text-sm">
              Status: <span className="font-semibold">{offer?.status}</span>
            </p>
            {isSeller && offer?.status === "Pending" && (
              <div className="flex justify-center mt-3 gap-2">
                <button
                  onClick={() => respondToOffer(offer?.id, "Accept")}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondToOffer(offer?.id, "Reject")}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Decline
                </button>
              </div>
            )}
            {!isSeller && offer?.status === "Accepted" && (
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Review Seller
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}>
        <div
          className={`relative px-4 py-2 max-w-[80%] ${
            isMe
              ? "bg-blue-500 text-white rounded-[20px] rounded-tr-[5px]"
              : "bg-gray-100 text-gray-900 rounded-[20px] rounded-tl-[5px]"
          }`}
        >
          <p className="text-[15px] leading-relaxed break-words">
            {msg.content}
          </p>
          <p
            className={`text-[11px] mt-1 ${
              isMe ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {dayjs(msg.created_at).format("h:mm A")}
          </p>
        </div>
      </div>
    );
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-[480px] bg-white shadow-lg p-4">
          <div className="flex items-center justify-center h-screen">
            <div className="text-gray-500">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  const isBuyer = user?.id !== conversation?.listing?.seller_id;

  return (
    <div className="flex justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-[480px] bg-white shadow-lg">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center h-14 px-4">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full"
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
            <h1 className="text-lg font-semibold flex-1 text-center">Chat</h1>
          </div>

          {/* Product Info */}
          <div className="px-4 py-3 border-b bg-white">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-base truncate">
                  {conversation?.listing?.title}
                </h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  {conversation?.other_participant?.nickname}
                </p>
              </div>
              <div className="w-14 h-14 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                {conversation?.listing?.images?.[0]?.image_url && (
                  <Image
                    src={conversation.listing.images[0].image_url}
                    alt={conversation.listing.title}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            </div>

            {/* Buyer's Action Bar */}
            {isBuyer && (
              <div className="mt-3">
                {!pendingOffer || showOfferInput ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        ₹
                      </span>
                      <input
                        type="number"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        className="w-full py-2 pl-8 pr-3 bg-gray-100 rounded text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter amount"
                      />
                    </div>
                    <button
                      onClick={() => sendMessage(true, offerAmount)}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                      disabled={!isValidOffer(offerAmount)}
                    >
                      {showOfferInput ? "Update offer" : "Make offer"}
                    </button>
                    {showOfferInput && (
                      <button
                        onClick={() => {
                          setShowOfferInput(false);
                          setOfferAmount(pendingOffer.price.toString());
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => cancelOffer(pendingOffer.id)}
                      className="py-2 px-3 bg-gray-100 rounded text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Cancel offer
                    </button>
                    <div className="py-2 px-3 bg-gray-100 rounded text-sm font-medium text-gray-700 text-center">
                      ₹{pendingOffer.price}
                    </div>
                    <button
                      onClick={() => {
                        setOfferAmount(pendingOffer.price.toString());
                        setShowOfferInput(true);
                      }}
                      className="py-2 px-3 bg-gray-100 rounded text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Amend offer
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[calc(100vh-280px)]">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMe={msg.sender.id === user.id}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Offer Input */}
        {showOfferInput && (
          <div className="border-t bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="Enter offer amount"
                className="flex-1 py-2.5 px-4 bg-gray-100 rounded-lg text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                onClick={() => sendMessage(true, offerAmount)}
                className="px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                disabled={!offerAmount || isNaN(offerAmount)}
              >
                Send Offer
              </button>
              <button
                onClick={() => {
                  setShowOfferInput(false);
                  setOfferAmount("");
                }}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Normal Chat Input */}
        {!showOfferInput && (
          <div className="sticky bottom-0 border-t bg-white px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Type here..."
                className="flex-1 py-2.5 px-4 bg-gray-100 rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
              <button
                onClick={() => sendMessage()}
                className="p-2 hover:bg-gray-100 rounded-full disabled:opacity-50"
                disabled={!input.trim()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Review Seller</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl ${
                      star <= reviewRating ? "text-yellow-400" : "text-gray-300"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Review
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this seller..."
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReviewModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                disabled={isSubmittingReview}
              >
                Cancel
              </button>
              <button
                onClick={submitReview}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
