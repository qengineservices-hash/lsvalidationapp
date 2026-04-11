"use client";

import type { ValidationRequest } from "@/stores/useAppDataStore";
import { useAppDataStore } from "@/stores/useAppDataStore";
import { Inbox } from "lucide-react";
import Link from "next/link";

export default function TableView({ requests }: { requests: ValidationRequest[] }) {
  const { cities, getUserById } = useAppDataStore();

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-livspace-gray-400 bg-white border border-livspace-gray-200 rounded-xl">
        <Inbox className="w-10 h-10 opacity-30" />
        <p className="text-sm font-medium">No requests match this view</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white border border-livspace-gray-200 rounded-xl">
      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead className="bg-livspace-gray-50 border-b border-livspace-gray-200 text-livspace-gray-600 font-bold uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">City</th>
            <th className="px-4 py-3">Designer</th>
            <th className="px-4 py-3">Request Time</th>
            <th className="px-4 py-3">Scheduled Time</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Address</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Assignment</th>
            <th className="px-4 py-3 text-center">Report</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-livspace-gray-100">
          {requests.map((req) => {
            const city = cities.find(c => c.id === req.city_id)?.name || "Unknown";
            const designer = getUserById(req.requested_by);
            const assignee = req.assigned_to ? getUserById(req.assigned_to) : null;
            
            const requestTime = new Date(req.created_at).toLocaleString();
            const scheduledTime = req.scheduled_date ? `${req.scheduled_date} ${req.scheduled_time || ""}` : "N/A";
            
            let stage = req.status.replace("_", " ").toUpperCase();
            
            const hasReport = req.status === "report_generated" || req.status === "validation_done";

            return (
              <tr key={req.id} className="hover:bg-livspace-gray-50 transition-colors">
                <td className="px-4 py-3 font-semibold text-livspace-dark">{city}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold">{designer?.full_name || "Unknown"}</span>
                    <span className="text-[10px] text-livspace-gray-400">{designer?.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-livspace-gray-600">{requestTime}</td>
                <td className="px-4 py-3 text-livspace-gray-600">{scheduledTime}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-livspace-blue">{req.customer_name}</span>
                    <span className="text-[10px] text-livspace-gray-400">{req.customer_phone || "N/A"}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-livspace-gray-600 max-w-[150px] truncate" title={req.address}>
                  {req.address}
                </td>
                <td className="px-4 py-3">
                  <span className="bg-livspace-gray-100 text-livspace-gray-700 px-2 py-1 rounded font-bold text-[10px]">
                    {stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-livspace-gray-600">
                  {assignee?.full_name || "Unassigned"}
                </td>
                <td className="px-4 py-3 text-center">
                  {hasReport ? (
                    <Link href={`/reports/${req.id}`} className="text-livspace-orange font-bold hover:underline">
                      View Model
                    </Link>
                  ) : (
                    <span className="text-livspace-gray-300">Pending</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
