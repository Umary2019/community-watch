import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationPicker, type LatLng, type ResolvedAddress } from "@/components/app/LocationPicker";
import { EvidenceUpload, type UploadedFile } from "@/components/app/EvidenceUpload";
import { SEVERITIES } from "@/lib/format";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/reports/new")({
  head: () => ({ meta: [{ title: "New Report — SafeCity" }] }),
  component: NewReport,
});

const schema = z.object({
  title: z.string().trim().min(3, "Title too short").max(120),
  description: z.string().trim().min(10, "Please describe the incident").max(2000),
  category_id: z.string().uuid("Pick a category"),
  severity: z.enum(["low", "medium", "high", "critical"]),
  incident_date: z.string().min(1),
  incident_time: z.string().optional(),
  address: z.string().trim().min(3).max(200),
  state: z.string().trim().max(80).optional(),
  lga: z.string().trim().max(80).optional(),
});

function NewReport() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [address, setAddress] = useState("");
  const [stateName, setStateName] = useState("");
  const [lga, setLga] = useState("");

  function handleResolved(a: ResolvedAddress) {
    if (a.address && !address.trim()) setAddress(a.address);
    if (a.state && !stateName.trim()) setStateName(a.state);
    if (a.lga && !lga.trim()) setLga(a.lga);
  }

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () =>
      (await supabase.from("crime_categories").select("id, name").eq("is_active", true).order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async (input: z.infer<typeof schema>) => {
      if (!user) throw new Error("Not signed in");
      if (!loc) throw new Error("Location required — pin it on the map");
      const { data, error } = await supabase
        .from("crime_reports")
        .insert({
          ...input,
          reporter_id: user.id,
          latitude: loc.lat,
          longitude: loc.lng,
          is_anonymous: isAnonymous,
        })
        .select("id")
        .single();
      if (error) throw error;
      if (files.length) {
        const rows = files.map((f) => ({
          report_id: data.id,
          uploaded_by: user.id,
          url: f.url,
          storage_path: f.path,
          type: f.type,
          caption: f.name,
        }));
        const { error: evErr } = await supabase.from("evidence").insert(rows);
        if (evErr) throw evErr;
      }
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Report submitted");
      navigate({ to: "/reports/$id", params: { id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = schema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    create.mutate(parsed.data);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Report a crime</h1>
        <p className="text-muted-foreground">
          Provide as much detail as possible. Your location and evidence help
          officers respond faster.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Incident details</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Short summary of the incident" required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select name="category_id" required>
                <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select name="severity" defaultValue="medium">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident_date">Date</Label>
              <Input id="incident_date" name="incident_date" type="date" required defaultValue={new Date().toISOString().slice(0,10)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incident_time">Time</Label>
              <Input id="incident_time" name="incident_time" type="time" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" rows={5} required maxLength={2000} placeholder="What happened? Who was involved? Any distinguishing details…" />
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
                  placeholder="Auto-fills when you pick a location on the map"
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

        <Card>
          <CardHeader><CardTitle>Evidence (optional)</CardTitle></CardHeader>
          <CardContent>
            {user && <EvidenceUpload userId={user.id} value={files} onChange={setFiles} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Privacy</CardTitle></CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={isAnonymous}
                onCheckedChange={(v) => setIsAnonymous(v === true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">Submit anonymously</span>
                <p className="text-muted-foreground mt-1">
                  Your identity will be hidden from police officers reviewing this
                  case. Administrators retain access for oversight and audit purposes.
                </p>
              </span>
            </label>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit report
          </Button>
        </div>
      </form>
    </div>
  );
}