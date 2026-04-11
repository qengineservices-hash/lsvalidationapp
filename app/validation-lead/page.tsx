"use client";

import { useAuthStore, ROLE_DASHBOARD } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import { ClipboardCheck, LayoutGrid, Table, FileDown } from "lucide-react";
import TableView from "@/components/dashboard/TableView";
import { exportGlobalTracker } from "@/lib/exportTracker";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ValidationLeadDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const { getRequestsForVl, updateRequestStatus } = useAppDataStore();
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Safety: If Admin/Manager accidentally lands here, bounce them to their correct home
  useEffect(() => {
    if (currentUser && currentUser.role !== "validation_lead") {
      router.replace(ROLE_DASHBOARD[currentUser.role]);
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "validation_lead") return null;

  const myAssignedRequests = getRequestsForVl(currentUser.id);

  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-livspace-dark">
          Hello, <span className="text-livspace-orange">{currentUser.full_name}</span>
        </h1>
        <p className="text-sm text-livspace-gray-500">
          Your assigned site validations. Tap a request to begin or continue validation.
        </p>
      </div>

      {/* Assigned Requests */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-livspace-gray-500" />
            My Validations
            <span className="text-sm font-normal text-livspace-gray-400">
              ({myAssignedRequests.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex bg-livspace-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode("card")}
                className={cn("p-1.5 rounded text-xs transition-colors", viewMode === "card" ? "bg-white shadow-sm text-livspace-dark" : "text-livspace-gray-400")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn("p-1.5 rounded text-xs transition-colors", viewMode === "table" ? "bg-white shadow-sm text-livspace-dark" : "text-livspace-gray-400")}
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => exportGlobalTracker(myAssignedRequests, `VL_Tracker_${new Date().toISOString().split('T')[0]}.csv`)}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        </div>

        {viewMode === "card" ? (
          <StatusBuckets
            requests={myAssignedRequests}
            overrideBuckets={[
              { key: "assigned", label: "New", emoji: "🆕" },
              { key: "in_progress", label: "Ongoing", emoji: "🔄" },
              { key: "on_hold", label: "On Hold", emoji: "⏸️" },
              { key: "report_generated", label: "Completed", emoji: "✅", statuses: ["validation_done", "report_generated"] },
            ]}
            getActionHref={(req) => req.status === "assigned" ? undefined : `/validation-lead/validate/${req.id}`}
            renderActions={(req) => {
              if (req.status === "assigned") {
                return (
                  <button 
                    onClick={() => updateRequestStatus(req.id, "in_progress")}
                    className="w-full bg-livspace-blue text-white py-2.5 text-xs font-bold rounded-lg hover:bg-blue-800 transition-colors"
                  >
                    Accept Validation
                  </button>
                );
              }
              return null;
            }}
          />
        ) : (
          <TableView requests={myAssignedRequests} />
        )}
      </div>
    </div>
  );
}
