"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import { handleApiError } from "@/services/api";
import axios from "axios";

const EditListingPage = () => {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [listingData, setListingData] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    condition: "",
    location: "",
  });

  // Image states
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [mainImageId, setMainImageId] = useState(null);
  const [imagesToDelete, setImagesToDelete] = useState([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updateMessage, setUpdateMessage] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      if (!authLoading && !user) {
        router.push("/auth/signin");
        return;
      }

      try {
        // Check if slug is undefined
        if (!params.slug || params.slug === "undefined") {
          setError("Invalid listing URL: slug is missing");
          setLoading(false);
          return;
        }

        // Check if user is authenticated
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No authentication token found");
          router.push("/auth/signin");
          return;
        }

        console.log(
          "Fetching listing with token:",
          token.substring(0, 10) + "..."
        );

        const response = await api.get(
          `/api/listings/${params.slug}/${params.product_id}/`
        );
        const listingData = response.data;

        // Log listing data for debugging
        console.log("Listing data:", listingData);
        console.log("User data:", user);
        console.log("User ID:", user?.id);
        console.log("Listing user_id:", listingData.user_id);
        console.log("Listing seller_id:", listingData.seller_id);

        // Verify ownership - handle different ID formats
        const isOwner = (() => {
          if (!user || !listingData.seller_id) {
            console.log(
              "Ownership check failed: Missing user or listing seller_id"
            );
            return false;
          }

          // Convert both to strings for comparison
          const userIdStr = String(user.id).trim();
          const sellerIdStr = String(listingData.seller_id).trim();

          console.log("Comparing IDs:", {
            userIdStr,
            sellerIdStr,
            directMatch: userIdStr === sellerIdStr,
          });

          // Direct string comparison
          if (userIdStr === sellerIdStr) {
            console.log("Ownership verified: Direct string match");
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
            if (numericMatch) {
              console.log("Ownership verified: Numeric match");
              return true;
            }
          }

          // Check if user_id exists as an alternative field
          if (listingData.user_id) {
            const userIdStr2 = String(listingData.user_id).trim();
            console.log("Checking alternative user_id:", {
              userIdStr,
              userIdStr2,
              directMatch: userIdStr === userIdStr2,
            });

            if (userIdStr === userIdStr2) {
              console.log("Ownership verified: Alternative user_id match");
              return true;
            }

            const userIdNum2 = parseInt(userIdStr2, 10);
            if (!isNaN(userIdNum) && !isNaN(userIdNum2)) {
              const numericMatch2 = userIdNum === userIdNum2;
              console.log("Alternative numeric comparison:", {
                userIdNum,
                userIdNum2,
                numericMatch2,
              });
              if (numericMatch2) {
                console.log("Ownership verified: Alternative numeric match");
                return true;
              }
            }
          }

          console.log("Ownership check failed: No matching IDs found");
          return false;
        })();

        if (!isOwner) {
          setError("You don't have permission to edit this listing");
          setLoading(false);
          return;
        }

        setListingData(listingData);
        setFormData({
          title: listingData.title || "",
          description: listingData.description || "",
          price: listingData.price || "",
          condition: listingData.condition || "",
          location: listingData.location || "",
        });

        // Handle images safely
        if (listingData.images && Array.isArray(listingData.images)) {
          setExistingImages(listingData.images);

          // Find main image - first check for is_primary flag
          const primaryImage = listingData.images.find(
            (img) => img.is_primary === true
          );

          if (primaryImage && primaryImage.id) {
            setMainImageId(primaryImage.id);
          } else if (
            listingData.images.length > 0 &&
            listingData.images[0].id
          ) {
            // If no image is marked as primary, use the first image
            setMainImageId(listingData.images[0].id);
          }
        } else {
          setExistingImages([]);
        }
      } catch (error) {
        const errorMessage = handleApiError(error);
        setError(errorMessage);

        if (axios.isAxiosError(error) && error.response?.status === 401) {
          router.push("/auth/signin");
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [params.slug, params.product_id, router, user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Special handling for price field
    if (name === "price") {
      // Only allow valid number inputs including decimals with up to 2 decimal places
      const priceRegex = /^(\d+)?(\.\d{0,2})?$/;
      if (value === "" || priceRegex.test(value)) {
        setFormData((prev) => ({
          ...prev,
          [name]: value,
        }));
      }
    } else {
      // Handle all other fields normally
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle new image uploads
  const handleImageChange = (e) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);

      // Check if adding these new files would exceed the 5 image limit
      if (
        existingImages.length -
          imagesToDelete.length +
          newImages.length +
          fileArray.length >
        5
      ) {
        setUpdateMessage(
          `Error: You can only have a maximum of 5 images. You already have ${
            existingImages.length - imagesToDelete.length + newImages.length
          } images.`
        );
        return;
      }

      // Validate images before setting them
      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/jpg",
      ];
      const maxSizeInBytes = 5 * 1024 * 1024; // 5MB

      // Check for invalid files
      const invalidFiles = fileArray.filter((file) => {
        // Check file type
        if (!validImageTypes.includes(file.type)) {
          setUpdateMessage(
            `Error: File "${file.name}" is not a valid image type. Allowed types: JPEG, PNG, GIF, WEBP.`
          );
          return true;
        }

        // Check file size
        if (file.size > maxSizeInBytes) {
          setUpdateMessage(
            `Error: File "${file.name}" exceeds the maximum size of 5MB.`
          );
          return true;
        }

        return false;
      });

      if (invalidFiles.length === 0) {
        setUpdateMessage(null);
        // Append new images to existing ones
        setNewImages((prevImages) => [...prevImages, ...fileArray]);
      }
    }
  };

  // Functions to handle images
  const handleRemoveExistingImage = (imageId) => {
    // Add to images to delete list
    setImagesToDelete((prev) => [...prev, imageId]);

    // If it was the main image, choose a new main image
    if (mainImageId === imageId) {
      // Find first image that's not being deleted
      const remainingImages = existingImages.filter(
        (img) => !imagesToDelete.includes(img.id) && img.id !== imageId
      );
      if (remainingImages.length > 0) {
        setMainImageId(remainingImages[0].id);
      } else if (newImages.length > 0) {
        // No existing images left, use the first new image
        setMainImageId(null); // We'll set this to the first new image when submitting
      } else {
        setMainImageId(null);
      }
    }
  };

  const handleRemoveNewImage = (index) => {
    setNewImages((prev) => {
      const newImagesArray = [...prev];
      newImagesArray.splice(index, 1);
      return newImagesArray;
    });
  };

  const handleSetMainExistingImage = (imageId) => {
    setMainImageId(imageId);
  };

  const handleSetMainNewImage = () => {
    // Clear mainImageId so the first new image becomes main
    setMainImageId(null);
  };

  // Get remaining image count
  const getRemainingImageCount = () => {
    const currentImageCount =
      existingImages.length - imagesToDelete.length + newImages.length;
    return 5 - currentImageCount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUpdateMessage("");

    try {
      // Validate form data
      if (
        !formData.title ||
        !formData.description ||
        !formData.price ||
        !formData.condition
      ) {
        setUpdateMessage("Please fill in all required fields");
        setIsSubmitting(false);
        return;
      }

      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue) || priceValue <= 0) {
        setUpdateMessage("Price must be greater than 0");
        setIsSubmitting(false);
        return;
      }

      // Check if we have at least one image
      const remainingImages = existingImages.filter(
        (img) => !imagesToDelete.includes(img.id)
      );
      if (remainingImages.length + newImages.length === 0) {
        setUpdateMessage("At least one image is required");
        setIsSubmitting(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("price", formData.price.toString());
      formDataToSend.append("condition", formData.condition);
      formDataToSend.append("location", formData.location || "");

      // Add user ID for ownership verification
      if (user?.id) {
        console.log("Adding user ID to form data:", user.id);
        formDataToSend.append("seller_id", String(user.id));
      } else {
        console.warn("No user ID available for form submission");
      }

      // Handle images to delete
      if (imagesToDelete.length > 0) {
        formDataToSend.append(
          "images_to_delete",
          JSON.stringify(imagesToDelete)
        );
      }

      // Handle new images
      newImages.forEach((image) => {
        formDataToSend.append("images", image);
      });

      // Set main image if specified
      if (mainImageId) {
        formDataToSend.append("main_image_id", mainImageId);
      }

      console.log("Submitting form data:", {
        title: formData.title,
        description: formData.description,
        price: formData.price,
        condition: formData.condition,
        location: formData.location,
        user_id: user?.id,
        imagesToDelete,
        newImagesCount: newImages.length,
        mainImageId,
      });

      const response = await api.put(
        `/api/listings/${params.slug}/${params.product_id}/`,
        formDataToSend,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setUpdateMessage("Listing updated successfully!");
      router.push(`/listings/${params.slug}/${params.product_id}`);
    } catch (error) {
      const errorMessage = handleApiError(error);
      setUpdateMessage(errorMessage);

      if (axios.isAxiosError(error) && error.response?.status === 401) {
        router.push("/auth/signin");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToListings = () => {
    router.push("/listings");
  };

  // Display loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 mt-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Display error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 mt-16 px-4">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h2 className="text-xl font-bold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-red-500 mb-4">{error}</p>
          <p className="text-gray-600 mb-6">
            You can only edit listings that you own.
          </p>

          <button
            onClick={handleBackToListings}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 bg-white shadow-md rounded-lg mt-20">
      <div className="mb-4">
        <button
          onClick={handleBackToListings}
          className="flex items-center text-blue-500 hover:text-blue-700 font-medium"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-1"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
              clipRule="evenodd"
            />
          </svg>
          Back to Listings
        </button>
      </div>

      {updateMessage && (
        <div
          className={`p-4 mb-6 rounded-md ${
            updateMessage.includes("Error")
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {updateMessage}
        </div>
      )}

      {listingData && (
        <div>
          <h1 className="text-2xl font-bold mb-6">Edit Listing</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                aria-label="Listing title"
                placeholder="Enter listing title"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                aria-label="Listing description"
                placeholder="Enter detailed description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Price (₹) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-label="Listing price"
                  placeholder="Enter price (e.g., 1000)"
                  pattern="^\d+(\.\d{1,2})?$"
                  title="Please enter a valid price (e.g. 1000 or 1000.50)"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Condition *
                </label>
                <select
                  name="condition"
                  value={formData.condition}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-label="Item condition"
                  title="Select the condition of your item"
                >
                  <option value="">Select Condition</option>
                  <option value="new">New</option>
                  <option value="like_new">Like New</option>
                  <option value="lightly_used">Lightly Used</option>
                  <option value="well_used">Well Used</option>
                  <option value="heavily_used">Heavily Used</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  aria-label="Pickup location"
                  placeholder="Enter pickup location"
                />
              </div>
            </div>

            {/* Image Management Section */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Manage Images</h2>

              {/* Existing Images */}
              {existingImages.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3">Current Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {existingImages.map((image) => {
                      // Skip images marked for deletion
                      if (imagesToDelete.includes(image.id)) return null;

                      // Check if this is the main image
                      const isMain = mainImageId === image.id;

                      return (
                        <div key={image.id} className="relative">
                          <div className="relative">
                            <img
                              src={image.image_url}
                              alt="Listing image"
                              className={`w-full h-32 object-cover rounded-md border-2 ${
                                isMain ? "border-blue-500" : "border-gray-200"
                              }`}
                            />
                            {isMain && (
                              <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-bl-md font-bold">
                                Main
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between mt-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveExistingImage(image.id)
                              }
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                            {!isMain && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSetMainExistingImage(image.id)
                                }
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Set as Main
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* New Images */}
              {newImages.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-md font-medium mb-3">
                    New Images to Add
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                    {newImages.map((image, index) => {
                      // Will this be the main image? True if no mainImageId is set and this is the first new image
                      const willBeMain = !mainImageId && index === 0;

                      return (
                        <div key={index} className="relative">
                          <div className="relative">
                            <img
                              src={URL.createObjectURL(image)}
                              alt={`New image ${index + 1}`}
                              className={`w-full h-32 object-cover rounded-md border-2 ${
                                willBeMain
                                  ? "border-blue-500"
                                  : "border-gray-200"
                              }`}
                            />
                            {willBeMain && (
                              <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-bl-md font-bold">
                                Will be Main
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 truncate mt-1">
                            {image.name.length > 15
                              ? `${image.name.substring(0, 15)}...`
                              : image.name}
                          </div>
                          <div className="flex justify-between mt-1">
                            <button
                              type="button"
                              onClick={() => handleRemoveNewImage(index)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                            {mainImageId && index === 0 && (
                              <button
                                type="button"
                                onClick={handleSetMainNewImage}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Set as Main
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upload New Images */}
              <div className="mt-4">
                <label
                  htmlFor="new_images"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  {getRemainingImageCount() > 0
                    ? `Add Images (${getRemainingImageCount()} remaining)`
                    : "Maximum image limit reached (5)"}
                </label>
                <input
                  type="file"
                  id="new_images"
                  name="new_images"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  disabled={getRemainingImageCount() <= 0 || isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload up to {getRemainingImageCount()} more images in JPEG,
                  PNG, GIF, or WEBP format (max 5MB each).
                </p>
                <p className="text-xs text-gray-600 mt-2">
                  <span className="font-semibold">Note:</span> Your listing must
                  have at least one image. The main image will be used as the
                  thumbnail in listings.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-gray-600 text-sm mb-4">
                <span className="text-red-500">*</span> Required fields
              </p>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={handleBackToListings}
                  className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    existingImages.length -
                      imagesToDelete.length +
                      newImages.length ===
                      0
                  }
                  className={`px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors ${
                    isSubmitting ||
                    existingImages.length -
                      imagesToDelete.length +
                      newImages.length ===
                      0
                      ? "opacity-70 cursor-not-allowed"
                      : ""
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
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
                      Updating...
                    </span>
                  ) : (
                    "Update Listing"
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default EditListingPage;
