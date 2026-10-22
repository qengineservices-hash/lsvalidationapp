import { Quote, QuoteLineItem } from "@/stores/useQuoteStore";

/**
 * Exports a quote to CSV following the specific sequence:
 * Section, Item Name, Description, Brand/Specification, Unit, Quantity, Unit Price
 */
export function exportQuoteToCSV(
  quote: Quote,
  lineItems: QuoteLineItem[],
  projectMeta: { city: string }
) {
  // 1. Sort Section (Full Home first, then alphabetically)
  const sortSections = (items: QuoteLineItem[]) => {
    return [...items].sort((a, b) => {
      if (a.room_name === "Full Home" && b.room_name !== "Full Home") return -1;
      if (b.room_name === "Full Home" && a.room_name !== "Full Home") return 1;
      
      const secComp = a.room_name.localeCompare(b.room_name);
      if (secComp !== 0) return secComp;
      
      // Secondary sort by display_order within section
      return (a.display_order || 0) - (b.display_order || 0);
    });
  };

  const sortedItems = sortSections(lineItems);

  // 2. CSV String Builder Helper (handles escaping)
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // 3. Header Rows
  const headers = ["Section", "Item Name", "Description", "Brand/Specification", "Unit", "Quantity", "Unit Price"];
  let csvContent = headers.join(",") + "\n";

  // 4. Data Rows
  sortedItems.forEach(item => {
    const row = [
      item.room_name,
      item.item_name,
      item.description || "",
      item.brand_specification || "",
      item.unit,
      item.quantity,
      item.unit_price
    ];
    csvContent += row.map(escapeCSV).join(",") + "\n";
  });

  // 5. Totals Row
  const totalsRow = [
    "TOTAL",
    "",
    "",
    "",
    "",
    "", // Quantity blank as per prompt
    quote.total
  ];
  csvContent += totalsRow.map(escapeCSV).join(",") + "\n";

  // 6. Trigger Browser Download
  // Filename: {PID}_{City}_{QuoteNumber}_v{version}.csv
  const cityName = projectMeta.city.replace(/\s+/g, '_');
  const fileName = `${quote.project_id}_${cityName}_${quote.quote_number}_v${(quote as any).version || 1}.csv`;
  
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
