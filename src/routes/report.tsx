import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Crosshair, ImagePlus, Trash2, Upload } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MapPanel } from "@/components/MapPanel";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { fetchDepartments } from "@/lib/complaints";
import { saveComplaintPhoto, compressImage } from "@/lib/imageCompression";
import {
  CATEGORIES,
  DEPARTMENT_FOR_CATEGORY,
  PRIORITIES,
  suggestPriority,
  type Category,
  type Priority,
} from "@/lib/infratrack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an issue — InfraTrack" },
      {
        name: "description",
        content:
          "Report a pothole, streetlight, drain, garbage or water issue with an exact location.",
      },
      { property: "og:title", content: "Report an issue — InfraTrack" },
      {
        property: "og:description",
        content: "Send a civic issue straight to the right department.",
      },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ReportRouteShell />
    </RequireAuth>
  ),
});

function ReportRouteShell() {
  const { t } = useLanguage();
  return (
    <AppShell title={t("nav_report")}>
      <ReportForm />
    </AppShell>
  );
}

function ReportForm() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("road_pothole");
  const [priority, setPriority] = useState<Priority>("medium");
  const [touchedPriority, setTouchedPriority] = useState(false);
  const [address, setAddress] = useState("");
  const [area, setArea] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);

  // Photo upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const suggested = useMemo(
    () => suggestPriority(category, `${title} ${description}`),
    [category, title, description],
  );
  useEffect(() => {
    if (!touchedPriority) setPriority(suggested);
  }, [suggested, touchedPriority]);

  const departmentName = DEPARTMENT_FOR_CATEGORY[category];
  const department = departments.find((d) => d.name === departmentName);

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location is not available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setPicked({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => toast.error("Could not read your location. Tap the map instead."),
    );
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    setCompressing(true);
    try {
      const { dataUrl } = await compressImage(file);
      setPhotoPreview(dataUrl);
      setSelectedFile(file);
      toast.success("Image attached and optimized.");
    } catch {
      toast.error("Could not process photo.");
    } finally {
      setCompressing(false);
    }
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      toast.error("Mark the location on the map first.");
      return;
    }
    setBusy(true);

    const { data, error } = await supabase
      .from("complaints")
      .insert({
        user_id: user!.id,
        title,
        description,
        category,
        priority,
        address,
        area: area || null,
        image_url: imageUrl || (photoPreview ? photoPreview.slice(0, 500) : null),
        latitude: picked.lat,
        longitude: picked.lng,
        department_id: department?.id ?? null,
      })
      .select("id, complaint_id")
      .single();

    if (error || !data) {
      setBusy(false);
      toast.error(error?.message ?? "Could not submit the complaint.");
      return;
    }

    // Persist compressed issue photo if selected
    if (selectedFile) {
      try {
        const savedUrl = await saveComplaintPhoto(selectedFile, data.id, "before");
        // Try updating complaint record with real saved URL
        await supabase.from("complaints").update({ image_url: savedUrl }).eq("id", data.id);
      } catch (photoErr) {
        console.warn("Photo upload fallback stored in localStorage", photoErr);
      }
    } else if (photoPreview) {
      try {
        localStorage.setItem(`infratrack_before_photo_${data.id}`, photoPreview);
      } catch {
        // ignore
      }
    }

    await supabase.from("status_history").insert({
      complaint_id: data.id,
      old_status: null,
      new_status: "pending",
      changed_by: user!.id,
      remarks: "Complaint submitted with location and evidence",
    });

    await supabase.from("notifications").insert({
      user_id: user!.id,
      complaint_id: data.id,
      message: `${data.complaint_id} received and sent to ${departmentName}.`,
    });

    setBusy(false);
    toast.success(`Complaint ${data.complaint_id} submitted.`);
    navigate({ to: "/complaints/$id", params: { id: data.id } });
  }

  const selectClass =
    "h-10 w-full rounded-md border border-border/80 bg-background px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2 max-w-[1400px] mx-auto">
      <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-card">
        <div className="space-y-1.5">
          <Label htmlFor="title" className="font-semibold text-xs">
            Title
          </Label>
          <Input
            id="title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Broken streetlight causing dark intersection"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc" className="font-semibold text-xs">
            Description
          </Label>
          <Textarea
            id="desc"
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is wrong, how big is it, is anyone at risk?"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat" className="font-semibold text-xs">
              Category
            </Label>
            <select
              id="cat"
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prio" className="font-semibold text-xs">
              Priority
            </Label>
            <select
              id="prio"
              className={selectClass}
              value={priority}
              onChange={(e) => {
                setTouchedPriority(true);
                setPriority(e.target.value as Priority);
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-muted-foreground">Suggested: {suggested}</p>
          </div>
        </div>

        <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-foreground">
          Auto-dispatches to: <strong className="text-primary font-bold">{departmentName}</strong>
        </div>

        {/* Citizen "Before" Issue Photo Upload */}
        <div className="space-y-2 rounded-xl border border-dashed border-border/90 bg-background/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              <Label className="font-semibold text-xs cursor-pointer">
                {t("attach_photo_label")}
              </Label>
            </div>
            {photoPreview ? (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={removePhoto}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-7"
              >
                <Trash2 className="h-3 w-3 mr-1" /> Remove
              </Button>
            ) : null}
          </div>

          <p className="text-[11px] text-muted-foreground">{t("attach_photo_hint")}</p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoChange}
            accept="image/*"
            className="hidden"
            id="issue-photo-input"
          />

          {photoPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-border shadow-xs mt-2">
              <img
                src={photoPreview}
                alt="Before repair preview"
                className="max-h-48 w-full object-cover"
              />
              <div className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                {t("before_photo_label")}
              </div>
              <Button
                type="button"
                size="xs"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-2 right-2 shadow-xs text-xs"
              >
                Change Photo
              </Button>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-lg bg-card/60 hover:bg-card cursor-pointer transition-colors"
            >
              <ImagePlus className="h-7 w-7 text-primary/70 mb-1" />
              <p className="text-xs font-semibold text-foreground">
                Click to upload photo evidence
              </p>
              <p className="text-[10px] text-muted-foreground">JPEG, PNG, WebP (auto-compressed)</p>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="addr" className="font-semibold text-xs">
            Address / Landmark
          </Label>
          <Input
            id="addr"
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 100 Feet Road, near Metro Pillar 42"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="area" className="font-semibold text-xs">
              Area / Ward (optional)
            </Label>
            <Input
              id="area"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="e.g. Ward 12 - Indiranagar"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="img" className="font-semibold text-xs">
              Photo URL (alternative)
            </Label>
            <Input
              id="img"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>

        <Button
          type="submit"
          className="w-full font-semibold shadow-xs"
          disabled={busy || compressing}
        >
          {busy ? "Submitting…" : "Submit Complaint"}
        </Button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground font-medium">
            Tap the map to mark the exact spot.
            {picked ? ` (${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)})` : ""}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ml-auto shadow-2xs font-medium"
            onClick={useMyLocation}
          >
            <Crosshair className="mr-1.5 h-4 w-4 text-primary" /> Use my location
          </Button>
        </div>
        <MapPanel
          height="540px"
          center={picked ? [picked.lat, picked.lng] : [20.5937, 78.9629]}
          zoom={picked ? 14 : 5}
          picked={picked}
          onPick={(lat, lng) => setPicked({ lat, lng })}
        />
      </div>
    </form>
  );
}
