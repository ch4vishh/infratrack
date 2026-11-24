import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Crosshair, ImagePlus, Trash2, Upload } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { MapPanel } from "@/components/MapPanel";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchDepartments,
  saveLocalComplaint,
  DEFAULT_DEPARTMENTS,
  type Complaint,
} from "@/lib/complaints";
import {
  saveComplaintPhoto,
  compressImage,
  uploadComplaintImage,
  getComplaintBeforePhoto,
} from "@/lib/imageCompression";
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
  const qc = useQueryClient();
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
      const { dataUrl } = await compressImage(file, 900, 900, 0.72);
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

  const submitMutation = useMutation({
    mutationFn: async (vars: {
      optimisticComplaint: Complaint;
      file: File | null;
      externalUrl: string | null;
      rawPreview: string | null;
      depName: string;
    }) => {
      const { optimisticComplaint, file, externalUrl, rawPreview, depName } = vars;
      let storagePublicUrl: string | null = null;
      let compressedDataUrl = rawPreview;

      if (file) {
        try {
          const comp = await compressImage(file, 900, 900, 0.72);
          compressedDataUrl = comp.dataUrl;
          storagePublicUrl = await uploadComplaintImage(comp.blob, "issue");
        } catch (uploadErr) {
          console.warn("Storage upload warning:", uploadErr);
        }
      }

      const finalResolvedUrl = storagePublicUrl || externalUrl || compressedDataUrl || null;
      if (finalResolvedUrl) {
        optimisticComplaint.image_url = finalResolvedUrl;
        saveLocalComplaint(optimisticComplaint);
        try {
          localStorage.setItem(`infratrack_before_photo_${optimisticComplaint.id}`, finalResolvedUrl);
          localStorage.setItem(`infratrack_photo_${optimisticComplaint.id}`, finalResolvedUrl);
          if (optimisticComplaint.complaint_id) {
            localStorage.setItem(
              `infratrack_before_photo_${optimisticComplaint.complaint_id}`,
              finalResolvedUrl,
            );
            localStorage.setItem(
              `infratrack_photo_${optimisticComplaint.complaint_id}`,
              finalResolvedUrl,
            );
          }
        } catch {
          // ignore quota error
        }
      }

      // Prepare insert payload for Supabase
      const insertPayload = {
        user_id: optimisticComplaint.user_id,
        title: optimisticComplaint.title,
        description: optimisticComplaint.description,
        category: optimisticComplaint.category,
        priority: optimisticComplaint.priority,
        status: "pending" as const,
        address: optimisticComplaint.address,
        area: optimisticComplaint.area,
        image_url: finalResolvedUrl,
        latitude: optimisticComplaint.latitude,
        longitude: optimisticComplaint.longitude,
        department_id: optimisticComplaint.department_id,
      };

      try {
        const { data, error } = await supabase
          .from("complaints")
          .insert(insertPayload)
          .select("*")
          .single();

        if (error) {
          console.warn("[Supabase] Insert error, retrying without large data payload if any:", error);
          if (finalResolvedUrl && finalResolvedUrl.startsWith("data:")) {
            try {
              const retryPayload = { ...insertPayload, image_url: null };
              const { data: retryData, error: retryErr } = await supabase
                .from("complaints")
                .insert(retryPayload)
                .select("*")
                .single();
              if (!retryErr && retryData) {
                const real = retryData as Complaint;
                real.image_url = finalResolvedUrl;
                saveLocalComplaint(real);
                return real;
              }
            } catch {
              // fallback below
            }
          }
        } else if (data) {
          const real = data as Complaint;
          if (finalResolvedUrl) {
            real.image_url = finalResolvedUrl;
            try {
              localStorage.setItem(`infratrack_before_photo_${real.id}`, finalResolvedUrl);
              localStorage.setItem(`infratrack_photo_${real.id}`, finalResolvedUrl);
              if (real.complaint_id) {
                localStorage.setItem(`infratrack_before_photo_${real.complaint_id}`, finalResolvedUrl);
                localStorage.setItem(`infratrack_photo_${real.complaint_id}`, finalResolvedUrl);
              }
            } catch {
              // ignore
            }
          }
          saveLocalComplaint(real);

          // Non-blocking status history & notification
          if (real.user_id) {
            supabase
              .from("status_history")
              .insert({
                complaint_id: real.id,
                old_status: null,
                new_status: "pending",
                changed_by: real.user_id,
                remarks: "Complaint submitted with location and evidence",
              })
              .then(() => { });

            supabase
              .from("notifications")
              .insert({
                user_id: real.user_id,
                complaint_id: real.id,
                message: `${real.complaint_id} received and sent to ${depName}.`,
              })
              .then(() => { });
          }

          return real;
        }
      } catch (networkErr) {
        console.warn("Supabase insert network failure details:", networkErr);
      }

      return optimisticComplaint;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["complaints"] });
      const previousComplaints = qc.getQueryData<Complaint[]>(["complaints"]) || [];

      // Optimistically update complaint query caches
      qc.setQueriesData<Complaint[]>({ queryKey: ["complaints"] }, (old) => {
        return old ? [vars.optimisticComplaint, ...old] : [vars.optimisticComplaint];
      });

      // Seed complaint detail cache for 0ms transition
      qc.setQueryData(["complaint", vars.optimisticComplaint.id], {
        complaint: vars.optimisticComplaint,
        history: [
          {
            id: `hist-${vars.optimisticComplaint.id}`,
            complaint_id: vars.optimisticComplaint.id,
            old_status: null,
            new_status: "pending",
            changed_at: vars.optimisticComplaint.created_at,
            remarks: "Complaint submitted with location and evidence",
          },
        ],
        departments: departments.length ? departments : DEFAULT_DEPARTMENTS,
      });

      return { previousComplaints };
    },
    onSuccess: (realComplaint, vars) => {
      if (realComplaint && realComplaint.id !== vars.optimisticComplaint.id) {
        qc.setQueriesData<Complaint[]>({ queryKey: ["complaints"] }, (old) => {
          if (!old) return [realComplaint];
          return old.map((c) => (c.id === vars.optimisticComplaint.id ? realComplaint : c));
        });
        qc.setQueryData(["complaint", realComplaint.id], {
          complaint: realComplaint,
          history: [
            {
              id: `hist-${realComplaint.id}`,
              complaint_id: realComplaint.id,
              old_status: null,
              new_status: "pending",
              changed_at: realComplaint.created_at,
              remarks: "Complaint submitted with location and evidence",
            },
          ],
          departments: departments.length ? departments : DEFAULT_DEPARTMENTS,
        });
      }
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!picked) {
      toast.error(
        t("lang") === "hi"
          ? "कृपया पहले मानचित्र पर स्थान चुनें।"
          : "Mark the location on the map first.",
      );
      return;
    }

    const effectiveUserId = user?.id ?? null;
    const formattedAddress =
      address.trim() || `${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}`;

    const validExternalUrl =
      imageUrl.trim().startsWith("http://") || imageUrl.trim().startsWith("https://")
        ? imageUrl.trim()
        : null;

    const initialPhoto = validExternalUrl || photoPreview || null;
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const localId = `local-${Date.now()}-${randomSuffix}`;
    const humanComplaintId = `INF-${Date.now().toString().slice(-6)}`;

    // Build optimistic complaint object
    const optimisticComplaint: Complaint = {
      id: localId,
      complaint_id: humanComplaintId,
      user_id: effectiveUserId,
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      status: "pending",
      department_id: department?.id ?? null,
      latitude: picked.lat,
      longitude: picked.lng,
      address: formattedAddress,
      area: area.trim() || null,
      image_url: initialPhoto,
      remarks: null,
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      resolved_at: null,
    };

    // 1. Immediately persist to shared local store for 0ms delay
    saveLocalComplaint(optimisticComplaint);

    // 2. Cache initial photo under both id and complaint_id
    if (initialPhoto) {
      try {
        localStorage.setItem(`infratrack_before_photo_${localId}`, initialPhoto);
        localStorage.setItem(`infratrack_photo_${localId}`, initialPhoto);
        localStorage.setItem(`infratrack_before_photo_${humanComplaintId}`, initialPhoto);
        localStorage.setItem(`infratrack_photo_${humanComplaintId}`, initialPhoto);
      } catch {
        // ignore
      }
    }

    // 3. Trigger optimistic mutation in background
    submitMutation.mutate({
      optimisticComplaint,
      file: selectedFile,
      externalUrl: validExternalUrl,
      rawPreview: photoPreview,
      depName: departmentName,
    });

    // 4. Instant UI Feedback (0ms perceived latency)
    toast.success(
      t("lang") === "hi"
        ? `शिकायत ${humanComplaintId} सफलतापूर्वक दर्ज की गई!`
        : `Complaint ${humanComplaintId} submitted successfully.`,
    );

    // 5. Navigate immediately
    navigate({ to: "/complaints/$id", params: { id: localId } });
  }

  const selectClass =
    "h-10 w-full rounded-md border border-border/80 bg-background px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring";

  return (
  <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2 max-w-[1400px] mx-auto">
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-card">
      <div className="space-y-1.5">
        <Label htmlFor="title" className="font-semibold text-xs">
          {t("report_title_label")}
        </Label>
        <Input
          id="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("report_title_placeholder")}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="desc" className="font-semibold text-xs">
          {t("report_desc_label")}
        </Label>
        <Textarea
          id="desc"
          required
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("report_desc_placeholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cat" className="font-semibold text-xs">
            {t("report_category_label")}
          </Label>
          <select
            id="cat"
            className={selectClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {t(`cat_${c.value}`, c.label)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="prio" className="font-semibold text-xs">
            {t("report_priority_label")}
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
                {t(`prio_${p.value}`, p.label)}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            {t("report_suggested")}: {t(`prio_${suggested}`, suggested)}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-primary/10 border border-primary/20 p-3 text-xs text-foreground">
        {t("report_autodispatch")}:{" "}
        <strong className="text-primary font-bold">{departmentName}</strong>
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
              <Trash2 className="h-3 w-3 mr-1" /> {t("remove_photo")}
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
              {t("report_change_photo")}
            </Button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 border border-dashed border-border rounded-lg bg-card/60 hover:bg-card cursor-pointer transition-colors"
          >
            <ImagePlus className="h-7 w-7 text-primary/70 mb-1" />
            <p className="text-xs font-semibold text-foreground">
              {t("report_upload_click")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {t("report_upload_types")}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="addr" className="font-semibold text-xs">
          {t("report_address_label")}
        </Label>
        <Input
          id="addr"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder={t("report_address_placeholder")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="area" className="font-semibold text-xs">
            {t("report_area_label")}
          </Label>
          <Input
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder={t("report_area_placeholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="img" className="font-semibold text-xs">
            {t("report_photo_url_label")}
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
        disabled={submitMutation.isPending || compressing}
      >
        {submitMutation.isPending ? t("report_submitting_btn") : t("report_submit_btn")}
      </Button>
    </div>

    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground font-medium">
          {t("report_map_hint")}
          {picked ? ` (${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)})` : ""}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ml-auto shadow-2xs font-medium"
          onClick={useMyLocation}
        >
          <Crosshair className="mr-1.5 h-4 w-4 text-primary" /> {t("report_use_location")}
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
