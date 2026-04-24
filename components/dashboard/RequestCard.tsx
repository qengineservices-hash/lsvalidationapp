"use client";

import type { ValidationRequest, RequestStatus } from "@/stores/useAppDataStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { Clock, User, MapPin, Hash } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDateTime, calculateDuration, getEmailLink } from "@/lib/formatters";
import { Mail, ExternalLink, PlusCircle } from "lucide-react";

export interface QuoteMetadata {
  id: string;
  quote_number: string;
  status: string;
  sent_to_designer_at?: string;
  first_accessed_at?: string;
  payment_confirmed_at?: string;
  access_token?: string;
}

interface RequestCardProps {
  request: ValidationRequest;
  showAssignee?: boolean;
  actionHref?: string;
  renderActions?: (request: ValidationRequest) => React.ReactNode;
  quoteMetadata?: QuoteMetadata | null;
}

const STATUS_STYLES: Record<RequestStatus, { label: string; bg: string; text: string }> = {
  new: { label: "New", bg: "bg-blue-100", text: "text-blue-700" },
  assigned: { label: "Assigned", bg: "bg-purple-100", text: "text-purple-700" },
  in_progress: { label: "In Progress", bg: "bg-amber-100", text: "text-amber-700" },
  on_hold: { label: "On Hold", bg: "bg-red-100", text: "text-red-700" },
  validation_done: { label: "Validation Done", bg: "bg-green-100", text: "text-green-700" },
  report_generated: { label: "Report Generated", bg: "bg-emerald-100", text: "text-emerald-800" },
  quote_generated: { label: "Quotation Generated", bg: "bg-blue-100", text: "text-blue-700" },
  payment_confirmed: { label: "Payment Confirmed", bg: "bg-green-100", text: "text-green-700" },
};

export default function RequestCard({
  request,
  showAssignee = false,
  actionHref,
  renderActions,
  quoteMetadata,
}: RequestCardProps) {
  const router = useRouter();
  const { getUserById, cities } = useAppDataStore();
  const { currentUser } = useAuthStore();
  const role = currentUser?.role;
  const isDesigner = role === 'designer';

  const designer = getUserById(request.requested_by);
  const city = cities.find((c) => c.id === request.city_id);
  const assignee = request.assigned_to ? getUserById(request.assigned_to) : null;
  const assigner = request.assigned_by ? getUserById(request.assigned_by) : null;
  const statusStyle = STATUS_STYLES[request.status];
  const duration = calculateDuration(request.start_time, request.end_time);
  const hasReport = request.status === "report_generated" || request.status === "validation_done";

  const handleCardClick = () => {
    if (actionHref) {
      router.push(actionHref);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={cn(
        "p-4 bg-white border border-livspace-gray-200 rounded-xl transition-all space-y-3 relative group",
        actionHref ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : ""
      )}
    >
      <div className="relative">
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
          <div className="flex flex-col items-end gap-2 text-right">
            <span
              className={cn(
                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider",
                statusStyle.bg,
                statusStyle.text
              )}
            >
              {statusStyle.label}
              {request.version && request.version > 1 && ` v${request.version}`}
            </span>
            {request.priority !== "P2" && (
              <span
                className={cn(
                  "text-[8px] font-bold px-1.5 py-0.5 rounded",
                  request.priority === "P0"
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {request.priority}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-livspace-gray-400 mt-2">
          <span className="truncate max-w-[150px]">{request.society_name} — {request.flat_no}</span>
          {showAssignee && (
            <div className="flex flex-col items-end gap-0.5">
              {assignee && (
                <span className="flex items-center gap-1 font-bold text-livspace-dark">
                  <User className="w-2.5 h-2.5" />
                  {assignee.full_name}
                </span>
              )}
              {assigner && (
                <span className="text-[8px] italic text-livspace-gray-400">by {assigner.full_name}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 mt-3">
          <div className="flex items-center gap-2 text-[10px] text-livspace-gray-400">
            <Clock className="w-3 h-3" />
            <span>Raised: {formatDateTime(request.created_at).split(',')[0]}</span>
            
            {request.scheduled_date && (
              <span className="ml-1 pl-1 border-l border-livspace-gray-200">
                📅 {request.scheduled_date}
              </span>
            )}
          </div>
          
          {duration !== "N/A" && (
            <div className="flex items-center gap-2">
              <div className="text-[9px] font-bold text-livspace-blue uppercase tracking-tighter">Time Taken:</div>
              <div className="bg-blue-50 text-livspace-blue px-1.5 py-0.5 rounded text-[10px] font-bold">
                {duration}
              </div>
            </div>
          )}
        </div>

        {request.status === "on_hold" && request.on_hold_reason && (
          <div className="mt-3 p-2 bg-red-50 text-red-700 text-[10px] font-medium rounded-lg border border-red-100">
            <span className="font-bold">Hold Reason:</span> {request.on_hold_reason}
          </div>
        )}
      </div>
      
      <div className="pt-3 border-t border-livspace-gray-100 flex items-center justify-between gap-2 relative z-10">
        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
          {renderActions && renderActions(request)}
        </div>
        
        <div className="flex items-center gap-2">
          {hasReport && (
            <a 
              href={getEmailLink(request, designer?.email, assigner?.email)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-livspace-gray-400 hover:text-livspace-blue hover:bg-livspace-blue/5 rounded-lg transition-all"
              onClick={(e) => e.stopPropagation()}
              title="Send via Gmail to Designer, CC Manager"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}
          {actionHref && (
            <div className="flex items-center gap-3">
          {/* We will handle Quotation actions in a separate section below */}

              {!renderActions && (
                <div className="text-[10px] font-bold text-livspace-orange flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  {hasReport ? "View Report" : "Continue"}
                  <ExternalLink className="w-3 h-3" />
                </div>
              )}
              {hasReport && !isDesigner && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `/validation-lead/validate/${request.id}`;
                  }}
                  className="px-2 py-1 bg-white border border-livspace-blue text-livspace-blue text-[9px] font-bold rounded-md hover:bg-blue-50 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QUOTATION SECTION */}
      {hasReport && (
        <div className="pt-3 border-t border-livspace-gray-100 flex flex-col gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-livspace-gray-400 uppercase">Quotation Status</span>
            
            {/* Logic for badges based on the cases */}
            {!quoteMetadata && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                No Quote Created
              </span>
            )}
            {quoteMetadata?.status === 'draft' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Quote Draft
              </span>
            )}
            {quoteMetadata?.status === 'pending_vm_review' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                Awaiting VM Review
              </span>
            )}
            {quoteMetadata?.status === 'pending_nm_approval' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                NM Approval Needed
              </span>
            )}
            {quoteMetadata?.status === 'vm_approved' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                VM Approved
              </span>
            )}
            {quoteMetadata?.status === 'sent_to_designer' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                Sent to Designer
              </span>
            )}
            {(quoteMetadata?.status === 'payment_confirmed' || quoteMetadata?.status === 'locked') && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                ✓ Payment Confirmed
              </span>
            )}
          </div>

          {/* Details & Actions per case */}
          <div className="flex flex-col gap-2 mt-1 w-full">
            {!quoteMetadata && !isDesigner && (
              <button
                onClick={(e) => { e.stopPropagation(); window.location.href = `/quotation/${request.id}`; }}
                className="w-full py-2 bg-livspace-blue text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 transition"
              >
                Create Quotation
              </button>
            )}

            {!quoteMetadata && isDesigner && (
              <div className="text-[10px] text-slate-400 font-medium italic py-2 text-center border border-dashed border-slate-200 rounded-lg">
                Waiting for VL to create quotation...
              </div>
            )}

            {quoteMetadata?.status === 'draft' && (
              <button
                onClick={(e) => { e.stopPropagation(); window.location.href = `/quotation/${request.id}`; }}
                className="w-full py-2 bg-white border border-slate-300 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition"
              >
                Continue Building
              </button>
            )}

            {quoteMetadata?.status === 'sent_to_designer' && (
              <div className="flex flex-col gap-2">
                <div className="text-[9px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                  <div><span className="font-medium text-slate-700">Sent on:</span> {quoteMetadata.sent_to_designer_at ? formatDateTime(quoteMetadata.sent_to_designer_at) : '—'}</div>
                  <div><span className="font-medium text-slate-700">Designer accessed:</span> {quoteMetadata.first_accessed_at ? 'Yes' : 'No'}</div>
                </div>
                {isDesigner && quoteMetadata.access_token && (
                  <button
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/quote-view?token=${quoteMetadata.access_token}`; }}
                    className="w-full py-2 bg-livspace-orange text-white text-[10px] font-bold rounded-lg hover:bg-orange-600 transition"
                  >
                    View & Confirm Payment
                  </button>
                )}
              </div>
            )}

            {(quoteMetadata?.status === 'payment_confirmed' || quoteMetadata?.status === 'locked') && (
              <>
                <div className="text-[9px] text-green-800 bg-green-50 p-2 rounded-lg border border-green-100">
                  <span className="font-bold">10% payment confirmed</span> by Designer on {quoteMetadata.payment_confirmed_at ? formatDateTime(quoteMetadata.payment_confirmed_at) : '—'}
                </div>
                <div className="flex gap-2 w-full mt-1">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      alert("Opening PDF generation mode...");
                      window.location.href = `/quotation/${request.id}/summary`;
                    }}
                    className="flex-1 py-1.5 bg-livspace-dark text-white text-[10px] font-bold rounded hover:bg-black transition text-center"
                  >
                    View Summary & PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/quotation/${request.id}`; }}
                    className="flex-1 py-1.5 bg-white border border-livspace-dark text-livspace-dark text-[10px] font-bold rounded hover:bg-slate-50 transition text-center"
                  >
                    View Quote
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
