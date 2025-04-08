"use client";
import Navbar from "@/components/Navbar";
import React from "react";

const layout = ({ children }) => {
  return (
    <div>
      {/*<div className="fixed top-0 left-0 right-0 z-50">
        <Navbar />
      </div>*/}
      {children}
    </div>
  );
};

export default layout;
