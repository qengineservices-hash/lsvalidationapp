"use client";

import { useEffect, useState } from "react";
import { Loader2, Download, CheckCircle, AlertCircle, Building2 } from "lucide-react";

interface QuoteViewData {
  accessRecord: any;
  quote: any;
  lineItems: any[];
  validationDetails: any;
}

export default function QuoteViewPage({ searchParams }: { searchParams: { token?: string } }) {
  const token = searchParams.token;
  
  const [data, setData] = useState<QuoteViewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"full" | "summary">("full");
  
  // Payment Form State
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentName, setPaymentName] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentChecked, setPaymentChecked] = useState(false);
  const [honeypot, setHoneypot] = useState(""); // Bot trap - should remain empty

  useEffect(() => {
    if (!token) {
      setError("No access token provided. Please use the exact link sent to your email.");
      setLoading(false);
      return;
    }

    async function loadQuote() {
      try {
        const res = await fetch(`/api/quote-view/${token}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load quotation.");
        }
        const data = await res.json();
        setData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadQuote();
  }, [token]);

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentChecked) return;
    
    // Honeypot check: if the hidden field has a value, it's a bot
    if (honeypot) {
      console.warn("Bot detected: honeypot field filled.");
      alert("Something went wrong. Please try again.");
      return;
    }
    
    setConfirmingPayment(true);
    try {
      const res = await fetch(`/api/quote-view/${token}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed_by: paymentName, notes: paymentNotes })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to confirm payment.");
      }
      
      const resData = await res.json();
      
      // Update local state to reflect payment
      setData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          accessRecord: {
            ...prev.accessRecord,
            payment_confirmed_at: resData.confirmed_at,
            payment_confirmed_by_name: paymentName
          }
        };
      });
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setConfirmingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
          <p className="text-slate-600 mb-6">{error || "Invalid link."}</p>
          <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-500 text-left">
            <p>If you believe this is an error, please contact your Validation Lead and ask them to re-generate the link.</p>
          </div>
        </div>
      </div>
    );
  }

  const { quote, lineItems, validationDetails, accessRecord } = data;
  
  // Group line items by room
  const itemsByRoom = lineItems.reduce((acc, item) => {
    if (!acc[item.room_name]) acc[item.room_name] = [];
    acc[item.room_name].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Sorting: Full Home first, then alphabetical
  const sortedRooms = Object.keys(itemsByRoom).sort((a, b) => {
    if (a === "Full Home") return -1;
    if (b === "Full Home") return 1;
    return a.localeCompare(b);
  });

  // Calculate Advance Payment
  const advancePaymentAmount = quote.total * 0.10;
  const isPaid = !!accessRecord.payment_confirmed_at;

  // Render Summary Tab calculations
  const calculateCategorySummary = () => {
    const summary = lineItems.reduce((acc, item) => {
      const cat = item.service_on || "General Items";
      if (!acc[cat]) acc[cat] = { count: 0, amount: 0 };
      acc[cat].count += 1;
      acc[cat].amount += parseFloat(item.amount);
      return acc;
    }, {} as Record<string, { count: number, amount: number }>);
    
    return Object.entries(summary).sort((a, b) => b[1].amount - a[1].amount);
  };
  const categorySummary = calculateCategorySummary();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 print:bg-white print:pb-0">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 print:static print:border-none print:shadow-none">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-800 p-2 rounded-lg print:border print:border-slate-800">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight uppercase">Livspace Services</h1>
                <p className="text-xs text-slate-500 font-medium tracking-widest">OFFICIAL QUOTATION</p>
              </div>
            </div>
            
            <button 
              onClick={handlePrint}
              className="print:hidden flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-colors"
            >
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 print:bg-white print:border-slate-300 print:text-black">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Quote No.</p>
              <p className="font-bold text-slate-800">{quote.quote_number}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Project ID</p>
              <p className="font-bold text-slate-800 uppercase tracking-tight">{validationDetails.pid}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Customer</p>
              <p className="font-bold text-slate-800">{validationDetails.customer_name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-1">Sent Date</p>
              <p className="font-bold text-slate-800">{new Date(quote.sent_to_designer_at || quote.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        
        {/* Tabs (Hidden on Print) */}
        <div className="flex space-x-6 border-b border-slate-200 mb-8 print:hidden">
          <button 
            onClick={() => setActiveTab("full")}
            className={`pb-3 font-bold px-1 border-b-2 transition-colors ${activeTab === "full" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            Full Quote
          </button>
          <button 
            onClick={() => setActiveTab("summary")}
            className={`pb-3 font-bold px-1 border-b-2 transition-colors ${activeTab === "summary" ? "border-slate-800 text-slate-800" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            Summary & Analytics
          </button>
        </div>

        {/* Tab 1: Full Quote */}
        <div className={activeTab === "full" ? "block" : "hidden print:block"}>
          
          <div className="space-y-8">
            {sortedRooms.map((roomName) => {
              const roomItems = itemsByRoom[roomName];
              const roomTotal = roomItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);

              return (
                <section key={roomName} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:break-inside-avoid">
                  <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center print:bg-white print:border-b-2 print:border-black">
                    <h2 className="font-bold text-lg text-slate-800">{roomName}</h2>
                    <p className="font-bold text-slate-800">₹{Math.round(roomTotal).toLocaleString('en-IN')}</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap min-w-[800px] print:min-w-full print:text-[11px]">
                      <thead className="bg-white border-b border-slate-100 text-slate-500 font-semibold print:text-black">
                        <tr>
                          <th className="px-6 py-3 w-16">Type</th>
                          <th className="px-6 py-3 w-32">Service</th>
                          <th className="px-6 py-3 min-w-[200px] whitespace-normal">Description</th>
                          <th className="px-6 py-3 w-20 text-center">Unit</th>
                          <th className="px-6 py-3 w-24 text-right">Qty</th>
                          <th className="px-6 py-3 w-24 text-right">Rate</th>
                          <th className="px-6 py-3 w-32 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 print:divide-slate-200">
                        {roomItems.map(item => (
                          <tr key={item.id} className="text-slate-700 hover:bg-slate-50/50 transition-colors print:text-black">
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase ${item.item_type === 'mrc' ? 'bg-blue-50 text-blue-700 print:border print:border-blue-700' : 'bg-orange-50 text-orange-700 print:border print:border-orange-700'}`}>
                                {item.item_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium">{item.service_on || '-'}</td>
                            <td className="px-6 py-4 whitespace-normal min-w-[200px]">
                              <p className="font-bold text-slate-800 text-[13px] print:text-[11px]">{item.item_name}</p>
                              {item.description && (
                                <p className="text-slate-500 text-xs mt-1 leading-relaxed print:text-[10px]">{item.description}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-center font-medium">{item.unit}</td>
                            <td className="px-6 py-4 text-right">{parseFloat(item.quantity).toFixed(2)}</td>
                            <td className="px-6 py-4 text-right">₹{parseFloat(item.unit_price).toLocaleString('en-IN')}</td>
                            <td className="px-6 py-4 text-right font-bold text-slate-900">₹{parseFloat(item.amount).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="mt-8 flex justify-end print:mt-12">
            <div className="w-full max-w-sm bg-slate-800 text-white rounded-2xl p-6 shadow-xl print:text-black print:bg-white print:border print:border-black print:shadow-none">
              <div className="space-y-3 mb-6 font-medium text-sm text-slate-300 print:text-black">
                <div className="flex justify-between">
                  <span>MRC Items Total</span>
                  <span>₹{Math.round(quote.mrc_subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Non-MRC Items ({quote.non_mrc_percentage.toFixed(1)}%)</span>
                  <span>₹{Math.round(quote.non_mrc_subtotal).toLocaleString('en-IN')}</span>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-700 print:border-black flex justify-between items-end">
                <span className="font-bold text-slate-400 print:text-black">GRAND TOTAL</span>
                <span className="text-3xl font-black text-white print:text-black">₹{Math.round(quote.total).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 2: Summary */}
        <div className={activeTab === "summary" ? "block" : "hidden print:hidden"}>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Cost Breakdown by Category</h2>
            
            <div className="space-y-6">
              {categorySummary.map(([category, data]) => {
                const percentage = (data.amount / quote.total) * 100;
                return (
                  <div key={category}>
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <span className="font-bold text-slate-700">{category}</span>
                        <span className="text-xs text-slate-400 ml-2">({data.count} items)</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">₹{Math.round(data.amount).toLocaleString('en-IN')}</span>
                        <span className="text-xs text-slate-400 ml-2 w-12 inline-block">{percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                    {/* CSS Bar Chart */}
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
            
          </div>
        </div>

        {/* Payment Confirmation Section */}
        {activeTab === "full" && (
          <div className="mt-16 border-t border-slate-200 pt-16 print:hidden">
            {isPaid ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-start space-x-4">
                <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-800 text-lg mb-1">Payment Confirmed</h3>
                  <p className="text-emerald-700">10% Advance Payment confirmed by {accessRecord.payment_confirmed_by_name} on {new Date(accessRecord.payment_confirmed_at).toLocaleString()}.</p>
                  <p className="text-sm text-emerald-600 mt-2">The Validation Lead has been notified to proceed with formal delivery constraints.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden max-w-2xl mx-auto">
                <div className="bg-blue-600 p-6 text-white">
                  <h3 className="font-bold text-xl mb-1">Confirm Advance Payment</h3>
                  <p className="text-blue-100 text-sm">To lock this quotation and proceed, confirm collection of the required initial payment.</p>
                </div>
                <form onSubmit={handleConfirmPayment} className="p-8 space-y-6">
                  
                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-slate-500 font-medium tracking-wide uppercase">Required Advance (10%)</p>
                    </div>
                    <p className="text-2xl font-black text-blue-700">₹{Math.round(advancePaymentAmount).toLocaleString('en-IN')}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Confirmed by Name *</label>
                    <input 
                      required 
                      type="text" 
                      value={paymentName}
                      onChange={e => setPaymentName(e.target.value)}
                      placeholder="e.g. John Doe (Designer)"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Payment Reference / Notes <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <textarea 
                      rows={2}
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="UTR number, transaction ID, or general notes..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-slate-800 resize-none"
                    />
                  </div>

                  {/* Honeypot: invisible to humans, bots will fill it */}
                  <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} aria-hidden="true">
                    <label htmlFor="hp_field_email">Leave this blank</label>
                    <input
                      type="text"
                      id="hp_field_email"
                      name="hp_field_email"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={e => setHoneypot(e.target.value)}
                    />
                  </div>

                  <label className="flex items-start space-x-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center mt-0.5">
                      <input 
                        type="checkbox" 
                        required
                        checked={paymentChecked}
                        onChange={e => setPaymentChecked(e.target.checked)}
                        className="peer appearance-none w-5 h-5 border-2 border-slate-300 rounded cursor-pointer checked:bg-blue-600 checked:border-blue-600 transition-all"
                      />
                      <CheckCircle className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
                    </div>
                    <span className="text-sm text-slate-600 group-hover:text-slate-800 transition-colors leading-relaxed">
                      I confirm that the advance payment has been firmly collected and the customer has explicitly agreed to proceed with this scope of work.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={confirmingPayment || !paymentChecked || !paymentName.trim()}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg shadow-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center h-14"
                  >
                    {confirmingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Payment & Lock Quote"}
                  </button>

                </form>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
