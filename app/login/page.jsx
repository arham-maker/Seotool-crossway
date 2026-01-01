"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white dark:bg-gray-100 shadow-xl rounded-xl border border-gray-200 dark:border-gray-300 p-8">
        <h1 className="text-3xl font-bold mb-2 text-center text-gray-900 dark:text-black">Login</h1>
        <p className="text-gray-600 dark:text-gray-800 mb-8 text-center text-sm">
          Sign in to your account to continue
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
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
              placeholder="Enter your password"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-400 bg-white dark:bg-gray-50 px-3 py-2.5 text-sm md:text-base text-black dark:text-black placeholder-gray-500 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 focus:border-gray-400 dark:focus:border-gray-500 transition-all duration-150"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-700 dark:text-gray-800 hover:text-gray-900 dark:hover:text-black font-medium"
            >
              Forgot password?
            </Link>
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
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-800">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-gray-900 dark:text-black hover:text-gray-700 dark:hover:text-gray-700 font-semibold"
            >
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

