"use client";

import type { ValidationRequest, RequestStatus } from "@/stores/useAppDataStore";
import RequestCard from "./RequestCard";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Inbox } from "lucide-react";

interface StatusBucketsProps {
  requests: ValidationRequest[];
  showAssignee?: boolean;
  getActionHref?: (request: ValidationRequest) => string;
  renderActions?: (request: ValidationRequest) => React.ReactNode;
  overrideBuckets?: { key: RequestStatus; label: string; emoji: string }[];
}

const BUCKETS: { key: RequestStatus; label: string; emoji: string }[] = [
  { key: "new", label: "New", emoji: "🆕" },
  { key: "assigned", label: "Assigned", emoji: "📋" },
  { key: "in_progress", label: "Ongoing", emoji: "🔄" },
  { key: "on_hold", label: "On Hold", emoji: "⏸️" },
  { key: "completed", label: "Completed", emoji: "✅" },
];

export default function StatusBuckets({
  requests,
  showAssignee = false,
  getActionHref,
  renderActions,
  overrideBuckets,
}: StatusBucketsProps) {
  const bucketsToUse = overrideBuckets || BUCKETS;
  const [activeBucket, setActiveBucket] = useState<RequestStatus>(bucketsToUse[0].key);

  const filteredRequests = requests.filter((r) => r.status === activeBucket);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {bucketsToUse.map((bucket) => {
          const count = requests.filter((r) => r.status === bucket.key).length;
          return (
            <button
              key={bucket.key}
              onClick={() => setActiveBucket(bucket.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                activeBucket === bucket.key
                  ? "bg-livspace-blue text-white"
                  : "bg-white text-livspace-gray-600 border border-livspace-gray-200 hover:border-livspace-blue"
              )}
            >
              <span>{bucket.emoji}</span>
              {bucket.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                    activeBucket === bucket.key
                      ? "bg-white/20 text-white"
                      : "bg-livspace-gray-100 text-livspace-gray-600"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Request list */}
      {filteredRequests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-livspace-gray-400">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">
            No {bucketsToUse.find((b) => b.key === activeBucket)?.label.toLowerCase()} requests
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              showAssignee={showAssignee}
              actionHref={getActionHref?.(request)}
              renderActions={renderActions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
