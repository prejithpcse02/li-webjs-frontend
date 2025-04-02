"use client";
import React, { useState } from "react";
import Link from "next/link";
import { FiMail, FiArrowLeft } from "react-icons/fi";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Simulating API call
      console.log("Reset password for:", email);
      // Replace with actual API call
      // const response = await axios.post('/api/auth/forgot-password', { email });

      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Show success message
      setIsSubmitted(true);
    } catch (err) {
      setError("Failed to send reset link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm p-8">
        {/* Back to sign in */}
        <Link
          href="/auth/signin"
          className="flex items-center text-sm text-gray-600 mb-8"
        >
          <FiArrowLeft className="mr-2" />
          Back to Sign In
        </Link>

        {/* App Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold text-blue-600 mb-2">
              Listtra
            </span>
          </div>
        </div>

        {!isSubmitted ? (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
              Forgot Your Password?
            </h1>
            <p className="text-gray-600 text-center mb-8">
              Enter your email address
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Email Field */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiMail className="text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Email"
                  />
                </div>
              </div>

              {/* Submit button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="bg-green-50 text-green-700 p-4 rounded-md mb-6">
              <h3 className="text-lg font-medium">Email Sent!</h3>
              <p className="mt-1">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>
            <p className="text-gray-600 mb-6">
              Please check your email and follow the link to reset your
              password. The link will expire in 30 minutes.
            </p>
            <Link
              href="/signin"
              className="inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
