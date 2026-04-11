import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";
import type { AppUser, UserRole } from "./useAuthStore";

// ===================================================
// TYPES
// ===================================================

export interface VmVlAssignment {
  id: string;
  vm_id: string;
  vl_id: string;
  is_active: boolean;
}

export interface UserCity {
  id: string;
  user_id: string;
  city_id: string;
}

export interface City {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

export type RequestStatus = "new" | "assigned" | "in_progress" | "on_hold" | "completed";

export interface ValidationRequest {
  id: string;
  request_number: string;
  pid: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  society_name: string;
  flat_no: string;
  floor_no: string;
  city_id: string;
  request_type: string;
  priority: "P0" | "P1" | "P2";
  priority_reason: string;
  special_instructions: string;
  requested_by: string;   // user id
  assigned_to: string;    // VL user id
  assigned_by: string;    // VM user id
  status: RequestStatus;
  on_hold_reason?: string;
  created_at: string;
  updated_at: string;
}

// ===================================================
// STORE
// ===================================================

interface AppDataState {
  // Master data
  users: AppUser[];
  cities: City[];
  vmVlAssignments: VmVlAssignment[];
  userCities: UserCity[];
  validationRequests: ValidationRequest[];

  // User CRUD
  addUser: (user: AppUser) => void;
  updateUser: (id: string, data: Partial<AppUser>) => void;
  getUserById: (id: string) => AppUser | undefined;
  getUsersByRole: (role: UserRole) => AppUser[];

  // City CRUD
  addCity: (city: City) => void;
  updateCity: (id: string, data: Partial<City>) => void;
  deleteCity: (id: string) => void;

  // VM-VL Assignments
  assignVlToVm: (assignment: VmVlAssignment) => void;
  removeVlFromVm: (id: string) => void;
  getVlsForVm: (vmId: string) => AppUser[];

  // User-City Assignments
  assignUserToCity: (userCity: UserCity) => void;
  removeUserFromCity: (id: string) => void;
  getCitiesForUser: (userId: string) => City[];

  // Validation Requests
  addRequest: (request: ValidationRequest) => void;
  updateRequestStatus: (id: string, status: RequestStatus, reason?: string) => void;
  assignVlToRequest: (requestId: string, vlId: string, vmId: string) => void;
  getRequestsForDesigner: (designerId: string) => ValidationRequest[];
  getRequestsForVl: (vlId: string) => ValidationRequest[];
  getRequestsForCity: (cityId: string) => ValidationRequest[];
}

const DEFAULT_CITIES: City[] = [
  { id: "city_blr", name: "Bangalore", code: "BLR", is_active: true },
  { id: "city_mum", name: "Mumbai", code: "MUM", is_active: true },
  { id: "city_del", name: "Delhi", code: "DEL", is_active: true },
  { id: "city_hyd", name: "Hyderabad", code: "HYD", is_active: true },
  { id: "city_chn", name: "Chennai", code: "CHN", is_active: true },
  { id: "city_noi", name: "Noida", code: "NOI", is_active: true },
];

// Seed admin user
const SEED_ADMIN: AppUser = {
  id: "user_admin_001",
  email: "qengine_services@livspace.com",
  full_name: "QEngine Admin",
  phone: "",
  role: "admin",
  is_active: true,
};

export const useAppDataStore = create<AppDataState>()(
  (set, get) => ({
    users: [SEED_ADMIN],
    cities: DEFAULT_CITIES,
    vmVlAssignments: [],
    userCities: [],
    validationRequests: [],

    // ---- Users ----
    addUser: (user) => {
      set((s) => ({ users: [...s.users, user] }));
      createClient().from("app_users").insert(user).then();
    },

    updateUser: (id, data) => {
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
      }));
      createClient().from("app_users").update(data).eq("id", id).then();
    },

    getUserById: (id) => get().users.find((u) => u.id === id),

    getUsersByRole: (role) =>
      get().users.filter((u) => u.role === role && u.is_active),

    // ---- Cities ----
    addCity: (city) => {
      set((s) => ({ cities: [...s.cities, city] }));
      createClient().from("app_cities").insert(city).then();
    },

    updateCity: (id, data) => {
      set((s) => ({
        cities: s.cities.map((c) => (c.id === id ? { ...c, ...data } : c)),
      }));
      createClient().from("app_cities").update(data).eq("id", id).then();
    },

    deleteCity: (id) => {
      set((s) => ({
        cities: s.cities.filter((c) => c.id !== id),
        userCities: s.userCities.filter((uc) => uc.city_id !== id),
      }));
      createClient().from("app_cities").delete().eq("id", id).then();
    },

    // ---- VM-VL Assignments ----
    assignVlToVm: (assignment) => {
      set((s) => ({ vmVlAssignments: [...s.vmVlAssignments, assignment] }));
      createClient().from("app_vm_vl_assignments").insert(assignment).then();
    },

    removeVlFromVm: (id) => {
      set((s) => ({
        vmVlAssignments: s.vmVlAssignments.filter((a) => a.id !== id),
      }));
      createClient().from("app_vm_vl_assignments").delete().eq("id", id).then();
    },

    getVlsForVm: (vmId) => {
      const state = get();
      const vlIds = state.vmVlAssignments
        .filter((a) => a.vm_id === vmId && a.is_active)
        .map((a) => a.vl_id);
      return state.users.filter((u) => vlIds.includes(u.id) && u.is_active);
    },

    // ---- User-City ----
    assignUserToCity: (userCity) => {
      set((s) => ({ userCities: [...s.userCities, userCity] }));
      createClient().from("app_user_cities").insert(userCity).then();
    },

    removeUserFromCity: (id) => {
      set((s) => ({
        userCities: s.userCities.filter((uc) => uc.id !== id),
      }));
      createClient().from("app_user_cities").delete().eq("id", id).then();
    },

    getCitiesForUser: (userId) => {
      const state = get();
      const cityIds = state.userCities
        .filter((uc) => uc.user_id === userId)
        .map((uc) => uc.city_id);
      return state.cities.filter((c) => cityIds.includes(c.id));
    },

    // ---- Validation Requests ----
    addRequest: (request) => {
      set((s) => ({
        validationRequests: [...s.validationRequests, request],
      }));
      createClient().from("app_validation_requests").insert({ id: request.id, data: request }).then();
    },

    updateRequestStatus: (id, status, reason) => {
      const updatedTimestamp = new Date().toISOString();
      set((s) => ({
        validationRequests: s.validationRequests.map((r) =>
          r.id === id ? { ...r, status, updated_at: updatedTimestamp, ...(reason !== undefined ? { on_hold_reason: reason } : {}) } : r
        ),
      }));
      // Need to push the whole updated request since it's a JSONB dump
      const updatedReq = get().validationRequests.find(r => r.id === id);
      if (updatedReq) {
        createClient().from("app_validation_requests").update({ data: updatedReq, updated_at: updatedTimestamp }).eq("id", id).then();
      }
    },

    assignVlToRequest: (requestId, vlId, vmId) => {
      const updatedTimestamp = new Date().toISOString();
      set((s) => ({
        validationRequests: s.validationRequests.map((r) =>
          r.id === requestId
            ? {
                ...r,
                assigned_to: vlId,
                assigned_by: vmId,
                status: "assigned" as RequestStatus,
                updated_at: updatedTimestamp,
              }
            : r
        ),
      }));
      const updatedReq = get().validationRequests.find(r => r.id === requestId);
      if (updatedReq) {
        createClient().from("app_validation_requests").update({ data: updatedReq, updated_at: updatedTimestamp }).eq("id", requestId).then();
      }
    },

    getRequestsForDesigner: (designerId) =>
      get().validationRequests.filter((r) => r.requested_by === designerId),

    getRequestsForVl: (vlId) =>
      get().validationRequests.filter((r) => r.assigned_to === vlId),

    getRequestsForCity: (cityId) =>
      get().validationRequests.filter((r) => r.city_id === cityId),
  })
);
