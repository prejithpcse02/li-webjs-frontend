"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import dayjs from "dayjs";
import Image from "next/image";
import EmojiPicker from "emoji-picker-react";
import Link from "next/link";

export default function ChatDetailPage() {
  const router = useRouter();
  const { conversationId } = useParams();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [processedMessages, setProcessedMessages] = useState([]);
  const [input, setInput] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [listingReviews, setListingReviews] = useState([]);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [lastMessageId, setLastMessageId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const bottomRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const isBuyer = user?.id !== conversation?.listing?.seller_id;

  const quickReplies = [
    "Yes, I'm interested",
    "No, thank you",
    "Can you send more details?",
    "What's the best price?",
    "Is this still available?",
    "When can I see it?",
    "Can you share the location?",
  ];

  // Check if user has already reviewed
  useEffect(() => {
    const checkExistingReview = async () => {
      if (conversation?.listing && user?.id) {
        try {
          const response = await api.get("/api/reviews/my-reviews/");
          const existingReview = response.data.find(
            (review) =>
              review.reviewed_product === conversation.listing.product_id &&
              review.reviewed_user === conversation.listing.seller_id
          );
          setHasReviewed(!!existingReview);
        } catch (error) {
          console.error("Error checking existing review:", error);
        }
      }
    };

    checkExistingReview();
  }, [conversation?.listing, user?.id]);

  useEffect(() => {
    if (conversationId) {
      setIsLoading(true);

      // Create an AbortController for cleanup
      const controller = new AbortController();
      const signal = controller.signal;

      // Function to check auth and fetch data
      const fetchData = async () => {
        try {
          // Check if we have a valid token
          const token = localStorage.getItem("token");
          if (!token) {
            router.push("/auth/signin");
            return;
          }

          // Set token in headers
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Fetch conversation and messages in parallel
          const [conversationRes, messagesRes] = await Promise.all([
            api.get(`/api/chat/conversations/${conversationId}/`, { signal }),
            api.get(`/api/chat/conversations/${conversationId}/messages/`, {
              signal,
            }),
          ]);

          // Set conversation and messages data
          setConversation(conversationRes.data);
          setMessages(messagesRes.data);
          setOfferAmount(
            conversationRes.data?.listing?.price?.toString() || ""
          );

          // Set pending offer
          const latestPendingOffer =
            messagesRes.data
              .filter((msg) => msg.is_offer && msg.offer?.status === "Pending")
              .pop()?.offer || null;
          setPendingOffer(latestPendingOffer);

          // Fetch reviews for both buyer and seller if we have a product ID
          if (conversationRes.data?.listing?.product_id) {
            try {
              const reviewsRes = await api.get(
                `/api/reviews/listing/${conversationRes.data.listing.product_id}/`,
                { signal }
              );
              setListingReviews(reviewsRes.data);

              // Check if user has already reviewed
              const userReview = reviewsRes.data.find(
                (review) => review.reviewer === user?.id
              );
              setHasReviewed(!!userReview);
            } catch (reviewError) {
              console.error("Error fetching reviews:", reviewError);
              // Continue even if reviews fail to load
            }
          }

          // Only set loading to false after all data is loaded
          setIsLoading(false);
        } catch (error) {
          if (!signal.aborted) {
            console.error("Failed to fetch data:", error);
            if (error.response?.status === 401) {
              // Try to refresh the token
              try {
                const refreshToken = localStorage.getItem("refreshToken");
                if (refreshToken) {
                  const response = await api.post("/api/token/refresh/", {
                    refresh: refreshToken,
                  });
                  localStorage.setItem("token", response.data.access);
                  api.defaults.headers.common[
                    "Authorization"
                  ] = `Bearer ${response.data.access}`;
                  // Retry the fetch
                  fetchData();
                  return;
                }
              } catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                router.push("/auth/signin");
                return;
              }
            }
          }
          // Set loading to false even if there's an error
          setIsLoading(false);
        }
      };

      fetchData();

      // Cleanup function
      return () => {
        controller.abort();
      };
    }
  }, [conversationId, user, router]);

  // Auto-refresh messages
  useEffect(() => {
    if (conversationId && !isLoading) {
      // Set up interval to check for new messages
      refreshIntervalRef.current = setInterval(async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) return;

          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Only fetch the latest messages
          const response = await api.get(
            `/api/chat/conversations/${conversationId}/messages/`
          );

          // Check if we have new messages
          if (response.data.length > messages.length) {
            setMessages(response.data);

            // Update pending offer if needed
            const latestPendingOffer =
              response.data
                .filter(
                  (msg) => msg.is_offer && msg.offer?.status === "Pending"
                )
                .pop()?.offer || null;

            if (
              JSON.stringify(latestPendingOffer) !==
              JSON.stringify(pendingOffer)
            ) {
              setPendingOffer(latestPendingOffer);
            }

            // Scroll to bottom if we're already at the bottom
            if (bottomRef.current) {
              const scrollPosition = window.innerHeight + window.scrollY;
              const documentHeight = document.documentElement.scrollHeight;
              const isAtBottom = scrollPosition >= documentHeight - 100;

              if (isAtBottom) {
                setTimeout(() => {
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }
            }
          }
        } catch (error) {
          console.error("Error refreshing messages:", error);
        }
      }, 5000); // Check every 10 seconds

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [conversationId, messages.length, pendingOffer, isLoading]);

  // Process messages when they change
  useEffect(() => {
    if (messages.length > 0) {
      // Create a Set to track unique offer IDs
      const seenOfferIds = new Set();

      const processed = messages
        .map((msg, index) => {
          // For offer messages, check if we've already seen this offer
          if (msg.is_offer && msg.offer) {
            if (seenOfferIds.has(msg.offer.id)) {
              return null; // Skip duplicate offers
            }
            seenOfferIds.add(msg.offer.id);
          }

          return {
            ...msg,
            key: `${msg.id}-${index}`,
            isMe: msg.sender.id === user?.id,
          };
        })
        .filter(Boolean); // Remove null entries

      setProcessedMessages(processed);

      // Update last message ID
      if (processed.length > 0) {
        setLastMessageId(processed[processed.length - 1].id);
      }
    }
  }, [messages, user]);

  // Add message caching
  const cachedMessages = useMemo(() => {
    return processedMessages;
  }, [processedMessages]);

  // Optimize message rendering
  const renderMessages = useCallback(() => {
    return cachedMessages.map((msg) => (
      <MessageBubble key={msg.key} msg={msg} isMe={msg.isMe} />
    ));
  }, [cachedMessages]);

  // Optimize review rendering
  /*const renderReviews = useCallback(() => {
    if (cachedReviews.length > 0) {
      return (
        <div className="bg-white p-4 border-t">
          <h3 className="text-lg font-semibold mb-3">
            Reviews for this listing
          </h3>
          {cachedReviews.map((review) => (
            <div key={review.id} className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-blue-800">
                  {review.reviewer_username} left a review
                </p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < review.rating ? "text-yellow-400" : "text-gray-300"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>
              </div>
              {review.review_text && (
                <p className="text-blue-800 italic">"{review.review_text}"</p>
              )}
              <p className="text-sm text-gray-500 mt-2">
                {dayjs(review.created_at).format("MMM D, YYYY")}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  }, [cachedReviews]);*/

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isValidOffer = (amount) =>
    !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

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
          // Create a temporary message for immediate display
          const tempId = `temp-${Date.now()}`;
          const tempMessage = {
            id: tempId,
            content: `Made offer: ₹${offerAmount}`,
            created_at: new Date().toISOString(),
            sender: { id: user?.id, nickname: user?.nickname || "You" },
            is_offer: true,
            offer: {
              id: tempId,
              price: parseFloat(offerAmount),
              status: "Pending",
            },
            key: `${tempId}-${messages.length}`,
            isMe: true,
            isTemp: true,
          };

          // Optimistically update UI
          setMessages((prev) => [...prev, tempMessage]);

          // Create new offer in the background
          const res = await api.post("/api/chat/messages/", {
            conversation: parseInt(conversationId),
            sender_id: user?.id,
            content: `Made offer: ₹${offerAmount}`,
            message_type: "text",
            is_offer: true,
            price: parseFloat(offerAmount),
          });

          // Update with the real message from the server
          setMessages((prev) => {
            const updatedMessages = prev.filter((msg) => msg.id !== tempId);
            return [
              ...updatedMessages,
              {
                ...res.data,
                key: `${res.data.id}-${updatedMessages.length}`,
                isMe: true,
              },
            ];
          });

          setPendingOffer(res.data.offer);
          setShowOfferInput(false);

          // Scroll to bottom
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      } else {
        // Create a temporary message for immediate display
        const tempId = `temp-${Date.now()}`;
        const tempMessage = {
          id: tempId,
          content: trimmed,
          created_at: new Date().toISOString(),
          sender: { id: user?.id, nickname: user?.nickname || "You" },
          is_offer: false,
          key: `${tempId}-${messages.length}`,
          isMe: true,
          isTemp: true,
        };

        // Optimistically update UI
        setMessages((prev) => [...prev, tempMessage]);
        setInput("");

        // Create regular message in the background
        const res = await api.post("/api/chat/messages/", {
          conversation: parseInt(conversationId),
          sender_id: user?.id,
          content: trimmed,
          message_type: "text",
          is_offer: false,
        });

        // Update with the real message from the server
        setMessages((prev) => {
          const updatedMessages = prev.filter((msg) => msg.id !== tempId);
          return [
            ...updatedMessages,
            {
              ...res.data,
              key: `${res.data.id}-${updatedMessages.length}`,
              isMe: true,
            },
          ];
        });

        // Scroll to bottom
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err) {
      console.error("Send message failed", err);

      // Remove the temporary message if there was an error
      setMessages((prev) => prev.filter((msg) => !msg.isTemp));

      alert(
        err.response?.data?.error || "Failed to send message. Please try again."
      );
    }
  };

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

  const cancelOffer = async (offerId) => {
    try {
      await api.post(`/api/offers/${offerId}/cancel/`);
      const refreshed = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );
      setMessages(refreshed.data);
      setPendingOffer(null);

      // Update conversation count in parent component
      if (typeof window !== "undefined") {
        const event = new CustomEvent("chatUpdated", {
          detail: { conversationId: parseInt(conversationId) },
        });
        window.dispatchEvent(event);
      }
    } catch (err) {
      alert("Cancel failed");
    }
  };

  const respondToOffer = async (offerId, action) => {
    try {
      if (user?.id !== conversation?.listing?.seller_id)
        throw new Error("Not seller");

      // Optimistically update the UI
      const updatedMessages = messages.map((msg) => {
        if (msg.is_offer && msg.offer?.id === offerId) {
          return {
            ...msg,
            offer: {
              ...msg.offer,
              status: action,
            },
          };
        }
        return msg;
      });

      // Update the messages state immediately
      setMessages(updatedMessages);

      // Update pending offer state if needed
      if (pendingOffer?.id === offerId) {
        setPendingOffer(null);
      }

      // Make the API request
      await api.post(`/api/offers/${offerId}/${action.toLowerCase()}/`);

      // Refresh messages to ensure consistency
      const refreshed = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );
      setMessages(refreshed.data);

      // Update conversation count in parent component
      if (typeof window !== "undefined") {
        const event = new CustomEvent("chatUpdated", {
          detail: { conversationId: parseInt(conversationId) },
        });
        window.dispatchEvent(event);
      }
    } catch (err) {
      // Revert the optimistic update on error
      const refreshed = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );
      setMessages(refreshed.data);
      alert("Failed to respond");
    }
  };

  const submitReview = async () => {
    try {
      // Check if already reviewed
      if (hasReviewed) {
        alert("You have already reviewed this seller for this product.");
        setShowReviewModal(false);
        return;
      }

      setIsSubmittingReview(true);

      // Check if we have a valid token
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      // Set token in headers
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      // Submit the review
      const reviewResponse = await api.post("/api/reviews/", {
        reviewed_user: conversation.listing.seller_id,
        reviewed_product: conversation.listing.product_id,
        rating: parseInt(reviewRating),
        review_text: reviewText.trim() || null,
      });

      // Refresh messages to get the new review message
      const messagesResponse = await api.get(
        `/api/chat/conversations/${conversationId}/messages/`
      );

      // Update states
      setMessages(messagesResponse.data);
      setListingReviews((prev) => [...prev, reviewResponse.data]);
      setHasReviewed(true);
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewText("");

      // Scroll to bottom to show the new review
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });

      alert("Thank you for your review!");
    } catch (error) {
      console.error("Failed to submit review:", error);
      if (error.response?.data?.error) {
        alert(error.response.data.error);
        if (error.response.data.error.includes("already reviewed")) {
          setHasReviewed(true);
          setShowReviewModal(false);
        }
      } else if (
        !conversation?.listing?.seller_id ||
        !conversation?.listing?.product_id
      ) {
        alert("Missing required listing information. Please try again later.");
      } else {
        alert("Failed to submit review. Please try again.");
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleEmojiClick = (emojiObject) => {
    setInput((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleQuickReply = (reply) => {
    setInput(reply);
    setShowQuickReplies(false);
    // Focus the input after setting the value
    const inputElement = document.querySelector(
      'input[placeholder="Type here..."]'
    );
    if (inputElement) {
      inputElement.focus();
    }
  };

  const formatTimestamp = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return messageDate.toLocaleDateString();
  };

  const MessageBubble = ({ msg, isMe }) => {
    const isOffer = msg.is_offer && msg.offer;
    const isSeller = user?.id === conversation?.listing?.seller_id;
    const isReview =
      msg.review_data ||
      (typeof msg.content === "string" &&
        msg.content.includes("left a review:"));

    if (isReview) {
      const reviewData = msg.review_data || {
        rating: parseInt(msg.content.match(/(\d+) ★/)?.[1] || 0),
        review_text: msg.content.split(" - ")[1] || null,
        reviewer_username: msg.sender.nickname,
      };

      return (
        <div className="flex justify-center my-4">
          <div className="border p-4 rounded-lg text-center shadow-sm max-w-sm w-full bg-blue-50 border-blue-200">
            {isSeller ? (
              <>
                <p className="text-blue-800 font-medium mb-2">
                  {msg.sender.id === user.id ? (
                    "You received a review!"
                  ) : (
                    <>
                      <Link
                        href={`/profiles/${reviewData.reviewer_username}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {reviewData.reviewer_username}
                      </Link>{" "}
                      left you a review!
                    </>
                  )}
                </p>
                <div className="flex justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < reviewData.rating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>
                {reviewData.review_text && (
                  <p className="text-blue-800 mt-2 italic">
                    "{reviewData.review_text}"
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-blue-800 font-medium">
                  {msg.sender.id === user.id
                    ? "You left a review"
                    : `${reviewData.reviewer_username} left a review`}
                </p>
                <div className="flex justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={
                        i < reviewData.rating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }
                    >
                      ★
                    </span>
                  ))}
                </div>
                {reviewData.review_text && (
                  <p className="text-blue-800 mt-2 italic">
                    "{reviewData.review_text}"
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      );
    }

    if (isOffer) {
      let statusColor = "";
      let statusBadgeColor = "";
      switch (msg.offer.status) {
        case "Accepted":
          statusColor = "bg-green-100 border-green-200 text-green-800";
          statusBadgeColor = "bg-green-500 text-white";
          break;
        case "Rejected":
          statusColor = "bg-red-100 border-red-200 text-red-800";
          statusBadgeColor = "bg-red-500 text-white";
          break;
        case "Cancelled":
          statusColor = "bg-gray-100 border-gray-200 text-gray-800";
          statusBadgeColor = "bg-gray-500 text-white";
          break;
        default:
          statusColor = "bg-yellow-100 border-yellow-200 text-yellow-800";
          statusBadgeColor = "bg-yellow-500 text-white";
      }

      return (
        <div className="flex justify-center my-3">
          <div
            className={`border p-3 rounded-lg w-full max-w-sm ${statusColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColor}`}
              >
                {msg.offer.status}
              </span>
              <span className="text-xs text-gray-600">
                {formatTimestamp(msg.created_at)}
              </span>
            </div>
            <div className="text-center mb-2">
              <p className="text-sm text-gray-600">
                Offer Made by {msg.sender.nickname}
              </p>
              <p className="font-medium text-lg">₹{msg.offer.price}</p>
            </div>

            {isSeller && msg.offer.status === "Pending" && (
              <div className="mt-3 flex gap-2 justify-center">
                <button
                  onClick={() => respondToOffer(msg.offer.id, "Accept")}
                  className="bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-green-600"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondToOffer(msg.offer.id, "Reject")}
                  className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-red-600"
                >
                  Decline
                </button>
              </div>
            )}

            {!isSeller && msg.offer.status === "Pending" && (
              <div className="mt-3 text-center">
                <button
                  onClick={() => cancelOffer(msg.offer.id)}
                  className="bg-gray-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-600"
                >
                  Cancel Offer
                </button>
              </div>
            )}

            {!isSeller &&
              msg.offer.status === "Accepted" &&
              !hasReviewed &&
              !messages.some((m) => m.review_data) && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowReviewModal(true)}
                    className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-600"
                  >
                    Review Seller
                  </button>
                </div>
              )}

            {!isSeller &&
              msg.offer.status === "Accepted" &&
              (hasReviewed || messages.some((m) => m.review_data)) && (
                <div className="mt-3 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Review Submitted
                  </div>
                </div>
              )}
          </div>
        </div>
      );
    }

    return (
      <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-2`}>
        <div
          className={`px-3 py-2 max-w-[75%] rounded-2xl ${
            isMe
              ? "bg-blue-500 text-white ml-12"
              : "bg-gray-100 text-gray-900 mr-12"
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          <div className="flex items-center justify-end gap-1 mt-1">
            <p
              className={`text-[10px] ${
                isMe ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {formatTimestamp(msg.created_at)}
            </p>
            {isMe && (
              <span className="text-[10px] text-blue-100">
                {msg.status === "read" ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const filteredMessages = searchQuery
    ? messages.filter((msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  if (isLoading) {
    return (
      <div className="flex justify-center bg-gray-100 min-h-screen">
        <div className="w-full max-w-[480px] bg-white shadow-md flex flex-col h-screen">
          {/* Header with back button and title */}
          <div className="sticky top-0 bg-white border-b z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
              <h1 className="text-lg font-semibold text-gray-800">Chat</h1>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </button>
            </div>

            {/* Search Bar */}
            {showSearch && (
              <div className="px-4 py-2 border-b">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full px-4 py-2 pl-10 bg-gray-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Product Info Loading Placeholder */}
            <div className="px-4 py-3 border-b bg-white">
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2 mt-2"></div>
                </div>
                <div className="w-14 h-14 flex-shrink-0 bg-gray-200 rounded-md animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Messages Loading Placeholder */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading conversation...</p>
              </div>
            </div>
          </div>

          {/* Input Loading Placeholder */}
          <div className="border-t bg-white">
            <div className="p-4 flex items-center gap-2">
              <div className="flex-1 h-10 bg-gray-200 rounded-full animate-pulse"></div>
              <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center bg-gray-100 min-h-screen">
      <div className="w-full max-w-[480px] bg-white shadow-md flex flex-col h-screen">
        {/* Header with back button and title */}
        <div className="sticky top-0 bg-white border-b z-10">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <button
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-800"
            >
              ✕
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Chat</h1>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="px-4 py-2 border-b">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full px-4 py-2 pl-10 bg-gray-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Product Info */}
          <div className="px-4 py-3 border-b bg-white">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-base truncate">
                  {conversation?.listing?.title}
                </h2>
                <Link
                  href={`/profiles/${conversation?.other_participant?.nickname}`}
                  className="text-sm text-blue-600 hover:text-blue-800 mt-0.5"
                >
                  {conversation?.other_participant?.nickname}
                </Link>
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
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {processedMessages.map((msg) => (
            <MessageBubble
              key={msg.key}
              msg={msg}
              isMe={msg.sender.id === user?.id}
            />
          ))}
          <div ref={bottomRef} />
          {isRefreshing && (
            <div className="flex justify-center my-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>

        {/* Quick Replies */}
        {showQuickReplies && (
          <div className="border-t bg-white p-2 quick-replies">
            <div className="flex gap-2 overflow-x-auto py-2">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  onClick={() => {
                    setInput(reply);
                    // Keep the quick replies visible
                    const inputElement = document.querySelector(
                      'input[placeholder="Type here..."]'
                    );
                    if (inputElement) {
                      inputElement.focus();
                    }
                  }}
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm whitespace-nowrap hover:bg-gray-200"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t bg-white">
          <div className="p-4 flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"
                  />
                </svg>
              </button>
              {showEmojiPicker && (
                <div
                  ref={emojiPickerRef}
                  className="absolute bottom-full left-0 mb-2 z-50"
                >
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={300}
                    height={400}
                    theme="light"
                  />
                </div>
              )}
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (e.target.value !== "") {
                  setShowQuickReplies(false);
                }
              }}
              onFocus={() => setShowQuickReplies(true)}
              onBlur={(e) => {
                // Delay hiding quick replies to allow for click handling
                setTimeout(() => {
                  if (!e.relatedTarget?.closest(".quick-replies")) {
                    setShowQuickReplies(false);
                  }
                }, 100);
              }}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 border rounded-full px-4 py-2 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              placeholder="Type here..."
            />
            <button
              onClick={() => sendMessage()}
              className="p-2 text-gray-600 hover:text-gray-800"
              disabled={!input.trim()}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-xl w-full max-w-md mx-4">
              <h2 className="text-xl font-semibold mb-4 text-gray-800">
                Review Seller
              </h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className={`text-2xl transition-colors ${
                        star <= reviewRating
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Review
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full border rounded-lg p-3 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Write your review..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitReview}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmittingReview}
                >
                  {isSubmittingReview ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
