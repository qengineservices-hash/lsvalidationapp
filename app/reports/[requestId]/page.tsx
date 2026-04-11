"use client";

import { useAppDataStore } from "@/stores/useAppDataStore";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { formatDateTime, calculateDuration } from "@/lib/formatters";

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { validationRequests, getUserById, cities } = useAppDataStore();
  const request = validationRequests.find((r) => r.id === requestId);
  const [manualInsight, setManualInsight] = useState("");

  const requester = useMemo(() => request ? getUserById(request.requested_by) : null, [request, getUserById]);
  const assignee = useMemo(() => request?.assigned_to ? getUserById(request.assigned_to) : null, [request, getUserById]);
  const assigner = useMemo(() => request?.assigned_by ? getUserById(request.assigned_by) : null, [request, getUserById]);
  const city = useMemo(() => request ? cities.find((c) => c.id === request.city_id) : null, [request, cities]);

  if (!request) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg text-red-600 font-bold">Request not found.</p>
        <button onClick={() => router.back()} className="mt-4 text-livspace-orange font-bold">← Go Back</button>
      </div>
    );
  }

  const data = request.validation_data;

  // Flatten logic for Validation Matrix Table
  const matrixData = useMemo(() => {
    const list: any[] = [];
    if (!data || !data.rooms) return list;
    
    Object.values(data.rooms).forEach((room: any) => {
      // Room Level Answers
      Object.entries(room.roomAnswers || {}).forEach(([q, a]: any) => {
        if (a.value && a.value !== "NA") {
          list.push({ room: room.name, question: q, answer: a.value, remarks: a.comment || "—" });
        }
      });
      // Wall Level Answers
      Object.entries(room.wallAnswers || {}).forEach(([q, a]: any) => {
        if (a.value && a.value !== "NA") {
          list.push({ room: room.name, question: q, answer: a.value, remarks: a.comment || "—" });
        }
      });
    });
    return list;
  }, [data]);

  // Flatten logic for Measurements Table
  const measurementData = useMemo(() => {
    const list: any[] = [];
    if (!data || !data.rooms) return list;

    Object.values(data.rooms).forEach((room: any) => {
      Object.entries(room.measurements || {}).forEach(([wallKey, measure]: any) => {
        if (measure.length || measure.height) {
          list.push({
            room: room.name,
            wall: wallKey,
            dim: `${measure.length || "0"} x ${measure.height || "0"} ${measure.secondary_dim ? `x ${measure.secondary_dim}` : ""}`,
            photo: measure.photo || null
          });
        }
      });
    });
    return list;
  }, [data]);

  const handleDownloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Details\n";
    csvContent += `PID,${request.pid}\n`;
    csvContent += `Request ID,${request.request_number || request.id}\n`;
    csvContent += `Customer Name,${request.customer_name}\n`;
    csvContent += `City,${city?.name}\n`;
    csvContent += `Address,"${request.address}"\n`;
    csvContent += `Raised Date,${formatDateTime(request.created_at)}\n`;
    csvContent += `Time Taken,${calculateDuration(request.start_time, request.end_time)}\n`;
    csvContent += `Validation Manager,${assigner?.full_name || "N/A"}\n`;
    csvContent += `Validation Lead,${assignee?.full_name || "Unassigned"}\n`;
    csvContent += `\n`;
    
    csvContent += "VALIDATION MATRIX\n";
    csvContent += "Room,Question,Answer,Remarks\n";
    matrixData.forEach(row => {
      csvContent += `"${row.room}","${row.question}","${row.answer}","${row.remarks}"\n`;
    });
    
    csvContent += `\n`;
    csvContent += "MEASUREMENTS\n";
    csvContent += "Room,Wall,Dimensions,Photo Link\n";
    measurementData.forEach(row => {
      csvContent += `"${row.room}","${row.wall}","${row.dim}","${row.photo || "N/A"}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `validation_report_${request.pid}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white min-h-screen pb-20 printable-area">
      {/* Action Bar (hidden in print) */}
      <div className="bg-white border-b print:hidden sticky top-16 z-40 shadow-sm">
        <div className="container py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-bold text-livspace-gray-500 hover:text-livspace-dark transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-livspace-dark text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Report
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-5xl space-y-10 print:py-0 print:space-y-8">
        
        {/* REPORT HEADER */}
        <div className="border-b-4 border-livspace-dark pb-6">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-livspace-orange text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded">Official</div>
                <h2 className="text-livspace-gray-400 font-bold uppercase tracking-tighter text-sm">Livspace Services Validation</h2>
              </div>
              <h1 className="text-4xl font-black text-livspace-dark tracking-tight">SITE VALIDATION REPORT</h1>
            </div>
            <div className="bg-livspace-gray-50 p-4 rounded-xl border border-livspace-gray-200 min-w-[250px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] uppercase font-bold text-livspace-gray-400">
                <span>PID:</span> <span className="text-livspace-dark text-right">{request.pid}</span>
                <span>Request ID:</span> <span className="text-livspace-dark text-right">{request.request_number || request.id}</span>
                <span>Date:</span> <span className="text-livspace-dark text-right">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PROJECT INFO SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-livspace-gray-50 rounded-2xl border border-livspace-gray-100">
            <p className="text-[10px] font-black uppercase text-livspace-blue tracking-widest mb-2">Property Details</p>
            <div className="space-y-2">
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Customer</p>
                <p className="text-sm font-bold text-livspace-dark">{request.customer_name}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Location</p>
                <p className="text-sm font-bold text-livspace-dark">{city?.name}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Address</p>
                <p className="text-xs font-medium text-livspace-gray-600 leading-relaxed">{request.address}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-livspace-gray-50 rounded-2xl border border-livspace-gray-100">
            <p className="text-[10px] font-black uppercase text-livspace-blue tracking-widest mb-2">Validation Team</p>
            <div className="space-y-2">
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Validation Manager</p>
                <p className="text-sm font-bold text-livspace-dark">{assigner?.full_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Assigned To (Lead)</p>
                <p className="text-sm font-bold text-livspace-dark">{assignee?.full_name || "Unassigned"}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-livspace-gray-50 rounded-2xl border border-livspace-gray-100">
            <p className="text-[10px] font-black uppercase text-livspace-blue tracking-widest mb-2">Timeline</p>
            <div className="space-y-2">
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Completion Time</p>
                <p className="text-sm font-bold text-livspace-dark">{formatDateTime(request.end_time)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-livspace-blue uppercase">Total Time Taken</p>
                <p className="text-lg font-black text-livspace-blue">{calculateDuration(request.start_time, request.end_time)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* VALIDATION MATRIX TABLE */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-livspace-dark uppercase tracking-tight">Validation Matrix</h3>
            <div className="h-0.5 flex-1 bg-livspace-gray-100" />
          </div>
          <div className="overflow-hidden border border-livspace-gray-200 rounded-2xl shadow-sm bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-livspace-dark text-white font-bold uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-4 py-3 border-r border-white/10">Room / Area</th>
                  <th className="px-4 py-3 border-r border-white/10">Requirement / Question</th>
                  <th className="px-4 py-3 border-r border-white/10">Validation Status</th>
                  <th className="px-4 py-3">VL Remarks / Observations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-livspace-gray-100">
                {matrixData.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-livspace-gray-400 italic">No formal validation data points recorded.</td></tr>
                ) : (
                  matrixData.map((row, i) => (
                    <tr key={i} className={cn(i % 2 === 0 ? "bg-white" : "bg-livspace-gray-50/50")}>
                      <td className="px-4 py-3 font-black text-livspace-dark align-top">{row.room}</td>
                      <td className="px-4 py-3 text-livspace-gray-600 align-top">{row.question}</td>
                      <td className="px-4 py-3 align-top">
                        <span className="bg-blue-50 text-livspace-blue px-2 py-0.5 rounded font-bold">{row.answer}</span>
                      </td>
                      <td className="px-4 py-3 text-livspace-gray-500 italic align-top">{row.remarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* MEASUREMENTS TABLE */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-livspace-dark uppercase tracking-tight">Room Level Measurements</h3>
            <div className="h-0.5 flex-1 bg-livspace-gray-100" />
          </div>
          <div className="overflow-hidden border border-livspace-gray-200 rounded-2xl shadow-sm bg-white">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#555] text-white font-bold uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-4 py-3 border-r border-white/10">Room</th>
                  <th className="px-4 py-3 border-r border-white/10">Wall / Surface</th>
                  <th className="px-4 py-3 border-r border-white/10">Dimensions (L x H)</th>
                  <th className="px-4 py-3">Evidence / Photos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-livspace-gray-100">
                {measurementData.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-10 text-center text-livspace-gray-400 italic">No measurements recorded.</td></tr>
                ) : (
                  measurementData.map((row, i) => (
                    <tr key={i} className={cn(i % 2 === 0 ? "bg-white" : "bg-livspace-gray-50/50")}>
                      <td className="px-4 py-3 font-black text-livspace-dark">{row.room}</td>
                      <td className="px-4 py-3 text-livspace-gray-600 font-medium uppercase text-[10px]">{row.wall}</td>
                      <td className="px-4 py-3 font-bold text-livspace-blue">{row.dim}</td>
                      <td className="px-4 py-3">
                        {row.photo ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded bg-livspace-gray-200 overflow-hidden">
                              <img src={row.photo} className="w-full h-full object-cover" />
                            </div>
                            <a href={row.photo} target="_blank" className="text-livspace-orange hover:underline font-bold text-[9px] flex items-center gap-0.5">
                              View Link <ExternalLink className="w-2 h-2" />
                            </a>
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* LEAD NOTES TABLE */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-livspace-dark uppercase tracking-tight">Insights & Notes from Validation Lead</h3>
            <div className="h-0.5 flex-1 bg-livspace-gray-100" />
          </div>
          <div className="bg-livspace-gray-50 border border-livspace-gray-200 rounded-2xl p-6">
            <textarea
              value={manualInsight}
              onChange={(e) => setManualInsight(e.target.value)}
              placeholder="Add any additional observations or notes here before exporting..."
              rows={4}
              className="w-full bg-white border border-livspace-gray-200 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-livspace-orange resize-none print:hidden shadow-sm"
            />
            <div className="hidden print:block text-sm text-livspace-gray-800 leading-relaxed font-medium whitespace-pre-wrap">
              {manualInsight || "No specific additional notes provided for this project."}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <div className="pt-20 pb-10 text-center space-y-2 border-t border-livspace-gray-100">
          <p className="text-xs font-bold text-livspace-dark">Happy Designing.</p>
          <p className="text-[10px] text-livspace-gray-400">© 2026 Livspace Services Validation Ecosystem</p>
        </div>

      </div>
    </div>
  );
}

