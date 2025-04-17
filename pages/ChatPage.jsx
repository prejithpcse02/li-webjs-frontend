import React, { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import { chatAPI } from "../services/chatAPI";
import { offerAPI } from "../services/offerAPI";

const ChatPage = () => {
  const { conversationId } = useParams();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentOffer, setCurrentOffer] = useState(null);
  const messagesEndRef = useRef(null);

  const { offerId, amount, listingId, sellerId } = location.state || {};

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const fetchedMessages = await chatAPI.getMessages(conversationId);
        setMessages(fetchedMessages);
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();
    // Set up polling for new messages
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchOfferDetails = async () => {
      if (offerId) {
        try {
          const offers = await offerAPI.getOffers(listingId);
          const currentOffer = offers.find((offer) => offer.id === offerId);
          if (currentOffer) {
            setCurrentOffer(currentOffer);
          }
        } catch (error) {
          console.error("Error fetching offer details:", error);
        }
      }
    };

    fetchOfferDetails();
  }, [offerId, listingId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const sentMessage = await chatAPI.sendMessage(conversationId, newMessage);
      setMessages([...messages, sentMessage]);
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleAcceptOffer = async () => {
    try {
      await offerAPI.acceptOffer(currentOffer.id);
      // Add a system message about the accepted offer
      const systemMessage = {
        id: Date.now(),
        content: `Offer of ₹${currentOffer.amount} has been accepted`,
        type: "system",
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages, systemMessage]);
    } catch (error) {
      console.error("Error accepting offer:", error);
    }
  };

  const handleRejectOffer = async () => {
    try {
      await offerAPI.rejectOffer(currentOffer.id);
      // Add a system message about the rejected offer
      const systemMessage = {
        id: Date.now(),
        content: `Offer of ₹${currentOffer.amount} has been rejected`,
        type: "system",
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages, systemMessage]);
    } catch (error) {
      console.error("Error rejecting offer:", error);
    }
  };

  const handleCancelOffer = async () => {
    try {
      await offerAPI.cancelOffer(currentOffer.id);
      // Add a system message about the cancelled offer
      const systemMessage = {
        id: Date.now(),
        content: `Offer of ₹${currentOffer.amount} has been cancelled`,
        type: "system",
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages, systemMessage]);
    } catch (error) {
      console.error("Error cancelling offer:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {currentOffer && (
        <div className="bg-white p-4 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">
                Current Offer: ₹{currentOffer.amount}
              </h3>
              <p className="text-sm text-gray-500">
                Status: {currentOffer.status}
              </p>
            </div>
            <div className="space-x-2">
              {currentOffer.status === "pending" && (
                <>
                  <button
                    onClick={handleAcceptOffer}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleRejectOffer}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                  >
                    Reject
                  </button>
                </>
              )}
              {currentOffer.status === "pending" &&
                currentOffer.isFromCurrentUser && (
                  <button
                    onClick={handleCancelOffer}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === "system"
                ? "justify-center"
                : message.isFromCurrentUser
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.type === "system"
                  ? "bg-gray-200 text-gray-700 mx-auto"
                  : message.isFromCurrentUser
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-800"
              }`}
            >
              <p>{message.content}</p>
              <span className="text-xs opacity-75 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPage;
