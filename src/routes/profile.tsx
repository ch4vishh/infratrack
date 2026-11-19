import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Bell,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { fetchComplaints } from "@/lib/complaints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/infratrack";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Your Profile & Settings — InfraTrack" },
      {
        name: "description",
        content:
          "Manage your InfraTrack profile, photo, authority access, and notification preferences.",
      },
      { property: "og:title", content: "Your Profile — InfraTrack" },
      { property: "og:description", content: "Manage your InfraTrack account details." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <ProfileRouteShell />
    </RequireAuth>
  ),
});

function ProfileRouteShell() {
  const { t } = useLanguage();
  return (
    <AppShell title={t("profile_title")}>
      <ProfilePage />
    </AppShell>
  );
}

function getInitials(name?: string | null) {
  if (!name) return "IT";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function ProfilePage() {
  const { profile, user, avatarUrl, updateAvatar, isAdmin, refresh } = useAuth();
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Notification preferences state (persisted to localStorage)
  const [notifyStatus, setNotifyStatus] = useState(true);
  const [notifyNearby, setNotifyNearby] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(false);

  const { data: userComplaints = [] } = useQuery({
    queryKey: ["complaints", "profile", user?.id],
    queryFn: () => fetchComplaints({ userId: user?.id }),
    enabled: !!user?.id,
  });

  const totalComplaints = userComplaints.length;
  const resolvedCount = userComplaints.filter((c) => c.status === "resolved").length;
  const inQueueCount = totalComplaints - resolvedCount;

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setPreviewAvatar(avatarUrl);
  }, [profile, avatarUrl]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("infratrack_notify_prefs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.status === "boolean") setNotifyStatus(parsed.status);
        if (typeof parsed.nearby === "boolean") setNotifyNearby(parsed.nearby);
        if (typeof parsed.email === "boolean") setNotifyEmail(parsed.email);
      }
    } catch {
      // ignore
    }
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreviewAvatar(dataUrl);
      setUploadingAvatar(true);
      try {
        await updateAvatar(dataUrl);
        toast.success("Profile photo updated successfully!");
      } catch (err: unknown) {
        toast.error("Could not save photo: " + (err instanceof Error ? err.message : "Error"));
      } finally {
        setUploadingAvatar(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    setPreviewAvatar(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await updateAvatar(null);
    toast.success("Profile photo removed.");
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("saved_prefs", "Profile updated"));
      await refresh();
    }
  };

  const saveNotifyPrefs = (status: boolean, nearby: boolean, email: boolean) => {
    setNotifyStatus(status);
    setNotifyNearby(nearby);
    setNotifyEmail(email);
    try {
      localStorage.setItem("infratrack_notify_prefs", JSON.stringify({ status, nearby, email }));
      toast.success(t("saved_prefs"));
    } catch {
      // ignore
    }
  };

  const claimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const { data, error } = await supabase.rpc("claim_admin_role", { _code: code.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data) {
      toast.error("Invalid access code.");
      return;
    }
    setCode("");
    await refresh();
    toast.success("Authority privileges unlocked! Admin menu is now active.");
  };

  return (
    <div className="w-full max-w-[1380px] mx-auto space-y-6">
      {/* Top Profile Hero Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card backdrop-blur-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-md ring-4 ring-primary/5 shrink-0">
              {previewAvatar ? (
                <AvatarImage
                  src={previewAvatar}
                  alt={profile?.full_name || "Profile"}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                {getInitials(profile?.full_name || user?.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {profile?.full_name || (isAdmin ? t("role_authority") : t("role_citizen"))}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {isAdmin ? (
                    <ShieldAlert className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                  {isAdmin ? t("role_authority") : t("role_citizen")}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile?.email || user?.email}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1">
                {t("member_since")} {formatDate(profile?.created_at || user?.created_at)}
              </p>
            </div>
          </div>

          {/* Quick Metrics in Hero */}
          <div className="flex items-center gap-3 sm:gap-6 border-t sm:border-t-0 sm:border-l border-border/80 pt-4 sm:pt-0 sm:pl-6 w-full sm:w-auto justify-around sm:justify-start">
            <div className="text-center">
              <p className="font-display text-xl sm:text-2xl font-bold text-foreground">
                {totalComplaints}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {t("stat_total_complaints")}
              </p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl sm:text-2xl font-bold text-success">
                {resolvedCount}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {t("stat_resolved")}
              </p>
            </div>
            <div className="text-center">
              <p className="font-display text-xl sm:text-2xl font-bold text-warning">
                {inQueueCount}
              </p>
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                {t("stat_in_queue")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column (Photo & Role) + Right Column (Details & Notifications) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Profile Photo Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">
                {t("profile_photo_title")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("profile_photo_desc")}
            </p>

            <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-border/80 bg-background/50 space-y-3">
              <Avatar className="h-28 w-28 border-2 border-primary/25 shadow-md ring-4 ring-primary/5">
                {previewAvatar ? (
                  <AvatarImage src={previewAvatar} alt="Avatar Preview" className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                  {getInitials(profile?.full_name || user?.email)}
                </AvatarFallback>
              </Avatar>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  id="avatar-file-input"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shadow-2xs"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                >
                  <Upload className="h-3.5 w-3.5" />
                  {previewAvatar ? t("change_photo") : t("upload_photo")}
                </Button>
                {previewAvatar ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    onClick={handleRemovePhoto}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("remove_photo")}
                  </Button>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground text-center">
                {t("photo_requirements")}
              </p>
            </div>
          </div>

          {/* Role & Access Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">
                {t("access_level_title")}
              </h3>
            </div>

            <div className="p-3.5 rounded-xl border border-border/80 bg-background/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("signed_in_as")}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {isAdmin ? t("role_authority") : t("role_citizen")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isAdmin ? t("authority_privileges") : t("citizen_privileges")}
              </p>
            </div>

            {!isAdmin ? (
              <form onSubmit={claimAdmin} className="space-y-3 pt-2">
                <Label htmlFor="code" className="text-xs font-semibold">
                  {t("authority_code_label")}
                </Label>
                <div className="space-y-2">
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder={t("authority_code_placeholder")}
                    className="font-mono text-xs"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    className="w-full gap-1.5 shadow-2xs text-xs font-semibold"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    {t("unlock_authority_btn")}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("demo_code_hint")}:{" "}
                  <span className="font-mono font-bold text-foreground">INFRA-ADMIN-2026</span>
                </p>
              </form>
            ) : null}
          </div>
        </div>

        {/* Right Column (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Personal Details Form */}
          <form
            onSubmit={saveProfile}
            className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-5"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-display text-lg font-bold text-foreground">
                {t("account_details_title")}
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-xs font-semibold">
                  {t("full_name_label")}
                </Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  {t("email_label")}
                </Label>
                <Input
                  id="email"
                  value={profile?.email ?? user?.email ?? ""}
                  disabled
                  className="bg-muted/40 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  {t("phone_label")}
                </Label>
                <Input
                  id="phone"
                  value={phone}
                  placeholder="+91 98765 43210"
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-border/60">
              <p className="text-xs text-muted-foreground">
                {t("member_since")} {formatDate(profile?.created_at || user?.created_at)}
              </p>
              <Button type="submit" disabled={saving} className="font-semibold shadow-xs">
                {saving ? t("saving") : t("save_changes")}
              </Button>
            </div>
          </form>

          {/* Notification Preferences Card */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-5">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">
                  {t("notifications_title")}
                </h3>
                <p className="text-xs text-muted-foreground">{t("notifications_desc")}</p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {/* Option 1: Status Change */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-background/50">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-foreground">{t("notify_status")}</p>
                  <p className="text-xs text-muted-foreground">{t("notify_status_sub")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyStatus}
                  onChange={(e) => saveNotifyPrefs(e.target.checked, notifyNearby, notifyEmail)}
                  className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                  aria-label={t("notify_status")}
                />
              </div>

              {/* Option 2: Nearby Alerts */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-background/50">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-foreground">{t("notify_nearby")}</p>
                  <p className="text-xs text-muted-foreground">{t("notify_nearby_sub")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyNearby}
                  onChange={(e) => saveNotifyPrefs(notifyStatus, e.target.checked, notifyEmail)}
                  className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                  aria-label={t("notify_nearby")}
                />
              </div>

              {/* Option 3: Weekly Digest */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-background/50">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-foreground">{t("notify_email")}</p>
                  <p className="text-xs text-muted-foreground">{t("notify_email_sub")}</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => saveNotifyPrefs(notifyStatus, notifyNearby, e.target.checked)}
                  className="h-4 w-4 rounded-sm border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                  aria-label={t("notify_email")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
