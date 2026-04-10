"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-livspace-blue p-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-livspace-blue tracking-tight">LS SERVICES</h1>
          <p className="text-livspace-gray-600 font-medium">Internal Site Validation Tool</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-livspace-error bg-red-50 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-livspace-gray-800" htmlFor="email">
                Official Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="arkur.kumar@livspace.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-livspace-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-livspace-gray-800" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-livspace-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-livspace-orange outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary h-12 text-lg font-semibold flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign In"}
          </button>

          <p className="text-center text-xs text-livspace-gray-400 pt-4">
            Reset password or access issues? Contact vertical admin.
          </p>
        </form>
      </div>
    </div>
  );
}
