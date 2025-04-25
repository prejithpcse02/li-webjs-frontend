import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import LikeButton from "./LikeButton";
import axios from "axios";

const ListingCard = ({ item }) => {
  const {
    product_id,
    slug,
    title,
    description,
    price,
    condition,
    location,
    status,
    created_at,
    seller_name,
    images,
    main_image,
    is_liked: initialIsLiked,
    likes_count: initialLikesCount,
  } = item;

  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [imageError, setImageError] = useState(false);

  const handleLikeChange = async (newIsLiked) => {
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
  };

  // Get image URL with safety check - prioritize main_image over images array
  const getImageUrl = () => {
    // First try to use main_image if available
    if (main_image) {
      console.log(`Using main_image for listing ${product_id}: ${main_image}`);
      return main_image;
    }

    // Check if there's a primary image in the images array
    if (images && images.length > 0) {
      const primaryImage = images.find((img) => img.is_primary === true);
      if (primaryImage && primaryImage.image_url) {
        console.log(
          `Using primary image for listing ${product_id}: ${primaryImage.image_url}`
        );
        const url = primaryImage.image_url;
        if (url.startsWith("http") || url.startsWith("/")) {
          return url;
        } else {
          return `/${url}`;
        }
      }

      // Fall back to first image in the array
      if (images[0].image_url) {
        console.log(
          `Using first image for listing ${product_id}: ${images[0].image_url}`
        );
        const url = images[0].image_url;
        if (url.startsWith("http") || url.startsWith("/")) {
          return url;
        } else {
          return `/${url}`;
        }
      }
    }

    // Log the problem and use fallback
    console.log(`No image found for listing ${product_id}, using placeholder`);
    // Fallback to placeholder
    return "/placeholder-image.jpg";
  };

  return (
    <div className="w-full">
      <div className="h-full bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border-[1px] border-gray-300 shadow-gray-200 overflow-hidden z-30">
        <div className="relative aspect-square">
          <div className="absolute top-2 right-2 z-40 p-[1px] bg-gray-100 rounded-full">
            <LikeButton
              slug={slug}
              listingId={product_id}
              initialIsLiked={isLiked}
              onLikeChange={handleLikeChange}
            />
          </div>
          <Link
            href={`/listings/${
              slug ||
              title?.toLowerCase().replace(/\s+/g, "-").slice(0, 25) ||
              "item"
            }/${product_id}`}
          >
            <div className="w-full h-full flex items-center justify-center overflow-hidden border-b-[1px] border-gray-200">
              {!imageError ? (
                <img
                  src={getImageUrl()}
                  alt={title}
                  className="w-full h-full object-contain"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    backgroundColor: "#f8f8f8",
                  }}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-500">No Image Available</span>
                </div>
              )}
            </div>
          </Link>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px]">
            {title}
          </h3>
          <div className="flex flex-row justify-between items-center mt-2">
            <span className="text-lg font-bold text-primary">₹{price}</span>
            <div className="flex items-center space-x-2">
              {/*<span className="text-sm text-gray-500">{likesCount} likes</span>*/}
              <Link
                href={`/profiles/${seller_name}`}
                className="text-xs font-medium text-blue-600 z-10"
              >
                {seller_name}
              </Link>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center mt-2 text-xs text-gray-500">
            <span
              className="text-gray-600 max-w-[55%] truncate"
              title={location}
            >
              {location}
            </span>
            <span className="font-semibold text-gray-800 ml-2">
              {new Date(created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
