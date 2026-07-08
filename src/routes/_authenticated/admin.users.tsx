import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { AppRole } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: UsersAdmin,
});

function UsersAdmin() {
  const qc = useQueryClient();

  const { data = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => (await supabase.from("profiles").select("id, full_name, phone, badge_number, station, created_at").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: allRoles = [] } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [],
  });

  const grant = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role granted"); qc.invalidateQueries({ queryKey: ["admin-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role revoked"); qc.invalidateQueries({ queryKey: ["admin-roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  function rolesFor(id: string): AppRole[] {
    return allRoles.filter((r) => r.user_id === id).map((r) => r.role as AppRole);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users & Roles</h1>
        <p className="text-muted-foreground text-sm">Promote users to police officers or administrators.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Badge / Station</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => {
                const roles = rolesFor(u.id);
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.phone ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{[u.badge_number, u.station].filter(Boolean).join(" · ") || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {roles.length === 0 && <Badge variant="outline">none</Badge>}
                        {roles.map((r) => <Badge key={r} className="capitalize" variant={r === "admin" ? "destructive" : r === "police" ? "default" : "secondary"}>{r}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {(["police", "admin"] as AppRole[]).map((r) => (
                          roles.includes(r) ? (
                            <Button key={r} variant="outline" size="sm" onClick={() => revoke.mutate({ user_id: u.id, role: r })}>Revoke {r}</Button>
                          ) : (
                            <Button key={r} size="sm" onClick={() => grant.mutate({ user_id: u.id, role: r })}>Make {r}</Button>
                          )
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}