import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Bell, CheckCheck } from "lucide-react";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: Notifs,
});

function Notifs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", user!.id).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("All marked read"); qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread-notifications"] }); },
  });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()} className="gap-2">
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          {data.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
              You have no notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.map((n) => (
                <li key={n.id} className={`p-4 flex items-start gap-3 ${!n.is_read ? "bg-accent/30" : ""}`}>
                  <span className={`mt-1 h-2 w-2 rounded-full ${!n.is_read ? "bg-destructive" : "bg-muted-foreground/40"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{n.title}</div>
                    {n.body && <div className="text-sm text-muted-foreground mt-0.5">{n.body}</div>}
                    <div className="text-xs text-muted-foreground mt-1">{formatDate(n.created_at)}</div>
                  </div>
                  {n.link && (
                    <Link to={n.link} className="text-primary text-sm hover:underline shrink-0">Open</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}