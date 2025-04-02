"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
//import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth state to be determined
    if (!isLoading) {
      // Redirect to listings if user is authenticated, otherwise to signin
      if (user) {
        router.push("/listings");
      } else {
        router.push("/signin");
      }
    }
  }, [user, isLoading, router]);

  // Show loading indicator while checking auth state
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}
