"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

export default function QuotePreviewPage({ params }: { params: { quoteId: string } }) {
  const { quoteId } = params;
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPreview() {
      try {
        const res = await fetch(`/api/quotation/${quoteId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load quote preview.");
        }

        setQuote(data.quote);
        setLineItems(data.lineItems || []);
      } catch (err: any) {
        setError(err.message || "Failed to load quote preview.");
      } finally {
        setLoading(false);
      }
    }

    void loadPreview();
  }, [quoteId]);

  const groupedItems = useMemo(() => {
    return lineItems.reduce((acc: Record<string, any[]>, item) => {
      const key = item.room_name || "Unassigned";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }, [lineItems]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 text-red-700">
          <h1 className="text-lg font-bold mb-2">Preview unavailable</h1>
          <p className="text-sm">{error || "Unable to load this quotation preview."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Quote Preview</p>
              <h1 className="text-2xl font-bold text-secondary mt-1">{quote.quote_number}</h1>
              <p className="text-sm text-slate-500 mt-1">PID: {quote.project_id}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Grand Total</p>
              <p className="text-2xl font-black text-secondary mt-1">
                ₹{Math.round(Number(quote.total || 0)).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        </header>

        {Object.entries(groupedItems).map(([roomName, items]) => (
          <section key={roomName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-secondary">{roomName}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead className="bg-white border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em]">Type</th>
                    <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em]">Service On</th>
                    <th className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-[0.15em]">Item</th>
                    <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em]">Qty</th>
                    <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em]">Rate</th>
                    <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.15em]">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(items as any[]).map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          {item.item_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{item.service_on || "-"}</td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-800">{item.item_name}</p>
                        {item.description && <p className="text-xs text-slate-500 mt-1">{item.description}</p>}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-700">{item.quantity} {item.unit}</td>
                      <td className="px-6 py-4 text-right text-slate-700">₹{Number(item.unit_price || 0).toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">₹{Math.round(Number(item.amount || 0)).toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
