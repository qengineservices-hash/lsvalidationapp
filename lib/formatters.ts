import { format, differenceInMinutes, parseISO } from "date-fns";

/**
 * Standardized date format for the entire app: DD MMM YYYY, HH:mm
 * Example: 11 Apr 2026, 15:30
 */
export function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  try {
    return format(parseISO(dateStr), "dd MMM yyyy, HH:mm");
  } catch (e) {
    return "Invalid Date";
  }
}

/**
 * Calculates duration between two ISO strings in a readable format.
 * Example: "2h 15m"
 */
export function calculateDuration(start?: string | null, end?: string | null) {
  if (!start || !end) return "N/A";
  try {
    const startTime = parseISO(start);
    const endTime = parseISO(end);
    const totalMinutes = differenceInMinutes(endTime, startTime);
    
    if (totalMinutes < 0) return "0m";
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  } catch (e) {
    return "N/A";
  }
}

/**
 * Generates the full report URL for sharing.
 */
export function getReportUrl(requestId: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/reports/${requestId}`;
}

/**
 * Prepares the mailto link for sharing reports.
 */
/**
 * Prepares the Gmail compose link for sharing reports.
 * Designer in TO, VM in CC.
 */
export function getEmailLink(request: any, designerEmail?: string, managerEmail?: string) {
  const subject = encodeURIComponent(`Services Validation report: ${request.pid}`);
  const body = encodeURIComponent(
`Hi,

We have completed the validation for project ${request.pid}.

Address: ${request.address || "N/A"}

You can view the full report here: ${getReportUrl(request.id)}

You can also download the report from the link above.

Kindly reach out in case of any queries.

Happy Designing!`
  );

  // Use Gmail direct compose if possible (FS=1 means full screen, cm means compose)
  const to = designerEmail || "";
  const cc = managerEmail || "";
  
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&cc=${cc}&su=${subject}&body=${body}`;
}
