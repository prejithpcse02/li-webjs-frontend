import React, { useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import api from "@/services/api";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

const AddListingModal = ({ isOpen, onClose, onSuccess }) => {
  // Add logging for when modal props change
  useEffect(() => {
    console.log("AddListingModal isOpen changed:", isOpen);
  }, [isOpen]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    condition: "new",
    location: "",
  });

  const [images, setImages] = useState([]);
  const [mainImageIndex, setMainImageIndex] = useState(0); // Track which image is the main one
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleImageChange = (e) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);

      // Check if adding these new files would exceed the 5 image limit
      if (images.length + fileArray.length > 5) {
        setError(
          `You can only upload a maximum of 5 images. You already have ${images.length} images.`
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
          setError(
            `File "${file.name}" is not a valid image type. Allowed types: JPEG, PNG, GIF, WEBP.`
          );
          return true;
        }

        // Check file size
        if (file.size > maxSizeInBytes) {
          setError(`File "${file.name}" exceeds the maximum size of 5MB.`);
          return true;
        }

        return false;
      });

      if (invalidFiles.length === 0) {
        setError(null);
        // Append new images to existing ones instead of replacing
        setImages((prevImages) => [...prevImages, ...fileArray]);
        console.log(
          "Valid images selected:",
          fileArray.map(
            (f) => `${f.name} (${f.type}, ${(f.size / 1024).toFixed(2)}KB)`
          )
        );
      }
    }
  };

  // Function to handle making an image the main image
  const handleSetMainImage = (index) => {
    setMainImageIndex(index);
  };

  // Function to remove an image
  const handleRemoveImage = (index) => {
    setImages((prev) => {
      const newImages = [...prev];
      newImages.splice(index, 1);

      // Adjust mainImageIndex if needed
      if (index === mainImageIndex) {
        setMainImageIndex(0); // Default to first image if main image was removed
      } else if (index < mainImageIndex) {
        setMainImageIndex(mainImageIndex - 1); // Adjust index if we removed an image before it
      }

      return newImages;
    });
  };

  // Function to reorder images
  const handleMoveImage = (index, direction) => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === images.length - 1)
    ) {
      return; // Can't move first item up or last item down
    }

    setImages((prev) => {
      const newImages = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      // Swap images
      [newImages[index], newImages[targetIndex]] = [
        newImages[targetIndex],
        newImages[index],
      ];

      // Update main image index if needed
      if (index === mainImageIndex) {
        setMainImageIndex(targetIndex);
      } else if (targetIndex === mainImageIndex) {
        setMainImageIndex(index);
      }

      return newImages;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate form data
      if (
        !formData.title ||
        !formData.description ||
        !formData.price ||
        images.length === 0
      ) {
        setError(
          "Please fill out all required fields and add at least one image."
        );
        setLoading(false);
        return;
      }

      // Validate images
      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // Check file type
        const validTypes = [
          "image/jpeg",
          "image/png",
          "image/jpg",
          "image/webp",
        ];
        if (!validTypes.includes(image.type)) {
          setError(
            `File "${image.name}" is not a valid image. Please use JPG, PNG, or WebP formats.`
          );
          setLoading(false);
          return;
        }

        // Check file size (limit to 5MB)
        if (image.size > 5 * 1024 * 1024) {
          setError(`File "${image.name}" exceeds the 5MB size limit.`);
          setLoading(false);
          return;
        }
      }

      // Create FormData
      const formDataWithImages = new FormData();
      formDataWithImages.append("title", formData.title);
      formDataWithImages.append("description", formData.description);
      formDataWithImages.append("price", formData.price);
      formDataWithImages.append("condition", formData.condition);
      formDataWithImages.append("location", formData.location);
      // Generate a slug from the title, ensuring it's within 25 characters
      const slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/(^-|-$)/g, "") // Remove leading/trailing hyphens
        .slice(0, 25); // Limit to 25 characters
      formDataWithImages.append("slug", slug);

      // Append all images
      images.forEach((image) => {
        formDataWithImages.append("images", image);
      });

      console.log("Sending form data to backend:");
      console.log("- Title:", formData.title);
      console.log(
        "- Description:",
        formData.description.substring(0, 30) + "..."
      );
      console.log("- Price:", formData.price);
      console.log("- Condition:", formData.condition);
      console.log("- Location:", formData.location);
      console.log("- Slug:", slug);
      console.log("- Images:", images.length, "files");

      // Send the combined data to the backend
      const response = await api.post(
        "/api/listings/create/",
        formDataWithImages,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      console.log("Success response:", response.data);
      setSuccessMessage("Listing created successfully!");
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset form
        setFormData({
          title: "",
          description: "",
          price: "",
          condition: "new",
          location: "",
        });
        setImages([]);
        setMainImageIndex(0);
      }, 1500);
    } catch (err) {
      console.error("Error creating listing:", err);
      if (err.response) {
        console.error("Error status:", err.response.status);
        console.error("Error data:", err.response.data);

        // Handle different error formats
        if (typeof err.response.data === "object") {
          const errorMessages = [];

          // Handle field-specific errors
          Object.keys(err.response.data).forEach((field) => {
            const fieldErrors = err.response.data[field];

            // Handle nested image errors (common format from DRF)
            if (field === "images" && typeof fieldErrors === "object") {
              Object.keys(fieldErrors).forEach((imgIndex) => {
                const imgErrors = fieldErrors[imgIndex];
                if (Array.isArray(imgErrors)) {
                  errorMessages.push(
                    `Image ${parseInt(imgIndex) + 1}: ${imgErrors.join(", ")}`
                  );
                }
              });
            }
            // Handle array of errors
            else if (Array.isArray(fieldErrors)) {
              errorMessages.push(`${field}: ${fieldErrors.join(", ")}`);
            }
            // Handle string errors
            else if (typeof fieldErrors === "string") {
              errorMessages.push(`${field}: ${fieldErrors}`);
            }
          });

          // If we extracted field errors, display them
          if (errorMessages.length > 0) {
            setError(errorMessages.join("\n"));
          } else if (err.response.data.detail) {
            setError(err.response.data.detail);
          } else {
            setError(JSON.stringify(err.response.data));
          }
        } else {
          setError(
            err.response.data || "Failed to create listing. Please try again."
          );
        }
      } else {
        setError("Failed to create listing. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Add debugging for Dialog component
  const handleDialogClose = () => {
    console.log("Dialog onClose triggered");
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleDialogClose}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="relative bg-white rounded-lg max-w-3xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Add New Listing</h2>
          <button
            onClick={handleDialogClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error.split("\n").map((errorLine, idx) => (
              <div key={idx} className="mb-1">
                {errorLine}
              </div>
            ))}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title*
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What are you selling?"
                disabled={loading}
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description*
              </label>
              <textarea
                id="description"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your item (condition, features, etc.)"
                disabled={loading}
              ></textarea>
            </div>

            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Price (₹)*
              </label>
              <input
                type="number"
                id="price"
                name="price"
                required
                min="0.01"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="condition"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Condition*
              </label>
              <select
                id="condition"
                name="condition"
                required
                value={formData.condition}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="lightly_used">Lightly Used</option>
                <option value="well_used">Well Used</option>
                <option value="heavily_used">Heavily Used</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location*
              </label>
              <input
                type="text"
                id="location"
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Where can this item be picked up?"
                disabled={loading}
              />
            </div>

            <div className="col-span-2">
              <label
                htmlFor="images"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {images.length === 0
                  ? "Images* (Upload up to 5)"
                  : `Images* (${images.length}/5) - ${
                      images.length < 5
                        ? "Click to add more"
                        : "Maximum reached"
                    }`}
              </label>
              <input
                type="file"
                id="images"
                name="images"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                required={images.length === 0}
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                disabled={loading || images.length >= 5}
              />
              <p className="text-xs text-gray-500 mt-1">
                {images.length >= 5 ? (
                  <span className="text-orange-500">
                    Maximum of 5 images reached. Remove some to add more.
                  </span>
                ) : (
                  <>
                    Upload up to {5 - images.length} more images in JPEG, PNG,
                    GIF, or WEBP format (max 5MB each).
                  </>
                )}
              </p>
              {images.length > 0 ? (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Image Preview ({images.length}/5)
                    <span className="text-sm text-gray-500 ml-2">
                      {mainImageIndex === 0
                        ? "First image is set as main. "
                        : ""}
                      Use 'Set as Main' to change which image appears first.
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {images.map((image, index) => (
                      <div key={index} className="relative">
                        <div className="relative">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`Preview ${index}`}
                            className={`w-full h-24 object-cover rounded-md border-2 ${
                              index === mainImageIndex
                                ? "border-blue-500"
                                : "border-gray-200"
                            }`}
                          />
                          {index === mainImageIndex && (
                            <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-1 py-0.5 rounded-bl-md">
                              Main
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 truncate mt-1 max-w-full">
                          {image.name.substring(0, 15)}
                          {image.name.length > 15 ? "..." : ""}
                        </div>
                        <div className="flex justify-between mt-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(index)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                          {index !== mainImageIndex && (
                            <button
                              type="button"
                              onClick={() => handleSetMainImage(index)}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Set as Main
                            </button>
                          )}
                        </div>
                        <div className="flex justify-between mt-1">
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, "up")}
                            disabled={index === 0}
                            className={`text-xs ${
                              index === 0
                                ? "text-gray-400"
                                : "text-gray-600 hover:text-gray-800"
                            }`}
                          >
                            ↑ Up
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveImage(index, "down")}
                            disabled={index === images.length - 1}
                            className={`text-xs ${
                              index === images.length - 1
                                ? "text-gray-400"
                                : "text-gray-600 hover:text-gray-800"
                            }`}
                          >
                            ↓ Down
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-2 py-4 px-3 bg-gray-50 rounded-md border border-dashed border-gray-300 text-center">
                  <p className="text-gray-500 text-sm">
                    No images selected yet. Please select at least one image.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    The first image will be set as the main image by default.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={handleDialogClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center">
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
                  Creating...
                </div>
              ) : (
                "Create Listing"
              )}
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
};

export default AddListingModal;
