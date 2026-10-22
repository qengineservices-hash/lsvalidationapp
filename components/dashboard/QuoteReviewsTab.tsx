"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { Receipt } from "lucide-react";
import QuotationBuckets from "@/components/quotation/QuotationBuckets";

export default function QuoteReviewsTab() {
  const { currentUser } = useAuthStore();

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
          <h2 className="text-xl font-bold text-livspace-dark shrink-0 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-muted" />
            Quote Reviews
          </h2>
          <p className="text-xs text-brand-muted">Review and approve quotations submitted by Validation Leads</p>
      </div>
      
      <QuotationBuckets isManager={true} />
    </div>
  );
}
