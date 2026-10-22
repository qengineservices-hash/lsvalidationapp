"use client";

import { useEffect, useState } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, CheckCircle2, FileText, ClipboardCheck, Inbox, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function VLPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [data, setData] = useState<any>(null);

  const months = Array.from({ length: 7 }, (_, i) => {
    const d = subMonths(new Date(), i);
    return {
      value: format(d, "yyyy-MM"),
      label: i === 0 ? "This Month" : format(d, "MMMM yyyy")
    };
  });

  useEffect(() => {
    async function fetchPerformance() {
      setLoading(true);
      try {
        const res = await fetch(`/api/performance/vl?month=${selectedMonth}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPerformance();
  }, [selectedMonth]);

  const formatCurrencyValue = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getRejectionColor = (rate: number) => {
    if (rate < 10) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (rate <= 25) return "text-amber-600 bg-amber-50 border-amber-100";
    return "text-red-600 bg-red-50 border-red-100";
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-secondary mb-2" />
        <p className="text-sm text-brand-muted">Calculating metrics...</p>
      </div>
    );
  }

  const { metrics, trend } = data || { metrics: {}, trend: [] };

  return (
    <div className="container py-6 md:py-8 space-y-8 max-w-4xl min-bottom-padding">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/validation-lead" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-secondary">My Performance</h1>
            <p className="text-xs text-brand-muted">Insight into your validation efficiency and quality</p>
          </div>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
           <Loader2 className="w-5 h-5 animate-spin text-secondary opacity-50" />
        </div>
      )}

      {/* Row 1: Validation */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Inbox className="w-4 h-4" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requests Received</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{metrics.receivedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><ClipboardCheck className="w-4 h-4" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validations Done</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{metrics.completedCount}</p>
        </div>
      </div>

      {/* Row 2: Quote */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FileText className="w-4 h-4" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotes Created</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{metrics.quotesCreated}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quotes Confirmed</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{metrics.paymentConfirmedCount}</p>
        </div>
      </div>

      {/* Row 3: Quality */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={cn("p-5 rounded-2xl border shadow-sm", getRejectionColor(metrics.rejectionRate))}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-80">Rejection Rate</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black">{(metrics.rejectionRate || 0).toFixed(1)}%</p>
            <div className="text-right">
               <p className="text-xs font-bold">{metrics.reworkCount} quotes required rework</p>
               <p className="text-[10px] opacity-70">Based on VM feedback</p>
            </div>
          </div>
        </div>
        <div className="bg-secondary p-5 rounded-2xl border border-secondary shadow-lg shadow-secondary/20 text-white">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1 text-white/60">Total GMV</p>
          <div className="flex items-end justify-between">
             <p className="text-3xl font-black text-accent">{formatCurrencyValue(metrics.gmv || 0)}</p>
             <p className="text-[10px] text-white/60 text-right">Confirmed advance payment</p>
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-secondary mb-8">Quarterly Trend (Validations vs Confirmed Quotes)</h3>
        
        <div className="flex items-end justify-between h-48 gap-2 md:gap-4 relative w-full mb-8">
           {/* Chart Lines */}
           <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              <div className="border-t border-slate-100 h-0 w-full" />
              <div className="border-t border-slate-100 h-0 w-full" />
              <div className="border-t border-slate-100 h-0 w-full" />
              <div className="border-t border-slate-100 h-0 w-full" />
           </div>

           {trend.map((t: any) => {
             const max = Math.max(...trend.map((tr: any) => Math.max(tr.validations, tr.quotes, 1)));
             const valHeight = (t.validations / max) * 100;
             const quoteHeight = (t.quotes / max) * 100;

             return (
               <div key={t.month} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                 <div className="flex gap-1 h-full items-end">
                    <div 
                      className="w-1.5 md:w-3 bg-secondary rounded-t-sm transition-all group-hover:opacity-80" 
                      style={{ height: `${valHeight}%` }}
                      title={`Validations: ${t.validations}`}
                    />
                    <div 
                      className="w-1.5 md:w-3 bg-primary rounded-t-sm transition-all group-hover:opacity-80" 
                      style={{ height: `${quoteHeight}%` }}
                      title={`Quotes: ${t.quotes}`}
                    />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400">{t.month}</span>
               </div>
             );
           })}
        </div>

        <div className="flex items-center justify-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-secondary rounded-sm" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Validations Done</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-primary rounded-sm" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Quotes Confirmed</span>
           </div>
        </div>
      </div>
    </div>
  );
}
