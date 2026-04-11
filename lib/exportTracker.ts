import type { ValidationRequest } from "@/stores/useAppDataStore";
import { formatDateTime } from "./formatters";

/**
 * Exports validation requests to a CSV file in the standard Tracker format.
 * Columns mirror the UI Tracker (TableView).
 */
export const exportGlobalTracker = (requests: ValidationRequest[], fileName: string = "Global_Tracker.csv") => {
  if (requests.length === 0) {
    alert("No data to export.");
    return;
  }

  // Define headers matching the 15-column layout
  const headers = [
    "City",
    "PID",
    "Request ID",
    "Designer Name",
    "Validation Manager",
    "Validation Lead",
    "Request Date & Time",
    "Schedule Date & Time",
    "Validation Assignment",
    "Validation Assigned Date & Time",
    "Validation Accept (date & Time)",
    "Validation Start Date & Time",
    "Validation End Date & Time",
    "Validation Status",
    "Report Link"
  ];

  // Map requests to rows
  const rows = requests.map(req => {
    // Helper to get labels (same as TableView)
    const assignmentLabel = req.assigned_to ? "VL assigned" : "VL Not Assigned";
    let statusLabel = "Validation Pending";
    if (req.status === "report_generated") statusLabel = "Report Generated";
    else if (req.status === "validation_done") statusLabel = "Validation Completed";

    // Build the row data
    // We assume getAppDataStore is available or we pass the data we need.
    // For pure utility, we'll use the fields in the request object.
    // NOTE: Name lookups need to be done before calling this, or we export IDs.
    // To keep this utility clean, we'll try to use available data or generic placeholders.
    // In the app, this is usually called from a component that has access to the full store.
    
    return [
      req.city_id || "Unknown", // Component should ideally resolve names before export if possible
      req.pid,
      req.request_number || req.id,
      req.requested_by, // Component should resolve names
      req.assigned_by || "—",
      req.assigned_to || "—",
      formatDateTime(req.created_at),
      req.scheduled_date ? `${req.scheduled_date} ${req.scheduled_time || ""}` : "—",
      assignmentLabel,
      req.assigned_at ? formatDateTime(req.assigned_at) : "—",
      req.accepted_at ? formatDateTime(req.accepted_at) : "—",
      req.start_time ? formatDateTime(req.start_time) : "—",
      req.end_time ? formatDateTime(req.end_time) : "—",
      statusLabel,
      req.status === "report_generated" ? `${window.location.origin}/reports/${req.id}` : "—"
    ];
  });

  // Construct CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  // Create download link
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
