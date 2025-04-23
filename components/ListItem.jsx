import React, { useState, useRef, useEffect } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Dialog } from "@headlessui/react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import api from "@/services/api";
import Link from "next/link";
import LikeButton from "./LikeButton";

const ListItem = ({ item }) => {
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
    main_image,
    is_liked: initialIsLiked,
    likes_count: initialLikesCount,
  } = item;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sliderRef = useRef(null);
  const { user } = useAuth();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversationCount, setConversationCount] = useState(
    item.conversation_count || 0
  );
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    // Listen for chat updates
    const handleChatUpdate = async (event) => {
      try {
        // Fetch the latest conversation count
        const response = await api.get(
          `/api/listings/${product_id}/conversation-count/`
        );
        if (response.data && typeof response.data.count === "number") {
          setConversationCount(response.data.count);
        }
      } catch (error) {
        console.error("Error updating conversation count:", error);
      }
    };

    window.addEventListener("chatUpdated", handleChatUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("chatUpdated", handleChatUpdate);
    };
  }, [product_id]);

  // Check if current user is the seller of this listing
  const attemptToMatch = () => {
    if (!user || !seller_id) {
      console.log("No user or seller_id:", { user, seller_id });
      return false;
    }

    // Convert both to strings first
    const userIdStr = String(user.id).trim();
    const sellerIdStr = String(seller_id).trim();

    console.log("Comparing IDs:", { userIdStr, sellerIdStr });

    // Direct string comparison
    if (userIdStr === sellerIdStr) {
      console.log("Direct string match");
      return true;
    }

    // Try numeric comparison if both can be parsed as numbers
    const userIdNum = parseInt(userIdStr, 10);
    const sellerIdNum = parseInt(sellerIdStr, 10);

    if (!isNaN(userIdNum) && !isNaN(sellerIdNum)) {
      const numericMatch = userIdNum === sellerIdNum;
      console.log("Numeric comparison:", {
        userIdNum,
        sellerIdNum,
        numericMatch,
      });
      return numericMatch;
    }

    console.log("No match found");
    return false;
  };

  const isOwner = attemptToMatch();
  console.log("Is owner:", isOwner);

  // Handle edit listing
  const handleEdit = () => {
    if (!product_id) {
      console.error("Product ID is missing");
      return;
    }

    // Generate a slug from title if it's undefined
    const urlSlug =
      slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 25);

    // Navigate to edit page using slug and product_id
    router.push(`/listings/${urlSlug}/${product_id}/edit`);
  };

  const handleStartChat = async () => {
    if (!user) {
      router.push("/auth/signin");
      return;
    }

    try {
      const res = await api.post("/api/chat/conversations/", {
        listing: product_id,
      });
      console.log("Conversation created:", res.data);
      router.push(`/chat/${res.data.id}`);
    } catch (error) {
      console.error("Failed to create/get conversation:", error);
    }
  };

  const handleViewChats = () => {
    router.push(`/chat?listing=${product_id}`);
  };

  const handleLikeChange = async (newIsLiked) => {
    setIsLiked(newIsLiked);
    setLikesCount((prev) => (newIsLiked ? prev + 1 : prev - 1));
  };

  const updateListingStatus = async (newStatus) => {
    if (newStatus === currentStatus) return;

    try {
      setIsUpdatingStatus(true);
      console.log("Updating status to:", newStatus);
      console.log("Product ID:", product_id);
      console.log("Slug:", slug);

      // Use the correct URL pattern with both slug and product_id
      const response = await api.patch(
        `/api/listings/${slug}/${product_id}/status/`,
        {
          status: newStatus,
        }
      );

      console.log("Status update response:", response.data);
      setCurrentStatus(response.data.status);

      // Show success message
      alert(`Status updated to ${response.data.status}`);

      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
      console.error("Error updating status:", error);
      if (error.response?.status === 401) {
        alert("Please log in to update the listing status");
        router.push("/auth/signin");
      } else if (error.response?.status === 403) {
        alert("You do not have permission to update this listing");
      } else {
        alert("Failed to update listing status. Please try again.");
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Add an effect to refresh the current status
  useEffect(() => {
    const fetchCurrentStatus = async () => {
      try {
        // Only proceed if we have a product_id
        if (!product_id) {
          console.log("No product_id available for status check");
          return;
        }

        // Try fetching using just product_id first
        try {
          const response = await api.get(`/api/listings/${product_id}/`);
          setCurrentStatus(response.data.status);
          return;
        } catch (error) {
          console.log(
            "Could not fetch with product_id only, trying with slug..."
          );

          // If that fails and we have a slug, try with both
          if (slug) {
            const response = await api.get(
              `/api/listings/${slug}/${product_id}/`
            );
            setCurrentStatus(response.data.status);
          }
        }
      } catch (error) {
        console.error("Error fetching current status:", error);
      }
    };

    if (isOwner) {
      fetchCurrentStatus();
    }
  }, [product_id, slug, isOwner]);

  // Handle delete listing
  const handleDelete = async () => {
    // Log all item properties to debug
    console.log("Item properties:", {
      product_id,
      slug,
      title,
      seller_id,
      user: user ? user.id : null,
    });

    if (!product_id) {
      console.error("Product ID is missing", { product_id });
      alert("Cannot delete listing: Missing product ID");
      return;
    }

    if (!user) {
      console.error("User not authenticated");
      alert("Please log in to delete this listing");
      router.push("/auth/signin");
      return;
    }

    if (!isOwner) {
      console.error("User is not the owner");
      alert("You don't have permission to delete this listing");
      return;
    }

    setIsDeleting(true);
    try {
      // Generate a slug from title if it's undefined
      // Make sure to remove any trailing hyphens
      const urlSlug =
        slug ||
        title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") // Remove leading and trailing hyphens
          .slice(0, 25);

      // Log the request details
      console.log("Deleting listing:", {
        product_id,
        slug: urlSlug,
        url: `/api/listings/${urlSlug}/${product_id}/`,
      });

      // Try the endpoint with just the product_id first
      try {
        const response = await api.delete(`/api/listings/${product_id}/`);
        console.log("Delete response (product_id only):", response);

        // Show success message
        alert("Listing deleted successfully");

        // Close the delete confirmation dialog
        setShowDeleteConfirm(false);

        // Redirect to listings page
        router.push("/listings");
        return;
      } catch (productIdError) {
        console.log(
          "Failed with product_id only, trying with slug:",
          productIdError
        );

        // If that fails, try with both slug and product_id
        const response = await api.delete(
          `/api/listings/${urlSlug}/${product_id}/`
        );

        console.log("Delete response (with slug):", response);

        // Show success message
        alert("Listing deleted successfully");

        // Close the delete confirmation dialog
        setShowDeleteConfirm(false);

        // Redirect to listings page
        router.push("/listings");
      }
    } catch (error) {
      console.error("Error deleting listing:", error);

      // Show error message
      let errorMessage = "Failed to delete listing";

      if (error.response) {
        console.error("Error response:", error.response);

        if (error.response.status === 404) {
          errorMessage = "Listing not found. It may have been already deleted.";
        } else if (error.response.status === 403) {
          errorMessage = "You don't have permission to delete this listing.";
        } else if (error.response.status === 401) {
          errorMessage = "Please log in to delete this listing.";
          router.push("/auth/signin");
        } else if (error.response.data?.detail) {
          errorMessage = error.response.data.detail;
        }
      }

      alert(errorMessage);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const NextArrow = ({ onClick }) => (
    <div
      className="absolute top-1/2 right-2 sm:right-4 transform -translate-y-1/2 cursor-pointer text-gray-800 bg-white rounded-full shadow-lg p-2 z-10 hover:bg-gray-200"
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5 sm:w-6 sm:h-6"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  );

  const PrevArrow = ({ onClick }) => (
    <div
      className="absolute top-1/2 left-2 sm:left-4 transform -translate-y-1/2 cursor-pointer text-gray-800 bg-white rounded-full shadow-lg p-2 z-10 hover:bg-gray-200"
      onClick={onClick}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-5 h-5 sm:w-6 sm:h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    </div>
  );

  const settings = {
    dots: true,
    infinite: images.length > 1,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: images.length > 1,
    autoplaySpeed: 2000,
    nextArrow: images.length > 1 ? <NextArrow /> : null,
    prevArrow: images.length > 1 ? <PrevArrow /> : null,
    beforeChange: (current, next) => setSelectedIndex(next),
  };

  // Get image URL with safety check
  const getImageUrl = (image, isFirst = false) => {
    // First check if we have a main_image (for listing preview on cards)
    if (isFirst && main_image) {
      console.log(`Using main_image for listing: ${main_image}`);
      return main_image;
    }

    // Then check if we have a valid image object
    if (image && image.image_url) {
      // Make sure URL starts with http or /
      const url = image.image_url;
      if (url.startsWith("http") || url.startsWith("/")) {
        return url;
      } else {
        // If it's a relative URL without leading slash, add it
        return `/${url}`;
      }
    }

    // Fallback to placeholder
    console.log(
      `No image found for item in ListItem component, using placeholder`
    );
    return "/placeholder-image.jpg";
  };

  // Find the primary image if it exists
  const findPrimaryImage = () => {
    if (images && images.length > 0) {
      // Check if any image has is_primary=true
      const primaryImage = images.find((img) => img.is_primary === true);
      if (primaryImage) {
        return primaryImage;
      }
      // If no primary image is found, use the first image
      return images[0];
    }
    // Fallback to main_image or null
    return null;
  };

  // Get all images arranged with primary first
  const getArrangedImages = () => {
    if (!images || images.length === 0) {
      return [];
    }

    const primaryIndex = images.findIndex((img) => img.is_primary === true);
    if (primaryIndex === -1) {
      // No primary image designated, return as is
      return images;
    }

    // Move primary image to front
    const arrangedImages = [...images];
    const primaryImage = arrangedImages.splice(primaryIndex, 1)[0];
    return [primaryImage, ...arrangedImages];
  };

  const arrangedImages = getArrangedImages();

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 p-4 sm:p-6 md:p-8 relative">
      {isOwner && (
        <div className="absolute top-5 left-5 z-10 flex space-x-2">
          <button
            onClick={handleEdit}
            className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded-md text-sm flex items-center cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Edit
          </button>
        </div>
      )}

      <div className="mb-4 relative max-w-2xl mx-auto px-4 py-4">
        {arrangedImages.length > 0 ? (
          <Slider {...settings} className="rounded-md overflow-hidden">
            {arrangedImages.map((image, index) => (
              <div key={index} className="flex justify-center">
                <img
                  src={getImageUrl(image)}
                  alt={title}
                  className="w-full h-64 sm:h-100 object-contain rounded-md cursor-pointer"
                  onClick={() => {
                    setSelectedIndex(index);
                    setIsOpen(true);
                  }}
                />
              </div>
            ))}
          </Slider>
        ) : (
          <div className="flex justify-center">
            <img
              src={getImageUrl(undefined, true)}
              alt={title}
              className="w-full h-64 sm:h-100 object-contain rounded-md cursor-pointer"
              onClick={() => setIsOpen(true)}
            />
          </div>
        )}
      </div>

      <h1 className="text-xl sm:text-xl font-bold text-gray-900 mb-4 mt-12">
        {title}
      </h1>
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 text-sm sm:text-base">
          <span className="text-gray-600 font-semibold mt-2">
            Listed on:{" "}
            <span className="font-light">
              {new Date(created_at).toLocaleDateString()}
            </span>
          </span>
          <span className="text-gray-600 font-semibold">
            Seller:{" "}
            <Link
              href={`/profiles/${seller_name}`}
              className="font-bold text-blue-600 z-10"
            >
              {seller_name}
            </Link>
          </span>
        </div>
        <p className="text-lg font-semibold text-green-600 mt-2">₹ {price}</p>
        <div className="mt-3">
          <p className="text-gray-600 font-semibold">Description</p>
          <p className="text-gray-800 font-medium text-sm leading-relaxed">
            {description}
          </p>
        </div>
        <div className="mt-3">
          <p className="text-gray-600 font-semibold">Condition</p>
          <p className="text-gray-800 font-medium text-sm leading-relaxed capitalize">
            {condition}
          </p>
        </div>
        <div className="mt-3">
          <p className="text-gray-600 font-semibold">Pickup Location</p>
          <p className="text-gray-800 font-medium text-sm">{location}</p>
        </div>
        <div className="flex flex-col gap-4 mt-4">
          {isOwner ? (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2 items-center">
                <LikeButton
                  slug={slug}
                  listingId={product_id}
                  initialIsLiked={isLiked}
                  onLikeChange={handleLikeChange}
                />
                <button
                  onClick={handleViewChats}
                  className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-500"
                >
                  Messages
                </button>
              </div>

              <div className="flex gap-2 mt-2">
                {currentStatus === "available" && (
                  <>
                    <button
                      onClick={() => updateListingStatus("pending")}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 px-4 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Pending pickup
                    </button>
                    <button
                      onClick={() => updateListingStatus("sold")}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark as Sold
                    </button>
                  </>
                )}

                {currentStatus === "pending" && (
                  <>
                    <button
                      onClick={() => updateListingStatus("available")}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel Pending
                    </button>
                    <button
                      onClick={() => updateListingStatus("sold")}
                      disabled={isUpdatingStatus}
                      className="flex-1 py-2.5 px-4 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Mark as Sold
                    </button>
                  </>
                )}

                {currentStatus === "sold" && (
                  <button
                    onClick={() => updateListingStatus("available")}
                    disabled={isUpdatingStatus}
                    className="flex-1 py-2.5 px-4 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel Sold
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <LikeButton
                slug={slug}
                listingId={product_id}
                initialIsLiked={isLiked}
                onLikeChange={handleLikeChange}
              />
              <button
                onClick={handleStartChat}
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Chat with Seller
              </button>
            </div>
          )}
        </div>

        <div
          className={`mt-4 text-right ${
            currentStatus === "pending"
              ? "text-yellow-600"
              : currentStatus === "sold"
              ? "text-red-600"
              : "text-green-600"
          } font-semibold`}
        >
          {currentStatus === "pending"
            ? "Pending pickup"
            : currentStatus === "sold"
            ? "Sold"
            : "Available"}
        </div>
      </div>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 relative z-50">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-4 z-50"
          >
            ✕
          </button>

          <Slider
            {...settings}
            initialSlide={selectedIndex}
            ref={sliderRef}
            className="rounded-md overflow-hidden"
          >
            {arrangedImages.length > 0 ? (
              arrangedImages.map((image, index) => (
                <div key={index} className="flex justify-center">
                  <img
                    src={getImageUrl(image)}
                    alt={title}
                    className="w-full h-[500px] object-contain rounded-md"
                  />
                </div>
              ))
            ) : (
              <div className="flex justify-center">
                <img
                  src={getImageUrl(undefined, true)}
                  alt={title}
                  className="w-full h-[500px] object-contain rounded-md"
                />
              </div>
            )}
          </Slider>

          {arrangedImages.length > 1 && (
            <div className="flex justify-center mt-4">
              {arrangedImages.map((image, index) => (
                <img
                  key={index}
                  src={getImageUrl(image)}
                  alt={title}
                  className={`w-16 h-16 object-cover rounded-md cursor-pointer mx-1 ${
                    selectedIndex === index
                      ? "border-2 border-blue-500"
                      : "border border-gray-300"
                  }`}
                  onClick={() => {
                    if (sliderRef.current) {
                      sliderRef.current.slickGoTo(index);
                    }
                    setSelectedIndex(index);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Confirm Delete
          </h3>
          <p className="text-gray-600 mb-6">
            Are you sure you want to delete this listing? This action cannot be
            undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center"
            >
              {isDeleting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete Listing"
              )}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default ListItem;
