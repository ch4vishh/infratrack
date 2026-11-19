import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  MapPin,
  PhoneCall,
  PlusCircle,
  ShieldCheck,
  Siren,
  Sparkles,
  Workflow,
} from "lucide-react";
import { fetchComplaints, fetchDepartments } from "@/lib/complaints";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, LanguageToggle } from "@/lib/i18n";
import { StatusBadge, PriorityBadge } from "@/components/Badges";
import { UpvoteButton } from "@/components/UpvoteButton";
import { PerformanceLeaderboard } from "@/components/PerformanceLeaderboard";
import { CivicBlueprintPattern } from "@/components/CivicBlueprintPattern";
import { getUpvotesCount } from "@/lib/upvotes";
import { getComplaintPhoto } from "@/lib/imageCompression";
import { formatDate } from "@/lib/infratrack";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InfraTrack — Civic Infrastructure Complaint Management & Resolution" },
      {
        name: "description",
        content:
          "InfraTrack connects citizens and municipal authorities for real-time tracking, GIS mapping, and rapid resolution of public infrastructure issues.",
      },
      { property: "og:title", content: "InfraTrack — Civic Infrastructure Platform" },
      {
        property: "og:description",
        content:
          "Report potholes, broken streetlights, water leaks, and drains with live tracking and resolution maps.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, isAdmin } = useAuth();
  const { t } = useLanguage();
  const { data: complaints = [] } = useQuery({
    queryKey: ["complaints", "public"],
    queryFn: () => fetchComplaints(),
  });
  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
  });

  const resolved = complaints.filter((c) => c.status === "resolved").length;
  const inProgress = complaints.filter(
    (c) => c.status === "in_progress" || c.status === "assigned",
  ).length;
  const open = complaints.length - resolved;
  const resolutionRate =
    complaints.length > 0 ? Math.round((resolved / complaints.length) * 100) : 0;
  const recentComplaints = complaints.slice(0, 6);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-card/95 backdrop-blur-md">
        <div className="w-[95%] max-w-[1440px] mx-auto flex items-center justify-between px-2 py-3.5 sm:px-4">
          <Link to="/" className="flex items-center gap-2.5 transition-transform hover:opacity-95">
            <span className="rounded-lg bg-primary p-2 text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Infra<span className="text-primary">Track</span>
            </span>
          </Link>

          <nav className="flex items-center gap-2 sm:gap-3 text-sm">
            <Link
              to="/map"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              <MapPin className="h-4 w-4 text-primary" />
              {t("nav_map")}
            </Link>
            <Link
              to="/about"
              className="hidden sm:inline-flex px-3 py-1.5 text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              {t("nav_about")}
            </Link>

            <LanguageToggle />

            {user ? (
              <Link to={isAdmin ? "/admin" : "/dashboard"}>
                <Button size="sm" className="font-medium shadow-xs">
                  {t("nav_godashboard")}
                </Button>
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="font-medium">
                    {t("nav_signin")}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="font-medium shadow-xs">
                    {t("nav_signup")}
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section with Full-Bleed Aerial City Background */}
      <section className="relative overflow-hidden border-b border-border/70">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none mix-blend-multiply"
          style={{ backgroundImage: `url('/hero-city.jpg')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background pointer-events-none" />

        <div className="relative w-[95%] max-w-[1440px] mx-auto px-2 sm:px-4 py-16 md:py-24">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            {/* Left Hero Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t("hero_badge")}</span>
              </div>

              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                {t("hero_title")}
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                {t("hero_subtitle")}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link to="/report">
                  <Button size="lg" className="h-12 px-6 font-semibold shadow-md gap-2">
                    <PlusCircle className="h-5 w-5" />
                    {t("hero_btn_report")}
                  </Button>
                </Link>
                <Link to="/map">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-12 px-6 font-semibold bg-card/80 backdrop-blur-xs gap-2"
                  >
                    <MapPin className="h-4 w-4 text-primary" />
                    {t("hero_btn_map")}
                  </Button>
                </Link>
              </div>

              {/* Metric Progress Bars & Fast Stats */}
              <div className="pt-6">
                <div className="rounded-2xl border border-border/80 bg-card/90 p-5 shadow-card backdrop-blur-xs">
                  <div className="grid grid-cols-3 gap-4 text-center divide-x divide-border/60">
                    <div className="px-2">
                      <p className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                        {complaints.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t("stat_total_complaints")}
                      </p>
                    </div>
                    <div className="px-2">
                      <p className="font-display text-2xl sm:text-3xl font-bold text-success">
                        {resolved}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("stat_resolved")}</p>
                    </div>
                    <div className="px-2">
                      <p className="font-display text-2xl sm:text-3xl font-bold text-warning">
                        {open}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("stat_in_queue")}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-5 space-y-1.5 border-t border-border/60 pt-4">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-muted-foreground">{t("stat_resolution_rate")}</span>
                      <span className="font-bold text-primary">{resolutionRate}%</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/80">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
                        style={{ width: `${Math.max(8, resolutionRate)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Feature Highlights */}
            <div className="lg:col-span-5 grid sm:grid-cols-2 gap-4">
              {[
                {
                  icon: MapPin,
                  title: t("feat_pinpoint_title"),
                  body: t("feat_pinpoint_desc"),
                  accent: "text-primary",
                },
                {
                  icon: Workflow,
                  title: t("feat_routing_title"),
                  body: t("feat_routing_desc"),
                  accent: "text-info",
                },
                {
                  icon: Siren,
                  title: t("feat_status_title"),
                  body: t("feat_status_desc"),
                  accent: "text-warning",
                },
                {
                  icon: BarChart3,
                  title: t("feat_analytics_title"),
                  body: t("feat_analytics_desc"),
                  accent: "text-success",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="inline-flex rounded-xl bg-background p-2.5 shadow-2xs border border-border/60">
                    <f.icon className={`h-5 w-5 ${f.accent}`} />
                  </div>
                  <h3 className="mt-3.5 font-display text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard Preview Strip */}
      <section className="border-b border-border/70 py-12 bg-background">
        <div className="w-[95%] max-w-[1440px] mx-auto px-2 sm:px-4">
          <PerformanceLeaderboard
            complaints={complaints}
            departments={departments}
            compact={true}
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="relative overflow-hidden border-b border-border/70 py-16 md:py-24 bg-card/30">
        {/* Civic street-grid & topographic map blueprint background */}
        <CivicBlueprintPattern />

        <div className="relative z-10 w-[95%] max-w-[1440px] mx-auto px-2 sm:px-4">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              {t("how_it_works_title")}
            </h2>
            <p className="mt-3 text-muted-foreground text-sm sm:text-base">
              {t("how_it_works_subtitle")}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: t("step1_title"),
                desc: t("step1_desc"),
                icon: MapPin,
                color: "bg-primary text-primary-foreground",
              },
              {
                step: "02",
                title: t("step2_title"),
                desc: t("step2_desc"),
                icon: Workflow,
                color: "bg-info text-info-foreground",
              },
              {
                step: "03",
                title: t("step3_title"),
                desc: t("step3_desc"),
                icon: Siren,
                color: "bg-warning text-warning-foreground",
              },
              {
                step: "04",
                title: t("step4_title"),
                desc: t("step4_desc"),
                icon: CheckCircle2,
                color: "bg-success text-success-foreground",
              },
            ].map((st) => (
              <div
                key={st.step}
                className="group relative rounded-2xl border border-[#163D2C]/15 bg-[#F7F6F0]/90 dark:bg-card/90 backdrop-blur-sm p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-[#163D2C]/40 hover:shadow-xl hover:shadow-[#163D2C]/5"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-2xl font-black text-muted-foreground/40 group-hover:text-primary transition-colors">
                    {st.step}
                  </span>
                  <div
                    className={`p-2.5 rounded-xl shadow-xs transition-transform duration-300 group-hover:scale-105 ${st.color}`}
                  >
                    <st.icon className="h-5 w-5" />
                  </div>
                </div>
                <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {st.title}
                </h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live Civic Activity Feed with Upvoting */}
      <section className="py-16 md:py-24">
        <div className="w-[95%] max-w-[1440px] mx-auto px-2 sm:px-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                <Flame className="h-3.5 w-3.5 text-destructive" />
                <span>{t("live_activity_title")}</span>
              </div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {t("live_activity_subtitle")}
              </h2>
            </div>
            <Link to="/map">
              <Button variant="outline" size="sm" className="gap-1.5 font-medium shadow-2xs">
                {t("view_all_map")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recentComplaints.length === 0 ? (
              <p className="col-span-full text-center text-sm text-muted-foreground py-8">
                {t("no_complaints")}
              </p>
            ) : (
              recentComplaints.map((item) => {
                const upvotes = getUpvotesCount(item.id, item.complaint_id);
                const beforePhoto = getComplaintPhoto(item.id, "before", item.image_url);

                return (
                  <div
                    key={item.id}
                    className="group rounded-2xl border border-border/80 bg-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* Photo Thumbnail if available */}
                      {beforePhoto ? (
                        <div className="relative mb-3.5 h-36 w-full overflow-hidden rounded-xl border border-border bg-black/5">
                          <img
                            src={beforePhoto}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <span className="absolute bottom-1.5 left-1.5 rounded-sm bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-2xs">
                            Evidence Photo
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          {item.complaint_id}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <PriorityBadge priority={item.priority} upvotes={upvotes} />
                          <StatusBadge status={item.status} />
                        </div>
                      </div>

                      <Link
                        to="/complaints/$id"
                        params={{ id: item.id }}
                        className="block group-hover:text-primary transition-colors"
                      >
                        <h3 className="font-display text-base font-bold text-foreground line-clamp-1">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      </Link>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 truncate text-[11px] text-muted-foreground max-w-[50%]">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate">{item.address || "Location pinned"}</span>
                      </span>

                      {/* Community Upvoting Button */}
                      <UpvoteButton
                        complaintId={item.id}
                        complaintCode={item.complaint_id}
                        size="xs"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Multi-Column Structured Footer */}
      <footer className="mt-auto border-t border-border/80 bg-card text-card-foreground">
        <div className="w-[95%] max-w-[1440px] mx-auto px-2 sm:px-4 py-12 md:py-16">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
            {/* Col 1: Platform Brand */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-lg bg-primary p-2 text-primary-foreground shadow-sm">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="font-display text-xl font-bold tracking-tight text-foreground">
                  Infra<span className="text-primary">Track</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pr-4">
                {t("footer_tagline")}
              </p>
              <div className="pt-2">
                <LanguageToggle />
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div className="lg:col-span-2 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                {t("footer_quick_links")}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li>
                  <Link to="/map" className="hover:text-primary transition-colors">
                    {t("nav_map")}
                  </Link>
                </li>
                <li>
                  <Link to="/report" className="hover:text-primary transition-colors">
                    {t("nav_report")}
                  </Link>
                </li>
                <li>
                  <Link to="/admin/analytics" className="hover:text-primary transition-colors">
                    {t("nav_analytics")}
                  </Link>
                </li>
                <li>
                  <Link to="/about" className="hover:text-primary transition-colors">
                    {t("nav_about")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Departments */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                {t("footer_departments")}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Roads & Infrastructure Board
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-info" />
                  Water Supply & Drainage Dept.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  Electrical & Streetlighting Div.
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Solid Waste & Sanitation Board
                </li>
              </ul>
            </div>

            {/* Col 4: Civic Helplines */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                {t("footer_helplines")}
              </h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-foreground">{t("footer_emergency")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-info" />
                  <span>{t("footer_civic_call")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-success" />
                  <span>{t("footer_water_board")}</span>
                </li>
                <li className="flex items-center gap-2">
                  <PhoneCall className="h-3.5 w-3.5 text-warning" />
                  <span>{t("footer_power_board")}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground text-center sm:text-left">
            <p>
              © {new Date().getFullYear()} InfraTrack. {t("footer_rights")}
            </p>
            <p className="text-[11px] text-muted-foreground/80">
              Civic Infrastructure Platform · Version 2.0
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
