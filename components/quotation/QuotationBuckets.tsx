"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Inbox, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDataStore } from "@/stores/useAppDataStore";
import RequestCard from "@/components/dashboard/RequestCard";

const VL_QUOTE_BUCKETS = [
  { key: "pending", label: "Quote Pending", emoji: "⏳" },
  { key: "draft", label: "In Draft", emoji: "📝" },
  { key: "shared", label: "Shared", emoji: "📤", statuses: ["sent_to_designer", "pending_vm_review", "pending_vm_approval", "pending_nm_approval", "vm_approved"] },
  { key: "converted", label: "Converted", emoji: "✅", statuses: ["payment_confirmed", "locked", "gfc_requested", "published"] },
];

const MANAGER_QUOTE_BUCKETS = [
  { key: "pending", label: "Quotes Pending", emoji: "⏳" },
  { key: "review", label: "Pending Reviews", emoji: "⚖️" },
  { key: "approved", label: "Approved", emoji: "✅" },
  { key: "sent", label: "Sent to Designer", emoji: "📤" },
  { key: "converted", label: "Converted", emoji: "💰" },
];

const DESIGNER_QUOTE_BUCKETS = [
  { key: "pending", label: "Quote Pending", emoji: "⏳" },
  { key: "progress", label: "In Progress", emoji: "📝" },
  { key: "shared", label: "Shared", emoji: "📤" },
  { key: "converted", label: "Converted", emoji: "✅" },
];

interface QuotationBucketsProps {
  vlId?: string;
  designerId?: string;
  isManager?: boolean;
}

export default function QuotationBuckets({ vlId, designerId, isManager }: QuotationBucketsProps) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { validationRequests } = useAppDataStore();
  const isDesigner = !!designerId;
  const buckets = isManager ? MANAGER_QUOTE_BUCKETS : (isDesigner ? DESIGNER_QUOTE_BUCKETS : VL_QUOTE_BUCKETS);
  const [activeBucket, setActiveBucket] = useState(buckets[0].key);
  const supabase = createClient();

  useEffect(() => {
    async function fetchQuotes() {
      setLoading(true);
      try {
        let query = supabase
          .from("quotes")
          .select(`
            *,
            designer_quote_access (
               access_token,
               sent_to_designer_at:created_at,
               first_accessed_at,
               payment_confirmed_at
            )
          `);

        if (vlId) query = query.eq("created_by", vlId);
        
        const { data, error } = await query.order("updated_at", { ascending: false });

        if (!error && data) {
          setQuotes(data);
        } else if (error) {
          console.error("Error fetching quotes:", error);
        }
      } catch (err) {
        console.error("Fetch Quotes Exception:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchQuotes();
  }, [supabase, vlId]);

  const completedRequests = useMemo(() => {
    const COMPLETED_STATUSES = ["report_generated", "validation_done", "quote_generated", "payment_confirmed", "gfc_requested", "published"];
    let base = validationRequests.filter(r => COMPLETED_STATUSES.includes(r.status));
    if (vlId) base = base.filter(r => r.assigned_to === vlId);
    if (designerId) base = base.filter(r => r.requested_by === designerId);
    return base;
  }, [validationRequests, vlId, designerId]);

  const bucketedData = useMemo(() => {
    const data: Record<string, any[]> = {};
    buckets.forEach(b => { data[b.key] = []; });

    completedRequests.forEach(req => {
      const quote = quotes.find(q => q.validation_request_id === req.id);
      
      if (!quote) {
        if (data.pending) data.pending.push({ request: req, quote: null });
      } else {
        const status = quote.status;
        if (isManager) {
          if (['pending_vm_review', 'pending_vm_approval', 'pending_nm_approval'].includes(status)) {
            data.review.push({ request: req, quote });
          } else if (status === 'vm_approved') {
            data.approved.push({ request: req, quote });
          } else if (status === 'sent_to_designer') {
            data.sent.push({ request: req, quote });
          } else if (['payment_confirmed', 'locked', 'gfc_requested', 'published'].includes(status)) {
            data.converted.push({ request: req, quote });
          } else if (status === 'draft') {
            // For managers, drafts can go into 'review' or we can add a new bucket.
            // Let's put them in 'review' but with a 'Draft' tag in the card
            data.review.push({ request: req, quote });
          }
        } else if (isDesigner) {
          if (['draft', 'pending_vm_review', 'pending_vm_approval', 'pending_nm_approval', 'vm_approved'].includes(status)) {
            data.progress.push({ request: req, quote });
          } else if (status === 'sent_to_designer') {
            data.shared.push({ request: req, quote });
          } else if (['payment_confirmed', 'locked', 'gfc_requested', 'published'].includes(status)) {
            data.converted.push({ request: req, quote });
          }
        } else {
          // VL View
          if (status === 'draft') {
            data.draft.push({ request: req, quote });
          } else if (['sent_to_designer', 'pending_vm_review', 'pending_vm_approval', 'pending_nm_approval', 'vm_approved'].includes(status)) {
            data.shared.push({ request: req, quote });
          } else if (['payment_confirmed', 'locked', 'gfc_requested', 'published'].includes(status)) {
            data.converted.push({ request: req, quote });
          }
        }
      }
    });

    return data;
  }, [completedRequests, quotes, isManager, isDesigner, buckets]);

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>;
  }

  const currentItems = bucketedData[activeBucket] || [];

  return (
    <div className="space-y-6">
      <div className="scroll-tabs">
        {buckets.map((bucket) => {
          const count = bucketedData[bucket.key]?.length || 0;
          
          return (
            <button
              key={bucket.key}
              onClick={() => setActiveBucket(bucket.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all touch-target",
                activeBucket === bucket.key
                  ? "bg-secondary text-white shadow-md shadow-secondary/20"
                  : "bg-white text-brand-muted border border-slate-100 hover:border-secondary"
              )}
            >
              <span>{bucket.emoji}</span>
              {bucket.label}
              {count > 0 && (
                <span
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                    activeBucket === bucket.key
                      ? "bg-white/20 text-white"
                      : "bg-brand-surface text-brand-muted"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {currentItems.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-livspace-gray-400">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">No projects in {buckets.find(b => b.key === activeBucket)?.label}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentItems.map(({ request, quote }) => (
            <RequestCard
              key={request.id}
              request={request}
              showAssignee={true}
              quoteMetadata={quote ? {
                id: quote.id,
                quote_number: quote.quote_number,
                status: quote.status,
                sent_to_designer_at: quote.designer_quote_access?.[0]?.sent_to_designer_at,
                first_accessed_at: quote.designer_quote_access?.[0]?.first_accessed_at,
                payment_confirmed_at: quote.designer_quote_access?.[0]?.payment_confirmed_at,
                gfc_requested_at: quote.gfc_requested_at,
                access_token: quote.designer_quote_access?.[0]?.access_token,
                kom_date: quote.kom_date
              } : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
