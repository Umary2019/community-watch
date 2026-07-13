import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import type L from "leaflet";
import { redIcon } from "@/lib/leaflet-icons";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2, Locate } from "lucide-react";
import { toast } from "sonner";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface ResolvedAddress {
  address: string;
  state?: string;
  lga?: string;
}

interface Props {
  value: LatLng | null;
  onChange: (v: LatLng) => void;
  onAddressResolved?: (a: ResolvedAddress) => void;
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

export function LocationPicker({ value, onChange, onAddressResolved, className }: Props) {
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const center: LatLng = value ?? { lat: 9.082, lng: 8.6753 }; // Nigeria center default

  // Reverse-geocode whenever the pin moves so the user sees the actual place
  // name for the crime scene and the parent form can auto-fill address fields.
  useEffect(() => {
    if (!value) {
      setPlaceName(null);
      return;
    }
    const ctrl = new AbortController();
    setResolving(true);
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${value.lat}&lon=${value.lng}&zoom=18&addressdetails=1`;
    fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Lookup failed"))))
      .then((data: { display_name?: string; address?: Record<string, string> }) => {
        const display = data.display_name ?? null;
        setPlaceName(display);
        if (onAddressResolved) {
          const a = data.address ?? {};
          const streetParts = [
            a.house_number,
            a.road ?? a.pedestrian ?? a.footway,
            a.neighbourhood ?? a.suburb ?? a.village ?? a.town ?? a.city_district,
            a.city ?? a.town ?? a.village,
          ].filter(Boolean);
          onAddressResolved({
            address: streetParts.join(", ") || display || "",
            state: a.state ?? a.region,
            lga: a.county ?? a.city_district ?? a.suburb,
          });
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") setPlaceName(null);
      })
      .finally(() => setResolving(false));
    return () => ctrl.abort();
  }, [value, onAddressResolved]);

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
      {value && (
        <div className="mb-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Crime scene
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            {resolving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-muted-foreground">Resolving place name…</span>
              </>
            ) : placeName ? (
              <span className="text-foreground">{placeName}</span>
            ) : (
              <span className="text-muted-foreground">
                No named place found for this point.
              </span>
            )}
          </div>
        </div>
      )}
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
            >
              {placeName && (
                <Popup>
                  <div className="text-sm max-w-[240px]">{placeName}</div>
                </Popup>
              )}
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}