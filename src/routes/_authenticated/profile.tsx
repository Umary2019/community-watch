import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile-full", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const save = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("profiles").update({
        full_name: String(fd.get("full_name") || ""),
        phone: String(fd.get("phone") || "") || null,
        badge_number: String(fd.get("badge_number") || "") || null,
        station: String(fd.get("station") || "") || null,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile-full"] });
      qc.invalidateQueries({ queryKey: ["current-profile-name"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changePw = useMutation({
    mutationFn: async (pw: string) => {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Password updated"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Personal info</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-6 text-sm text-muted-foreground">Loading profile…</div>
          ) : !profile ? (
            <div className="py-6 text-sm text-muted-foreground">Profile information could not be found.</div>
          ) : (
          <form key={profile.updated_at} onSubmit={(e) => { e.preventDefault(); save.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="badge_number">Badge # (police)</Label>
                <Input id="badge_number" name="badge_number" defaultValue={profile?.badge_number ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="station">Station (police)</Label>
                <Input id="station" name="station" defaultValue={profile?.station ?? ""} />
              </div>
            </div>
            <Button type="submit" disabled={save.isPending}>Save changes</Button>
          </form>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Change password</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const pw = String(fd.get("pw") || ""); if (pw.length < 6) return toast.error("At least 6 characters"); changePw.mutate(pw); (e.currentTarget as HTMLFormElement).reset(); }} className="flex gap-3">
            <Input name="pw" type="password" placeholder="New password" minLength={6} required />
            <Button type="submit" disabled={changePw.isPending}>Update</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}