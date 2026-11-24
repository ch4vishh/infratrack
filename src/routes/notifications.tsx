import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDateTime } from "@/lib/infratrack";
import {
  getLocalNotifications,
  markLocalNotificationsRead,
} from "@/lib/complaints";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  complaint_id: string | null;
};

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — InfraTrack" },
      { name: "description", content: "Status updates on the civic issues you follow." },
      { property: "og:title", content: "Notifications — InfraTrack" },
      { property: "og:description", content: "Updates on your reported civic issues." },
    ],
  }),
  component: () => (
    <RequireAuth>
      <AppShell title="Notifications">
        <Notifications />
      </AppShell>
    </RequireAuth>
  ),
});

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      let remoteData: Notification[] = [];
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) remoteData = data as Notification[];
      } catch (err) {
        console.warn("Supabase notifications fetch skipped/failed:", err);
      }

      const localList = getLocalNotifications(user?.id);
      const map = new Map<string, Notification>();

      // Remote notifications first
      for (const item of remoteData) {
        map.set(item.id, item);
      }
      // Merge local notifications (ensuring offline and instant notifications appear immediately)
      for (const item of localList) {
        if (!map.has(item.id)) {
          map.set(item.id, {
            id: item.id,
            message: item.message,
            is_read: item.is_read,
            created_at: item.created_at,
            complaint_id: item.complaint_id,
          });
        }
      }

      return Array.from(map.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  async function markAllRead() {
    markLocalNotificationsRead(user?.id);
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    } catch {
      // ignore
    }
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      markLocalNotificationsRead(user?.id);
      try {
        supabase.from("notifications").update({ is_read: true }).eq("id", n.id).then(() => { });
      } catch { }
      qc.invalidateQueries({ queryKey: ["notifications"] });
    }
  }

  const unreadCount = data.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground font-medium">
          {unreadCount} unread update{unreadCount === 1 ? "" : "s"}
        </p>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto font-medium shadow-2xs"
            onClick={markAllRead}
          >
            <CheckCheck className="h-4 w-4 mr-1 text-primary" /> Mark all as read
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border/80 bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Loading notifications…</p>
        ) : data.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground">
              You will receive real-time updates when an authority reviews or resolves your reported issues.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {data.map((n) => (
              <li
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`flex items-start gap-3.5 p-4 sm:px-6 transition-colors ${n.is_read ? "bg-card/40 opacity-75" : "bg-primary/5 hover:bg-primary/10"
                  }`}
              >
                <div
                  className={`mt-0.5 rounded-full p-2 shrink-0 ${n.is_read
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/15 text-primary"
                    }`}
                >
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm leading-snug ${n.is_read ? "text-muted-foreground" : "font-semibold text-foreground"
                      }`}
                  >
                    {n.message}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>
                {n.complaint_id ? (
                  <Link
                    to="/complaints/$id"
                    params={{ id: n.complaint_id }}
                    onClick={() => handleNotificationClick(n)}
                    className="shrink-0 text-xs font-semibold text-primary hover:underline bg-background/80 px-2.5 py-1 rounded-md border border-border"
                  >
                    View Ticket →
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
