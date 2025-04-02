// li-web/components/LikeButton.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useRouter } from "next/navigation";

const LikeButton = ({ slug, listingId, initialIsLiked, onLikeChange }) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  const handleLike = async () => {
    setIsLoading(true);
    try {
      // Get the token from localStorage
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      // Configure axios to include credentials and token
      const config = {
        withCredentials: true,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      };

      if (isLiked) {
        await axios.delete(
          `http://127.0.0.1:8000/api/listings/${slug}/${listingId}/like/`,
          config
        );
        setIsLiked(false);
        onLikeChange?.(false);
      } else {
        await axios.post(
          `http://127.0.0.1:8000/api/listings/${slug}/${listingId}/like/`,
          {},
          config
        );
        setIsLiked(true);
        onLikeChange?.(true);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.removeItem("token");
        router.push("/login");
      } else if (error.response?.status === 403) {
        // Forbidden - user doesn't have permission
        console.error("You don't have permission to perform this action");
      } else {
        console.error("Error toggling like:", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`flex items-center space-x-1 bg-gray-100 border border-gray-200 rounded-full p-1 ${
        isLiked ? "text-red-500" : "text-gray-500"
      } hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isLiked ? "Unlike" : "Like"}
    >
      {isLiked ? <FaHeart size={20} /> : <FaRegHeart size={20} />}
    </button>
  );
};

export default LikeButton;
