import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { PerformanceLeaderboard } from "@/components/PerformanceLeaderboard";
import { useLanguage } from "@/lib/i18n";
import { fetchComplaints, fetchDepartments } from "@/lib/complaints";
import { CATEGORIES, STATUSES, categoryLabel, statusLabel } from "@/lib/infratrack";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — InfraTrack" },
      {
        name: "description",
        content: "Charts on complaint volume, categories and resolution times.",
      },
      { property: "og:title", content: "Analytics — InfraTrack" },
      {
        property: "og:description",
        content: "Insights into civic complaint trends across the city.",
      },
    ],
  }),
  component: () => (
    <RequireAuth admin>
      <AnalyticsWrapper />
    </RequireAuth>
  ),
});

function AnalyticsWrapper() {
  const { t } = useLanguage();
  return (
    <AppShell title={t("nav_analytics")}>
      <Analytics />
    </AppShell>
  );
}

const COLORS = [
  "#163D2C",
  "#E5A93C",
  "#1E6B47",
  "#B83227",
  "#1D5C8A",
  "#7c3aed",
  "#059669",
  "#64748b",
];

function Analytics() {
  const { t } = useLanguage();
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["complaints", "all"],
    queryFn: () => fetchComplaints(),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  const byCategory = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        name: categoryLabel(c.value),
        count: complaints.filter((x) => x.category === c.value).length,
      })).filter((r) => r.count > 0),
    [complaints],
  );

  const byStatus = useMemo(
    () =>
      STATUSES.map((s) => ({
        name: statusLabel(s.value),
        value: complaints.filter((x) => x.status === s.value).length,
      })).filter((r) => r.value > 0),
    [complaints],
  );

  const byDepartment = useMemo(
    () =>
      departments.map((d) => ({
        name: d.name.replace(" Department", ""),
        open: complaints.filter(
          (c) => c.department_id === d.id && c.status !== "resolved" && c.status !== "rejected",
        ).length,
        resolved: complaints.filter((c) => c.department_id === d.id && c.status === "resolved")
          .length,
      })),
    [complaints, departments],
  );

  const monthly = useMemo(() => {
    const map = new Map<string, { name: string; reported: number; resolved: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map.set(key, {
        name: d.toLocaleDateString("en-IN", { month: "short" }),
        reported: 0,
        resolved: 0,
      });
    }
    for (const c of complaints) {
      const d = new Date(c.created_at);
      const row = map.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (row) row.reported += 1;
      if (c.resolved_at) {
        const r = new Date(c.resolved_at);
        const rrow = map.get(`${r.getFullYear()}-${r.getMonth()}`);
        if (rrow) rrow.resolved += 1;
      }
    }
    return [...map.values()];
  }, [complaints]);

  const avgResolutionDays = useMemo(() => {
    const done = complaints.filter((c) => c.resolved_at);
    if (done.length === 0) return "—";
    const total = done.reduce(
      (sum, c) =>
        sum + (new Date(c.resolved_at!).getTime() - new Date(c.created_at).getTime()) / 86400000,
      0,
    );
    return `${(total / done.length).toFixed(1)} days`;
  }, [complaints]);

  const resolutionRate =
    complaints.length === 0
      ? "—"
      : `${Math.round((complaints.filter((c) => c.status === "resolved").length / complaints.length) * 100)}%`;

  if (isLoading) return <p className="text-sm text-muted-foreground p-6">Loading analytics…</p>;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Overview Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {t("stat_total_complaints")}
          </p>
          <p className="font-display text-3xl font-extrabold text-foreground mt-1">
            {complaints.length}
          </p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {t("stat_resolution_rate")}
          </p>
          <p className="font-display text-3xl font-extrabold text-primary mt-1">{resolutionRate}</p>
        </div>
        <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
            {t("avg_fix_time")}
          </p>
          <p className="font-display text-3xl font-extrabold text-foreground mt-1">
            {avgResolutionDays}
          </p>
        </div>
      </div>

      {/* Top Performing Departments & Wards Leaderboard Grid */}
      <PerformanceLeaderboard complaints={complaints} departments={departments} />

      {/* Visual Analytics Charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Complaints by category">
          <BarChart data={byCategory} margin={{ left: -20, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Bar dataKey="count" fill="#163D2C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Status breakdown">
          <PieChart>
            <Pie data={byStatus} dataKey="value" nameKey="name" outerRadius={110} label>
              {byStatus.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ChartCard>

        <ChartCard title="Department workload">
          <BarChart data={byDepartment} margin={{ left: -20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" angle={-20} textAnchor="end" interval={0} fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Legend />
            <Bar dataKey="open" stackId="a" fill="#E5A93C" />
            <Bar dataKey="resolved" stackId="a" fill="#163D2C" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Reported vs resolved (last 6 months)">
          <LineChart data={monthly} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" fontSize={11} />
            <YAxis allowDecimals={false} fontSize={11} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="reported" stroke="#1D5C8A" strokeWidth={2.5} />
            <Line type="monotone" dataKey="resolved" stroke="#163D2C" strokeWidth={2.5} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-card">
      <h3 className="mb-4 font-display text-base font-bold text-foreground">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
