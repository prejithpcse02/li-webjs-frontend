import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import LikeButton from "./LikeButton";
import axios from "axios";

const ListingCard = ({ item, isAuthenticated }) => {
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
    seller_id,
    images,
    is_liked: initialIsLiked,
    likes_count: initialLikesCount,
  } = item;

  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);

  const handleLikeChange = async (newIsLiked) => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      window.location.href = "/auth/signin";
      return;
    }
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
  };

  return (
    <div className="w-full">
      <div className="h-full bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border-[1px] border-gray-300 shadow-gray-200 overflow-hidden z-30">
        <div className="relative aspect-square">
          {isAuthenticated && (
            <div className="absolute top-2 right-2 z-50">
              <LikeButton
                slug={slug}
                listingId={product_id}
                initialIsLiked={isLiked}
                onLikeChange={handleLikeChange}
              />
            </div>
          )}
          <Link href={`/listings/${slug}/${product_id}`}>
            <Image
              src={images[0].image_url}
              alt={title}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
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
            <span className="text-gray-600 max-w-[45%]">{location}</span>
            <span className="font-semibold text-gray-800">
              {new Date(created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingCard;
