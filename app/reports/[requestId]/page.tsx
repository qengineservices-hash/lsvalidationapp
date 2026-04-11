"use client";

import { useAppDataStore } from "@/stores/useAppDataStore";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Printer, FileDown, ExternalLink, ChevronDown, Mail, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo, useEffect } from "react";
import { formatDateTime, calculateDuration, getEmailLink } from "@/lib/formatters";
import { SOCIETY_QUESTIONS } from "@/stores/useValidationStore";

// Accordion Component
function ReportAccordion({ title, children, defaultOpen = false, icon: Icon }: { title: string, children: React.ReactNode, defaultOpen?: boolean, icon?: any }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-livspace-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm mb-4 last:mb-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-livspace-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-livspace-blue" />}
          <h3 className="text-sm font-black text-livspace-dark uppercase tracking-tight">{title}</h3>
        </div>
        <ChevronDown className={cn("w-5 h-5 text-livspace-gray-400 transition-transform", isOpen ? "rotate-180" : "")} />
      </button>
      {isOpen && (
        <div className="px-6 pb-6 border-t border-livspace-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.requestId as string;
  const { validationRequests, getUserById, cities } = useAppDataStore();
  const request = validationRequests.find((r) => r.id === requestId);
  const [manualInsight, setManualInsight] = useState("");

  const designer = useMemo(() => request ? getUserById(request.requested_by) : null, [request, getUserById]);
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

  // Grouped logic for Validation Matrix Table
  const groupedMatrix = useMemo(() => {
    const rooms: Record<string, any[]> = {};
    if (!data || !data.rooms) return rooms;
    
    Object.values(data.rooms).forEach((room: any) => {
      const list: any[] = [];
      Object.entries(room.roomAnswers || {}).forEach(([q, a]: any) => {
        if (a.value && a.value !== "NA") {
          list.push({ question: q, answer: a.value, remarks: a.comment || "—" });
        }
      });
      Object.entries(room.wallAnswers || {}).forEach(([q, a]: any) => {
        if (a.value && a.value !== "NA") {
          list.push({ question: q, answer: a.value, remarks: a.comment || "—" });
        }
      });
      if (list.length > 0) rooms[room.name] = list;
    });
    return rooms;
  }, [data]);

  // Grouped logic for Measurements
  const groupedMeasurements = useMemo(() => {
    const rooms: Record<string, any[]> = {};
    if (!data || !data.rooms) return rooms;

    Object.values(data.rooms).forEach((room: any) => {
      const list: any[] = [];
      Object.entries(room.measurements || {}).forEach(([wallKey, measure]: any) => {
        if (measure && (measure.length || measure.height)) {
          list.push({
            wall: wallKey,
            dim: `${measure.length || "0"} x ${measure.height || "0"} ${measure.secondary_dim ? `x ${measure.secondary_dim}` : ""}`,
            photo: measure.photo || null
          });
        }
      });
      if (list.length > 0) rooms[room.name] = list;
    });
    return rooms;
  }, [data]);

  const handleDownloadCSV = () => {
    let csvContent = "\ufeff"; // BOM for better Excel encoding
    csvContent += "Category,Details,Remarks\n";
    
    // Summary Section
    csvContent += `SUMMARY,,\n`;
    csvContent += `PID,${request.pid},\n`;
    csvContent += `Request Number,${request.request_number || request.id},\n`;
    csvContent += `Customer Name,${request.customer_name},\n`;
    csvContent += `City,${city?.name || "N/A"},\n`;
    csvContent += `Address,"${request.address || ""}",\n`;
    csvContent += `Raised Date,${formatDateTime(request.created_at)},\n`;
    csvContent += `Last Edited,${formatDateTime(request.last_edited_at)},\n`;
    csvContent += `Version,v${request.version || 1},\n`;
    csvContent += `Time Taken,${calculateDuration(request.start_time, request.end_time)},\n`;
    csvContent += `Validation Manager,${assigner?.full_name || "N/A"},\n`;
    csvContent += `Validation Lead,${assignee?.full_name || "Unassigned"},\n`;
    csvContent += `\n`;

    // Society Constraints
    csvContent += `SOCIETY CONSTRAINTS,,\n`;
    SOCIETY_QUESTIONS.forEach(q => {
      csvContent += `${q.label},${data?.society?.[q.key] || "N/A"},\n`;
    });
    csvContent += `\n`;

    // Validation Matrix
    csvContent += `VALIDATION MATRIX,,\n`;
    Object.entries(groupedMatrix).forEach(([roomName, items]) => {
      csvContent += `ROOM: ${roomName},,\n`;
      items.forEach(item => {
        csvContent += `,"${item.question}","${item.answer}","${item.remarks}"\n`;
      });
    });
    csvContent += `\n`;

    // Measurements
    csvContent += `TECHNICAL MEASUREMENTS,,\n`;
    Object.entries(groupedMeasurements).forEach(([roomName, items]) => {
      csvContent += `ROOM: ${roomName},,\n`;
      items.forEach(item => {
        csvContent += `,"${item.wall}","${item.dim}",\n`;
      });
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const encodedUri = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `validation_report_${request.pid}_v${request.version || 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white min-h-screen pb-20 printable-area">
      {/* Action Bar */}
      <div className="bg-white border-b print:hidden sticky top-16 z-40 shadow-sm">
        <div className="container py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-sm font-bold text-livspace-gray-500 hover:text-livspace-dark transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          
          <div className="flex gap-2">
            <a 
              href={getEmailLink(request, designer?.email, assigner?.email)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-livspace-blue text-white rounded-lg text-xs font-bold hover:bg-livspace-blue/80 transition-colors shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" /> Send via Gmail
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-livspace-dark text-white rounded-lg text-xs font-bold hover:bg-black transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print Project
            </button>
            <button
              onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> Export Data
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-5xl space-y-8 print:py-0">
        
        {/* REPORT HEADER */}
        <div className="border-b-4 border-livspace-dark pb-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-livspace-orange text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded">Official</div>
                <h2 className="text-livspace-gray-400 font-bold uppercase tracking-tighter text-sm">Livspace Services Validation</h2>
              </div>
              <h1 className="text-4xl font-black text-livspace-dark tracking-tight">SITE VALIDATION REPORT</h1>
              <div className="mt-2 flex items-center gap-4 text-[10px] font-bold text-livspace-gray-400 uppercase">
                <span className="flex items-center gap-1 bg-livspace-gray-100 px-2 py-0.5 rounded text-livspace-dark">
                  <Clock className="w-3 h-3" /> v{request.version || 1}
                </span>
                <span>Last Edited: {formatDateTime(request.last_edited_at)}</span>
              </div>
            </div>
            <div className="bg-livspace-gray-50 p-4 rounded-xl border border-livspace-gray-200 min-w-[250px]">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] uppercase font-bold text-livspace-gray-400">
                <span>PID:</span> <span className="text-livspace-dark text-right">{request.pid}</span>
                <span>Request ID:</span> <span className="text-livspace-dark text-right">{request.request_number || request.id}</span>
                <span>Report Date:</span> <span className="text-livspace-dark text-right">{new Date().toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PROJECT INFO SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 bg-white rounded-2xl border border-livspace-gray-200">
            <p className="text-[10px] font-black uppercase text-livspace-blue tracking-widest mb-3">Property Details</p>
            <div className="space-y-3">
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

          <div className="p-5 bg-white rounded-2xl border border-livspace-gray-200">
            <p className="text-[10px] font-black uppercase text-livspace-blue tracking-widest mb-3">Validation Team</p>
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Validation Manager</p>
                <p className="text-sm font-bold text-livspace-dark">{assigner?.full_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Assigned To (Lead)</p>
                <p className="text-sm font-bold text-livspace-dark underline decoration-livspace-orange decoration-2 underline-offset-4">{assignee?.full_name || "Unassigned"}</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-livspace-gray-200">
            <p className="text-[10px] font-black uppercase text-livspace-blue tracking-widest mb-3">Timeline</p>
            <div className="space-y-3">
              <div>
                <p className="text-[9px] font-bold text-livspace-gray-400 uppercase">Completion Time</p>
                <p className="text-sm font-bold text-livspace-dark">{formatDateTime(request.end_time)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-livspace-blue uppercase">Total Time Taken</p>
                <p className="text-2xl font-black text-livspace-blue tracking-tight">{calculateDuration(request.start_time, request.end_time)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* SOCIETY CONSTRAINTS */}
        <ReportAccordion title="Society Constraints" icon={Info}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {SOCIETY_QUESTIONS.map((q) => {
              const val = data?.society?.[q.key];
              if (!val) return null;
              return (
                <div key={q.key} className="p-3 bg-livspace-gray-50 rounded-xl border border-livspace-gray-100">
                  <p className="text-[9px] font-bold text-livspace-gray-400 uppercase mb-1">{q.label}</p>
                  <p className="text-xs font-bold text-livspace-dark">{val}</p>
                </div>
              );
            })}
          </div>
        </ReportAccordion>

        {/* VALIDATION MATRIX */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-livspace-dark uppercase tracking-tight">Validation Matrix</h3>
            <div className="h-0.5 flex-1 bg-livspace-gray-100" />
          </div>
          
          {Object.entries(groupedMatrix).map(([roomName, items]) => (
            <ReportAccordion key={roomName} title={roomName}>
              <div className="overflow-hidden border border-livspace-gray-100 rounded-xl bg-white mt-2">
                <table className="w-full text-left text-xs">
                  <thead className="bg-livspace-gray-50 text-livspace-gray-500 font-bold uppercase text-[9px]">
                    <tr>
                      <th className="px-4 py-3 border-r border-white">Requirement</th>
                      <th className="px-4 py-3 border-r border-white w-24">Status</th>
                      <th className="px-4 py-3">VL Remarks / Observations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-livspace-gray-50">
                    {items.map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-livspace-gray-600 align-top">{row.question}</td>
                        <td className="px-4 py-3 align-top">
                          <span className={cn(
                            "px-2 py-0.5 rounded font-black text-[10px] uppercase",
                            row.answer === "Yes" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          )}>{row.answer}</span>
                        </td>
                        <td className="px-4 py-3 text-livspace-gray-500 italic align-top">{row.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ReportAccordion>
          ))}
        </section>

        {/* MEASUREMENTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-livspace-dark uppercase tracking-tight">Technical Measurements</h3>
            <div className="h-0.5 flex-1 bg-livspace-gray-100" />
          </div>
          
          {Object.entries(groupedMeasurements).map(([roomName, items]) => (
            <ReportAccordion key={roomName} title={`${roomName} Measurements`}>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                {items.map((row, i) => (
                  <div key={i} className="p-4 bg-white border border-livspace-gray-200 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-black text-livspace-gray-400 uppercase tracking-widest">{row.wall}</span>
                      <span className="text-xs font-black text-livspace-blue">{row.dim}</span>
                    </div>
                    {row.photo && (
                      <div className="aspect-video rounded-lg overflow-hidden bg-livspace-gray-100 group relative">
                        <img src={row.photo} className="w-full h-full object-cover" />
                        <a href={row.photo} target="_blank" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                          View HD <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ReportAccordion>
          ))}
        </section>

        {/* FEEDBACK & INSIGHTS */}
        <section className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-black text-livspace-dark uppercase tracking-tight">Final Insights</h3>
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
            <div className="hidden print:block text-sm text-livspace-gray-800 leading-relaxed font-bold whitespace-pre-wrap">
              {manualInsight || "No specific additional notes provided for this project."}
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <div className="pt-20 pb-10 text-center space-y-2 border-t border-livspace-gray-100">
          <p className="text-xs font-bold text-livspace-dark">Happy Designing.</p>
          <p className="text-[10px] text-livspace-gray-400 font-medium">© 2026 Livspace Services Validation Ecosystem • System IP 10.22.41.xx</p>
        </div>

      </div>
    </div>
  );
}

