import React, { useState, useRef } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Dialog } from "@headlessui/react";

const ListItem = ({ item }) => {
  const {
    title,
    slug,
    description,
    price,
    condition,
    location,
    status,
    created_at,
    seller_name,
    images,
  } = item;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const sliderRef = useRef(null);

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
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    beforeChange: (current, next) => setSelectedIndex(next),
  };

  return (
    <div className="max-w-6xl mx-auto bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 p-4 sm:p-6 md:p-8 relative">
      <div className="bg-green-600 text-white px-4 py-2 rounded-md w-fit absolute right-5 top-5 z-10">
        <span className="text-sm sm:text-md font-medium capitalize">
          {status}
        </span>
      </div>

      {/* Thumbnail Image Carousel */}
      <div className="mb-4 relative max-w-2xl mx-auto px-4 py-4">
        <Slider {...settings} className="rounded-md overflow-hidden">
          {images.map((image, index) => (
            <div key={index} className="flex justify-center">
              <img
                src={image.image_url}
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
      </div>

      <h1 className="text-xl sm:text-xl font-bold text-gray-900 mb-4 mt-12">
        {title}
      </h1>
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-sm sm:text-base">
          <span className="text-gray-600 font-semibold">
            Listed on:{" "}
            <span className="font-light">
              {new Date(created_at).toLocaleDateString()}
            </span>
          </span>
          <span className="text-gray-600 font-semibold">
            Seller:{" "}
            <span className="text-blue-600 font-bold">{seller_name}</span>
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
      </div>

      {/* Image Preview Modal */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      >
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl p-6 relative">
          {/* Close Button */}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2"
          >
            ✕
          </button>

          {/* Fullscreen Image Carousel */}
          <Slider
            {...settings}
            initialSlide={selectedIndex}
            ref={sliderRef}
            className="rounded-md overflow-hidden"
          >
            {images.map((image, index) => (
              <div key={index} className="flex justify-center">
                <img
                  src={image.image_url}
                  alt={title}
                  className="w-full h-[500px] object-contain rounded-md"
                />
              </div>
            ))}
          </Slider>

          {/* Thumbnail Navigation */}
          <div className="flex justify-center mt-4">
            {images.map((image, index) => (
              <img
                key={index}
                src={image.image_url}
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
        </div>
      </Dialog>
    </div>
  );
};

export default ListItem;
