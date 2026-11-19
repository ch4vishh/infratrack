import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, FileText, Loader2, PlusCircle } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { UpvoteButton } from "@/components/UpvoteButton";
import { MapPanel } from "@/components/MapPanel";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/lib/i18n";
import { fetchComplaints } from "@/lib/complaints";
import { getUpvotesCount } from "@/lib/upvotes";
import { categoryLabel, formatDate } from "@/lib/infratrack";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — InfraTrack" },
      { name: "description", content: "Your reported civic issues and their current status." },
      { property: "og:title", content: "Your dashboard — InfraTrack" },
      { property: "og:description", content: "Track the civic issues you reported." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <DashboardWrapper />
    </RequireAuth>
  ),
});

function DashboardWrapper() {
  const { t } = useLanguage();
  return (
    <AppShell title={t("nav_dashboard")}>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { data: mine = [], isLoading } = useQuery({
    queryKey: ["complaints", "mine", user?.id],
    queryFn: () => fetchComplaints({ userId: user!.id }),
    enabled: !!user,
  });

  const count = (s: string) => mine.filter((c) => c.status === s).length;
  const recent = mine.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {t("nav_dashboard")}, {profile?.full_name || t("role_citizen")}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl leading-relaxed">
          {t("hero_subtitle")}
        </p>
        <Link to="/report">
          <Button className="mt-4 gap-2 font-medium shadow-xs">
            <PlusCircle className="h-4 w-4" />
            {t("hero_btn_report")}
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("stat_total_complaints")} value={mine.length} icon={FileText} />
        <StatCard label={t("status_pending")} value={count("pending")} icon={Clock} tone="accent" />
        <StatCard
          label={t("status_in_progress")}
          value={count("assigned") + count("in_progress")}
          icon={Loader2}
          tone="info"
        />
        <StatCard
          label={t("status_resolved")}
          value={count("resolved")}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      <div className="rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 px-6 py-4">
          <h3 className="font-display text-base font-bold text-foreground">
            {t("live_activity_title")}
          </h3>
          <Link to="/my-complaints" className="text-xs font-semibold text-primary hover:underline">
            {t("view_all_map")}
          </Link>
        </div>
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">{t("saving")}…</p>
        ) : recent.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">{t("no_complaints")}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {recent.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 px-6 py-3.5 hover:bg-background/40 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    to="/complaints/$id"
                    params={{ id: c.id }}
                    className="font-medium text-foreground hover:text-primary transition-colors"
                  >
                    {c.title}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.complaint_id} · {categoryLabel(c.category)} · {formatDate(c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge
                    priority={c.priority}
                    upvotes={getUpvotesCount(c.id, c.complaint_id)}
                  />
                  <StatusBadge status={c.status} />
                  <UpvoteButton complaintId={c.id} complaintCode={c.complaint_id} size="xs" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mine.length > 0 ? (
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-4">
          <h3 className="font-display text-base font-bold text-foreground">
            {t("feat_pinpoint_title")}
          </h3>
          <MapPanel complaints={mine} height="420px" />
        </div>
      ) : null}
    </div>
  );
}
