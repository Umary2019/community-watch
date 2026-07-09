export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "—";
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "assigned":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30";
    case "under_investigation":
      return "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30";
    case "resolved":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "rejected":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "closed":
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function severityColor(sev: string): string {
  switch (sev) {
    case "low":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "medium":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "high":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "critical":
      return "bg-destructive/15 text-destructive border-destructive/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export const STATUSES = [
  "pending",
  "assigned",
  "under_investigation",
  "resolved",
  "rejected",
  "closed",
] as const;

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export function humanStatus(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const raw = v == null ? "" : String(v);
    // Neutralize spreadsheet formula-injection triggers (=, +, -, @, tab, CR)
    const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function sanitizeCell(v: unknown): string {
  const raw = v == null ? "" : String(v);
  return /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
}

export async function downloadXLSX(name: string, rows: Record<string, unknown>[]) {
  const XLSX = await import("xlsx");
  const sanitized = rows.map((r) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(r)) out[k] = sanitizeCell(v);
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(sanitized);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reports");
  XLSX.writeFile(wb, name);
}

export async function downloadPDF(
  name: string,
  title: string,
  columns: { header: string; key: string }[],
  rows: Record<string, unknown>[],
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  doc.setFontSize(16);
  doc.text(title, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleString()} · ${rows.length} record(s)`,
    40,
    58,
  );
  autoTable(doc, {
    startY: 74,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => sanitizeCell(r[c.key]))),
    styles: { fontSize: 9, cellPadding: 6, overflow: "linebreak" },
    headStyles: { fillColor: [15, 33, 65], textColor: 255 },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    margin: { left: 40, right: 40 },
  });
  doc.save(name);
}

export function downloadFile(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}