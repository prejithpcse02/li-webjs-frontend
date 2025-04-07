"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ListItem from "@/components/ListItem";
import { listingAPI } from "@/services/listingAPI";

const Page = () => {
  const params = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleBackToListings = () => {
    router.push("/listings");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await listingAPI.getListing(
          params.slug,
          params.product_id
        );
        setData(result);
      } catch (err) {
        console.error("Error fetching listing:", err);
        if (err.response?.status === 404) {
          setError("Listing not found");
        } else {
          setError(err.message || "Failed to fetch listing");
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.slug && params.product_id) {
      fetchData();
    }
  }, [params.slug, params.product_id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500 text-center">
          <p className="text-xl font-semibold">Error</p>
          <p>{error}</p>
          <button
            onClick={handleBackToListings}
            className="mt-4 text-blue-500 hover:text-blue-700 font-medium"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 text-center">
          <p className="text-xl font-semibold">No data found</p>
          <button
            onClick={handleBackToListings}
            className="mt-4 text-blue-500 hover:text-blue-700 font-medium"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mt-20 ml-4 z-10">
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
      <div className="container mx-auto px-4 pb-8">
        <ListItem item={data} />
      </div>
    </main>
  );
};

export default Page;
