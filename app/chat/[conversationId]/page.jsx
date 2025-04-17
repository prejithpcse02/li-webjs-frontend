"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import dayjs from "dayjs"; // install if needed: npm i dayjs
import Image from "next/image";

export default function ChatDetailPage() {
  const router = useRouter();
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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

  // Scroll to bottom when new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle message send
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    try {
      const res = await api.post("/api/chat/messages/", {
        conversation: conversationId,
        sender_id: user.id,
        content: trimmed,
        message_type: "text",
      });
      setMessages((prev) => [...prev, res.data]);
      setInput("");
    } catch (error) {
      console.error("Send message failed:", error);
    }
  };

  // Send on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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
              <button className="flex-1 py-2 px-3 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                Cancel offer
              </button>
              <button className="flex-1 py-2 px-3 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                A$ {conversation?.listing?.price}
              </button>
              <button className="flex-1 py-2 px-3 bg-gray-100 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                Amend offer
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[calc(100vh-280px)]">
          {messages.map((msg) => {
            const isMe = msg.sender.id === user.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
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
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="sticky bottom-0 border-t bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type here..."
              className="flex-1 py-2.5 px-4 bg-gray-100 rounded-full text-[15px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
            <button
              onClick={sendMessage}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
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
      </div>
    </div>
  );
}
