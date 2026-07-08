import L from "leaflet";

// Fix default marker icon paths under bundlers.
const iconRetinaUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png";
const iconUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png";
const shadowUrl = "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl, iconUrl, shadowUrl });

export const redIcon = new L.Icon({
  iconUrl:
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 44' width='32' height='44'>
        <path fill='#E63946' stroke='#0B1D3A' stroke-width='2' d='M16 2C8.3 2 2 8.3 2 16c0 10.5 14 26 14 26s14-15.5 14-26c0-7.7-6.3-14-14-14z'/>
        <circle cx='16' cy='16' r='6' fill='#fff'/>
      </svg>`,
    ),
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -40],
});