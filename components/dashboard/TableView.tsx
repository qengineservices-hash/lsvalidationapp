"use client";

import { useState, useMemo } from "react";
import type { ValidationRequest } from "@/stores/useAppDataStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { Inbox, FileText, ExternalLink, ChevronDown } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function TableView({ requests }: { requests: ValidationRequest[] }) {
  const { cities, getUserById } = useAppDataStore();
  
  const [filters, setFilters] = useState<Record<string, string>>({
    city: "",
    pid: "",
    request_id: "",
    designer: "",
    manager: "",
    lead: "",
    assignment: "",
    status: "",
  });

  const getAssignmentLabel = (req: ValidationRequest) => {
    return req.assigned_to ? "VL assigned" : "VL Not Assigned";
  };

  const getStatusLabel = (req: ValidationRequest) => {
    if (req.status === "report_generated") return "Report Generated";
    if (req.status === "validation_done") return "Validation Completed";
    return "Validation Pending";
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const city = cities.find(c => c.id === req.city_id)?.name || "";
      const designer = getUserById(req.requested_by)?.full_name || "";
      const manager = req.assigned_by ? getUserById(req.assigned_by)?.full_name || "" : "—";
      const lead = req.assigned_to ? getUserById(req.assigned_to)?.full_name || "" : "—";
      const assignment = getAssignmentLabel(req);
      const status = getStatusLabel(req);

      return (
        (!filters.city || city.toLowerCase().includes(filters.city.toLowerCase())) &&
        (!filters.pid || req.pid.toLowerCase().includes(filters.pid.toLowerCase())) &&
        (!filters.customer || req.customer_name.toLowerCase().includes(filters.customer.toLowerCase())) &&
        (!filters.request_id || (req.request_number || req.id).toLowerCase().includes(filters.request_id.toLowerCase())) &&
        (!filters.designer || designer.toLowerCase().includes(filters.designer.toLowerCase())) &&
        (!filters.manager || manager.toLowerCase().includes(filters.manager.toLowerCase())) &&
        (!filters.lead || lead.toLowerCase().includes(filters.lead.toLowerCase())) &&
        (!filters.assignment || assignment.toLowerCase().includes(filters.assignment.toLowerCase())) &&
        (!filters.status || status.toLowerCase().includes(filters.status.toLowerCase()))
      );
    });
  }, [requests, filters, cities, getUserById]);

  const uniqueValues = useMemo(() => {
    const vals: Record<string, string[]> = {
      city: [],
      pid: [],
      request_id: [],
      designer: [],
      manager: [],
      lead: [],
      assignment: ["VL assigned", "VL Not Assigned"],
      status: ["Validation Pending", "Validation Completed", "Report Generated"],
    };

    requests.forEach(req => {
      const city = cities.find(c => c.id === req.city_id)?.name || "";
      const designer = getUserById(req.requested_by)?.full_name || "";
      const manager = req.assigned_by ? getUserById(req.assigned_by)?.full_name || "" : "—";
      const lead = req.assigned_to ? getUserById(req.assigned_to)?.full_name || "" : "—";

      if (city && !vals.city.includes(city)) vals.city.push(city);
      if (req.pid && !vals.pid.includes(req.pid)) vals.pid.push(req.pid);
      const rid = req.request_number || req.id;
      if (rid && !vals.request_id.includes(rid)) vals.request_id.push(rid);
      if (designer && !vals.designer.includes(designer)) vals.designer.push(designer);
      if (manager && !vals.manager.includes(manager)) vals.manager.push(manager);
      if (lead && !vals.lead.includes(lead)) vals.lead.push(lead);
    });

    Object.keys(vals).forEach(k => vals[k].sort());
    return vals;
  }, [requests, cities, getUserById]);

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-livspace-gray-400 bg-white border border-livspace-gray-200 rounded-xl">
        <Inbox className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">No requests available</p>
      </div>
    );
  }

  const SearchableFilter = ({ name, options }: { name: string, options: string[] }) => {
    const dataListId = `list-${name}`;
    return (
      <div className="mt-1 relative">
        <input
          list={dataListId}
          value={filters[name]}
          placeholder="Filter..."
          onChange={(e) => {
            const val = e.target.value;
            setFilters(prev => ({ ...prev, [name]: val }));
          }}
          className="w-full bg-white/50 border border-livspace-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-livspace-blue transition-all text-[9px] font-normal normal-case"
        />
        <datalist id={dataListId}>
          {options.map(opt => <option key={opt} value={opt} />)}
        </datalist>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto bg-white border border-livspace-gray-200 rounded-xl shadow-2xl">
      <table className="w-full text-left text-[11px] whitespace-nowrap border-collapse">
        <thead className="bg-[#f8f9fa] border-b border-livspace-gray-200 text-livspace-dark font-bold uppercase tracking-tight">
          <tr>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[100px]">
              City
              <SearchableFilter name="city" options={uniqueValues.city} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[80px]">
              PID
              <SearchableFilter name="pid" options={uniqueValues.pid} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[100px]">
              Request ID
              <SearchableFilter name="request_id" options={uniqueValues.request_id} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[120px]">
              Designer Name
              <SearchableFilter name="designer" options={uniqueValues.designer} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[120px]">
              Validation Manager
              <SearchableFilter name="manager" options={uniqueValues.manager} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[120px]">
              Validation Lead
              <SearchableFilter name="lead" options={uniqueValues.lead} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[140px]">
              Request Date & Time
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[130px]">
              Schedule Date & Time
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[130px]">
              Validation Assignment
              <SearchableFilter name="assignment" options={uniqueValues.assignment} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[150px]">
              Validation Assigned Date
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[150px]">
              Validation Accept
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[150px]">
              Validation Start
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[150px]">
              Validation End
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[130px]">
              Validation Status
              <SearchableFilter name="status" options={uniqueValues.status} />
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[50px] text-center">
              Ver.
            </th>
            <th className="px-3 py-4 border-r border-livspace-gray-200 min-w-[150px]">
              Last Edited At
            </th>
            <th className="px-3 py-4 text-center min-w-[100px]">
              Report Link
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-livspace-gray-100">
          {filteredRequests.length === 0 ? (
            <tr>
              <td colSpan={15} className="px-3 py-10 text-center text-livspace-gray-400 italic">
                No matching requests found for the selected filters.
              </td>
            </tr>
          ) : (
            filteredRequests.map((req) => {
              const city = cities.find(c => c.id === req.city_id)?.name || "Unknown";
              const designer = getUserById(req.requested_by);
              const manager = req.assigned_by ? getUserById(req.assigned_by) : null;
              const lead = req.assigned_to ? getUserById(req.assigned_to) : null;
              
              const assignmentLabel = getAssignmentLabel(req);
              const statusLabel = getStatusLabel(req);
              const hasReport = req.status === "report_generated" || req.status === "validation_done";

              return (
                <tr key={req.id} className="hover:bg-livspace-blue/5 transition-colors group">
                  <td className="px-3 py-3 border-r border-livspace-gray-100 font-bold text-livspace-dark">{city}</td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 font-medium">{req.pid}</td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-[10px] text-livspace-gray-500">{req.request_number || req.id}</td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 font-semibold">{designer?.full_name || "—"}</td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100">{manager?.full_name || "—"}</td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100">{lead?.full_name || "—"}</td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-livspace-gray-600">{formatDateTime(req.created_at)}</td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-livspace-gray-500 italic">
                    {req.scheduled_date ? `${req.scheduled_date} ${req.scheduled_time || ""}` : "—"}
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 font-bold uppercase text-[9px]">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded",
                      assignmentLabel === "VL assigned" ? "bg-purple-100 text-purple-700" : "bg-livspace-gray-100 text-livspace-gray-500"
                    )}>
                      {assignmentLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-livspace-gray-400">
                    {req.assigned_at ? formatDateTime(req.assigned_at) : "—"}
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-livspace-gray-400">
                    {req.accepted_at ? formatDateTime(req.accepted_at) : "—"}
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-livspace-gray-400">
                    {req.start_time ? formatDateTime(req.start_time) : "—"}
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-livspace-gray-400">
                    {req.end_time ? formatDateTime(req.end_time) : "—"}
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 uppercase font-black text-[9px] tracking-widest">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded flex items-center gap-1",
                      statusLabel === "Report Generated" ? "bg-green-600 text-white" :
                      statusLabel === "Validation Completed" ? "bg-green-100 text-green-700" :
                      "bg-amber-100 text-amber-700"
                    )}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-center font-bold text-livspace-blue">
                    v{req.version || 1}
                  </td>
                  <td className="px-3 py-3 border-r border-livspace-gray-100 text-[10px] text-livspace-gray-500">
                    {req.last_edited_at ? formatDateTime(req.last_edited_at) : "—"}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {hasReport ? (
                      <div className="flex items-center justify-center gap-3">
                        <Link 
                          href={`/reports/${req.id}`} 
                          className="inline-flex items-center gap-1 text-livspace-orange font-bold hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View
                        </Link>
                        {(req.status === "validation_done" || req.status === "report_generated") && (
                          <Link 
                            href={`/validation-lead/validate/${req.id}`} 
                            className="text-[10px] text-livspace-blue hover:underline font-bold"
                          >
                            Edit
                          </Link>
                        )}
                      </div>
                    ) : (
                      <span className="text-livspace-gray-300 italic">Pending</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
