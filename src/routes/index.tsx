import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield,
  MapPin,
  Users,
  BarChart3,
  Upload,
  Bell,
  Lock,
  ArrowRight,
  Siren,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </span>
            <span className="text-lg">SafeCity</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link to="/auth">
              <Button>Report a crime</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,theme(colors.primary/15),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Siren className="h-3.5 w-3.5 text-destructive" />
              GPS-enabled incident reporting
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight">
              Report crime.{" "}
              <span className="text-destructive">Respond faster.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-lg">
              SafeCity connects citizens, police officers and administrators in
              one secure platform. Submit an incident in seconds with automatic
              GPS capture, evidence upload and real-time status tracking.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Get started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button size="lg" variant="outline">
                  How it works
                </Button>
              </a>
            </div>
          </div>
          <div className="relative">
            <Card className="border-border/60 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Report #CR-20260708-000042</div>
                  <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                    Pending
                  </span>
                </div>
                <div className="mt-4 h-40 rounded-md bg-gradient-to-br from-secondary to-primary relative overflow-hidden">
                  <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_60%_40%,#fff_0,transparent_50%)]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-full bg-destructive/30 animate-ping absolute inset-0" />
                      <div className="h-16 w-16 rounded-full bg-destructive flex items-center justify-center relative">
                        <MapPin className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>Robbery</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Severity</span><span className="text-destructive font-medium">High</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span>6.5244°N, 3.3792°E</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-card/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="text-3xl font-bold">Built for citizens, police and administrators</h2>
          <p className="mt-2 text-muted-foreground max-w-2xl">
            Everything a modern crime reporting system needs — mapping, evidence
            handling, analytics and role-based access — in one place.
          </p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: "GPS + Interactive Map", body: "Automatic location capture with draggable markers on Leaflet/OpenStreetMap." },
              { icon: Upload, title: "Evidence Uploads", body: "Attach multiple images and videos, stored securely in the cloud." },
              { icon: Users, title: "Role-Based Access", body: "Citizen, Police and Admin dashboards with strict permission boundaries." },
              { icon: BarChart3, title: "Analytics & Heatmap", body: "Trends, category breakdowns and hotspot maps for informed policing." },
              { icon: Bell, title: "Live Notifications", body: "Status changes and case assignments update in real time." },
              { icon: Lock, title: "Security First", body: "Row-level security, audit logs and validated inputs everywhere." },
            ].map((f) => (
              <Card key={f.title} className="border-border/60">
                <CardContent className="p-6">
                  <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between gap-4 text-sm text-muted-foreground">
          <div>© {new Date().getFullYear()} SafeCity — Crime Reporting System</div>
          <div>Final Year Project · Computer Science</div>
        </div>
      </footer>
    </div>
  );
}
