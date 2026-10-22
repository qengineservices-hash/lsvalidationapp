"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ClipboardCheck, Clock, Receipt, LayoutGrid, Loader2, ArrowRight } from "lucide-react";
import StatusBuckets from "@/components/dashboard/StatusBuckets";
import QuotationBuckets from "@/components/quotation/QuotationBuckets";
import GfcBuckets from "@/components/gfc/GfcBuckets";

function ValidationLeadDashboardContent() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { validationRequests } = useAppDataStore();

  const initialTab = searchParams.get("tab") || "validations";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab") || "validations";
    setActiveTab(tab);
  }, [searchParams]);

  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    return validationRequests.filter((r) => r.assigned_to === currentUser.id);
  }, [validationRequests, currentUser]);

  if (!currentUser) return null;

  return (
    <div className="container py-6 md:py-8 space-y-8 max-w-4xl pb-24 md:pb-8">
      {/* Welcome Section */}
      <div className="flex flex-col gap-1 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <h1 className="text-2xl md:text-3xl font-black text-secondary tracking-tight">
          Hello, <span className="text-primary">{currentUser.full_name.split(' ')[0]}</span>
        </h1>
        <p className="text-sm text-brand-muted font-medium">Manage your assigned validations and quotations.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
        <button
          onClick={() => router.push("/validation-lead?tab=validations")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all",
            activeTab === "validations" ? "bg-secondary text-white shadow-lg shadow-secondary/10" : "text-brand-muted hover:bg-slate-50"
          )}
        >
          <ClipboardCheck className="w-4 h-4" />
          Validations
        </button>
        <button
          onClick={() => router.push("/validation-lead?tab=quotations")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all",
            activeTab === "quotations" ? "bg-secondary text-white shadow-lg shadow-secondary/10" : "text-brand-muted hover:bg-slate-50"
          )}
        >
          <Receipt className="w-4 h-4" />
          Quotations
        </button>
        <button
          onClick={() => router.push("/validation-lead?tab=gfc")}
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
        {activeTab === "validations" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                My Assignments
              </h2>
            </div>
            <StatusBuckets
              requests={myRequests}
              getActionHref={(r) => (r.status === "report_generated" || r.status === "validation_done" ? `/reports/${r.id}` : `/validation-lead/validate/${r.id}`)}
            />
          </div>
        )}

        {activeTab === "quotations" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                Quotations Dashboard
              </h2>
            </div>
            <QuotationBuckets vlId={currentUser.id} />
          </div>
        )}

        {activeTab === "gfc" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-secondary flex items-center gap-2">
                <LayoutGrid className="w-5 h-5 text-primary" />
                GFC Projects
              </h2>
            </div>
            <GfcBuckets />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ValidationLeadDashboard() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-secondary" /></div>}>
      <ValidationLeadDashboardContent />
    </Suspense>
  );
}
