import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { LanguageToggle, useLanguage } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About InfraTrack — How Civic Complaints Are Handled" },
      {
        name: "description",
        content:
          "How InfraTrack routes citizen complaints to city departments, tracks status changes and publishes resolution analytics.",
      },
      { property: "og:title", content: "About InfraTrack" },
      {
        property: "og:description",
        content: "How citizen complaints move from report to resolution on InfraTrack.",
      },
    ],
  }),
  component: About,
});

function About() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border/80 bg-card">
        <div className="w-[95%] max-w-[1440px] mx-auto flex items-center justify-between px-2 py-3.5 sm:px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="rounded-lg bg-primary p-2 text-primary-foreground shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold tracking-tight text-foreground">
              Infra<span className="text-primary">Track</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("nav_home")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 w-[95%] max-w-[1000px] mx-auto px-2 sm:px-4 py-12 md:py-16">
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          {t("nav_about")} InfraTrack
        </h1>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">{t("hero_subtitle")}</p>

        <div className="mt-10 rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-6">
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("how_it_works_title")}
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 text-sm">
            <li className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-1.5">
              <strong className="text-primary block font-display font-semibold">
                {t("step1_title")}
              </strong>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("step1_desc")}</p>
            </li>
            <li className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-1.5">
              <strong className="text-info block font-display font-semibold">
                {t("step2_title")}
              </strong>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("step2_desc")}</p>
            </li>
            <li className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-1.5">
              <strong className="text-warning block font-display font-semibold">
                {t("step3_title")}
              </strong>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("step3_desc")}</p>
            </li>
            <li className="rounded-xl border border-border/60 bg-background/50 p-4 space-y-1.5">
              <strong className="text-success block font-display font-semibold">
                {t("step4_title")}
              </strong>
              <p className="text-xs text-muted-foreground leading-relaxed">{t("step4_desc")}</p>
            </li>
          </ol>
        </div>

        <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-card space-y-3">
          <h2 className="font-display text-xl font-bold text-foreground">
            {t("access_level_title")}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t("citizen_privileges")}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("authority_privileges")}
          </p>
          <div className="mt-3 inline-block rounded-xl bg-background/80 px-4 py-2 border border-border/80 text-xs text-foreground font-mono">
            {t("demo_code_hint")}: <strong>INFRA-ADMIN-2026</strong>
          </div>
        </div>
      </main>
    </div>
  );
}
