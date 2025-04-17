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

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const bottomRef = useRef(null);

  // Fetch conversation + messages
  useEffect(() => {
    if (conversationId) {
      api
        .get(`/api/chat/conversations/${conversationId}/`)
        .then((res) => setConversation(res.data));
      api
        .get(`/api/chat/conversations/${conversationId}/messages/`)
        .then((res) => setMessages(res.data));
    }
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Submit a message (plain or offer)
  const sendMessage = async (isOffer = false, offerAmount = null) => {
    const trimmed = isOffer ? offerAmount : input.trim();
    if (!trimmed) return;

    try {
      if (isOffer) {
        // Create message with offer
        const res = await api.post("/api/chat/messages/", {
          conversation: conversationId,
          sender_id: user.id,
          content: `Made offer: ₹${offerAmount}`,
          message_type: "text",
          is_offer: true,
          price: offerAmount,
        });

        setMessages((prev) => [...prev, res.data]);
        setShowOfferInput(false);
        setOfferAmount("");
      } else {
        // Create regular message
        const res = await api.post("/api/chat/messages/", {
          conversation: conversationId,
          sender_id: user.id,
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
      // Call the appropriate endpoint based on the action
      await api.post(`/api/offers/${offerId}/${newStatus.toLowerCase()}/`);

      // Refresh messages to show the updated offer status
      const refreshed = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );
      setMessages(refreshed.data);
    } catch (err) {
      console.error("Failed to respond to offer", err);
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

    if (isOffer) {
      const offer = msg.offer;

      return (
        <div className="flex justify-center my-4">
          <div className="bg-yellow-100 border border-yellow-300 p-4 rounded-lg text-center shadow-sm max-w-sm w-full">
            <p className="text-md font-bold text-yellow-800 mb-1">
              Offer: ₹{offer.price}
            </p>
            <p className="text-sm text-gray-800">
              Status: <span className="font-semibold">{offer.status}</span>
            </p>
            {user.id !== msg.sender.id && offer.status === "Pending" && (
              <div className="flex justify-center mt-3 gap-2">
                <button
                  onClick={() => respondToOffer(offer.id, "Accepted")}
                  className="bg-green-600 text-white px-3 py-1 rounded-md"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondToOffer(offer.id, "Rejected")}
                  className="bg-red-500 text-white px-3 py-1 rounded-md"
                >
                  Decline
                </button>
              </div>
            )}
            <p className="text-xs text-yellow-700 mt-2">
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
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setShowOfferInput(true)}
                className="flex-1 py-2 px-3 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Make offer
              </button>
              <button className="flex-1 py-2 px-3 bg-gray-100 rounded-md text-sm font-medium text-gray-700">
                ₹ {conversation?.listing?.price}
              </button>
              <button className="flex-1 py-2 px-3 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200">
                Amend offer
              </button>
            </div>
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
