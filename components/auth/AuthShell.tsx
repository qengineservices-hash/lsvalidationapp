"use client";

import { useAuthStore, ROLE_LABELS, ROLE_DASHBOARD } from "@/stores/useAuthStore";
import type { UserRole } from "@/stores/useAuthStore";
import { useGlobalSync } from "@/stores/useSyncEngine";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, User, ChevronDown, Home, ClipboardCheck, Receipt, Settings, FileText, LayoutGrid, Menu, X, Layers } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/notifications/NotificationBell";
import Toast from "@/components/ui/Toast";
import { Suspense } from "react";
import GlobalPidSearch from "@/components/app/GlobalPidSearch";

// Pages that don't require auth
const PUBLIC_PATHS = ["/login", "/quote-view", "/parametric-demo", "/reports"];

// Role-specific bottom nav tabs
type NavTab = { label: string; icon: React.ReactNode; href: string };

function getBottomTabs(role?: string, pathname?: string): NavTab[] {
  const normalizedRole = role?.toLowerCase().trim() || "";
  if (pathname?.startsWith("/designer")) {
    return [
      { label: "Home", icon: <Home className="w-5 h-5" />, href: "/designer" },
      { label: "Validation", icon: <ClipboardCheck className="w-5 h-5" />, href: "/designer?tab=tracker" },
      { label: "Quotation", icon: <Receipt className="w-5 h-5" />, href: "/designer?tab=quotes" },
    ];
  }
  switch (normalizedRole) {
    case "designer":
      return [
        { label: "Home", icon: <Home className="w-5 h-5" />, href: "/designer" },
        { label: "Validation", icon: <ClipboardCheck className="w-5 h-5" />, href: "/designer?tab=tracker" },
        { label: "Quotation", icon: <Receipt className="w-5 h-5" />, href: "/designer?tab=quotes" },
      ];
    case "validation_lead":
      return [
        { label: "Home", icon: <Home className="w-5 h-5" />, href: "/validation-lead" },
        { label: "Quotations", icon: <Receipt className="w-5 h-5" />, href: "/validation-lead?tab=quotations" },
        { label: "Performance", icon: <LayoutGrid className="w-5 h-5" />, href: "/validation-lead/performance" },
      ];
    case "validation_manager":
      return [
        { label: "Home", icon: <Home className="w-5 h-5" />, href: "/manager" },
        { label: "Quote Reviews", icon: <Receipt className="w-5 h-5" />, href: "/manager?tab=quote_reviews" },
        { label: "Performance", icon: <LayoutGrid className="w-5 h-5" />, href: "/validation-manager/performance" },
      ];
    case "admin":
    case "super_admin":
      return [
        { label: "Home", icon: <Home className="w-5 h-5" />, href: "/admin" },
        { label: "MRC", icon: <LayoutGrid className="w-5 h-5" />, href: "/admin/mrc" },
      ];
    case "design_associate":
      return [
        { label: "Home", icon: <Home className="w-5 h-5" />, href: "/design-associate" },
        { label: "Projects", icon: <Layers className="w-5 h-5" />, href: "/design-associate/projects" },
      ];
    default:
      return [{ label: "Home", icon: <Home className="w-5 h-5" />, href: "/" }];
  }
}

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
    if (!isAuthenticated && !PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
      router.push("/login");
    }
  }, [hydrated, isAuthenticated, pathname, router]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-brand-surface">
        <div className="animate-pulse text-brand-muted font-bold">Loading...</div>
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
    super_admin: "bg-red-100 text-red-700",
    designer: "bg-blue-100 text-blue-700",
    validation_manager: "bg-purple-100 text-purple-700",
    validation_lead: "bg-green-100 text-green-700",
  };

  const bottomTabs = getBottomTabs(currentUser.role, pathname);

  return (
    <>
      <Toast />
      {/* ==========================================
          TOP HEADER — Compact on mobile
          ========================================== */}
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-secondary text-white">
        <div className="flex h-14 md:h-16 items-center justify-between px-4 md:px-6 max-w-[1400px] mx-auto">
          {/* Left: Logo */}
          <Link
            href={ROLE_DASHBOARD[currentUser.role]}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="text-lg md:text-xl font-bold tracking-tight">LS SERVICES</span>
            <span className="hidden md:inline-block text-xs bg-white/20 px-2 py-0.5 rounded text-white/80">
              Site Validation Tool
            </span>
            {isSyncing && (
              <span className="ml-1 flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
            )}
          </Link>

          {/* Right: Role badge + User menu */}
          <div className="flex items-center gap-2">
            {/* Role badge — hidden on small mobile */}
            <span
              className={cn(
                "hidden sm:inline-block text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-accent/20 text-accent"
              )}
            >
              {ROLE_LABELS[currentUser.role]}
            </span>

            <GlobalPidSearch />
            <NotificationBell />

            {/* Desktop: dropdown trigger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-sm"
            >
              <User className="w-4 h-4" />
              <span>{currentUser.full_name}</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Mobile: hamburger */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors touch-target"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ==========================================
          SLIDE-IN MENU — Full screen on mobile, dropdown on desktop
          ========================================== */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 md:bg-transparent"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className={cn(
            "fixed z-50 bg-white shadow-xl",
            // Mobile: slides from right, full height
            "inset-y-0 right-0 w-72 max-w-[85vw]",
            // Desktop: positioned as dropdown
            "md:absolute md:inset-auto md:right-4 md:top-14 md:w-56 md:rounded-xl md:border md:border-slate-100"
          )}>
            {/* User info */}
            <div className="px-5 py-4 border-b border-livspace-gray-100">
              <p className="text-sm font-bold text-livspace-dark">{currentUser.full_name}</p>
              <p className="text-xs text-livspace-gray-400 mt-0.5">{currentUser.email}</p>
              <span
                className={cn(
                  "inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider sm:hidden",
                  roleBadgeColor[currentUser.role]
                )}
              >
                {ROLE_LABELS[currentUser.role]}
              </span>
            </div>

            {/* Nav links */}
            <nav className="py-2">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors touch-target"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>

              {currentUser.role === "validation_lead" && (
                <Link
                  href="/validation-lead/performance"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors touch-target"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Performance
                </Link>
              )}

              {currentUser.role === "validation_manager" && (
                <Link
                  href="/validation-manager/performance"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors touch-target"
                >
                  <LayoutGrid className="w-4 h-4" />
                  Performance
                </Link>
              )}

              <Link
                href="/support"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-5 py-3 text-sm text-livspace-gray-600 hover:bg-livspace-gray-50 transition-colors touch-target"
              >
                <Settings className="w-4 h-4" />
                Help / Support
              </Link>
            </nav>

            {/* Logout */}
            <div className="border-t border-livspace-gray-100 py-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors touch-target"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ==========================================
          MAIN CONTENT — with bottom nav padding on mobile
          ========================================== */}
      <main className="flex-1 pb-bottom-nav">{children}</main>

      {/* ==========================================
          BOTTOM TAB BAR — Mobile only (hidden on md+)
          ========================================== */}
      <Suspense fallback={<div className="h-16 md:hidden bg-secondary border-t border-white/10" />}>
        <BottomNav bottomTabs={bottomTabs} />
      </Suspense>
    </>
  );
}

function BottomNav({ bottomTabs }: { bottomTabs: NavTab[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  if (bottomTabs.length === 0) return null;

  return (
    <nav className="bottom-nav bg-secondary md:hidden" role="navigation" aria-label="Main navigation">
      {bottomTabs.map((tab) => {
        const tabPath = tab.href.split('?')[0];
        const tabQuery = tab.href.split('?')[1] || "";
        
        const isPathMatch = pathname === tabPath;
        const isQueryMatch = tabQuery 
          ? searchParams.toString().includes(tabQuery)
          : !searchParams.get("tab") || searchParams.get("tab") === "home";
          
        const isActive = isPathMatch && isQueryMatch;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors relative",
              isActive
                ? "text-accent"
                : "text-white/60 active:text-white"
            )}
          >
            <div className={cn(isActive && "[&>svg]:fill-accent")}>
              {tab.icon}
            </div>
            <span className="text-[10px] font-medium">{tab.label}</span>
            {isActive && (
              <span className="absolute top-0 w-8 h-0.5 bg-accent rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
