"use client";

import type { ValidationRequest, RequestStatus } from "@/stores/useAppDataStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { Clock, User, MapPin, Hash, Layout } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDateTime, calculateDuration, getEmailLink } from "@/lib/formatters";
import { Mail, ExternalLink, PlusCircle, CheckCircle2, UserCog, Loader2, FileCheck } from "lucide-react";
import { useState } from "react";
import ReassignVlModal from "@/components/modals/ReassignVlModal";
import { isPendingVmApproval, normalizeQuoteStatus } from "@/lib/quotation";

export interface QuoteMetadata {
  id: string;
  quote_number: string;
  status: string;
  sent_to_designer_at?: string;
  first_accessed_at?: string;
  payment_confirmed_at?: string;
  gfc_requested_at?: string;
  access_token?: string;
  kom_date?: string;
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
  assigned: { label: "Assigned", bg: "bg-secondary-light", text: "text-secondary" },
  in_progress: { label: "In Progress", bg: "bg-amber-100", text: "text-amber-700" },
  on_hold: { label: "On Hold", bg: "bg-red-100", text: "text-red-700" },
  validation_done: { label: "Validation Done", bg: "bg-green-100", text: "text-green-700" },
  report_generated: { label: "Report Generated", bg: "bg-emerald-100", text: "text-emerald-800" },
  quote_generated: { label: "Quotation Generated", bg: "bg-blue-100", text: "text-blue-700" },
  payment_confirmed: { label: "Converted", bg: "bg-emerald-100", text: "text-emerald-700" },
  gfc_requested: { label: "Converted (GFC)", bg: "bg-purple-100", text: "text-purple-700" },
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
  const [showReassign, setShowReassign] = useState(false);
  const quoteStatus = normalizeQuoteStatus(quoteMetadata?.status);
  const role = currentUser?.role;
  const isDesigner = role === 'designer';
  const isManager = role === 'validation_manager' || role === 'admin';
  const isVL = role === 'validation_lead';

  const designer = getUserById(request.requested_by);
  const city = cities.find((c) => c.id === request.city_id);
  const assignee = request.assigned_to ? getUserById(request.assigned_to) : null;
  const assigner = request.assigned_by ? getUserById(request.assigned_by) : null;
  const effectiveStatus = (quoteMetadata?.status === 'payment_confirmed' || quoteMetadata?.status === 'gfc_requested' || quoteMetadata?.status === 'gfc_in_progress') 
    ? quoteMetadata.status as RequestStatus 
    : request.status;
  
  const statusStyle = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.new;
  const duration = calculateDuration(request.start_time, request.end_time);
  const hasReport = ["report_generated", "validation_done", "quote_generated", "payment_confirmed", "gfc_requested"].includes(request.status);

  const handleCardClick = () => {
    if (actionHref) {
      router.push(actionHref);
    }
  };

  const [requestingQuote, setRequestingQuote] = useState(false);
  const [requestingGfc, setRequestingGfc] = useState(false);

  const handleRequestQuote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Request a quotation for ${request.pid}? This will notify the Validation Lead who completed your site validation.`)) return;
    
    setRequestingQuote(true);
    try {
      const res = await fetch("/api/quotation/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id })
      });
      if (res.ok) {
        alert("Quotation requested successfully. Your Validation Lead will be notified.");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRequestingQuote(false);
    }
  };

  const handleRequestGfc = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quoteMetadata?.id) return;
    if (!confirm(`Request GFC drawings for ${request.pid}? This will notify the Validation Manager to assign a Design Associate.`)) return;

    setRequestingGfc(true);
    try {
      const res = await fetch("/api/quotation/request-gfc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quoteMetadata.id })
      });
      if (res.ok) {
        alert("GFC drawings requested. VM will assign a Design Associate.");
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRequestingGfc(false);
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={cn(
        "p-4 bg-white border border-slate-100 rounded-2xl transition-all space-y-3 relative group",
        actionHref ? "cursor-pointer hover:shadow-md md:hover:-translate-y-0.5" : ""
      )}
    >
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h4 className="font-bold text-livspace-dark text-base">
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
                "text-xs font-medium px-3 py-1 rounded-full uppercase tracking-wider",
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
            <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                {assignee ? (
                  <button 
                    onClick={() => isManager && setShowReassign(true)}
                    className={cn(
                      "flex items-center gap-1 font-bold text-livspace-dark hover:text-secondary transition-colors",
                      isManager ? "cursor-pointer" : "cursor-default"
                    )}
                  >
                    <User className="w-2.5 h-2.5" />
                    {assignee.full_name}
                  </button>
                ) : (
                  isManager && (
                    <button 
                      onClick={() => setShowReassign(true)}
                      className="text-[10px] font-bold text-secondary hover:underline flex items-center gap-1"
                    >
                      <PlusCircle className="w-2.5 h-2.5" />
                      Assign VL
                    </button>
                  )
                )}
                {isManager && assignee && (
                  <button
                    onClick={() => setShowReassign(true)}
                    className="p-1.5 hover:bg-secondary-light text-secondary rounded-lg transition-colors border border-transparent hover:border-secondary/20 group/btn"
                    title="Change VL"
                  >
                    <UserCog className="w-3 h-3" />
                  </button>
                )}
              </div>
              {assigner && (
                <span className="text-[8px] italic text-livspace-gray-400">by {assigner.full_name}</span>
              )}
            </div>
          )}
        </div>

        {showReassign && (
          <div onClick={(e) => e.stopPropagation()}>
            <ReassignVlModal 
              request={request}
              onClose={() => setShowReassign(false)}
              onSuccess={() => {
                window.location.reload();
              }}
            />
          </div>
        )}

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
              <div className="text-[9px] font-bold text-secondary uppercase tracking-tighter">Time Taken:</div>
              <div className="bg-secondary-light text-secondary px-1.5 py-0.5 rounded text-[10px] font-bold">
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
                <div className={cn(
                  "text-[10px] font-bold flex items-center gap-1 transition-opacity",
                  request.assigned_to 
                    ? "text-livspace-orange opacity-70 group-hover:opacity-100" 
                    : "text-slate-300 cursor-not-allowed"
                )}>
                  {hasReport ? "View Report" : (request.assigned_to ? "Continue" : "Assign VL to Start")}
                  <ExternalLink className="w-3 h-3" />
                </div>
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
            {isPendingVmApproval(quoteMetadata?.status) && (
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
                ✓ Payment Confirmed {quoteMetadata?.kom_date && `• KOM: ${quoteMetadata.kom_date}`}
              </span>
            )}
            {quoteMetadata?.status === 'gfc_requested' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> GFC Requested
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2 mt-1 w-full">
            {!quoteMetadata && !isDesigner && (
              <button
                onClick={(e) => { e.stopPropagation(); window.location.href = `/quotation/${request.id}`; }}
                className="w-full py-3 bg-secondary text-white text-xs font-bold rounded-xl hover:bg-secondary-hover transition touch-target"
              >
                Create Quotation
              </button>
            )}

            {!quoteMetadata && isDesigner && (
              <div className="space-y-2">
                {request.quote_requested_at ? (
                  <div className="w-full py-3 bg-slate-50 border border-slate-200 text-slate-400 text-xs font-bold rounded-xl flex items-center justify-center gap-2">
                    Quote Requested ✓
                  </div>
                ) : (
                  <button
                    onClick={handleRequestQuote}
                    disabled={requestingQuote}
                    className="w-full py-3 bg-livspace-blue text-white text-xs font-bold rounded-xl hover:bg-livspace-blue/90 transition touch-target flex items-center justify-center gap-2"
                  >
                    {requestingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : "Request Quotation"}
                  </button>
                )}
                <div className="text-[10px] text-slate-400 font-medium italic text-center">
                  {request.quote_requested_at ? `Requested on ${formatDateTime(request.quote_requested_at).split(',')[0]}` : "Waiting for VL to create quotation..."}
                </div>
              </div>
            )}

            {quoteMetadata?.status === 'draft' && (
              <button
                onClick={(e) => { e.stopPropagation(); window.location.href = `/quotation/${request.id}`; }}
                className="w-full py-3 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition touch-target flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4 text-slate-400" />
                {isDesigner ? "View Quote" : "Edit Quotation"}
              </button>
            )}

            {([quoteStatus].filter(Boolean) as string[]).some((status) => ['pending_vm_review', 'pending_vm_approval', 'pending_nm_approval', 'vm_approved'].includes(status)) && (
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const isPending = ['pending_vm_review', 'pending_vm_approval', 'pending_nm_approval'].includes(quoteMetadata?.status || '');
                  const path = (isManager && isPending) ? '/review' : '';
                  window.location.href = `/quotation/${request.id}${path}`; 
                }}
                className="w-full py-3 bg-white border border-secondary text-secondary text-xs font-bold rounded-xl hover:bg-secondary-light transition touch-target flex items-center justify-center gap-2"
              >
                {isManager && ['pending_vm_review', 'pending_vm_approval', 'pending_nm_approval'].includes(quoteMetadata?.status || '') ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Review & Approve
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4" />
                    {isDesigner ? "View Quote" : "Edit Quotation"}
                  </>
                )}
              </button>
            )}

            {quoteMetadata?.status === 'sent_to_designer' && (
              <div className="flex flex-col gap-2">
                <div className="text-[9px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                  <div><span className="font-medium text-slate-700">Sent on:</span> {quoteMetadata.sent_to_designer_at ? formatDateTime(quoteMetadata.sent_to_designer_at) : '—'}</div>
                  <div><span className="font-medium text-slate-700">Designer accessed:</span> {quoteMetadata.first_accessed_at ? 'Yes' : 'No'}</div>
                </div>
                {isDesigner && quoteMetadata.access_token ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/quote-view?token=${quoteMetadata.access_token}`; }}
                    className="w-full py-2 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary-hover transition"
                  >
                    View & Confirm Payment
                  </button>
                ) : (
                  !isDesigner && (
                    <button
                      onClick={(e) => { e.stopPropagation(); window.location.href = `/quotation/${request.id}`; }}
                      className="w-full py-2 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition"
                    >
                      Edit Quotation
                    </button>
                  )
                )}
              </div>
            )}

            {(['payment_confirmed', 'locked', 'gfc_requested', 'published'].includes(quoteMetadata?.status || '')) && (
              <div className="space-y-2">
                <div className="text-[9px] text-green-800 bg-green-50 p-2 rounded-lg border border-green-100">
                  <span className="font-bold">50% payment confirmed</span> by Designer on {quoteMetadata.payment_confirmed_at ? formatDateTime(quoteMetadata.payment_confirmed_at) : '—'}
                </div>
                
                {quoteMetadata.status !== 'gfc_requested' && (
                  <button
                    onClick={handleRequestGfc}
                    disabled={requestingGfc}
                    className="w-full py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition shadow-md flex items-center justify-center gap-2"
                  >
                    {requestingGfc ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
                    Request GFC Drawings
                  </button>
                )}

                {quoteMetadata.status === 'gfc_requested' && (
                  <div className="text-[9px] text-purple-800 bg-purple-50 p-2 rounded-lg border border-purple-100 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3" /> GFC Drawings Requested ({formatDateTime(quoteMetadata.gfc_requested_at || '')})
                  </div>
                )}
                <div className="flex gap-2 w-full mt-1">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      alert("Opening PDF generation mode...");
                      window.location.href = `/quotation/${request.id}/summary`;
                    }}
                    className="flex-1 py-1.5 bg-secondary text-white text-[10px] font-bold rounded hover:bg-secondary-hover transition text-center"
                  >
                    View Summary & PDF
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); window.location.href = `/quotation/${request.id}`; }}
                    className="flex-1 py-1.5 bg-white border border-secondary text-secondary text-[10px] font-bold rounded hover:bg-secondary-light transition text-center"
                  >
                    View Quote
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
