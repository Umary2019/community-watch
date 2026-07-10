import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useTopRole } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { redIcon } from "@/lib/leaflet-icons";
import { STATUSES, formatDate, humanStatus, statusColor, severityColor } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { Trash2, ArrowLeft, UserCheck, Pencil } from "lucide-react";
import { ReportChat } from "@/components/app/ReportChat";
import { ReportRating } from "@/components/app/ReportRating";

export const Route = createFileRoute("/_authenticated/reports/$id")({
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const role = useTopRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crime_reports")
        .select(`*, category:crime_categories(name)`)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: reporter } = useQuery({
    queryKey: ["profile", report?.reporter_id],
    enabled: !!report?.reporter_id,
    queryFn: async () =>
      (await supabase.from("profiles").select("full_name, phone").eq("id", report!.reporter_id).maybeSingle()).data,
  });

  const { data: officer } = useQuery({
    queryKey: ["profile", report?.officer_id],
    enabled: !!report?.officer_id,
    queryFn: async () =>
      (await supabase.from("profiles").select("full_name, badge_number").eq("id", report!.officer_id!).maybeSingle()).data,
  });

  // Admin-only list of officers available for assignment
  const { data: officers = [] } = useQuery({
    queryKey: ["officers-list"],
    enabled: role === "admin",
    queryFn: async () => {
      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "police");
      const ids = (roleRows ?? []).map((r) => r.user_id);
      if (!ids.length) return [] as { id: string; full_name: string | null; badge_number: string | null }[];
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, badge_number")
        .in("id", ids);
      return data ?? [];
    },
  });

  const { data: evidence = [] } = useQuery({
    queryKey: ["report-evidence", id],
    queryFn: async () => (await supabase.from("evidence").select("*").eq("report_id", id).order("created_at")).data ?? [],
  });

  const { data: updates = [] } = useQuery({
    queryKey: ["report-updates", id],
    queryFn: async () => (await supabase.from("investigation_updates").select("*").eq("report_id", id).order("created_at")).data ?? [],
  });

  const [note, setNote] = useState("");
  const [statusChange, setStatusChange] = useState<string>("");
  const [internal, setInternal] = useState(false);

  const updateStatus = useMutation({
    mutationFn: async (newStatus: (typeof STATUSES)[number]) => {
      const patch: { status: (typeof STATUSES)[number]; officer_id?: string } = { status: newStatus };
      if (role === "police" && !report?.officer_id && user) patch.officer_id = user.id;
      const { error } = await supabase.from("crime_reports").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["report", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addUpdate = useMutation({
    mutationFn: async () => {
      if (!note.trim() || !user) return;
      const { error } = await supabase.from("investigation_updates").insert({
        report_id: id,
        officer_id: user.id,
        note: note.trim(),
        is_internal: internal,
        status_change: statusChange && statusChange !== "none" ? (statusChange as "pending") : null,
      });
      if (error) throw error;
      if (statusChange && statusChange !== "none") {
        await supabase.from("crime_reports").update({ status: statusChange as "pending", officer_id: user.id }).eq("id", id);
      }
    },
    onSuccess: () => {
      toast.success("Update posted");
      setNote(""); setStatusChange(""); setInternal(false);
      qc.invalidateQueries({ queryKey: ["report-updates", id] });
      qc.invalidateQueries({ queryKey: ["report", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selfAssign = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("crime_reports")
        .update({ officer_id: user.id, status: report?.status === "pending" ? "assigned" : report?.status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Case assigned to you"); qc.invalidateQueries({ queryKey: ["report", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assignOfficer = useMutation({
    mutationFn: async (officerId: string) => {
      const { error } = await supabase
        .from("crime_reports")
        .update({ officer_id: officerId, status: report?.status === "pending" ? "assigned" : report?.status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Officer assigned"); qc.invalidateQueries({ queryKey: ["report", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("crime_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Report deleted"); navigate({ to: "/reports" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!report) return <div className="text-muted-foreground">Report not found.</div>;

  const isOwner = report.reporter_id === user?.id;
  const canManage = role === "police" || role === "admin";
  const canDelete = (isOwner && report.status === "pending") || role === "admin";
  const canEdit = isOwner && report.status === "pending";
  const canWithdraw = isOwner && report.status === "pending";
  // Anonymous reports: hide reporter identity from officers, keep admin oversight.
  const showReporter = role === "admin" || (canManage && !report.is_anonymous);
  const isParticipant =
    !!user &&
    (user.id === report.reporter_id || (report.officer_id && user.id === report.officer_id));
  const showChat = isParticipant || role === "admin";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => history.back()} className="gap-2 -ml-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold">{report.title}</h1>
          <div className="text-sm text-muted-foreground font-mono">{report.report_number}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`text-xs rounded-full border px-2 py-1 ${statusColor(report.status)}`}>{humanStatus(report.status)}</span>
          <span className={`text-xs rounded-full border px-2 py-1 capitalize ${severityColor(report.severity)}`}>{report.severity}</span>
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link to="/reports/$id/edit" params={{ id }}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
          {canWithdraw ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                confirm(
                  "Withdraw this report? It will be permanently removed. This action cannot be undone.",
                ) && remove.mutate()
              }
            >
              <Trash2 className="h-4 w-4" /> Withdraw
            </Button>
          ) : canDelete && (
            <Button variant="outline" size="sm" className="gap-1" onClick={() => confirm("Delete this report?") && remove.mutate()}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {isOwner && report.status === "pending" && (
        <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This report is still <span className="font-medium text-foreground">pending pickup</span>.
          You can edit or withdraw it until an officer takes the case.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Details</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" value={report.category?.name ?? "—"} />
              <Field label="Date / time" value={`${report.incident_date} ${report.incident_time ?? ""}`} />
              <Field label="Address" value={report.address} />
              <Field label="Region" value={[report.lga, report.state].filter(Boolean).join(", ") || "—"} />
              <Field label="Coordinates" value={`${report.latitude}, ${report.longitude}`} />
              <Field label="Reported" value={formatDate(report.created_at)} />
              {canManage && (
                <Field
                  label="Reporter"
                  value={
                    showReporter
                      ? reporter?.full_name ?? "—"
                      : <span className="italic text-muted-foreground">Anonymous</span>
                  }
                />
              )}
              {canManage && <Field label="Officer" value={officer?.full_name ?? "Unassigned"} />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Description</div>
              <p className="whitespace-pre-wrap">{report.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64 rounded-md overflow-hidden border border-border">
              <MapContainer center={[Number(report.latitude), Number(report.longitude)]} zoom={15} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[Number(report.latitude), Number(report.longitude)]} icon={redIcon} />
              </MapContainer>
            </div>
            <a
              className="text-primary text-sm mt-2 inline-block hover:underline"
              href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`}
              target="_blank" rel="noreferrer"
            >Open in OpenStreetMap →</a>
          </CardContent>
        </Card>
      </div>

      {evidence.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Evidence</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {evidence.map((e) => (
                <a key={e.id} href={e.url} target="_blank" rel="noreferrer" className="block aspect-square rounded-md overflow-hidden border border-border bg-muted">
                  {e.type === "image" ? (
                    <img src={e.url} alt={e.caption ?? ""} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs p-2 text-muted-foreground">{e.type}: {e.caption}</div>
                  )}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && (
        <Card>
          <CardHeader><CardTitle>Case management</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Assignment controls */}
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Assignment:</span>
              {role === "police" && report.officer_id !== user?.id && (
                <Button size="sm" variant="outline" className="gap-2" onClick={() => selfAssign.mutate()} disabled={selfAssign.isPending}>
                  <UserCheck className="h-4 w-4" /> Assign to me
                </Button>
              )}
              {role === "admin" && (
                <Select
                  value={report.officer_id ?? "unassigned"}
                  onValueChange={(v) => v !== "unassigned" && assignOfficer.mutate(v)}
                >
                  <SelectTrigger className="w-64"><SelectValue placeholder="Assign officer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" disabled>Assign officer…</SelectItem>
                    {officers.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.full_name ?? "Unnamed"}{o.badge_number ? ` · #${o.badge_number}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {report.officer_id && (
                <span className="text-xs text-muted-foreground">
                  Currently: {officer?.full_name ?? "—"}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Quick status:</span>
              {STATUSES.map((s) => (
                <Button key={s} variant="outline" size="sm" onClick={() => updateStatus.mutate(s)} disabled={report.status === s}>
                  {humanStatus(s)}
                </Button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="md:col-span-3">
                <Textarea placeholder="Add investigation note…" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={internal}
                    onChange={(e) => setInternal(e.target.checked)}
                    className="accent-destructive"
                  />
                  Internal note (hidden from the reporter)
                </label>
              </div>
              <div className="space-y-2">
                <Select value={statusChange || "none"} onValueChange={setStatusChange}>
                  <SelectTrigger><SelectValue placeholder="Change status (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No change</SelectItem>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{humanStatus(s)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => addUpdate.mutate()} disabled={!note.trim() || addUpdate.isPending} className="w-full">
                  Post update
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Investigation timeline</CardTitle></CardHeader>
        <CardContent>
          {updates.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">No updates yet.</div>
          ) : (
            <ol className="relative border-l border-border ml-3 space-y-4">
              {updates.map((u) => (
                <li key={u.id} className="ml-6">
                  <span className="absolute -left-1.5 h-3 w-3 rounded-full bg-destructive" />
                  <div className="text-xs text-muted-foreground">{formatDate(u.created_at)}</div>
                  {u.is_internal && (
                    <div className="text-xs mt-1 inline-block rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5">
                      Internal
                    </div>
                  )}
                  {u.status_change && (
                    <div className="text-xs mt-1"><span className={`rounded-full border px-2 py-0.5 ${statusColor(u.status_change)}`}>Status → {humanStatus(u.status_change)}</span></div>
                  )}
                  <p className="text-sm mt-1 whitespace-pre-wrap">{u.note}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {showChat && user && (
        <ReportChat
          reportId={id}
          currentUserId={user.id}
          reporterId={report.reporter_id}
          officerId={report.officer_id}
        />
      )}

      {user && (
        <ReportRating
          reportId={id}
          reporterId={report.reporter_id}
          currentUserId={user.id}
          status={report.status}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}