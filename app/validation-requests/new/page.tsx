"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, ROLE_DASHBOARD } from "@/stores/useAuthStore";
import { useAppDataStore, type ValidationRequest } from "@/stores/useAppDataStore";
import { Hash, User, MapPin, Building2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

export default function NewValidationRequestPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { cities, addRequest, getVlsForVm } = useAppDataStore();
  const router = useRouter();

  const [form, setForm] = useState({
    pid: "",
    customer_name: "",
    customer_phone: "",
    society_name: "",
    address: "",
    flat_no: "",
    floor_no: "",
    city_id: "",
    request_type: "services",
    priority: "P2" as "P0" | "P1" | "P2",
    priority_reason: "",
    special_instructions: "",
    scheduled_date: "",
    scheduled_time: "",
    assigned_to: "",  // Only used by VM
  });

  if (!currentUser) return null;

  const isVM = currentUser.role === "validation_manager";
  const isAdmin = currentUser.role === "admin";
  const canAssign = isVM || isAdmin;

  // VLs available for assignment (under this VM)
  const availableVLs = canAssign
    ? isVM
      ? getVlsForVm(currentUser.id)
      : useAppDataStore.getState().getUsersByRole("validation_lead")
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.pid || !form.customer_name || !form.city_id || !form.customer_phone || !form.address) {
      alert("PID, Customer Name, Phone, Address, and City are required.");
      return;
    }
    
    if (!/^\d{10}$/.test(form.customer_phone)) {
      alert("Customer Phone must be exactly 10 digits.");
      return;
    }

    const request: ValidationRequest = {
      id: "req_" + Date.now(),
      request_number: "SVR-" + Date.now().toString().slice(-6),
      pid: form.pid,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      address: form.address,
      society_name: form.society_name,
      flat_no: form.flat_no,
      floor_no: form.floor_no,
      city_id: form.city_id,
      request_type: form.request_type,
      priority: form.priority,
      priority_reason: form.priority_reason,
      special_instructions: form.special_instructions,
      scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time,
      requested_by: currentUser.id,
      assigned_to: form.assigned_to || "",
      assigned_by: form.assigned_to ? currentUser.id : "",
      status: form.assigned_to ? "assigned" : "new",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    addRequest(request);
    alert("Request submitted successfully! #" + request.request_number);
    router.push(ROLE_DASHBOARD[currentUser.role]);
  };

  const update = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="container py-8 max-w-2xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-bold text-livspace-dark">
          New Validation Request
        </h1>
        <p className="text-sm text-livspace-gray-500">
          Fill in the project details to raise a new site validation request.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* PID & Customer */}
        <div className="bg-white border border-livspace-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-livspace-blue uppercase tracking-wider">
            Project Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                PID *
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-2.5 h-4 w-4 text-livspace-gray-400" />
                <input
                  type="text"
                  maxLength={15}
                  required
                  placeholder="Numeric up to 15 digits"
                  value={form.pid}
                  onChange={(e) => update("pid", e.target.value.replace(/\D/g, ""))}
                  className="w-full border border-livspace-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Customer Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-livspace-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Aditi Sharma"
                  value={form.customer_name}
                  onChange={(e) => update("customer_name", e.target.value)}
                  className="w-full border border-livspace-gray-200 rounded-lg pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Customer Phone *
              </label>
              <input
                type="text"
                required
                maxLength={10}
                placeholder="9876543210"
                value={form.customer_phone}
                onChange={(e) => update("customer_phone", e.target.value.replace(/\D/g, ""))}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                City *
              </label>
              <select
                required
                value={form.city_id}
                onChange={(e) => update("city_id", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange bg-white"
              >
                <option value="">Select City</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white border border-livspace-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-livspace-blue uppercase tracking-wider">
            Location Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Society Name
              </label>
              <input
                type="text"
                placeholder="Prestige Falcon City"
                value={form.society_name}
                onChange={(e) => update("society_name", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Full Address *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Full address with landmark"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Flat No
              </label>
              <input
                type="text"
                placeholder="B-402"
                value={form.flat_no}
                onChange={(e) => update("flat_no", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Floor No
              </label>
              <input
                type="text"
                placeholder="4th"
                value={form.floor_no}
                onChange={(e) => update("floor_no", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
              />
            </div>
            
            {/* Scheduled Date/Time */ }
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Scheduled Date
              </label>
              <input
                type="date"
                value={form.scheduled_date}
                onChange={(e) => update("scheduled_date", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Scheduled Time
              </label>
              <input
                type="time"
                value={form.scheduled_time}
                onChange={(e) => update("scheduled_time", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange"
              />
            </div>
          </div>
        </div>

        {/* Priority & Instructions */}
        <div className="bg-white border border-livspace-gray-200 rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-livspace-blue uppercase tracking-wider">
            Priority & Notes
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Priority
              </label>
              <div className="flex gap-2">
                {(["P2", "P1", "P0"] as const).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => update("priority", p)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold transition-all border",
                      form.priority === p
                        ? p === "P0"
                          ? "bg-red-500 text-white border-red-500"
                          : p === "P1"
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-livspace-blue text-white border-livspace-blue"
                        : "bg-white text-livspace-gray-600 border-livspace-gray-200"
                    )}
                  >
                    {p} {p === "P0" ? "(Urgent)" : p === "P1" ? "(High)" : "(Normal)"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-livspace-gray-500">
                Special Instructions
              </label>
              <textarea
                rows={3}
                placeholder="Any notes for the validation lead..."
                value={form.special_instructions}
                onChange={(e) => update("special_instructions", e.target.value)}
                className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange resize-none"
              />
            </div>
          </div>
        </div>

        {/* VL Assignment (VM/Admin only) */}
        {canAssign && (
          <div className="bg-white border border-livspace-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-livspace-blue uppercase tracking-wider">
              Assign Validation Lead
            </h3>
            <select
              value={form.assigned_to}
              onChange={(e) => update("assigned_to", e.target.value)}
              className="w-full border border-livspace-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-livspace-orange bg-white"
            >
              <option value="">— Assign Later —</option>
              {availableVLs.map((vl) => (
                <option key={vl.id} value={vl.id}>
                  {vl.full_name} ({vl.email})
                </option>
              ))}
            </select>
            {availableVLs.length === 0 && (
              <p className="text-xs text-livspace-gray-400">
                No VLs tagged to you. Ask admin to assign VLs from the Admin Panel.
              </p>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full btn-primary h-14 text-lg font-bold flex items-center justify-center gap-2 group shadow-lg shadow-livspace-orange/20 rounded-xl"
        >
          <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          Submit Validation Request
        </button>
      </form>
    </div>
  );
}
