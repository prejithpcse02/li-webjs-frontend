import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import Chat from "@/components/Chat";

const Messages = () => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await api.get("/api/chat/conversations/");
        setConversations(response.data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    if (user) {
      fetchConversations();
    }
  }, [user]);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-4">Conversations</h2>
          <div className="space-y-4">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 rounded-lg cursor-pointer transition-colors ${
                  selectedConversation?.id === conversation.id
                    ? "bg-blue-50"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">
                      {conversation.listing.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      with {conversation.other_participant.username}
                    </p>
                  </div>
                  {conversation.unread_count > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {conversation.unread_count}
                    </span>
                  )}
                </div>
                {conversation.last_message && (
                  <p className="text-sm text-gray-500 mt-2 truncate">
                    {conversation.last_message.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="md:col-span-2">
          {selectedConversation ? (
            <Chat
              listing={selectedConversation.listing}
              onClose={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
