import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { redIcon } from "@/lib/leaflet-icons";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Locate } from "lucide-react";
import { toast } from "sonner";

export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  className?: string;
}

function Recenter({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (pos) map.setView([pos.lat, pos.lng], Math.max(map.getZoom(), 14));
  }, [pos, map]);
  return null;
}

function ClickHandler({ onChange }: { onChange: (v: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export function LocationPicker({ value, onChange, className }: Props) {
  const [locating, setLocating] = useState(false);
  const center: LatLng = value ?? { lat: 9.082, lng: 8.6753 }; // Nigeria center default

  function detect() {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Location captured");
      },
      (err) => {
        setLocating(false);
        toast.error(err.message || "Could not detect location");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {value
            ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : "Click the map or use your GPS"}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={detect} disabled={locating}>
          {locating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Locate className="h-4 w-4 mr-1" />}
          Use my location
        </Button>
      </div>
      <div className="h-72 rounded-md overflow-hidden border border-border">
        <MapContainer center={[center.lat, center.lng]} zoom={value ? 14 : 6} scrollWheelZoom>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          <Recenter pos={value} />
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              draggable
              icon={redIcon}
              eventHandlers={{
                dragend(e) {
                  const m = e.target as L.Marker;
                  const p = m.getLatLng();
                  onChange({ lat: p.lat, lng: p.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}

// Re-export leaflet namespace type
import type L from "leaflet";
export type { L };