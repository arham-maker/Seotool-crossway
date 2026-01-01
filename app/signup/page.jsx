"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name: name || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-white dark:bg-gray-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white dark:bg-gray-100 shadow-xl rounded-xl border border-gray-200 dark:border-gray-300 p-8 text-center">
          <div className="mb-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full" style={{ backgroundColor: 'oklch(37.3% 0.034 259.733 / 0.2)' }}>
              <svg
                className="w-8 h-8"
                style={{ color: 'oklch(37.3% 0.034 259.733)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-black">Account Created!</h2>
          <p className="text-gray-600 dark:text-gray-800 mb-4">
            Your account has been successfully created. Redirecting to login...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white dark:bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-gray-100 shadow-xl rounded-xl border border-gray-200 dark:border-gray-300 p-8">
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-900 dark:text-black">Sign Up</h1>
        <p className="text-gray-600 dark:text-gray-800 mb-8 text-center text-sm">
          Create a new account to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-semibold text-gray-900 dark:text-black mb-2"
            >
              Name (optional)
            </label>
            <input
              id="name"
              type="text"
              placeholder="Your name"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-400 bg-white dark:bg-gray-50 px-3 py-2.5 text-sm md:text-base text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 transition-all duration-150"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-900 dark:text-black mb-2"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="your@email.com"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-400 bg-white dark:bg-gray-50 px-3 py-2.5 text-sm md:text-base text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 transition-all duration-150"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-900 dark:text-black mb-2"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              required
              placeholder="At least 6 characters"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-400 bg-white dark:bg-gray-50 px-3 py-2.5 text-sm md:text-base text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 transition-all duration-150"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-gray-900 dark:text-black mb-2"
            >
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              placeholder="Confirm your password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-400 bg-white dark:bg-gray-50 px-3 py-2.5 text-sm md:text-base text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 transition-all duration-150"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 dark:border-red-300 bg-red-50 dark:bg-red-100 px-4 py-3 text-sm text-red-800 dark:text-red-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center rounded-lg bg-[#0EFF2A] px-4 py-2.5 text-sm md:text-base font-semibold text-black shadow-md hover:shadow-lg hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-800">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-gray-900 dark:text-black hover:text-gray-700 dark:hover:text-gray-700 font-semibold"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

