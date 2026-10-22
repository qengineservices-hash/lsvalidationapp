"use client";

import { useEffect, useState } from "react";
import { format, subMonths, startOfMonth } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, CheckCircle2, FileText, ClipboardCheck, Inbox, ArrowLeft, Users, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function VMPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedVl, setSelectedVl] = useState("all");
  const [data, setData] = useState<any>(null);
  const [expandedVl, setExpandedVl] = useState<string | null>(null);
  const [vlHistory, setVlHistory] = useState<Record<string, any>>({});
  const [historyLoading, setHistoryLoading] = useState<string | null>(null);

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
        const queryVl = selectedVl === "all" ? "" : `&vlId=${selectedVl}`;
        const res = await fetch(`/api/performance/vm?month=${selectedMonth}${queryVl}`);
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
  }, [selectedMonth, selectedVl]);

  const fetchVlHistory = async (vlId: string) => {
    if (vlHistory[vlId]) return;
    setHistoryLoading(vlId);
    try {
      const res = await fetch(`/api/performance/vl?month=${selectedMonth}&vlId=${vlId}`);
      if (res.ok) {
        const json = await res.json();
        setVlHistory(prev => ({ ...prev, [vlId]: json.trend }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(null);
    }
  };

  const formatCurrencyValue = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const getRejectionColor = (rate: number) => {
    if (rate < 10) return "text-emerald-600 font-bold";
    if (rate <= 25) return "text-amber-600 font-bold";
    return "text-red-600 font-bold";
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-secondary mb-2" />
        <p className="text-sm text-brand-muted">Calculating team metrics...</p>
      </div>
    );
  }

  const { metrics, teamBreakdown, trend, vls } = data || { metrics: {}, teamBreakdown: [], trend: [], vls: [] };

  return (
    <div className="container py-6 md:py-8 space-y-8 max-w-5xl min-bottom-padding">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/manager" className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-secondary">Team Performance</h1>
            <p className="text-xs text-brand-muted">Monitor team efficiency, quality, and GMV conversion</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedVl}
            onChange={(e) => setSelectedVl(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20 outline-none shadow-sm"
          >
            <option value="all">All VLs</option>
            {vls?.map((vl: any) => (
              <option key={vl.id} value={vl.id}>{vl.name}</option>
            ))}
          </select>

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
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4">
           <Loader2 className="w-5 h-5 animate-spin text-secondary opacity-50" />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Validations Done</p>
          <p className="text-2xl font-black text-secondary">{metrics.completedCount}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Quotes Created</p>
          <p className="text-2xl font-black text-secondary">{metrics.quotesCreated}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Total GMV</p>
          <p className="text-2xl font-black text-primary">{formatCurrencyValue(metrics.gmv)}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Team Rejection</p>
          <p className={cn("text-2xl font-black", getRejectionColor(metrics.rejectionRate))}>
            {metrics.rejectionRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Trend Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-sm font-bold text-secondary mb-8">Team Trend (Validations vs Confirmed Quotes)</h3>
        <div className="flex items-end justify-between h-40 gap-2 md:gap-4 relative w-full mb-4">
           {trend.map((t: any) => {
             const max = Math.max(...trend.map((tr: any) => Math.max(tr.validations, tr.quotes, 1)));
             const valHeight = (t.validations / max) * 100;
             const quoteHeight = (t.quotes / max) * 100;
             return (
               <div key={t.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                 <div className="flex gap-1 h-full items-end">
                    <div className="w-2 md:w-4 bg-secondary rounded-t-sm" style={{ height: `${valHeight}%` }} />
                    <div className="w-2 md:w-4 bg-primary rounded-t-sm" style={{ height: `${quoteHeight}%` }} />
                 </div>
                 <span className="text-[10px] font-bold text-slate-400 uppercase">{t.month}</span>
               </div>
             );
           })}
        </div>
      </div>

      {/* VL Breakdown Table */}
      {selectedVl === "all" && teamBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
             <h3 className="text-sm font-bold text-secondary">Validation Lead Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">VL Name</th>
                  <th className="px-6 py-4 text-center">Validations</th>
                  <th className="px-6 py-4 text-center">Quotes</th>
                  <th className="px-6 py-4 text-right">GMV</th>
                  <th className="px-6 py-4 text-center">Rejection %</th>
                  <th className="px-6 py-4 text-right">Avg Val</th>
                  <th className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teamBreakdown.map((vl: any) => (
                  <React.Fragment key={vl.vlId}>
                    <tr 
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => {
                        if (expandedVl === vl.vlId) setExpandedVl(null);
                        else {
                          setExpandedVl(vl.vlId);
                          fetchVlHistory(vl.vlId);
                        }
                      }}
                    >
                      <td className="px-6 py-4 font-bold text-slate-700 text-sm">{vl.vlName}</td>
                      <td className="px-6 py-4 text-center text-sm">{vl.completedCount}</td>
                      <td className="px-6 py-4 text-center text-sm">{vl.quotesCreated}</td>
                      <td className="px-6 py-4 text-right font-bold text-primary text-sm">{formatCurrencyValue(vl.gmv)}</td>
                      <td className={cn("px-6 py-4 text-center text-sm", getRejectionColor(vl.rejectionRate))}>
                        {vl.rejectionRate.toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-slate-500 font-medium">{formatCurrencyValue(vl.avgQuoteValue)}</td>
                      <td className="px-4 py-4">
                        {expandedVl === vl.vlId ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                      </td>
                    </tr>
                    {expandedVl === vl.vlId && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="px-8 py-6">
                           <div className="flex flex-col gap-4">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2">Month-on-Month Trend ({vl.vlName})</p>
                              {historyLoading === vl.vlId ? (
                                <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
                              ) : (
                                <div className="flex gap-4 items-end h-24 px-2">
                                   {vlHistory[vl.vlId]?.map((h: any) => {
                                      const hMax = Math.max(...vlHistory[vl.vlId].map((hr: any) => Math.max(hr.validations, hr.quotes, 1)));
                                      return (
                                        <div key={h.month} className="flex-1 flex flex-col items-center gap-1 group">
                                           <div className="flex gap-0.5 items-end h-16 w-full justify-center">
                                              <div className="w-2 bg-secondary/40 rounded-t-xs" style={{ height: `${(h.validations/hMax)*100}%` }} />
                                              <div className="w-2 bg-primary/40 rounded-t-xs" style={{ height: `${(h.quotes/hMax)*100}%` }} />
                                           </div>
                                           <span className="text-[8px] font-bold text-slate-400 uppercase">{h.month}</span>
                                        </div>
                                      );
                                   })}
                                </div>
                              )}
                           </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-black text-secondary border-t-2 border-slate-100">
                <tr>
                  <td className="px-6 py-4 text-xs">TEAM TOTALS</td>
                  <td className="px-6 py-4 text-center text-sm">{metrics.completedCount}</td>
                  <td className="px-6 py-4 text-center text-sm">{metrics.quotesCreated}</td>
                  <td className="px-6 py-4 text-right text-sm text-primary">{formatCurrencyValue(metrics.gmv)}</td>
                  <td className={cn("px-6 py-4 text-center text-sm", getRejectionColor(metrics.rejectionRate))}>
                    {metrics.rejectionRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    {formatCurrencyValue(metrics.quotesCreated > 0 ? metrics.gmv / metrics.quotesCreated : 0)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
