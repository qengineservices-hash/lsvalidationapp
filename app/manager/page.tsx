"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import Link from "next/link";
import { PlusCircle, FileText, MapPin } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function ManagerDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { cities, validationRequests, getCitiesForUser, getVlsForVm, assignVlToRequest } = useAppDataStore();

  const [selectedCity, setSelectedCity] = useState<string>("all");

  if (!currentUser) return null;

  const availableVLs = getVlsForVm(currentUser.id);

  // Cities tagged to this VM
  const myCities = getCitiesForUser(currentUser.id);
  const cityOptions = myCities.length > 0 ? myCities : cities; // Fallback to all if not tagged

  // Filter requests by city
  const filteredRequests =
    selectedCity === "all"
      ? validationRequests
      : validationRequests.filter((r) => r.city_id === selectedCity);

  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-livspace-dark">
            Hello, <span className="text-livspace-orange">{currentUser.full_name}</span>
          </h1>
          <p className="text-sm text-livspace-gray-500">
            Manage validation requests, assign leads, and track progress.
          </p>
        </div>
        <Link
          href="/validation-requests/new"
          className="btn-primary px-6 py-3 inline-flex items-center gap-2 font-bold text-sm rounded-xl"
        >
          <PlusCircle className="w-5 h-5" />
          New Request
        </Link>
      </div>

      {/* City Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCity("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all",
            selectedCity === "all"
              ? "bg-livspace-dark text-white"
              : "bg-white text-livspace-gray-600 border border-livspace-gray-200 hover:border-livspace-dark"
          )}
        >
          <MapPin className="w-3.5 h-3.5" />
          All Cities
        </button>
        {cityOptions.map((city) => (
          <button
            key={city.id}
            onClick={() => setSelectedCity(city.id)}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold transition-all",
              selectedCity === city.id
                ? "bg-livspace-dark text-white"
                : "bg-white text-livspace-gray-600 border border-livspace-gray-200 hover:border-livspace-dark"
            )}
          >
            {city.name}
          </button>
        ))}
      </div>

      {/* Request Buckets */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
          <FileText className="w-5 h-5 text-livspace-gray-500" />
          Validation Requests
          <span className="text-sm font-normal text-livspace-gray-400">
            ({filteredRequests.length})
          </span>
        </h2>

        <StatusBuckets 
          requests={filteredRequests} 
          showAssignee 
          getActionHref={(r) => `/validation-lead/validate/${r.id}`}
          renderActions={(r) => {
            if (r.status !== "new" && r.status !== "assigned") return null;
            return (
              <div className="flex items-center gap-2">
                <select
                  className="w-full text-xs border border-livspace-gray-200 rounded-lg px-2 py-2 focus:ring-1 focus:ring-livspace-blue outline-none bg-white"
                  value={r.assigned_to || ""}
                  onChange={(e) => {
                    if (e.target.value) {
                      assignVlToRequest(r.id, e.target.value, currentUser.id);
                    }
                  }}
                >
                  <option value="">— Assign Validation Lead —</option>
                  {availableVLs.map(vl => (
                    <option key={vl.id} value={vl.id}>{vl.full_name} ({vl.email})</option>
                  ))}
                </select>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}
