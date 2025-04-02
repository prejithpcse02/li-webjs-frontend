"use client";
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";
import { FiSearch, FiUser, FiPlusCircle, FiMenu, FiX } from "react-icons/fi";
import { FaRegHeart } from "react-icons/fa";
import SearchBar from "./SearchBar";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full h-16 bg-gray-100 flex justify-between items-center px-4 sm:px-6 shadow-md relative z-10">
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
          <Link
            href="/add-listing"
            className="flex items-center text-blue-600 text-sm font-semibold"
          >
            <FiPlusCircle className="text-lg" />
            <span className="ml-1">Add Listing</span>
          </Link>

          <Link
            href="/profile"
            className="flex items-center text-gray-600 text-sm font-semibold"
          >
            <FiUser className="text-lg" />
            <span className="ml-1">Profile</span>
          </Link>

          <Link
            href="/liked"
            className="flex items-center text-gray-600 text-sm font-semibold"
          >
            <FaRegHeart className="text-lg text-red-500" />
            <span className="ml-1">Liked</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
