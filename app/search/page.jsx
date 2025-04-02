// li-web/app/search/page.tsx
"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import ListingCard from "@/components/ListingCard";
import debounce from "lodash/debounce";

function SearchContent() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [recentListings, setRecentListings] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (user) {
      fetchRecentListings();
      // Load recent searches from localStorage
      const savedSearches = localStorage.getItem("recentSearches");
      if (savedSearches) {
        setRecentSearches(JSON.parse(savedSearches));
      }
    }
  }, [user]);

  const fetchRecentListings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/api/listings/recent/");
      setRecentListings(response.data);
    } catch (error) {
      console.error("Error fetching recent listings:", error);
      setError("Failed to fetch recent listings");
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await api.get(
          `/api/listings/search/?q=${encodeURIComponent(searchQuery)}`
        );
        setResults(response.data);
      } catch (error) {
        console.error("Search error:", error);
        setError("Failed to perform search");
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  const handleSearch = (e) => {
    e.preventDefault();
    const searchQuery = e.target.value;
    setQuery(searchQuery);
    debouncedSearch(searchQuery);

    // Update recent searches
    if (searchQuery.trim()) {
      const updatedSearches = [
        searchQuery,
        ...recentSearches.filter((s) => s !== searchQuery),
      ].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recentSearches");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Search Input */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleSearch}
              placeholder="Search listings..."
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Recent Searches
              </h2>
              <button
                onClick={clearRecentSearches}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setQuery(search);
                    debouncedSearch(search);
                  }}
                  className="px-3 py-1 bg-white rounded-full border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {/* Search Results */}
        {!loading && !error && query && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Search Results
            </h2>
            {results.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No results found</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {results.map((item) => (
                  <ListingCard
                    key={item.product_id}
                    item={item}
                    isAuthenticated={!!user}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recent Listings */}
        {!loading && !error && !query && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Recent Listings
            </h2>
            {recentListings.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No recent listings
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {recentListings.map((item) => (
                  <ListingCard
                    key={item.product_id}
                    item={item}
                    isAuthenticated={!!user}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
