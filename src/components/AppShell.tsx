import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  PlusCircle,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage, LanguageToggle } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getLocalNotifications } from "@/lib/complaints";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };

function getInitials(name?: string | null) {
  if (!name) return "IT";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const { profile, avatarUrl, isAdmin, signOut, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;

    const computeUnread = async () => {
      let remoteCount = 0;
      try {
        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("is_read", false);
        remoteCount = count ?? 0;
      } catch {
        // network/offline fallback
      }

      const localUnread = getLocalNotifications(user.id).filter((n) => !n.is_read).length;
      setUnread(Math.max(remoteCount, localUnread));
    };

    computeUnread();

    const handleNotifEvent = () => {
      computeUnread();
    };

    window.addEventListener("infratrack-notification-event", handleNotifEvent);
    return () => {
      window.removeEventListener("infratrack-notification-event", handleNotifEvent);
    };
  }, [user, pathname]);

  const citizenNav: NavItem[] = [
    { to: "/dashboard", label: t("nav_dashboard"), icon: LayoutDashboard },
    { to: "/report", label: t("nav_report"), icon: PlusCircle },
    { to: "/my-complaints", label: t("nav_my_complaints"), icon: FileText },
    { to: "/map", label: t("nav_map"), icon: MapIcon },
    { to: "/notifications", label: t("nav_notifications"), icon: Bell },
    { to: "/profile", label: t("nav_profile"), icon: User },
  ];

  const adminNav: NavItem[] = [
    { to: "/admin", label: t("nav_admin_dashboard"), icon: LayoutDashboard },
    { to: "/admin/complaints", label: t("nav_manage_complaints"), icon: ClipboardList },
    { to: "/admin/analytics", label: t("nav_analytics"), icon: BarChart3 },
    { to: "/admin/departments", label: t("nav_departments"), icon: Building2 },
    { to: "/map", label: t("nav_map"), icon: MapIcon },
    { to: "/notifications", label: t("nav_notifications"), icon: Bell },
    { to: "/profile", label: t("nav_profile"), icon: User },
  ];

  const nav = isAdmin ? adminNav : citizenNav;

  const sidebar = (
    <aside className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground">
      <Link
        to="/"
        className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border/60"
      >
        <span className="rounded-lg bg-sidebar-primary p-2 text-sidebar-primary-foreground shadow-sm">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <span className="font-display text-lg font-bold tracking-tight text-white block">
            InfraTrack
          </span>
          <span className="text-[11px] text-sidebar-foreground/60 block -mt-0.5">Civic Portal</span>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-xs"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-white",
              )}
            >
              <item.icon
                className={cn(
                  "h-4 w-4",
                  active ? "text-sidebar-primary" : "text-sidebar-foreground/70",
                )}
              />
              {item.label}
              {item.to === "/notifications" && unread > 0 ? (
                <span className="ml-auto rounded-full bg-sidebar-primary px-2 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground">
                  {unread}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3 text-sm">
        <Link
          to="/profile"
          className="flex items-center gap-3 rounded-xl p-2 transition-all hover:bg-sidebar-accent/50"
        >
          <Avatar className="h-10 w-10 border border-sidebar-border shrink-0">
            {avatarUrl ? (
              <AvatarImage
                src={avatarUrl}
                alt={profile?.full_name || "User"}
                className="object-cover"
              />
            ) : null}
            <AvatarFallback className="bg-sidebar-accent text-xs font-bold text-sidebar-foreground">
              {getInitials(profile?.full_name || user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-white leading-snug">
              {profile?.full_name || (isAdmin ? t("role_authority") : t("role_citizen"))}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/70">
              {profile?.email || user?.email}
            </p>
            <span className="mt-1 inline-flex items-center rounded-xs bg-sidebar-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-sidebar-primary">
              {isAdmin ? t("role_authority") : t("role_citizen")}
            </span>
          </div>
        </Link>
        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/", replace: true });
          }}
          className="mt-2 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" /> {t("nav_signout")}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">{sidebar}</div>
      {open ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="h-full">{sidebar}</div>
          <button
            className="flex-1 bg-foreground/40 backdrop-blur-xs"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          />
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b bg-card px-4 py-3 md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-xl font-bold tracking-tight text-foreground">{title}</h1>
          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle />
            <Link to="/notifications">
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-card" />
                ) : null}
              </Button>
            </Link>
            <Link to="/profile" className="hidden sm:block">
              <Avatar className="h-8 w-8 border border-border transition-transform hover:scale-105">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    alt={profile?.full_name || "User"}
                    className="object-cover"
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                  {getInitials(profile?.full_name || user?.email)}
                </AvatarFallback>
              </Avatar>
            </Link>
            {!isAdmin ? (
              <Link to="/report">
                <Button size="sm" className="font-medium">
                  <PlusCircle className="mr-1.5 h-4 w-4" /> {t("nav_report")}
                </Button>
              </Link>
            ) : null}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
