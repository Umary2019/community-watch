import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin/audit")({
  component: Audit,
});

function Audit() {
  const { data = [] } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Audit logs</h1>
        <p className="text-muted-foreground text-sm">Most recent {data.length} system events.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit events yet.</TableCell></TableRow>
              )}
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(a.created_at)}</TableCell>
                  <TableCell className="font-mono text-xs">{a.actor_id?.slice(0, 8) ?? "system"}</TableCell>
                  <TableCell className="font-medium">{a.action}</TableCell>
                  <TableCell>{a.entity}{a.entity_id ? ` · ${a.entity_id.slice(0,8)}` : ""}</TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">{a.metadata ? JSON.stringify(a.metadata) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}