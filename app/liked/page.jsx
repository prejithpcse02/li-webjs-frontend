// li-web/app/liked/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ListingCard from "@/components/ListingCard";
import Navbar from "@/components/Navbar";
import api from "@/services/api";

const LikedListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchLikedListings = async () => {
      try {
        // Get token from localStorage
        const token = localStorage.getItem("token");

        // Check if token exists
        if (!token) {
          console.log("No token found, redirecting to login");
          router.push("/auth/signin");
          return;
        }

        console.log("Fetching liked listings...");

        // Use the API service which already handles authentication
        const response = await api.get("/api/listings/liked/");

        // Transform the data to include is_liked and likes_count
        const transformedListings = response.data.map((listing) => ({
          ...listing,
          is_liked: true, // Since these are liked listings
          likes_count: listing.likes_count || 0,
        }));

        setListings(transformedListings);
      } catch (error) {
        console.error("Error details:", error);

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error("Error response data:", error.response.data);
          console.error("Error response status:", error.response.status);

          if (error.response.status === 401) {
            console.log("Unauthorized - token may be invalid or expired");
            localStorage.removeItem("token");
            router.push("/auth/signin");
          } else if (error.response.status === 403) {
            setError("You don't have permission to view liked listings");
          } else {
            setError(
              `Failed to fetch liked listings: ${
                error.response.data.detail || error.message
              }`
            );
          }
        } else if (error.request) {
          // The request was made but no response was received
          console.error("Error request:", error.request);
          setError(
            "No response from server. Please check if the backend is running."
          );
        } else {
          // Something happened in setting up the request that triggered an Error
          console.error("Error message:", error.message);
          setError(`Error: ${error.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLikedListings();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-100 py-8">
          <div className="container mx-auto px-4">
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Your Liked Listings
          </h1>
          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                You haven't liked any listings yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.product_id} item={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default LikedListings;
