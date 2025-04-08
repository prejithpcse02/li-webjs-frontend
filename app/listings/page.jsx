"use client";
import ListingCard from "@/components/ListingCard";
import Navbar from "@/components/Navbar";
//import AddListingModal from "@/components/AddListingModal";
//import dummy from "@/constants/dummy";
import React, { useEffect, useState, Suspense } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import AddListingModal from "@/components/AddListingModel";

// A client component that uses the search params
const ListingsContent = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // If not authenticated and not loading, redirect to login
    /*if (!authLoading && !user) {
      router.push("/auth/signin");
      return;
    }*/

    // Only fetch data if user is authenticated
    /*if (user) {
      fetchData();
    }*/
    fetchData();
  }, []);
  //user, authLoading, router

  // Enhanced useEffect to handle multiple ways of opening the modal
  useEffect(() => {
    // Function to handle opening modal
    const openModal = () => {
      console.log("Opening modal from event");
      setIsModalOpen(true);
    };

    if (typeof window !== "undefined") {
      // Add event listener for custom event from Navbar
      window.addEventListener("openAddListingModal", openModal);

      // Check localStorage flag (for navigation from other pages)
      const shouldOpenModal = localStorage.getItem("openAddListingModal");
      if (shouldOpenModal === "true") {
        console.log("Opening modal from localStorage flag");
        setIsModalOpen(true);
        // Clear the flag after using it
        localStorage.removeItem("openAddListingModal");
      }

      // Also check URL parameters for backward compatibility
      const urlParams = new URLSearchParams(window.location.search);
      const addParam = urlParams.get("add");
      if (addParam === "true") {
        console.log("Opening modal from URL parameter");
        setIsModalOpen(true);
      }
    }

    // Cleanup event listener on component unmount
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("openAddListingModal", openModal);
      }
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await api.get("/api/listings/");
      // Debug logging
      console.log("Data from API: ", result.data);
      if (result.data && result.data.length > 0) {
        // Log each item to check for slug property
        result.data.forEach((item, index) => {
          console.log(
            `Listing ${index} - product_id: ${item.product_id}, slug: ${
              item.slug || "MISSING SLUG"
            }`
          );
        });

        const firstItem = result.data[0];
        console.log("First listing item: ", firstItem);
        console.log("Main image URL: ", firstItem.main_image);
      }
      setData(result.data);
    } catch (error) {
      console.error("Error fetching listings:", error);
      if (error.response?.status === 401) {
        // If unauthorized, redirect to login
        router.push("/auth/signin");
      } else {
        setError(error.response?.data?.detail || "Failed to fetch listings");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddListingSuccess = () => {
    // Refresh the listings data after successfully adding a new listing
    fetchData();
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show loading state while fetching data
  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      {/* Modal for adding new listing */}
      <AddListingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleAddListingSuccess}
      />

      <main className="container mx-auto px-2 py-4 sm:px-6 sm:py-8 w-full bg-white z-0 mt-8">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800">
            Latest Listings
          </h1>
        </div>

        {loading && data && (
          <div className="w-full py-4 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {data && data.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <h2 className="text-lg font-medium text-gray-700 mb-2">
              No listings found
            </h2>
            <p className="text-gray-600 mb-4">
              Be the first to create a listing!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-4 z-0">
            {data?.map((item) => (
              <ListingCard key={item.product_id} item={item} />
            ))}
          </div>
        )}
      </main>
    </>
  );
};

// Main page component with suspense boundary
const Page = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <ListingsContent />
    </Suspense>
  );
};

export default Page;
