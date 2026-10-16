"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleClear() {
    setUsername("");
    setPassword("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many attempts. Please wait a few minutes and try again."
            : res.status === 422
              ? "Invalid username or password."
              : "Something went wrong. Please try again."
        );
        setLoading(false);
        return;
      }

      router.push("/teacher");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-lg border border-white/20 bg-black/50 px-8 py-8 sm:px-12 sm:py-10 shadow-2xl backdrop-blur-md">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-white/30" />
        <h2 className="text-base font-bold tracking-[0.2em] text-gray-100 uppercase">
          Teacher Sign In
        </h2>
        <div className="h-px flex-1 bg-white/30" />
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Username */}
        <div>
          <label
            htmlFor="login-username"
            className="mb-1.5 block text-base font-semibold text-white"
          >
            Username
          </label>
          <input
            id="login-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            disabled={loading}
            className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-destructive disabled:opacity-60"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="login-password"
            className="mb-1.5 block text-base font-semibold text-white"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
              className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 pr-10 text-base text-gray-900 outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-destructive disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-gray-500 outline-none hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-0 rounded-md"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            role="alert"
            aria-live="polite"
            className="rounded-md border border-destructive/50 bg-destructive/20 px-3 py-2 text-base text-red-200"
          >
            {error}
          </p>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="min-h-11 rounded-md border border-white/30 bg-transparent px-5 py-3 text-base font-medium text-white outline-none transition-colors hover:bg-white/10 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-0"
          >
            Clear Entries
          </button>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-md border border-white/30 bg-white/10 px-8 py-3 text-base font-semibold text-white outline-none transition-colors hover:bg-white/20 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-0"
          >
            Login
          </button>
        </div>
      </form>

      {/* Loading modal */}
      {loading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          role="alertdialog"
          aria-busy="true"
          aria-live="assertive"
        >
          <div className="flex flex-col items-center gap-4 rounded-lg border border-white/20 bg-black/80 px-10 py-8 shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin text-white" aria-hidden="true" />
            <p className="text-base font-semibold text-white">Signing in...</p>
          </div>
        </div>
      )}
    </div>
  );
}