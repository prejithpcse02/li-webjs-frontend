import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import {
  FiSearch,
  FiUser,
  FiPlusCircle,
  FiMenu,
  FiX,
  FiLogOut,
} from "react-icons/fi";
import { FaRegHeart } from "react-icons/fa";
import SearchBar from "./SearchBar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleAddListing = (e) => {
    e.preventDefault();
    console.log("Add listing clicked in navbar");

    // If not logged in, redirect to login
    if (!user) {
      console.log("User not logged in, redirecting to login");
      router.push("/auth/signin");
      return;
    }

    // Navigate to listings page first
    if (window.location.pathname !== "/listings") {
      console.log("Not on listings page, navigating to /listings");
      router.push("/listings");

      // Set a flag in localStorage to open the modal when the page loads
      localStorage.setItem("openAddListingModal", "true");
    } else {
      // If already on listings page, use a custom event
      console.log(
        "Already on listings page, dispatching openAddListingModal event"
      );
      const event = new CustomEvent("openAddListingModal");
      window.dispatchEvent(event);
    }

    // Close mobile menu if open
    if (menuOpen) {
      setMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  return (
    <nav className="w-full h-16 bg-gray-100 flex justify-between items-center px-4 sm:px-6 shadow-md relative z-50">
      {/* Logo */}
      <Link href="/listings" className="flex-shrink-0">
        <Image src="/next.svg" alt="logo" width={100} height={40} />
      </Link>

      {/* Search Bar */}
      <div className="hidden sm:flex items-center bg-white rounded-md shadow-sm px-4 py-2 w-1/2 text-gray-700 mx-auto">
        <Link href="/search" className="w-full">
          <input
            type="text"
            placeholder="Search listings..."
            className="w-full outline-none text-sm bg-transparent"
          />
        </Link>
        <FiSearch className="text-gray-500 text-lg cursor-pointer" />
      </div>

      <div className="sm:hidden flex items-center bg-white rounded-md shadow-sm px-3 py-2 text-gray-700 mx-2">
        <FiSearch className="text-gray-500 text-lg" />
        <Link href="/search" className="w-full">
          <input
            type="text"
            placeholder="Search listings..."
            className="w-full outline-none text-sm bg-transparent ml-2"
          />
        </Link>
      </div>

      {/*<SearchBar />*/}

      <div className="ml-2">
        {/* Hamburger Menu */}
        <button
          className="sm:hidden text-gray-700 text-2xl focus:outline-none"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <FiX /> : <FiMenu />}
        </button>

        {/* Right Section */}
        <div
          className={`absolute top-16 right-0 w-[40%] sm:w-full bg-white shadow-md p-4 flex flex-col space-y-4 items-center sm:relative sm:top-0 sm:flex-row sm:space-y-0 sm:space-x-6 sm:p-0 sm:bg-transparent sm:shadow-none sm:flex sm:justify-end sm:gap-4 ${
            menuOpen ? "block" : "hidden"
          }`}
        >
          <button
            onClick={handleAddListing}
            className="flex items-center text-blue-600 text-sm font-semibold cursor-pointer"
          >
            <FiPlusCircle className="text-lg" />
            <span className="ml-1">Add Listing</span>
          </button>

          {user ? (
            <>
              <Link
                href="/profile"
                className="flex items-center text-gray-600 text-sm font-semibold"
                onClick={() => setMenuOpen(false)}
              >
                <FiUser className="text-lg" />
                <span className="ml-1">{user.nickname || "Profile"}</span>
              </Link>

              <Link
                href="/liked"
                className="flex items-center text-gray-600 text-sm font-semibold"
                onClick={() => setMenuOpen(false)}
              >
                <FaRegHeart className="text-lg text-red-500" />
                <span className="ml-1">Liked</span>
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center text-red-600 text-sm font-semibold cursor-pointer"
              >
                <FiLogOut className="text-lg" />
                <span className="ml-1">Logout</span>
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="flex items-center text-gray-600 text-sm font-semibold"
              onClick={() => setMenuOpen(false)}
            >
              <FiUser className="text-lg" />
              <span className="ml-1">Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
