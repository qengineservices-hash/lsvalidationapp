import type { ValidationRequest } from "@/stores/useAppDataStore";
import { useAppDataStore } from "@/stores/useAppDataStore";

export function exportGlobalTracker(requests: ValidationRequest[], fileName: string) {
  const store = useAppDataStore.getState();

  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Headers
  const headers = [
    "City",
    "Designer Email",
    "Designer Name",
    "Request Time",
    "Scheduled Time",
    "Customer Name",
    "Customer Phone",
    "Address",
    "Stage",
    "Assignment",
    "Report Link",
  ];
  csvContent += headers.map(h => `"${h}"`).join(",") + "\n";

  requests.forEach(req => {
    const city = store.cities.find(c => c.id === req.city_id)?.name || "Unknown";
    const designer = store.getUserById(req.requested_by);
    const assignee = req.assigned_to ? store.getUserById(req.assigned_to) : null;
    
    const requestTime = new Date(req.created_at).toLocaleString();
    const scheduledTime = req.scheduled_date ? `${req.scheduled_date} ${req.scheduled_time || ""}` : "N/A";
    
    // Convert status to readable stage
    let stage = req.status.toUpperCase();
    if (stage === "VALIDATION_DONE") stage = "VALIDATION DONE";
    if (stage === "REPORT_GENERATED") stage = "REPORT GENERATED";
    
    const assignment = assignee ? `Assigned to ${assignee.full_name}` : "Unassigned";
    const reportLink = (req.status === "report_generated" || req.status === "validation_done") 
      ? `${window.location.origin}/reports/${req.id}` 
      : "Not Ready";

    const row = [
      city,
      designer?.email || "Unknown",
      designer?.full_name || "Unknown",
      requestTime,
      scheduledTime,
      req.customer_name,
      req.customer_phone || "N/A",
      req.address,
      stage,
      assignment,
      reportLink
    ];

    csvContent += row.map(v => `"${(v || "").replace(/"/g, '""')}"`).join(",") + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
