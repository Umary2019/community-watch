import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useTopRole } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FilePlus2, Search } from "lucide-react";
import {
  SEVERITIES,
  STATUSES,
  downloadFile,
  downloadPDF,
  downloadXLSX,
  formatDate,
  humanStatus,
  statusColor,
  toCSV,
} from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports/")({
  component: ReportsList,
});

function ReportsList() {
  const { user } = useAuth();
  const role = useTopRole();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-basic"],
    queryFn: async () => (await supabase.from("crime_categories").select("id, name")).data ?? [],
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ["reports-list", role, user?.id],
    enabled: !!user && !!role,
    queryFn: async () => {
      let qy = supabase
        .from("crime_reports")
        .select("id, report_number, title, status, severity, created_at, category_id, address, reporter_id, officer_id")
        .order("created_at", { ascending: false });
      if (role === "citizen") qy = qy.eq("reporter_id", user!.id);
      if (role === "police") qy = qy.or(`officer_id.eq.${user!.id},status.eq.pending`);
      const { data, error } = await qy;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (categoryId !== "all" && r.category_id !== categoryId) return false;
      if (severity !== "all" && r.severity !== severity) return false;
      if (fromDate && new Date(r.created_at) < new Date(fromDate)) return false;
      if (toDate && new Date(r.created_at) > new Date(`${toDate}T23:59:59`)) return false;
      if (q && !`${r.title} ${r.report_number} ${r.address}`.toLowerCase().includes(q.toLowerCase()))
        return false;
      return true;
    });
  }, [data, q, status, categoryId, severity, fromDate, toDate]);

  function rowsForExport() {
    return filtered.map((r) => ({
      report_number: r.report_number,
      title: r.title,
      status: r.status,
      severity: r.severity,
      category: categories.find((c) => c.id === r.category_id)?.name ?? "",
      address: r.address,
      created_at: r.created_at,
    }));
  }

  function exportCSV() {
    downloadFile(`reports-${Date.now()}.csv`, toCSV(rowsForExport()));
  }
  async function exportXLSX() {
    await downloadXLSX(`reports-${Date.now()}.xlsx`, rowsForExport());
  }
  async function exportPDF() {
    await downloadPDF(
      `reports-${Date.now()}.pdf`,
      "SafeCity — Crime Reports",
      [
        { header: "Report #", key: "report_number" },
        { header: "Title", key: "title" },
        { header: "Category", key: "category" },
        { header: "Status", key: "status" },
        { header: "Severity", key: "severity" },
        { header: "Address", key: "address" },
        { header: "Created", key: "created_at" },
      ],
      rowsForExport(),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            {role === "citizen" ? "My Reports" : role === "police" ? "Cases" : "All Reports"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {filtered.length} of {data.length} shown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV}>CSV (.csv)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportXLSX}>Excel (.xlsx)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportPDF}>PDF (.pdf)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {(role === "citizen" || role === "admin") && (
            <Link to="/reports/new">
              <Button className="gap-2"><FilePlus2 className="h-4 w-4" /> New</Button>
            </Link>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by number, title, address…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{humanStatus(s)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger><SelectValue placeholder="Severity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="flex gap-2 md:col-span-6">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            {(fromDate || toDate || severity !== "all" || status !== "all" || categoryId !== "all" || q) && (
              <div className="flex items-end">
                <Button variant="ghost" size="sm" onClick={() => { setQ(""); setStatus("all"); setCategoryId("all"); setSeverity("all"); setFromDate(""); setToDate(""); }}>Clear</Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report #</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reports match your filters.</TableCell></TableRow>
              )}
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.report_number}</TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>{categories.find((c) => c.id === r.category_id)?.name ?? "—"}</TableCell>
                  <TableCell><span className={`text-xs rounded-full border px-2 py-0.5 ${statusColor(r.status)}`}>{humanStatus(r.status)}</span></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(r.created_at)}</TableCell>
                  <TableCell><Link to="/reports/$id" params={{ id: r.id }} className="text-primary hover:underline text-sm">Open</Link></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}