// li-web/components/LikeButton.tsx
import React, { useState, useEffect } from "react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useRouter } from "next/navigation";
import { listingAPI } from "@/services/listingAPI";
import { toast } from "react-hot-toast";

const LikeButton = ({ slug, listingId, initialIsLiked, onLikeChange }) => {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsLiked(initialIsLiked);
  }, [initialIsLiked]);

  const handleLike = async () => {
    if (isLoading) return;

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth/signin");
      return;
    }

    // Optimistically update the UI
    const previousState = isLiked;
    setIsLiked(!previousState);
    onLikeChange?.(!previousState);

    setIsLoading(true);
    try {
      await listingAPI.toggleLike(slug, listingId, previousState);
      toast.success(
        !previousState ? "Added to favorites" : "Removed from favorites"
      );
    } catch (error) {
      // Revert the optimistic update on error
      setIsLiked(previousState);
      onLikeChange?.(previousState);

      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        router.push("/auth/signin");
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to perform this action");
      } else {
        toast.error("Failed to update favorite status. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleLike();
      }}
      disabled={isLoading}
      className={`p-2 rounded-full ${
        isLiked
          ? "text-red-500 hover:text-red-600"
          : "text-gray-400 hover:text-gray-500"
      } transition-colors duration-200`}
    >
      {isLiked ? <FaHeart size={20} /> : <FaRegHeart size={20} />}
    </button>
  );
};

export default LikeButton;
