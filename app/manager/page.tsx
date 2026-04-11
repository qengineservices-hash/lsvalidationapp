"use client";

import { useAuthStore, ROLE_DASHBOARD } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import Link from "next/link";
import { PlusCircle, FileText, MapPin, FileDown, LayoutGrid, Table } from "lucide-react";
import TableView from "@/components/dashboard/TableView";
import { exportGlobalTracker } from "@/lib/exportTracker";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ManagerDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const { cities, validationRequests, getCitiesForUser, getVlsForVm, assignVlToRequest } = useAppDataStore();

  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Safety: If Lead/Designer accidentally lands here, bounce them
  useEffect(() => {
    if (currentUser && currentUser.role !== "validation_manager" && currentUser.role !== "admin") {
      router.replace(ROLE_DASHBOARD[currentUser.role]);
    }
  }, [currentUser, router]);

  if (!currentUser || (currentUser.role !== "validation_manager" && currentUser.role !== "admin")) return null;

  const availableVLs = getVlsForVm(currentUser.id);

  // Cities tagged to this VM
  const myCities = getCitiesForUser(currentUser.id);
  const cityOptions = myCities.length > 0 ? myCities : cities; // Fallback to all if not tagged

  // Filter requests by city labels assigned to this VM (used to enforce role-based visibility)
  const filteredRequests = useMemo(() => {
    let base = validationRequests;
    if (currentUser.role === "validation_manager") {
      const cityIds = myCities.map(c => c.id);
      if (cityIds.length > 0) {
        base = base.filter(r => cityIds.includes(r.city_id));
      }
    }
    
    if (selectedCity === "all") return base;
    return base.filter((r) => r.city_id === selectedCity);
  }, [validationRequests, currentUser.role, myCities, selectedCity]);

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
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
            <FileText className="w-5 h-5 text-livspace-gray-500" />
            Tracker
            <span className="text-sm font-normal text-livspace-gray-400">
              ({filteredRequests.length})
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border",
                viewMode === "card" 
                  ? "bg-livspace-dark text-white border-livspace-dark shadow-md" 
                  : "bg-white text-livspace-gray-400 border-livspace-gray-200 hover:border-livspace-dark"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "p-2 px-4 rounded-lg transition-all flex items-center gap-2 text-xs font-bold border",
                viewMode === "table" 
                  ? "bg-livspace-dark text-white border-livspace-dark shadow-md" 
                  : "bg-white text-livspace-gray-400 border-livspace-gray-200 hover:border-livspace-dark"
              )}
            >
              <Table className="w-4 h-4" />
              <span>Tracker</span>
            </button>

            <button
              onClick={() => exportGlobalTracker(filteredRequests, `VM_Tracker_${new Date().toISOString().split('T')[0]}.csv`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        </div>

        {viewMode === "card" ? (
          <StatusBuckets 
            requests={filteredRequests} 
            showAssignee 
            getActionHref={(r) => {
              const hasReport = r.status === "report_generated" || r.status === "validation_done";
              return hasReport ? `/reports/${r.id}` : `/validation-lead/validate/${r.id}`;
            }}
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
        ) : (
          <TableView requests={filteredRequests} />
        )}
      </div>
    </div>
  );
}
