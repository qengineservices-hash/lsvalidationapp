"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import { ClipboardCheck } from "lucide-react";

export default function ValidationLeadDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { getRequestsForVl, updateRequestStatus } = useAppDataStore();

  if (!currentUser) return null;

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
        <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-livspace-gray-500" />
          My Validations
          <span className="text-sm font-normal text-livspace-gray-400">
            ({myAssignedRequests.length})
          </span>
        </h2>

        <StatusBuckets
          requests={myAssignedRequests}
          overrideBuckets={[
            { key: "assigned", label: "New", emoji: "🆕" },
            { key: "in_progress", label: "Ongoing", emoji: "🔄" },
            { key: "on_hold", label: "On Hold", emoji: "⏸️" },
            { key: "completed", label: "Completed", emoji: "✅" },
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
      </div>
    </div>
  );
}
