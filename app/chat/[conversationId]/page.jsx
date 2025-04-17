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
      const refreshed = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );
      setMessages(refreshed.data);
      setPendingOffer(null);
    } catch (err) {
      console.error("Failed to cancel offer", err);
    }
  };

  // Validate offer amount
  const isValidOffer = (amount) => {
    const numAmount = parseFloat(amount);
    return !isNaN(numAmount) && numAmount > 0;
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
        // Create message with offer
        const res = await api.post("/api/chat/messages/", {
          conversation: conversationId,
          sender_id: user?.id,
          content: `Made offer: A$${offerAmount}`,
          message_type: "text",
          is_offer: true,
          price: offerAmount,
        });

        setMessages((prev) => [...prev, res.data]);
        setPendingOffer(res.data.offer);
        setShowOfferInput(false);
      } else {
        // Create regular message
        const res = await api.post("/api/chat/messages/", {
          conversation: conversationId,
          sender_id: user?.id,
          content: trimmed,
          message_type: "text",
        });

        setMessages((prev) => [...prev, res.data]);
        setInput("");
      }
    } catch (err) {
      console.error("Send message failed", err);
    }
  };

  // Respond to offer (accept/reject)
  const respondToOffer = async (offerId, newStatus) => {
    try {
      // Check if user is the seller
      if (user?.id !== conversation?.listing?.seller_id) {
        throw new Error("Only the listing owner can respond to offers");
      }

      const action = newStatus === "Accepted" ? "accept" : "reject";
      const endpoint = `/api/offers/${offerId}/${action}/`;

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
      alert(err.message || "Failed to respond to offer. Please try again.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const MessageBubble = ({ msg, isMe }) => {
    const isOffer = msg.is_offer && msg.offer;
    const isSeller = user?.id === conversation?.listing?.seller_id;

    if (isOffer && msg.offer) {
      const offer = msg.offer;

      // Determine the background color based on offer status
      const getStatusColor = () => {
        switch (offer?.status) {
          case "Accepted":
            return "bg-green-100 border-green-300 text-green-800";
          case "Rejected":
            return "bg-red-100 border-red-300 text-red-800";
          default:
            return "bg-yellow-100 border-yellow-300 text-yellow-800";
        }
      };

      return (
        <div className="flex justify-center my-4">
          <div
            className={`${getStatusColor()} border p-4 rounded-lg text-center shadow-sm max-w-sm w-full`}
          >
            <p className="text-md font-bold mb-1">Offer: A${offer?.price}</p>
            <p className="text-sm">
              Status: <span className="font-semibold">{offer?.status}</span>
            </p>
            {/* Only show accept/reject buttons if user is the seller and offer is pending */}
            {isSeller && offer?.status === "Pending" && (
              <div className="flex justify-center mt-3 gap-2">
                <button
                  onClick={() => respondToOffer(offer?.id, "Accepted")}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondToOffer(offer?.id, "Rejected")}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                >
                  Decline
                </button>
              </div>
            )}
            <p className="text-xs mt-2 opacity-70">
              {dayjs(msg.created_at).format("h:mm A")}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
        <div
          className={`w-[80%] relative px-4 py-2.5 ${
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
            {user?.id !== conversation?.listing?.seller_id && (
              <div className="mt-3">
                {!pendingOffer ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        A$
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
                      Make offer
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => cancelOffer(pendingOffer.id)}
                      className="flex-1 py-2 px-3 bg-gray-100 rounded text-sm font-medium text-gray-700 hover:bg-gray-200"
                    >
                      Cancel offer
                    </button>
                    <button className="flex-1 py-2 px-3 bg-gray-100 rounded text-sm font-medium text-gray-700">
                      A$ {pendingOffer.price}
                    </button>
                    <button
                      onClick={() => {
                        setOfferAmount(pendingOffer.price.toString());
                        setShowOfferInput(true);
                      }}
                      className="flex-1 py-2 px-3 bg-gray-100 rounded text-sm font-medium text-gray-700 hover:bg-gray-200"
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
                onKeyDown={handleKeyDown}
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
    </div>
  );
}
