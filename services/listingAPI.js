import api from "./api";

// Listing API service
export const listingAPI = {
  // Get all listings
  getListings: async () => {
    try {
      const response = await api.get("/api/listings/");
      return response.data;
    } catch (error) {
      console.error("Get listings error:", error);
      throw error;
    }
  },

  // Get a single listing by slug and product_id
  getListing: async (slug, product_id) => {
    try {
      const response = await api.get(`/api/listings/${slug}/${product_id}/`);
      return response.data;
    } catch (error) {
      console.error("Get listing error:", error);
      throw error;
    }
  },

  // Create a new listing
  createListing: async (formData) => {
    try {
      const response = await api.post("/api/listings/create/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Create listing error:", error);
      throw error;
    }
  },

  // Update a listing
  updateListing: async (slug, product_id, data) => {
    try {
      const response = await api.put(
        `/api/listings/${slug}/${product_id}/`,
        data
      );
      return response.data;
    } catch (error) {
      console.error("Update listing error:", error);
      throw error;
    }
  },

  // Delete a listing
  deleteListing: async (product_id) => {
    try {
      const response = await api.delete(`/api/listings/${product_id}/`);
      return response.data;
    } catch (error) {
      console.error("Delete listing error:", error);
      throw error;
    }
  },

  // Like/unlike a listing
  toggleLike: async (slug, product_id, isLiked) => {
    try {
      if (isLiked) {
        const response = await api.delete(
          `/api/listings/${slug}/${product_id}/like/`
        );
        return response.data;
      } else {
        const response = await api.post(
          `/api/listings/${slug}/${product_id}/like/`
        );
        return response.data;
      }
    } catch (error) {
      console.error("Toggle like error:", error);
      throw error;
    }
  },

  // Get liked listings
  getLikedListings: async () => {
    try {
      const response = await api.get("/api/listings/liked/");
      return response.data;
    } catch (error) {
      console.error("Get liked listings error:", error);
      throw error;
    }
  },

  // Search listings
  searchListings: async (query) => {
    try {
      const response = await api.get(
        `/api/listings/search/?q=${encodeURIComponent(query)}`
      );
      return response.data;
    } catch (error) {
      console.error("Search listings error:", error);
      throw error;
    }
  },
};

export default listingAPI;
