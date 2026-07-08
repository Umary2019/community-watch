import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from "react-leaflet";
import { redIcon } from "@/lib/leaflet-icons";
import { humanStatus, statusColor } from "@/lib/format";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/map")({
  component: MapPage,
});

function MapPage() {
  const { data: reports = [] } = useQuery({
    queryKey: ["map-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crime_reports")
        .select("id, report_number, title, status, severity, latitude, longitude, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const center: [number, number] = reports.length
    ? [Number(reports[0].latitude), Number(reports[0].longitude)]
    : [9.082, 8.6753];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Crime map</h1>
        <p className="text-muted-foreground text-sm">
          Showing the {reports.length} most recent reports. Larger, redder circles indicate a hotspot cluster.
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Heatmap & pins</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[70vh] rounded-md overflow-hidden border border-border">
            <MapContainer center={center} zoom={6} scrollWheelZoom>
              <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {reports.map((r) => (
                <>
                  <CircleMarker
                    key={`c-${r.id}`}
                    center={[Number(r.latitude), Number(r.longitude)]}
                    radius={r.severity === "critical" ? 22 : r.severity === "high" ? 16 : 10}
                    pathOptions={{
                      color: "#E63946",
                      fillColor: "#E63946",
                      fillOpacity: r.severity === "critical" ? 0.35 : 0.2,
                      weight: 0,
                    }}
                  />
                  <Marker key={`m-${r.id}`} position={[Number(r.latitude), Number(r.longitude)]} icon={redIcon}>
                    <Popup>
                      <div className="space-y-1 text-sm">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.report_number}</div>
                        <span className={`inline-block text-xs rounded-full border px-2 py-0.5 ${statusColor(r.status)}`}>{humanStatus(r.status)}</span>
                        <div><Link to="/reports/$id" params={{ id: r.id }} className="text-primary hover:underline">Open →</Link></div>
                      </div>
                    </Popup>
                  </Marker>
                </>
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}