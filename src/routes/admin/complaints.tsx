import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, CheckCircle2, Flame, ImagePlus, ThumbsUp, Trash2, Upload } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { UpvoteButton } from "@/components/UpvoteButton";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { fetchComplaints, fetchDepartments, updateStatus, type Complaint } from "@/lib/complaints";
import { getUpvotesCount } from "@/lib/upvotes";
import { saveComplaintPhoto, compressImage } from "@/lib/imageCompression";
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
import { cn } from "@/lib/utils";

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

  async function assign(c: Complaint, field: "department_id" | "priority", value: string) {
    const patch =
      field === "department_id"
        ? { department_id: value }
        : { priority: value as "low" | "medium" | "high" };
    const { error } = await supabase.from("complaints").update(patch).eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
    toast.success("Complaint updated");
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

        {/* Upvotes / Newest Sort Toggle */}
        <div className="inline-flex rounded-lg border border-border bg-background/80 p-0.5 text-xs font-semibold shadow-2xs">
          <button
            type="button"
            onClick={() => setSortBy("upvoted")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1",
              sortBy === "upvoted"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Flame className="h-3 w-3 text-destructive" />
            {t("sort_upvoted")}
          </button>
          <button
            type="button"
            onClick={() => setSortBy("newest")}
            className={cn(
              "px-3 py-1.5 rounded-md transition-all flex items-center gap-1",
              sortBy === "newest"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t("sort_newest")}
          </button>
        </div>

        <span className="ml-auto self-center text-xs font-medium text-muted-foreground">
          {rows.length} complaint{rows.length === 1 ? "" : "s"}
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
                return (
                  <tr key={c.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-foreground">
                      {c.complaint_id}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to="/complaints/$id"
                        params={{ id: c.id }}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
                      >
                        {c.title}
                      </Link>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {c.area ?? c.address}
                      </p>
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="shadow-2xs font-semibold text-xs"
                        onClick={() => setSelected(c)}
                      >
                        Update
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected ? (
        <UpdateDialog
          complaint={selected}
          actorId={user?.id ?? ""}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function UpdateDialog({
  complaint,
  actorId,
  onClose,
  onDone,
}: {
  complaint: Complaint;
  actorId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [status, setStatus] = useState<Status>(complaint.status as Status);
  const [remarks, setRemarks] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG, WebP)");
      return;
    }

    try {
      const { dataUrl } = await compressImage(file);
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
      // If marking resolved and authority attached proof photo
      if (status === "resolved" && proofFile) {
        try {
          await saveComplaintPhoto(proofFile, complaint.id, "after");
        } catch (err) {
          console.warn("Could not save proof photo to storage, stored locally", err);
        }
      }

      await updateStatus(complaint, status, remarks, actorId);
      toast.success(`${complaint.complaint_id} updated successfully`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update complaint");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
      <form
        onSubmit={submit}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-2xl"
      >
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">{complaint.title}</h3>
          <p className="text-xs text-muted-foreground font-mono">
            {complaint.complaint_id} · {complaint.address}
          </p>
        </div>

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
