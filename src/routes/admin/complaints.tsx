import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Eye,
  Flame,
  ImageOff,
  ImagePlus,
  Maximize2,
  ThumbsUp,
  Trash2,
  Upload,
  ZoomIn,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { UpvoteButton } from "@/components/UpvoteButton";
import { ImageLightbox } from "@/components/ImageLightbox";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchComplaints,
  fetchDepartments,
  updateStatus,
  updateLocalComplaint,
  type Complaint,
} from "@/lib/complaints";
import { getUpvotesCount } from "@/lib/upvotes";
import {
  saveComplaintPhoto,
  compressImage,
  uploadComplaintImage,
  getComplaintBeforePhoto,
  resolveBeforePhotoUrl,
  resolveAfterPhotoUrl,
} from "@/lib/imageCompression";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  categoryLabel,
  formatDate,
  type Status,
} from "@/lib/infratrack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/admin/complaints")({
  head: () => ({
    meta: [
      { title: "Manage complaints — InfraTrack" },
      {
        name: "description",
        content: "Assign departments, set priority and update complaint status.",
      },
      { property: "og:title", content: "Manage complaints — InfraTrack" },
      {
        property: "og:description",
        content: "Authority workspace for resolving civic complaints.",
      },
    ],
  }),
  component: () => (
    <RequireAuth admin>
      <AdminComplaintsShell />
    </RequireAuth>
  ),
});

function AdminComplaintsShell() {
  const { t } = useLanguage();
  return (
    <AppShell title={t("nav_manage_complaints")}>
      <ManageComplaints />
    </AppShell>
  );
}

const selectClass =
  "h-10 rounded-md border border-border/80 bg-background px-3 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring";

function ManageComplaints() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data = [], isLoading } = useQuery({
    queryKey: ["complaints", "all"],
    queryFn: () => fetchComplaints(),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [priority, setPriority] = useState("all");
  const [sortBy, setSortBy] = useState<"upvoted" | "newest">("upvoted");
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [inspectingComplaint, setInspectingComplaint] = useState<Complaint | null>(null);
  const [lightboxImg, setLightboxImg] = useState<{
    url: string;
    title: string;
    badge: string;
  } | null>(null);

  const rows = useMemo(() => {
    const filtered = data.filter(
      (c) =>
        (status === "all" || c.status === status) &&
        (category === "all" || c.category === category) &&
        (priority === "all" || c.priority === priority) &&
        (q === "" ||
          `${c.title} ${c.description} ${c.address} ${c.area ?? ""} ${c.complaint_id}`
            .toLowerCase()
            .includes(q.toLowerCase())),
    );

    return filtered.sort((a, b) => {
      const upvotesA = getUpvotesCount(a.id, a.complaint_id);
      const upvotesB = getUpvotesCount(b.id, b.complaint_id);

      if (sortBy === "upvoted") {
        if (upvotesB !== upvotesA) return upvotesB - upvotesA;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [data, q, status, category, priority, sortBy]);

  function refresh() {
    qc.invalidateQueries({ queryKey: ["complaints"] });
  }

  const assignMutation = useMutation({
    mutationFn: async ({
      c,
      field,
      value,
    }: {
      c: Complaint;
      field: "department_id" | "priority";
      value: string;
    }) => {
      const patch =
        field === "department_id"
          ? { department_id: value }
          : { priority: value as "low" | "medium" | "high" };
      updateLocalComplaint(c.id, patch);
      try {
        const { error } = await supabase.from("complaints").update(patch).eq("id", c.id);
        if (error) console.warn("Supabase assign error:", error);
      } catch (err) {
        console.warn("Could not sync assign to Supabase:", err);
      }
      return { c, patch };
    },
    onMutate: async ({ c, field, value }) => {
      await qc.cancelQueries({ queryKey: ["complaints"] });
      const patch =
        field === "department_id"
          ? { department_id: value }
          : { priority: value as "low" | "medium" | "high" };
      updateLocalComplaint(c.id, patch);

      qc.setQueriesData<Complaint[]>({ queryKey: ["complaints"] }, (old) => {
        if (!old) return old;
        return old.map((item) => (item.id === c.id ? { ...item, ...patch } : item));
      });
      toast.success("Complaint updated");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["complaints"] });
    },
  });

  function assign(c: Complaint, field: "department_id" | "priority", value: string) {
    assignMutation.mutate({ c, field, value });
  }

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      {/* Filters & Sorting Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/80 bg-card p-4 shadow-card">
        <Input
          className="max-w-xs"
          placeholder="Search issue, ID, area..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Sort Controls (Most Upvoted vs Newest) */}
        <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-background p-1 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setSortBy("upvoted")}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${sortBy === "upvoted"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            <Flame className="h-3.5 w-3.5" />
            Most Upvoted
          </button>
          <button
            type="button"
            onClick={() => setSortBy("newest")}
            className={`rounded-md px-2.5 py-1.5 transition-colors cursor-pointer ${sortBy === "newest"
              ? "bg-primary text-primary-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Newest First
          </button>
        </div>

        <span className="ml-auto text-xs text-muted-foreground font-medium">
          {rows.length} issue{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Complaints Table */}
      <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs tracking-wide text-muted-foreground uppercase border-b border-border/70">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Confirmations</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reported</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No complaints match these filters.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const upvotes = getUpvotesCount(c.id, c.complaint_id);
                const beforePhoto = getComplaintBeforePhoto(c);

                return (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">
                      {c.complaint_id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Evidence Thumbnail */}
                        {beforePhoto ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxImg({
                                url: beforePhoto,
                                title: `${c.title} — Reported Photo`,
                                badge: t("before_photo_label"),
                              });
                            }}
                            className="relative h-11 w-11 flex-shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-black/5 hover:border-primary transition-colors"
                            title={t("click_to_enlarge")}
                          >
                            <img
                              src={beforePhoto}
                              alt={c.title}
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement).style.display =
                                  "none";
                              }}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="h-3.5 w-3.5 text-white" />
                            </div>
                          </div>
                        ) : null}

                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => setInspectingComplaint(c)}
                            className="text-left font-medium text-foreground hover:text-primary transition-colors line-clamp-1 cursor-pointer block"
                          >
                            {c.title}
                          </button>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {c.area ?? c.address}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{categoryLabel(c.category)}</td>
                    <td className="px-4 py-3">
                      <select
                        className={selectClass + " text-xs py-1 h-8"}
                        value={c.department_id ?? ""}
                        onChange={(e) => assign(c, "department_id", e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={c.priority} upvotes={upvotes} />
                    </td>
                    <td className="px-4 py-3">
                      <UpvoteButton
                        complaintId={c.id}
                        complaintCode={c.complaint_id}
                        size="xs"
                        variant="pill"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(c.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => setInspectingComplaint(c)}
                          title="View full details and photo"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 shadow-2xs font-semibold text-xs"
                          onClick={() => setSelected(c)}
                        >
                          Update
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick Details Drawer / Modal */}
      {inspectingComplaint ? (
        <AdminComplaintDetailModal
          complaint={inspectingComplaint}
          departmentName={
            departments.find((d) => d.id === inspectingComplaint.department_id)?.name ??
            "Unassigned"
          }
          onClose={() => setInspectingComplaint(null)}
          onUpdateStatus={() => {
            setSelected(inspectingComplaint);
            setInspectingComplaint(null);
          }}
          onInspectImage={(url, title, badge) => setLightboxImg({ url, title, badge })}
        />
      ) : null}

      {/* Update Status Dialog */}
      {selected ? (
        <UpdateDialog
          complaint={selected}
          actorId={user?.id ?? ""}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            refresh();
          }}
          onInspectImage={(url, title, badge) => setLightboxImg({ url, title, badge })}
        />
      ) : null}

      {/* Lightbox Modal */}
      {lightboxImg ? (
        <ImageLightbox
          url={lightboxImg.url}
          title={lightboxImg.title}
          badge={lightboxImg.badge}
          onClose={() => setLightboxImg(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * Detailed Inspection Modal for Municipal Authorities
 */
function AdminComplaintDetailModal({
  complaint,
  departmentName,
  onClose,
  onUpdateStatus,
  onInspectImage,
}: {
  complaint: Complaint;
  departmentName: string;
  onClose: () => void;
  onUpdateStatus: () => void;
  onInspectImage: (url: string, title: string, badge: string) => void;
}) {
  const { t } = useLanguage();
  const [beforeImgError, setBeforeImgError] = useState(false);
  const [afterImgError, setAfterImgError] = useState(false);
  const upvotes = getUpvotesCount(complaint.id, complaint.complaint_id);

  const beforePhoto = getComplaintBeforePhoto(complaint);
  const afterPhoto = resolveAfterPhotoUrl(complaint);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="font-mono text-xs font-bold text-muted-foreground">
                {complaint.complaint_id}
              </span>
              <PriorityBadge priority={complaint.priority} upvotes={upvotes} />
              <StatusBadge status={complaint.status} />
            </div>
            <h3 className="font-display text-xl font-bold text-foreground">{complaint.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {complaint.address} {complaint.area ? `· ${complaint.area}` : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            ✕
          </Button>
        </div>

        {/* Citizen "Before" Reported Issue Photo */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              {t("reported_evidence_label")}
            </h4>
            {beforePhoto && !beforeImgError ? (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() =>
                  onInspectImage(
                    beforePhoto,
                    `${complaint.title} — Reported Photo`,
                    t("before_photo_label"),
                  )
                }
                className="h-6 text-xs text-primary gap-1"
              >
                <ZoomIn className="h-3 w-3" /> {t("click_to_enlarge")}
              </Button>
            ) : null}
          </div>

          {beforePhoto && !beforeImgError ? (
            <div
              onClick={() =>
                onInspectImage(
                  beforePhoto,
                  `${complaint.title} — Reported Photo`,
                  t("before_photo_label"),
                )
              }
              className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-black/5 hover:border-primary/50 transition-colors max-h-72 flex items-center justify-center"
            >
              <img
                src={beforePhoto}
                alt={complaint.title}
                onError={() => setBeforeImgError(true)}
                className="max-h-72 w-full object-cover transition-transform duration-300 group-hover:scale-102"
              />
              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="rounded-md bg-black/75 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                  <Maximize2 className="h-3.5 w-3.5" /> {t("click_to_enlarge")}
                </span>
              </div>
            </div>
          ) : beforeImgError ? (
            <div className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center">
              <ImageOff className="h-6 w-6 text-destructive mx-auto mb-1" />
              <p className="text-xs font-semibold text-destructive">{t("photo_load_failed")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("photo_load_failed_hint")}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
              <Camera className="h-6 w-6 text-muted-foreground/60 mx-auto mb-1" />
              <p className="text-xs font-semibold text-foreground">{t("no_before_photo")}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Citizen submitted this report with GPS pin and description.
              </p>
            </div>
          )}
        </div>

        {/* Authority "After" Resolution Photo if present */}
        {afterPhoto ? (
          <div className="space-y-2 border-t border-border/60 pt-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-success flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              {t("after_photo_label")}
            </h4>
            {!afterImgError ? (
              <div
                onClick={() =>
                  onInspectImage(
                    afterPhoto,
                    `${complaint.title} — Resolution Proof`,
                    t("after_photo_label"),
                  )
                }
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-success/40 bg-black/5 hover:border-success transition-colors max-h-60 flex items-center justify-center"
              >
                <img
                  src={afterPhoto}
                  alt="Resolution Proof"
                  onError={() => setAfterImgError(true)}
                  className="max-h-60 w-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="rounded-md bg-black/75 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1.5 shadow-md">
                    <Maximize2 className="h-3.5 w-3.5" /> {t("click_to_enlarge")}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Complaint Info Fields */}
        <div className="space-y-2 border-t border-border/60 pt-3 text-xs">
          <p className="font-semibold text-foreground">Description:</p>
          <p className="text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-lg">
            {complaint.description || "No description provided."}
          </p>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <div>
              <span className="text-muted-foreground">Department: </span>
              <strong className="text-foreground">{departmentName}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Category: </span>
              <strong className="text-foreground">{categoryLabel(complaint.category)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Reported: </span>
              <strong className="text-foreground">{formatDate(complaint.created_at)}</strong>
            </div>
            <div>
              <span className="text-muted-foreground">Confirmations: </span>
              <strong className="text-foreground">{upvotes} citizen confirmations</strong>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-4">
          <Link
            to="/complaints/$id"
            params={{ id: complaint.id }}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Open Public Ticket View →
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground font-semibold shadow-xs"
              onClick={onUpdateStatus}
            >
              Update Status / Resolve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Status Update Dialog with Contextual Citizen Photo Preview
 */
function UpdateDialog({
  complaint,
  actorId,
  onClose,
  onDone,
  onInspectImage,
}: {
  complaint: Complaint;
  actorId: string;
  onClose: () => void;
  onDone: () => void;
  onInspectImage?: (url: string, title: string, badge: string) => void;
}) {
  const { t } = useLanguage();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState<Status>(complaint.status as Status);
  const [remarks, setRemarks] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [beforeImgError, setBeforeImgError] = useState(false);

  const beforePhoto = getComplaintBeforePhoto(complaint);

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP)");
      return;
    }

    try {
      const { dataUrl } = await compressImage(file, 900, 900, 0.72);
      setProofPreview(dataUrl);
      setProofFile(file);
      toast.success("Resolution proof photo prepared.");
    } catch {
      toast.error("Could not compress photo.");
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let afterImageUrl: string | null = null;
      if (status === "resolved" && proofFile) {
        try {
          const comp = await compressImage(proofFile, 900, 900, 0.72);
          afterImageUrl = comp.dataUrl;
          const storageUrl = await uploadComplaintImage(comp.blob, "resolved");
          if (storageUrl) afterImageUrl = storageUrl;
          await saveComplaintPhoto(proofFile, complaint.id, "after");
        } catch (err) {
          console.warn("Could not save proof photo to storage, stored locally", err);
        }
      }

      await updateStatus(
        complaint,
        status,
        remarks,
        actorId,
        afterImageUrl || proofPreview,
        t("lang") as "en" | "hi",
      );

      // Optimistically update query caches
      qc.setQueriesData<Complaint[]>({ queryKey: ["complaints"] }, (old) => {
        if (!old) return old;
        return old.map((item) =>
          item.id === complaint.id
            ? {
                ...item,
                status,
                remarks: remarks || item.remarks,
                after_image_url: afterImageUrl || proofPreview || item.after_image_url,
                resolved_at: status === "resolved" ? new Date().toISOString() : item.resolved_at,
              }
            : item,
        );
      });

      toast.success(`${complaint.complaint_id} updated successfully`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update complaint");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <form
        onSubmit={submit}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">{complaint.title}</h3>
          <p className="text-xs text-muted-foreground font-mono">
            {complaint.complaint_id} · {complaint.address}
          </p>
        </div>

        {/* Citizen "Before" Reported Photo Context for the Authority */}
        {beforePhoto ? (
          <div className="space-y-1.5 rounded-xl border border-border/80 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-primary" />
                {t("reported_evidence_label")}
              </span>
              {!beforeImgError && onInspectImage ? (
                <button
                  type="button"
                  onClick={() =>
                    onInspectImage(
                      beforePhoto,
                      `${complaint.title} — Reported Photo`,
                      t("before_photo_label"),
                    )
                  }
                  className="text-[11px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ZoomIn className="h-3 w-3" /> {t("click_to_enlarge")}
                </button>
              ) : null}
            </div>

            {!beforeImgError ? (
              <div
                onClick={() =>
                  onInspectImage?.(
                    beforePhoto,
                    `${complaint.title} — Reported Photo`,
                    t("before_photo_label"),
                  )
                }
                className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-black/5 max-h-36"
              >
                <img
                  src={beforePhoto}
                  alt="Citizen Reported Issue"
                  onError={() => setBeforeImgError(true)}
                  className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {t("before_photo_label")}
                </span>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-2.5 text-center">
                <ImageOff className="h-4 w-4 text-destructive mx-auto mb-0.5" />
                <p className="text-[11px] font-semibold text-destructive">
                  {t("photo_load_failed")}
                </p>
              </div>
            )}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">New Status</label>
          <select
            className={selectClass + " w-full"}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Authority "After" Resolution Proof Photo */}
        {status === "resolved" ? (
          <div className="space-y-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-primary" />
                {t("resolution_photo_label")}
              </label>
              {proofPreview ? (
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                  }}
                  className="text-destructive h-6 text-[11px]"
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">{t("resolution_photo_hint")}</p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleProofChange}
              accept="image/*"
              className="hidden"
              id="proof-photo-input"
            />

            {proofPreview ? (
              <div className="relative overflow-hidden rounded-xl border border-border shadow-xs mt-2">
                <img
                  src={proofPreview}
                  alt="Resolution Proof Preview"
                  className="max-h-40 w-full object-cover"
                />
                <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
                  {t("after_photo_label")}
                </span>
                <Button
                  type="button"
                  size="xs"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute top-2 right-2 text-xs"
                >
                  Change
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-3.5 border border-dashed border-border rounded-lg bg-card/80 hover:bg-card cursor-pointer transition-colors"
              >
                <ImagePlus className="h-6 w-6 text-primary mb-1" />
                <p className="text-xs font-semibold text-foreground">
                  Attach Resolution Proof Photo
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Enables Before & After comparison for citizens
                </p>
              </div>
            )}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Remarks for Citizen</label>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Work completed on-site. Repaired and inspected."
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="font-semibold shadow-xs">
            {saving ? "Saving…" : "Save Update"}
          </Button>
        </div>
      </form>
    </div>
  );
}
