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

export type RequestStatus = "new" | "assigned" | "in_progress" | "on_hold" | "validation_done" | "report_generated";

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
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_at?: string;
  accepted_at?: string;
  start_time?: string;
  end_time?: string;
  last_edited_at?: string;
  version?: number;
  version_history?: { version: number; data: any; finalized_at: string; finalized_by: string }[];
  on_hold_reason?: string;
  validation_data?: any; // Stores the full ValidationStore formData
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
  updateRequestStatus: (id: string, status: RequestStatus, extraData?: Partial<ValidationRequest>, finalize?: boolean) => void;
  assignVlToRequest: (requestId: string, vlId: string, vmId: string) => void;
  getRequestsForDesigner: (designerId: string) => ValidationRequest[];
  getRequestsForVl: (vlId: string) => ValidationRequest[];
  getRequestsForCity: (cityId: string) => ValidationRequest[];
}

export const DEFAULT_CITIES: City[] = [
  { id: "city_blr", name: "Bangalore", code: "BLR", is_active: true },
  { id: "city_mum", name: "Mumbai", code: "MUM", is_active: true },
  { id: "city_del", name: "Delhi", code: "DEL", is_active: true },
  { id: "city_hyd", name: "Hyderabad", code: "HYD", is_active: true },
  { id: "city_chn", name: "Chennai", code: "CHN", is_active: true },
  { id: "city_noi", name: "Noida", code: "NOI", is_active: true },
];

// Seed admin user
export const SEED_ADMIN: AppUser = {
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
      const { id, email, full_name, role, is_active } = user;
      createClient().from("app_users").insert({ id, email, full_name, role, is_active }).then();
    },

    updateUser: (id, data) => {
      set((s) => ({
        users: s.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
      }));
      const payload: any = {};
      if (data.email !== undefined) payload.email = data.email;
      if (data.full_name !== undefined) payload.full_name = data.full_name;
      if (data.role !== undefined) payload.role = data.role;
      if (data.is_active !== undefined) payload.is_active = data.is_active;

      if (Object.keys(payload).length > 0) {
        createClient().from("app_users").update(payload).eq("id", id).then();
      }
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

    updateRequestStatus: (id, status, extraData, finalize = false) => {
      const updatedTimestamp = new Date().toISOString();
      set((s) => ({
        validationRequests: s.validationRequests.map((r) => {
          if (r.id !== id) return r;
          
          const isReopening = (r.status === "validation_done" || r.status === "report_generated") && status === "in_progress";
          let newVersion = r.version || 1;
          const newHistory = [...(r.version_history || [])];

          if (isReopening) {
            newVersion = (r.version || 1) + 1;
          }

          if (finalize) {
            newHistory.push({
              version: newVersion,
              data: extraData?.validation_data || r.validation_data, // Capture the full state
              finalized_at: updatedTimestamp,
              finalized_by: r.assigned_to || "Unknown VL",
            });
          }

          return { 
            ...r, 
            ...extraData, 
            status, 
            updated_at: updatedTimestamp,
            last_edited_at: updatedTimestamp,
            version: newVersion,
            version_history: newHistory,
          };
        }),
      }));
      // Push the whole updated request since it's a JSONB dump
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
                assigned_at: updatedTimestamp,
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
