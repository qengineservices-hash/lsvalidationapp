"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, isValidLivspaceEmail, ROLE_DASHBOARD, ROLE_LABELS } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { AlertCircle, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const users = useAppDataStore((s) => s.users);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();

    // Enforce @livspace.com domain
    if (!isValidLivspaceEmail(trimmedEmail)) {
      setError("Only @livspace.com email addresses are allowed.");
      setLoading(false);
      return;
    }

    // Look up user in the store
    const user = users.find(
      (u) => u.email.toLowerCase() === trimmedEmail && u.is_active
    );

    if (!user) {
      setError("Account not found. Contact your admin to get access.");
      setLoading(false);
      return;
    }

    // Login and redirect to role-specific dashboard
    login(user);
    router.push(ROLE_DASHBOARD[user.role]);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-livspace-blue p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-2xl">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-livspace-orange rounded-2xl mb-2">
            <span className="text-2xl font-black text-white">LS</span>
          </div>
          <h1 className="text-3xl font-bold text-livspace-blue tracking-tight">
            LS SERVICES
          </h1>
          <p className="text-livspace-gray-600 font-medium">
            Site Validation Tool
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 rounded-xl border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <label
              className="text-sm font-semibold text-livspace-gray-800"
              htmlFor="email"
            >
              Official Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="yourname@livspace.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full border border-livspace-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all text-sm"
            />
            <p className="text-[10px] text-livspace-gray-400 font-medium">
              Only @livspace.com emails are accepted
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-12 text-lg font-semibold flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <LogIn className="h-5 w-5" />
                Sign In
              </>
            )}
          </button>

          <p className="text-center text-xs text-livspace-gray-400 pt-2">
            Don't have access? Contact your vertical admin.
          </p>
        </form>
      </div>
    </div>
  );
}
