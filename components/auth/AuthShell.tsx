"use client";

import { useAuthStore, ROLE_LABELS, ROLE_DASHBOARD } from "@/stores/useAuthStore";
import { useGlobalSync } from "@/stores/useSyncEngine";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, User, ChevronDown, Home } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Pages that don't require auth
const PUBLIC_PATHS = ["/login", "/quote-view"];

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Initialize Global Sync Engine
  const { isSyncing } = useGlobalSync();

  // Wait for hydration to avoid mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname)) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-livspace-gray-100">
        <div className="animate-pulse text-livspace-gray-400 font-bold">Loading...</div>
      </div>
    );
  }

  // Public pages render without shell
  if (PUBLIC_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  // Not authenticated — redirect happening
  if (!isAuthenticated || !currentUser) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const roleBadgeColor: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    designer: "bg-blue-100 text-blue-700",
    validation_manager: "bg-purple-100 text-purple-700",
    validation_lead: "bg-green-100 text-green-700",
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-livspace-blue text-white">
        <div className="container flex h-16 items-center justify-between">
          <Link
            href={ROLE_DASHBOARD[currentUser.role]}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="text-xl font-bold tracking-tight">LS SERVICES</span>
            <span className="hidden md:inline-block text-xs bg-white/20 px-2 py-0.5 rounded text-white/80">
              Site Validation Tool
            </span>
            {isSyncing && (
              <span className="ml-2 flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
              </span>
            )}
          </Link>

          <div className="flex items-center gap-3">
            {/* Role badge */}
            <span
              className={cn(
                "hidden sm:inline-block text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                roleBadgeColor[currentUser.role]
              )}
            >
              {ROLE_LABELS[currentUser.role]}
            </span>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{currentUser.full_name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-livspace-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-livspace-gray-100">
                      <p className="text-sm font-bold text-livspace-dark">
                        {currentUser.full_name}
                      </p>
                      <p className="text-[10px] text-livspace-gray-400">
                        {currentUser.email}
                      </p>
                    </div>
                    <Link
                      href={ROLE_DASHBOARD[currentUser.role]}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      Dashboard
                    </Link>

                    {/* Role-specific links */}
                    {currentUser.role === "validation_lead" && (
                      <Link
                        href="/quotation"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors"
                      >
                        <span className="w-4 h-4 text-center text-xs">📋</span>
                        My Quotations
                      </Link>
                    )}
                    {currentUser.role === "validation_manager" && (
                      <Link
                        href="/manager"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors"
                      >
                        <span className="w-4 h-4 text-center text-xs">📝</span>
                        Quote Reviews
                      </Link>
                    )}
                    {((currentUser.role as string) === "admin" || (currentUser.role as string) === "super_admin") && (
                      <Link
                        href="/admin/mrc"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors"
                      >
                        <span className="w-4 h-4 text-center text-xs">📦</span>
                        MRC Management
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
