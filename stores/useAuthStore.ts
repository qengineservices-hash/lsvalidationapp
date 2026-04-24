import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "admin" | "super_admin" | "designer" | "validation_manager" | "validation_lead";

export interface AppUser {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  is_deleted?: boolean;
}

interface AuthState {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  login: (user: AppUser) => void;
  logout: () => void;
}

// Email domain validation
export function isValidLivspaceEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@livspace.com");
}

// Role display labels
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  super_admin: "Super Admin",
  designer: "Designer",
  validation_manager: "Validation Manager",
  validation_lead: "Validation Lead",
};

// Role-specific dashboard paths
export const ROLE_DASHBOARD: Record<UserRole, string> = {
  admin: "/admin",
  super_admin: "/admin",
  designer: "/designer",
  validation_manager: "/manager",
  validation_lead: "/validation-lead",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      isAuthenticated: false,

      login: (user) =>
        set({
          currentUser: user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          currentUser: null,
          isAuthenticated: false,
        }),
    }),
    { name: "ls-auth" }
  )
);
