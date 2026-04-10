"use client";

import type { ValidationRequest, RequestStatus } from "@/stores/useAppDataStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { cn } from "@/lib/utils";
import { Clock, User, MapPin, Hash, MousePointerClick } from "lucide-react";
import { useRouter } from "next/navigation";

interface RequestCardProps {
  request: ValidationRequest;
  showAssignee?: boolean;
  actionHref?: string;
  renderActions?: (request: ValidationRequest) => React.ReactNode;
}

const STATUS_STYLES: Record<RequestStatus, { label: string; bg: string; text: string }> = {
  new: { label: "New", bg: "bg-blue-100", text: "text-blue-700" },
  assigned: { label: "Assigned", bg: "bg-purple-100", text: "text-purple-700" },
  in_progress: { label: "In Progress", bg: "bg-amber-100", text: "text-amber-700" },
  on_hold: { label: "On Hold", bg: "bg-red-100", text: "text-red-700" },
  completed: { label: "Completed", bg: "bg-green-100", text: "text-green-700" },
};

export default function RequestCard({
  request,
  showAssignee = false,
  actionHref,
  renderActions,
}: RequestCardProps) {
  const router = useRouter();
  const { getUserById, cities } = useAppDataStore();

  const city = cities.find((c) => c.id === request.city_id);
  const assignee = request.assigned_to ? getUserById(request.assigned_to) : null;
  const statusStyle = STATUS_STYLES[request.status];

  return (
    <div 
      className="p-4 bg-white border border-livspace-gray-200 rounded-xl hover:shadow-md hover:-translate-y-0.5 transition-all space-y-3 relative"
    >
      <div 
        className={cn("absolute inset-0 rounded-xl", actionHref ? "cursor-pointer" : "")} 
        onClick={() => actionHref && router.push(actionHref)}
      />
      <div className="relative pointer-events-none">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-bold text-livspace-dark text-sm">
              {request.customer_name}
            </h4>
            <div className="flex items-center gap-3 text-xs text-livspace-gray-400">
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {request.pid}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {city?.name || "—"}
              </span>
            </div>
          </div>
          <span
            className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
              statusStyle.bg,
              statusStyle.text
            )}
          >
            {statusStyle.label}
          </span>
        </div>

        <div className="flex items-center justify-between text-[10px] text-livspace-gray-400 mt-3">
          <span>{request.society_name} — {request.flat_no}</span>
          {showAssignee && assignee && (
            <span className="flex items-center gap-1 font-medium text-livspace-blue">
              <User className="w-3 h-3" />
              {assignee.full_name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-livspace-gray-400 mt-3">
          <Clock className="w-3 h-3" />
          {new Date(request.created_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {request.priority !== "P2" && (
            <span
              className={cn(
                "ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded",
                request.priority === "P0"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              {request.priority}
            </span>
          )}
        </div>
        {request.status === "on_hold" && request.on_hold_reason && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 text-[10px] font-medium rounded-lg border border-red-100">
            <span className="font-bold">Hold Reason:</span> {request.on_hold_reason}
          </div>
        )}
      </div>
      
      {renderActions && (
        <div className="relative z-10 pt-3 border-t border-livspace-gray-100">
          {renderActions(request)}
        </div>
      )}
    </div>
  );
}
