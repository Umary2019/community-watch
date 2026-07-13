import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { LocationPicker, type LatLng, type ResolvedAddress } from "@/components/app/LocationPicker";
import { SEVERITIES } from "@/lib/format";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reports/$id/edit")({
  head: () => ({ meta: [{ title: "Edit report — SafeCity" }] }),
  component: EditReport,
});

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  category_id: z.string().uuid(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  incident_date: z.string().min(1),
  incident_time: z.string().optional(),
  address: z.string().trim().min(3).max(200),
  state: z.string().trim().max(80).optional(),
  lga: z.string().trim().max(80).optional(),
});

function EditReport() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [address, setAddress] = useState<string>("");
  const [stateName, setStateName] = useState<string>("");
  const [lga, setLga] = useState<string>("");

  const { data: report, isLoading } = useQuery({
    queryKey: ["report", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("crime_reports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () =>
      (await supabase.from("crime_categories").select("id, name").eq("is_active", true).order("name")).data ?? [],
  });

  useEffect(() => {
    if (report && !loc) {
      setLoc({ lat: Number(report.latitude), lng: Number(report.longitude) });
      setAddress(report.address ?? "");
      setStateName(report.state ?? "");
      setLga(report.lga ?? "");
    }
  }, [report, loc]);

  function handleResolved(a: ResolvedAddress) {
    if (a.address) setAddress(a.address);
    if (a.state) setStateName(a.state);
    if (a.lga) setLga(a.lga);
  }

  const save = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      if (!loc) throw new Error("Location required");
      const { error } = await supabase
        .from("crime_reports")
        .update({ ...input, latitude: loc.lat, longitude: loc.lng })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Report updated");
      navigate({ to: "/reports/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!report) return <div className="text-muted-foreground">Report not found.</div>;

  if (report.reporter_id !== user?.id || report.status !== "pending") {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 space-y-4">
        <h1 className="text-2xl font-bold">Cannot edit</h1>
        <p className="text-muted-foreground">
          Reports can only be edited by the reporter while still pending. Once an officer
          picks the case up, edits are locked to preserve the case record.
        </p>
        <Button asChild variant="outline"><Link to="/reports/$id" params={{ id }}>Back to report</Link></Button>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    save.mutate(parsed.data);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" asChild>
          <Link to="/reports/$id" params={{ id }}><ArrowLeft className="h-4 w-4" /> Back</Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit report</h1>
        <p className="text-muted-foreground font-mono text-sm">{report.report_number}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Incident details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required maxLength={120} defaultValue={report.title} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select name="category_id" defaultValue={report.category_id} required>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select name="severity" defaultValue={report.severity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident_date">Date</Label>
              <Input id="incident_date" name="incident_date" type="date" required defaultValue={report.incident_date} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident_time">Time</Label>
              <Input id="incident_time" name="incident_time" type="time" defaultValue={report.incident_time ?? ""} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={5} required maxLength={2000} defaultValue={report.description} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Location</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="address">Address / landmark</Label>
                <Input
                  id="address"
                  name="address"
                  required
                  maxLength={200}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  maxLength={80}
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lga">LGA</Label>
                <Input
                  id="lga"
                  name="lga"
                  maxLength={80}
                  value={lga}
                  onChange={(e) => setLga(e.target.value)}
                />
              </div>
            </div>
            <LocationPicker value={loc} onChange={setLoc} onAddressResolved={handleResolved} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/reports/$id" params={{ id }}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}