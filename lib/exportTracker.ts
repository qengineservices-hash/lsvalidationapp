import { formatDateTime } from "./formatters";

/**
 * Exports validation requests to a CSV file in the standard Tracker format.
 * Expects already-resolved data from the component for accurate naming.
 */
export const exportGlobalTracker = (data: any[], fileName: string = "Global_Tracker.csv") => {
  if (data.length === 0) {
    alert("No data to export.");
    return;
  }

  // Define headers matching the UI Tracker 
  const headers = [
    "City",
    "PID",
    "Request ID",
    "Customer Name",
    "Designer Name",
    "Validation Manager",
    "Validation Lead",
    "Request Date",
    "Scheduled Date",
    "Status",
    "Version",
    "Last Edited",
    "Report Link"
  ];

  // Construct CSV content
  const rows = data.map(item => [
    item.city,
    item.pid,
    item.request_id,
    item.customer,
    item.designer,
    item.manager,
    item.lead,
    item.created_at,
    item.scheduled,
    item.status,
    `v${item.version || 1}`,
    item.last_edited,
    item.report_link
  ]);

  const csvContent = [
    "\ufeff" + headers.join(","), // BOM + Headers
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
