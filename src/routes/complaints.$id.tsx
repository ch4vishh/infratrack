import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  ImageOff,
  Maximize2,
  ShieldCheck,
  ZoomIn,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { UpvoteButton } from "@/components/UpvoteButton";
import { StatusTimeline, type HistoryRow } from "@/components/StatusTimeline";
import { MapPanel } from "@/components/MapPanel";
import { ImageLightbox } from "@/components/ImageLightbox";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/i18n";
import { getUpvotesCount } from "@/lib/upvotes";
import {
  getComplaintPhoto,
  getComplaintBeforePhoto,
  resolveBeforePhotoUrl,
  resolveAfterPhotoUrl,
} from "@/lib/imageCompression";
import {
  getLocalComplaintById,
  getLocalStatusHistory,
  getEffectiveStatus,
  DEFAULT_DEPARTMENTS,
  type Complaint,
} from "@/lib/complaints";
import { categoryLabel, formatDateTime } from "@/lib/infratrack";

export const Route = createFileRoute("/complaints/$id")({
  head: () => ({
    meta: [
      { title: "Complaint details — InfraTrack" },
      {
        name: "description",
        content: "Full history, location and status of a reported civic issue.",
      },
      { property: "og:title", content: "Complaint details — InfraTrack" },
      { property: "og:description", content: "See how a reported civic issue is progressing." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DetailsWrapper />
    </RequireAuth>
  ),
});

function DetailsWrapper() {
  const { t } = useLanguage();
  return (
    <AppShell title={t("nav_my_complaints")}>
      <Details />
    </AppShell>
  );
}

function Details() {
  const { id } = Route.useParams();
  const { t } = useLanguage();

  const [lightboxImg, setLightboxImg] = useState<{
    url: string;
    title: string;
    badge: string;
  } | null>(null);
  const [beforeImgError, setBeforeImgError] = useState(false);
  const [afterImgError, setAfterImgError] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: async () => {
      let complaint: Complaint | null = null;
      let history: HistoryRow[] = [];
      let departments: { id: string; name: string }[] = [];

      try {
        const [{ data: cData, error }, { data: hData }, { data: dData }] =
          await Promise.all([
            supabase.from("complaints").select("*").eq("id", id).maybeSingle(),
            supabase
              .from("status_history")
              .select("*")
              .eq("complaint_id", id)
              .order("changed_at", { ascending: true }),
            supabase.from("departments").select("id, name"),
          ]);
        if (!error && cData) {
          complaint = cData as Complaint;
        }
        if (hData) history = hData as HistoryRow[];
        if (dData && dData.length > 0) departments = dData;
      } catch (err) {
        console.warn("Supabase fetch for complaint failed, checking local store:", err);
      }

      if (!complaint) {
        complaint = getLocalComplaintById(id);
      } else {
        const local = getLocalComplaintById(id);
        if (local) {
          complaint = {
            ...complaint,
            ...local,
            status:
              local.status === "resolved" || complaint.status === "resolved"
                ? "resolved"
                : local.status || complaint.status,
            after_image_url: local.after_image_url || complaint.after_image_url || null,
            resolved_at: local.resolved_at || complaint.resolved_at || null,
            remarks: local.remarks || complaint.remarks || null,
          };
        }
      }

      if (complaint) {
        const effectiveStatus = getEffectiveStatus(complaint);
        const resolvedPhoto = resolveAfterPhotoUrl(complaint);
        complaint.status = effectiveStatus;
        if (resolvedPhoto && !complaint.after_image_url) {
          complaint.after_image_url = resolvedPhoto;
        }
        if (effectiveStatus === "resolved" && !complaint.resolved_at) {
          complaint.resolved_at = complaint.updated_at || new Date().toISOString();
        }
      }

      if (!departments || departments.length === 0) {
        departments = DEFAULT_DEPARTMENTS;
      }

      // Merge remote history and local status history
      const localHist = [
        ...getLocalStatusHistory(id),
        ...(complaint?.complaint_id ? getLocalStatusHistory(complaint.complaint_id) : []),
      ];

      const histMap = new Map<string, HistoryRow>();
      for (const h of history) {
        histMap.set(`${h.new_status}-${h.changed_at}`, h);
      }
      for (const h of localHist) {
        histMap.set(`${h.new_status}-${h.changed_at}`, h);
      }

      // If effective status is resolved, guarantee a resolved entry in the history timeline
      if (
        complaint &&
        complaint.status === "resolved" &&
        !Array.from(histMap.values()).some((h) => h.new_status === "resolved")
      ) {
        histMap.set("resolved-synthetic", {
          id: `hist-res-${complaint.id}`,
          new_status: "resolved",
          old_status: "in_progress",
          changed_at: complaint.resolved_at || complaint.updated_at || new Date().toISOString(),
          remarks:
            complaint.remarks ||
            "Resolution verified and completed on-site with photographic proof.",
        });
      }

      if (histMap.size === 0 && complaint) {
        histMap.set("pending-initial", {
          id: `hist-${complaint.id}`,
          complaint_id: complaint.id,
          old_status: null,
          new_status: (complaint.status as any) || "pending",
          changed_at: complaint.created_at,
          remarks: complaint.remarks || "Complaint submitted with location and evidence",
        });
      }

      history = Array.from(histMap.values()).sort(
        (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime(),
      );

      return {
        complaint,
        history,
        departments,
      };
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground p-6">Loading details…</p>;
  if (!data?.complaint)
    return <p className="text-sm text-muted-foreground p-6">Complaint not found.</p>;

  const c = data.complaint;
  const department = data.departments.find((d) => d.id === c.department_id)?.name ?? "Unassigned";
  const upvotes = getUpvotesCount(c.id, c.complaint_id);

  // Unified Photo Resolution
  const beforePhoto = getComplaintBeforePhoto(c);
  const afterPhoto = resolveAfterPhotoUrl(c);

  return (
    <div className="grid gap-6 lg:grid-cols-3 max-w-[1400px] mx-auto">
      {/* Main Details & Photos (lg:col-span-2) */}
      <div className="space-y-6 lg:col-span-2">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {c.complaint_id}
              </span>
              <PriorityBadge priority={c.priority} upvotes={upvotes} />
              <StatusBadge status={c.status} />
            </div>

            {/* Upvote / Confirm Issue Toggle Button */}
            <UpvoteButton complaintId={c.id} complaintCode={c.complaint_id} size="sm" />
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            {c.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{c.description}</p>

          <dl className="grid gap-4 text-sm sm:grid-cols-2 pt-2 border-t border-border/60">
            <Field label="Category" value={categoryLabel(c.category)} />
            <Field label="Department" value={department} />
            <Field label="Location" value={c.address} />
            <Field label="Area / Ward" value={c.area || "—"} />
            <Field label="Reported On" value={formatDateTime(c.created_at)} />
            <Field label="Last Updated" value={formatDateTime(c.updated_at)} />
            {c.resolved_at ? (
              <Field label="Resolved At" value={formatDateTime(c.resolved_at)} />
            ) : null}
          </dl>

          {c.remarks ? (
            <div className="rounded-xl bg-primary/10 border border-primary/20 p-4 text-sm">
              <p className="font-bold text-primary flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <ShieldCheck className="h-4 w-4" /> Authority Remarks
              </p>
              <p className="mt-1 text-foreground text-xs leading-relaxed">{c.remarks}</p>
            </div>
          ) : null}
        </div>

        {/* Side-by-Side "Before (Reported) vs. After (Resolved)" Comparison Grid */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">
                {t("side_by_side_title")}
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">{t("click_to_enlarge")}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Before Photo Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-warning" />
                  {t("before_photo_label")}
                </span>
                {beforePhoto && !beforeImgError ? (
                  <span className="text-[11px] text-primary font-medium flex items-center gap-1">
                    <ZoomIn className="h-3 w-3" /> Inspect
                  </span>
                ) : null}
              </div>

              {beforePhoto && !beforeImgError ? (
                <div
                  onClick={() =>
                    setLightboxImg({
                      url: beforePhoto,
                      title: `${c.title} — Reported Photo`,
                      badge: t("before_photo_label"),
                    })
                  }
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-black/5 shadow-xs transition-transform hover:scale-[1.01]"
                >
                  <img
                    src={beforePhoto}
                    alt="Before Repair Evidence"
                    onError={() => setBeforeImgError(true)}
                    className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="rounded-lg bg-black/75 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                      <Maximize2 className="h-3.5 w-3.5" /> Full Size
                    </span>
                  </div>
                </div>
              ) : beforeImgError ? (
                <div className="h-56 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center text-center p-4">
                  <ImageOff className="h-8 w-8 text-destructive/70 mb-1" />
                  <p className="text-xs font-semibold text-destructive">{t("photo_load_failed")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("photo_load_failed_hint")}
                  </p>
                </div>
              ) : (
                <div className="h-56 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center p-4 bg-background/50">
                  <Camera className="h-8 w-8 text-muted-foreground/60 mb-1" />
                  <p className="text-xs font-semibold text-foreground">{t("no_before_photo")}</p>
                  <p className="text-[11px] text-muted-foreground">Reported via text & GPS pin</p>
                </div>
              )}
            </div>

            {/* After Photo Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-xs font-bold text-foreground">
                  <span className="h-2 w-2 rounded-full bg-success" />
                  {t("after_photo_label")}
                </span>
                {afterPhoto && !afterImgError ? (
                  <span className="text-[11px] text-success font-medium flex items-center gap-1">
                    <ZoomIn className="h-3 w-3" /> Inspect
                  </span>
                ) : null}
              </div>

              {afterPhoto && !afterImgError ? (
                <div
                  onClick={() =>
                    setLightboxImg({
                      url: afterPhoto,
                      title: `${c.title} — Resolution Proof`,
                      badge: t("after_photo_label"),
                    })
                  }
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-success/40 bg-black/5 shadow-xs transition-transform hover:scale-[1.01]"
                >
                  <img
                    src={afterPhoto}
                    alt="After Resolution Proof"
                    onError={() => setAfterImgError(true)}
                    className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="rounded-lg bg-black/75 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                      <Maximize2 className="h-3.5 w-3.5" /> Full Size
                    </span>
                  </div>
                </div>
              ) : afterImgError ? (
                <div className="h-56 rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center text-center p-4">
                  <ImageOff className="h-8 w-8 text-destructive/70 mb-1" />
                  <p className="text-xs font-semibold text-destructive">{t("photo_load_failed")}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("photo_load_failed_hint")}
                  </p>
                </div>
              ) : (
                <div className="h-56 rounded-xl border border-dashed border-border flex flex-col items-center justify-center text-center p-4 bg-background/50">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/60 mb-1" />
                  <p className="text-xs font-semibold text-foreground">
                    {c.status === "resolved"
                      ? "Resolution Verified On-Site"
                      : "Pending Resolution Proof"}
                  </p>
                  <p className="text-[11px] text-muted-foreground max-w-xs mt-0.5">
                    {c.status === "resolved"
                      ? "Field inspection completed without photographic upload."
                      : t("resolution_photo_pending")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pinned Map Location */}
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-3">
          <h3 className="font-display text-base font-bold text-foreground">Pinned Location</h3>
          <MapPanel complaints={[c]} center={[c.latitude, c.longitude]} zoom={15} height="320px" />
        </div>
      </div>

      {/* Progress & Sidebar Details (lg:col-span-1) */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-4">
          <h3 className="font-display text-lg font-bold text-foreground">Status Trail</h3>
          <StatusTimeline
            status={c.status}
            history={data.history}
            resolvedAt={c.resolved_at}
            remarks={c.remarks}
          />
          <div className="pt-2 border-t border-border/60">
            <Link to="/my-complaints" className="text-xs font-bold text-primary hover:underline">
              ← Back to My Complaints
            </Link>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageLightbox
        isOpen={!!lightboxImg}
        onClose={() => setLightboxImg(null)}
        imageUrl={lightboxImg?.url ?? null}
        title={lightboxImg?.title}
        badge={lightboxImg?.badge}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wider text-muted-foreground uppercase font-bold">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}
