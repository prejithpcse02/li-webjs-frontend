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

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/signin");
        return;
      }

      // Log the current state for debugging
      console.log(
        `LikeButton: Current state - isLiked: ${isLiked}, listingId: ${listingId}`
      );

      try {
        await listingAPI.toggleLike(slug, listingId, isLiked);
        // If successful, toggle the state
        setIsLiked(!isLiked);
        onLikeChange?.(!isLiked);
        toast.success(
          isLiked ? "Removed from favorites" : "Added to favorites"
        );
      } catch (error) {
        // If we get a 400 error saying the listing is already liked/unliked,
        // we can treat this as a success since the end state is what we want
        if (error.response?.status === 400) {
          const errorMessage = error.response.data?.error || "";
          if (
            errorMessage.includes("already liked") ||
            errorMessage.includes("not liked")
          ) {
            // The backend state is already what we want, so update our local state
            setIsLiked(!isLiked);
            onLikeChange?.(!isLiked);
            toast.success(
              isLiked ? "Removed from favorites" : "Added to favorites"
            );
            return;
          }
        }
        throw error; // Re-throw other errors to be handled below
      }
    } catch (error) {
      console.error("Error toggling like:", error);

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
