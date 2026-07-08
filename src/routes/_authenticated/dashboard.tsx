import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useTopRole } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilePlus2, FileText, CheckCircle2, Clock, Siren } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { humanStatus, statusColor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

const CHART_COLORS = ["#0B1D3A", "#12325C", "#E63946", "#F1B02C", "#2A9D8F", "#8E44AD", "#457B9D", "#E76F51"];

function Dashboard() {
  const { user } = useAuth();
  const role = useTopRole();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id, role],
    enabled: !!user && !!role,
    queryFn: async () => {
      const base = supabase.from("crime_reports").select("id, status, created_at, category_id");
      const scoped = role === "citizen" ? base.eq("reporter_id", user!.id) : base;
      const { data, error } = await scoped;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-basic"],
    queryFn: async () => {
      const { data } = await supabase.from("crime_categories").select("id, name");
      return data ?? [];
    },
  });

  const total = stats?.length ?? 0;
  const pending = stats?.filter((r) => r.status === "pending").length ?? 0;
  const resolved = stats?.filter((r) => r.status === "resolved" || r.status === "closed").length ?? 0;
  const active = stats?.filter((r) => r.status === "under_investigation" || r.status === "assigned").length ?? 0;

  // Category chart
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const byCategory = Object.entries(
    (stats ?? []).reduce<Record<string, number>>((acc, r) => {
      const name = catMap.get(r.category_id) ?? "Unknown";
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, count]) => ({ name, count }));

  // Status pie
  const byStatus = Object.entries(
    (stats ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name: humanStatus(name), value }));

  // Trend (last 30 days)
  const trend = (() => {
    const map: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map[key] = 0;
    }
    (stats ?? []).forEach((r) => {
      const key = new Date(r.created_at).toISOString().slice(0, 10);
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([date, count]) => ({ date: date.slice(5), count }));
  })();

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {role === "citizen" && "Your reported incidents at a glance."}
            {role === "police" && "Investigations across the district."}
            {role === "admin" && "System-wide crime activity."}
          </p>
        </div>
        {(role === "citizen" || role === "admin") && (
          <Link to="/reports/new">
            <Button className="gap-2">
              <FilePlus2 className="h-4 w-4" />
              New Report
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Reports" value={total} icon={FileText} loading={isLoading} />
        <StatCard title="Pending" value={pending} icon={Clock} loading={isLoading} tone="amber" />
        <StatCard title="Active" value={active} icon={Siren} loading={isLoading} tone="red" />
        <StatCard title="Resolved" value={resolved} icon={CheckCircle2} loading={isLoading} tone="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Reports — last 30 days</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#E63946" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By status</CardTitle></CardHeader>
          <CardContent className="h-72">
            {byStatus.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                    {byStatus.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>By category</CardTitle></CardHeader>
        <CardContent className="h-72">
          {byCategory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byCategory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#12325C" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <RecentReports role={role} userId={user?.id} />
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  tone,
}: {
  title: string;
  value: number;
  icon: typeof Clock;
  loading?: boolean;
  tone?: "amber" | "red" | "green";
}) {
  const toneClass =
    tone === "amber"
      ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      : tone === "red"
        ? "bg-destructive/15 text-destructive"
        : tone === "green"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <div className="text-sm text-muted-foreground">{title}</div>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <div className="text-3xl font-bold">{value}</div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-md flex items-center justify-center ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function RecentReports({ role, userId }: { role: string | null; userId?: string }) {
  const { data = [] } = useQuery({
    queryKey: ["recent-reports", role, userId],
    enabled: !!userId && !!role,
    queryFn: async () => {
      let q = supabase
        .from("crime_reports")
        .select("id, report_number, title, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (role === "citizen") q = q.eq("reporter_id", userId!);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <Card>
      <CardHeader><CardTitle>Recent reports</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No reports yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((r) => (
              <li key={r.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link to="/reports/$id" params={{ id: r.id }} className="font-medium hover:underline truncate block">
                    {r.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">{r.report_number} · {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <span className={`text-xs rounded-full border px-2 py-0.5 ${statusColor(r.status)}`}>{humanStatus(r.status)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}