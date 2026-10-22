"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Inbox, Loader2, ArrowRight, CheckCircle2, User, Layout, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDataStore } from "@/stores/useAppDataStore";
import RequestCard from "@/components/dashboard/RequestCard";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatters";

const USER_GFC_BUCKETS = [
  { key: "requested", label: "GFC Requested", emoji: "📢" },
  { key: "pending", label: "GFC Pending", emoji: "⏳" },
  { key: "received", label: "GFC Received", emoji: "✅" },
];

const VM_GFC_BUCKETS = [
  { key: "assign", label: "Assign DAs", emoji: "👤" },
  { key: "pending", label: "GFC Pending", emoji: "⏳" },
  { key: "received", label: "GFC Received", emoji: "✅" },
];

interface GfcBucketsProps {
  isManager?: boolean;
}

export default function GfcBuckets({ isManager }: GfcBucketsProps) {
  const [gfcRequests, setGfcRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { users } = useAppDataStore();
  const buckets = isManager ? VM_GFC_BUCKETS : USER_GFC_BUCKETS;
  const [activeBucket, setActiveBucket] = useState(buckets[0].key);
  const supabase = createClient();

  const fetchGfc = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gfc-list");
      const data = await res.json();
      if (Array.isArray(data)) setGfcRequests(data);
      else console.error("GFC API error:", data);
    } catch (error) {
      console.error("GFC Fetch Error:", error);
    }
    setLoading(false);
  };

  useEffect(() => { fetchGfc(); }, [supabase]);

  const bucketedData = useMemo(() => {
    const data: Record<string, any[]> = {
      requested: [],
      assign: [],
      pending: [],
      received: [],
    };

    gfcRequests.forEach(gfc => {
      const status = gfc.status;
      if (status === 'pending') {
        data.requested.push(gfc);
        data.assign.push(gfc);
      } else if (status === 'assigned') {
        data.pending.push(gfc);
      } else if (['completed', 'published'].includes(status)) {
        data.received.push(gfc);
      }
    });

    return data;
  }, [gfcRequests]);

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>;
  }

  const currentItems = bucketedData[activeBucket] || [];

  return (
    <div className="space-y-6">
      {/* Filter Tabs */}
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

      {/* GFC List */}
      {currentItems.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-livspace-gray-400">
          <Inbox className="w-10 h-10 opacity-30" />
          <p className="text-sm font-medium">No projects in {buckets.find(b => b.key === activeBucket)?.label}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentItems.map((gfc) => {
            const request = gfc.quotes?.app_validation_requests;
            const quote = gfc.quotes;
            if (!request) return null;

            return (
              <div key={gfc.id} className="relative group">
                <RequestCard
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
                
                {/* GFC Specific Overlay Actions */}
                <div className="mt-2 bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between gap-3">
                   <div className="flex items-center gap-2">
                      <div className="p-2 bg-white rounded-lg border border-slate-100">
                         <Layout className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-[10px] font-bold text-slate-700">GFC Stage: {gfc.status.toUpperCase()}</span>
                         <span className="text-[9px] text-slate-500">Requested {formatDateTime(gfc.requested_at).split(',')[0]}</span>
                      </div>
                   </div>

                   {isManager && gfc.status === 'pending' ? (
                      <Link 
                        href={`/manager/dashboard?tab=gfc_management&assign=${gfc.id}`}
                        className="px-3 py-1.5 bg-secondary text-white text-[10px] font-bold rounded-lg hover:bg-secondary-hover transition flex items-center gap-1"
                      >
                         Assign DA <ArrowRight className="w-3 h-3" />
                      </Link>
                   ) : (
                      <Link 
                        href={`/gfc/${gfc.id}/review`}
                        className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-50 transition flex items-center gap-1"
                      >
                         View GFC <ExternalLink className="w-3 h-3" />
                      </Link>
                   )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
