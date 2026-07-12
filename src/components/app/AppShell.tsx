import type { ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Shield,
  LayoutDashboard,
  FilePlus2,
  ListChecks,
  Bell,
  UserCog,
  Users,
  Tags,
  Map,
  ClipboardList,
  ScrollText,
  LogOut,
  Menu,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useTopRole, type AppRole } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Shield;
  roles: AppRole[];
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["citizen", "police", "admin"] },
  { to: "/reports/new", label: "New Report", icon: FilePlus2, roles: ["citizen", "admin"] },
  { to: "/reports", label: "My Reports", icon: ListChecks, roles: ["citizen"] },
  { to: "/reports", label: "Assigned Cases", icon: ClipboardList, roles: ["police"] },
  { to: "/reports", label: "All Reports", icon: ClipboardList, roles: ["admin"] },
  { to: "/map", label: "Crime Map", icon: Map, roles: ["police", "admin"] },
  { to: "/admin/users", label: "Users & Roles", icon: Users, roles: ["admin"] },
  { to: "/admin/categories", label: "Categories", icon: Tags, roles: ["admin"] },
  { to: "/admin/audit", label: "Audit Logs", icon: ScrollText, roles: ["admin"] },
  { to: "/notifications", label: "Notifications", icon: Bell, roles: ["citizen", "police", "admin"] },
  { to: "/profile", label: "Profile", icon: UserCog, roles: ["citizen", "police", "admin"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const role = useTopRole();
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <SidebarContent role={role} />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function TopBar() {
  const { user } = useAuth();
  const role = useTopRole();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["current-profile-name", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count ?? 0;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur flex items-center px-4 md:px-6 gap-3">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar text-sidebar-foreground">
          <SidebarContent role={role} />
        </SheetContent>
      </Sheet>
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">Signed in as</div>
        <div className="text-sm font-medium truncate max-w-[60vw]">
          {profile?.full_name ?? "Loading profile…"} · <span className="uppercase text-xs tracking-wide text-destructive">{role ?? "…"}</span>
        </div>
      </div>
      <Link to="/notifications">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </Link>
      <Button variant="outline" size="sm" onClick={signOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>
    </header>
  );
}

function SidebarContent({ role }: { role: AppRole | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = NAV.filter((n) => (role ? n.roles.includes(role) : false));
  return (
    <div className="flex flex-col h-full">
      <div className="h-16 px-4 flex items-center gap-2 border-b border-sidebar-border">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-destructive">
          <Shield className="h-5 w-5 text-white" />
        </span>
        <div>
          <div className="font-semibold leading-tight">SafeCity</div>
          <div className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
            Crime Reporting
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const active =
            pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
          return (
            <Link
              key={item.to + item.label}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-sidebar-border text-xs text-sidebar-foreground/60">
        Final Year Project · CSC
      </div>
    </div>
  );
}