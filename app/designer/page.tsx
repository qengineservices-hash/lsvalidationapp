"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import Link from "next/link";
import { PlusCircle, FileText } from "lucide-react";

export default function DesignerDashboard() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { getRequestsForDesigner } = useAppDataStore();

  if (!currentUser) return null;

  const myRequests = getRequestsForDesigner(currentUser.id);

  return (
    <div className="container py-8 space-y-8 max-w-4xl">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-livspace-dark">
            Hello, <span className="text-livspace-orange">{currentUser.full_name}</span>
          </h1>
          <p className="text-sm text-livspace-gray-500">
            Raise new validation requests and track their progress.
          </p>
        </div>
        <Link
          href="/validation-requests/new"
          className="btn-primary px-6 py-3 inline-flex items-center gap-2 font-bold text-sm rounded-xl"
        >
          <PlusCircle className="w-5 h-5" />
          New Validation Request
        </Link>
      </div>

      {/* My Requests */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-livspace-dark flex items-center gap-2">
          <FileText className="w-5 h-5 text-livspace-gray-500" />
          My Requests
          <span className="text-sm font-normal text-livspace-gray-400">({myRequests.length})</span>
        </h2>

        <StatusBuckets requests={myRequests} showAssignee />
      </div>
    </div>
  );
}
