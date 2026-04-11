"use client";

import { useAppDataStore } from "@/stores/useAppDataStore";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { validationRequests, getUserById, cities } = useAppDataStore();
  const request = validationRequests.find((r) => r.id === requestId);
  const [manualInsight, setManualInsight] = useState("");

  if (!request) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg text-red-600 font-bold">Request not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-livspace-orange font-bold">← Go Back</button>
      </div>
    );
  }

  const requester = getUserById(request.requested_by);
  const assignee = request.assigned_to ? getUserById(request.assigned_to) : null;
  const city = cities.find((c) => c.id === request.city_id);

  const data = request.validation_data;

  // Auto-generate insights
  const generateInsights = () => {
    const insights: string[] = [];
    if (!data || !data.rooms) return insights;
    
    Object.values(data.rooms).forEach((room: any) => {
      Object.entries(room.wallAnswers || {}).forEach(([q, a]: any) => {
        if (a.value && a.value !== "NA") {
          insights.push(`[${room.name}] ${q} — Answer: ${a.value}. ${a.comment ? `Note: ${a.comment}` : ""}`);
        }
      });
      Object.entries(room.roomAnswers || {}).forEach(([q, a]: any) => {
        if (a.value && a.value !== "NA") {
          insights.push(`[${room.name}] ${q} — Answer: ${a.value}. ${a.comment ? `Note: ${a.comment}` : ""}`);
        }
      });
    });
    return insights;
  };

  const insights = generateInsights();

  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Details\n";
    csvContent += `PID,${request.pid}\n`;
    csvContent += `Customer Name,${request.customer_name}\n`;
    csvContent += `Customer Phone,${request.customer_phone}\n`;
    csvContent += `City,${city?.name}\n`;
    csvContent += `Address,"${request.address}"\n`;
    csvContent += `Society,"${request.society_name}"\n`;
    csvContent += `Request Time,${new Date(request.created_at).toLocaleString()}\n`;
    csvContent += `Scheduled Date,${request.scheduled_date || "N/A"}\n`;
    csvContent += `Start Time,${request.start_time ? new Date(request.start_time).toLocaleString() : "N/A"}\n`;
    csvContent += `End Time,${request.end_time ? new Date(request.end_time).toLocaleString() : "N/A"}\n`;
    csvContent += `Validation Lead,${assignee?.full_name || "Unassigned"}\n`;
    csvContent += `\n`;
    
    csvContent += "INSIGHTS\n";
    insights.forEach(ins => {
      csvContent += `"${ins.replace(/"/g, '""')}"\n`;
    });
    if (manualInsight) {
      csvContent += `"Manual Note: ${manualInsight.replace(/"/g, '""')}"\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `validation_report_${request.pid}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-livspace-gray-50 min-h-screen pb-20 printable-area">
      {/* Action Bar (hidden in print) */}
      <div className="bg-white border-b print:hidden sticky top-16 z-40">
        <div className="container py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-bold text-livspace-gray-500 hover:text-livspace-dark transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-livspace-gray-200 text-livspace-gray-600 rounded-lg text-xs font-bold hover:bg-livspace-gray-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> PDF / Print
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-4xl space-y-8 print:py-0 print:space-y-6">
        
        {/* Header Document */}
        <div className="bg-white border rounded-xl overflow-hidden shadow-sm print:border-none print:shadow-none">
          <div className="bg-livspace-dark text-white p-6 print:bg-black print:text-black print:border-b-2">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold tracking-wider">SITE VALIDATION REPORT</h1>
                <p className="text-sm opacity-80 mt-1">Project ID: {request.pid} • {request.request_number}</p>
              </div>
              <div className="text-right text-xs opacity-80 space-y-1">
                <p>Generated: {new Date().toLocaleDateString()}</p>
                <p>Lead: {assignee?.full_name}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-livspace-gray-500 uppercase tracking-wider text-[10px] font-bold">Customer Name</p>
              <p className="font-semibold text-livspace-dark">{request.customer_name}</p>
            </div>
            <div>
              <p className="text-livspace-gray-500 uppercase tracking-wider text-[10px] font-bold">Location</p>
              <p className="font-semibold text-livspace-dark">{city?.name}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-livspace-gray-500 uppercase tracking-wider text-[10px] font-bold">Address</p>
              <p className="font-semibold text-livspace-dark">{request.address}, {request.flat_no}, {request.floor_no}</p>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="bg-white border rounded-xl p-6 shadow-sm print:border-livspace-gray-200">
          <h3 className="text-sm font-bold text-livspace-blue uppercase tracking-wider mb-4 border-b pb-2">Timeline</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-livspace-gray-500 text-xs">Request Raised</p>
              <p className="font-bold">{new Date(request.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-livspace-gray-500 text-xs">Scheduled Arrival</p>
              <p className="font-bold">{request.scheduled_date || "N/A"} {request.scheduled_time || ""}</p>
            </div>
            <div>
              <p className="text-livspace-gray-500 text-xs">Validation Started</p>
              <p className="font-bold">{request.start_time ? new Date(request.start_time).toLocaleString() : "N/A"}</p>
            </div>
            <div>
              <p className="text-livspace-gray-500 text-xs">Validation Completed</p>
              <p className="font-bold">{request.end_time ? new Date(request.end_time).toLocaleString() : "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Automated Insights */}
        <div className="bg-white border rounded-xl p-6 shadow-sm print:border-livspace-gray-200">
          <h3 className="text-sm font-bold text-livspace-blue uppercase tracking-wider mb-4 border-b pb-2">Automated Insights & Deviations</h3>
          {insights.length === 0 ? (
            <p className="text-sm text-livspace-gray-500 italic">No significant insights flagged.</p>
          ) : (
            <ul className="space-y-2 text-sm text-livspace-gray-700">
              {insights.map((ins, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-livspace-orange">•</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Manual Insights Checkbox/TextArea */}
        <div className="bg-white border rounded-xl p-6 shadow-sm print:border-livspace-gray-200">
          <h3 className="text-sm font-bold text-livspace-blue uppercase tracking-wider mb-4 border-b pb-2">Validation Lead Notes</h3>
          <textarea
            value={manualInsight}
            onChange={(e) => setManualInsight(e.target.value)}
            placeholder="Add any additional observations or notes here before exporting..."
            rows={4}
            className="w-full border border-livspace-gray-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-livspace-orange resize-none print:hidden"
          />
          <div className="hidden print:block text-sm text-livspace-gray-700">
            {manualInsight ? manualInsight : "No manual notes appended."}
          </div>
        </div>

      </div>
    </div>
  );
}
