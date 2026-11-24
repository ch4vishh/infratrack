import { useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMapEvents } from "react-leaflet";
import { Link } from "@tanstack/react-router";
import { categoryLabel, formatDate, priorityLabel, statusLabel } from "@/lib/infratrack";
import { UpvoteButton } from "@/components/UpvoteButton";
import { getUpvotesCount } from "@/lib/upvotes";
import { getComplaintBeforePhoto } from "@/lib/imageCompression";
import { getEffectiveStatus } from "@/lib/complaints";

export type MapComplaint = {
  id: string;
  complaint_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
  image_url?: string | null;
};

const priorityColor: Record<string, string> = {
  high: "#c2410c",
  medium: "#1d4ed8",
  low: "#0f766e",
};

function pinIcon(priority: string, isVerified = false) {
  const color = isVerified ? "#dc2626" : (priorityColor[priority] ?? priorityColor["low"]);
  const pulseClass = isVerified ? "outline: 3px solid rgba(220, 38, 38, 0.4);" : "";

  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${isVerified ? 18 : 16}px;height:${isVerified ? 18 : 16}px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 5px rgba(0,0,0,.4);${pulseClass}"></span>`,
    iconSize: [isVerified ? 18 : 16, isVerified ? 18 : 16],
    iconAnchor: [8, 8],
  });
}

function ClickPicker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function ComplaintMap({
  complaints = [],
  center = [20.5937, 78.9629],
  zoom = 5,
  height = "70vh",
  onPick,
  picked,
  density = false,
}: {
  complaints?: MapComplaint[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onPick?: (lat: number, lng: number) => void;
  picked?: { lat: number; lng: number } | null;
  density?: boolean;
}) {
  // Density = count of complaints within ~0.3 degrees, used to size the circle.
  const densityPoints = useMemo(() => {
    return complaints.map((c) => {
      const near = complaints.filter(
        (o) => Math.abs(o.latitude - c.latitude) < 0.3 && Math.abs(o.longitude - c.longitude) < 0.3,
      ).length;
      return { ...c, near };
    });
  }, [complaints]);

  return (
    <div
      className="overflow-hidden rounded-xl border border-border/80 shadow-card"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {onPick ? <ClickPicker onPick={onPick} /> : null}
        {picked ? <Marker position={[picked.lat, picked.lng]} icon={pinIcon("high")} /> : null}

        {density
          ? densityPoints.map((c) => (
            <CircleMarker
              key={c.id}
              center={[c.latitude, c.longitude]}
              radius={8 + c.near * 4}
              pathOptions={{
                color: "transparent",
                fillColor: c.near > 2 ? "#b91c1c" : c.near > 1 ? "#ea580c" : "#f59e0b",
                fillOpacity: 0.35,
              }}
            />
          ))
          : null}

        {complaints.map((c) => {
          const upvotes = getUpvotesCount(c.id, c.complaint_id);
          const isVerified = upvotes >= 5;
          const photoUrl = getComplaintBeforePhoto(c);

          return (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={pinIcon(c.priority, isVerified)}
            >
              <Popup>
                <div className="space-y-2 p-1 text-xs min-w-[210px]">
                  <div className="flex items-center justify-between border-b pb-1">
                    <span className="font-mono font-bold text-foreground">{c.complaint_id}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {statusLabel(getEffectiveStatus(c))}
                    </span>
                  </div>

                  {photoUrl ? (
                    <div className="relative h-24 w-full overflow-hidden rounded-md border border-border bg-black/5">
                      <img
                        src={photoUrl}
                        alt={c.title}
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <p className="font-bold text-sm text-foreground leading-tight">{c.title}</p>
                  <p className="text-muted-foreground line-clamp-2">{c.description}</p>

                  <div className="text-[11px] space-y-0.5 text-muted-foreground">
                    <p>
                      <strong>Category:</strong> {categoryLabel(c.category)}
                    </p>
                    <p>
                      <strong>Location:</strong> {c.address}
                    </p>
                    <p>
                      <strong>Reported:</strong> {formatDate(c.created_at)}
                    </p>
                  </div>

                  {/* Community Upvote Button inside Map Popup */}
                  <div className="pt-2 border-t flex items-center justify-between gap-2">
                    <UpvoteButton complaintId={c.id} complaintCode={c.complaint_id} size="xs" />
                    <Link
                      to="/complaints/$id"
                      params={{ id: c.id }}
                      className="text-primary font-bold text-xs hover:underline"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
