"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/formatters";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle, Clock, ArrowRight, File as FileIcon, CheckCircle, Receipt, ClipboardCheck, Home, LayoutGrid, Loader2 } from "lucide-react";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import QuotationBuckets from "@/components/quotation/QuotationBuckets";
import GfcBuckets from "@/components/gfc/GfcBuckets";

function DesignerDashboardContent() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { validationRequests } = useAppDataStore();

  const initialTab = searchParams.get("tab") || "tracker";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sync state with URL
  useEffect(() => {
    const tab = searchParams.get("tab") || "tracker";
    setActiveTab(tab);
  }, [searchParams]);

  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    return validationRequests.filter((r) => r.requested_by === currentUser.id);
  }, [validationRequests, currentUser]);

  if (!currentUser) return null;

  return (
    <div className="container py-6 md:py-8 space-y-8 max-w-4xl pb-24 md:pb-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-secondary tracking-tight">
            Hello, <span className="text-primary">{currentUser.full_name.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-brand-muted font-medium">Track your site validations and quotations.</p>
        </div>
        <Link
          href="/validation-requests/new"
          className="flex items-center justify-center gap-2 px-6 py-4 bg-secondary text-white rounded-2xl font-bold text-sm hover:bg-secondary-hover transition-all shadow-xl shadow-secondary/20 group"
        >
          <PlusCircle className="w-5 h-5 group-hover:rotate-90 transition-transform" />
          New Validation Request
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => router.push("/designer?tab=tracker")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all",
            activeTab === "tracker" ? "bg-secondary text-white shadow-lg shadow-secondary/10" : "text-brand-muted hover:bg-slate-50"
          )}
        >
          <ClipboardCheck className="w-4 h-4" />
          Validation Tracker
        </button>
        <button
          onClick={() => router.push("/designer?tab=quotes")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all",
            activeTab === "quotes" ? "bg-secondary text-white shadow-lg shadow-secondary/10" : "text-brand-muted hover:bg-slate-50"
          )}
        >
          <Receipt className="w-4 h-4" />
          Quotations
        </button>
        <button
          onClick={() => router.push("/designer?tab=gfc")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all",
            activeTab === "gfc" ? "bg-secondary text-white shadow-lg shadow-secondary/10" : "text-brand-muted hover:bg-slate-50"
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          GFC Handover
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        {activeTab === "tracker" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Live Tracker
              </h2>
            </div>
            <StatusBuckets
              requests={myRequests}
              getActionHref={(r) => (r.status === "report_generated" || r.status === "validation_done" ? `/reports/${r.id}` : "")}
            />
          </div>
        )}

        {activeTab === "quotes" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Project Quotations
              </h2>
            </div>
            <QuotationBuckets designerId={currentUser.id} />
          </div>
        )}

        {activeTab === "gfc" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                GFC Status
              </h2>
            </div>
            <GfcBuckets />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DesignerDashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-secondary" /></div>}>
      <DesignerDashboardContent />
    </Suspense>
  );
}
