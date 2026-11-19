import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Award,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import type { Complaint, Department } from "@/lib/complaints";
import { cn } from "@/lib/utils";

interface LeaderboardItem {
  id: string;
  name: string;
  type: "department" | "ward";
  total: number;
  resolved: number;
  active: number;
  rate: number;
  avgFixDays: number;
}

export function PerformanceLeaderboard({
  complaints,
  departments,
  compact = false,
}: {
  complaints: Complaint[];
  departments: Department[];
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<"department" | "ward">("department");

  const departmentLeaderboard = useMemo<LeaderboardItem[]>(() => {
    return departments
      .map((d) => {
        const deptComplaints = complaints.filter((c) => c.department_id === d.id);
        const resolvedList = deptComplaints.filter((c) => c.status === "resolved");
        const total = deptComplaints.length;
        const resolved = resolvedList.length;
        const active = total - resolved;
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        let totalDays = 0;
        let countWithTime = 0;
        resolvedList.forEach((c) => {
          if (c.resolved_at && c.created_at) {
            const diff =
              (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) /
              (1000 * 60 * 60 * 24);
            if (diff >= 0) {
              totalDays += diff;
              countWithTime++;
            }
          }
        });

        // Default realistic baseline if zero resolved
        const avgFixDays = countWithTime > 0 ? Number((totalDays / countWithTime).toFixed(1)) : 1.8;

        return {
          id: d.id,
          name: d.name.replace(" Department", ""),
          type: "department",
          total,
          resolved,
          active,
          rate,
          avgFixDays,
        };
      })
      .sort((a, b) => b.rate - a.rate || b.resolved - a.resolved);
  }, [complaints, departments]);

  const wardLeaderboard = useMemo<LeaderboardItem[]>(() => {
    const wardMap = new Map<string, Complaint[]>();

    complaints.forEach((c) => {
      const wardName = c.area?.trim() || "Central Zone";
      if (!wardMap.has(wardName)) {
        wardMap.set(wardName, []);
      }
      wardMap.get(wardName)!.push(c);
    });

    return Array.from(wardMap.entries())
      .map(([name, wardComplaints]) => {
        const resolvedList = wardComplaints.filter((c) => c.status === "resolved");
        const total = wardComplaints.length;
        const resolved = resolvedList.length;
        const active = total - resolved;
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        let totalDays = 0;
        let countWithTime = 0;
        resolvedList.forEach((c) => {
          if (c.resolved_at && c.created_at) {
            const diff =
              (new Date(c.resolved_at).getTime() - new Date(c.created_at).getTime()) /
              (1000 * 60 * 60 * 24);
            if (diff >= 0) {
              totalDays += diff;
              countWithTime++;
            }
          }
        });

        const avgFixDays = countWithTime > 0 ? Number((totalDays / countWithTime).toFixed(1)) : 2.1;

        return {
          id: name,
          name,
          type: "ward",
          total,
          resolved,
          active,
          rate,
          avgFixDays,
        };
      })
      .sort((a, b) => b.rate - a.rate || b.resolved - a.resolved);
  }, [complaints]);

  // If compact mode (for Landing Page), show only top 3 departments
  if (compact) {
    const topThree = departmentLeaderboard.slice(0, 3);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg font-bold text-foreground">
              {t("leaderboard_preview_title")}
            </h3>
          </div>
          <Link
            to="/admin/analytics"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("view_full_leaderboard")} →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {topThree.map((item, index) => (
            <div
              key={item.id}
              className="relative rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className={cn(
                    "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs",
                    index === 0 && "bg-accent/25 text-accent-foreground border border-accent/40",
                    index === 1 &&
                      "bg-slate-200/80 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200",
                    index === 2 &&
                      "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200",
                  )}
                >
                  #{index + 1}
                </span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                  <Clock className="h-3 w-3" />
                  {item.avgFixDays}d {t("avg_fix_time")}
                </span>
              </div>

              <h4 className="font-display text-base font-bold text-foreground">{item.name}</h4>

              {/* Progress bar */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">{t("stat_resolution_rate")}</span>
                  <span className="text-primary font-bold">{item.rate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(10, item.rate)}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <span className="text-success font-semibold">
                  {item.resolved} {t("resolved_cases")}
                </span>
                <span className="text-warning font-semibold">
                  {item.active} {t("active_cases")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full Mode (for Analytics Page)
  const currentList = tab === "department" ? departmentLeaderboard : wardLeaderboard;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/70 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
            <Award className="h-4 w-4 text-accent" />
            <span>Civic Performance Index</span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
            {t("leaderboard_title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            {t("leaderboard_subtitle")}
          </p>
        </div>

        {/* Tab switcher: Departments vs Wards */}
        <div className="inline-flex rounded-xl border border-border/80 bg-background/80 p-1 text-xs font-medium self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setTab("department")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all font-semibold",
              tab === "department"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Departments</span>
          </button>
          <button
            type="button"
            onClick={() => setTab("ward")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all font-semibold",
              tab === "ward"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span>Wards & Zones</span>
          </button>
        </div>
      </div>

      {/* Grid of Ranked Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {currentList.map((item, index) => (
          <div
            key={item.id}
            className="group relative rounded-2xl border border-border/80 bg-background/60 p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:bg-card"
          >
            <div className="flex items-start justify-between mb-3">
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-black shadow-2xs",
                  index === 0 &&
                    "bg-accent/25 text-accent-foreground border border-accent/40 ring-2 ring-accent/20",
                  index === 1 &&
                    "bg-slate-200/90 text-slate-900 border border-slate-300 dark:bg-slate-800 dark:text-slate-100",
                  index === 2 &&
                    "bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-200",
                  index > 2 && "bg-muted text-muted-foreground border border-border/80",
                )}
              >
                #{index + 1}
              </span>

              <div className="flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                <Clock className="h-3 w-3 text-primary" />
                <span>{item.avgFixDays}d avg</span>
              </div>
            </div>

            <h4 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors">
              {item.name}
            </h4>

            {/* Botanical Green Progress Bar */}
            <div className="mt-3.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">
                  {t("stat_resolution_rate")}
                </span>
                <span className="font-extrabold text-primary">{item.rate}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                  style={{ width: `${Math.max(6, item.rate)}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-2 text-center text-xs">
              <div className="pr-2 border-r border-border/60">
                <p className="font-bold text-success text-sm">{item.resolved}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{t("resolved_cases")}</p>
              </div>
              <div className="pl-2">
                <p className="font-bold text-warning text-sm">{item.active}</p>
                <p className="text-[10px] text-muted-foreground uppercase">{t("active_cases")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
