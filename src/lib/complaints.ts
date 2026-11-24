import { supabase } from "@/integrations/supabase/client";
import type { Status } from "@/lib/infratrack";
import { statusLabel } from "@/lib/infratrack";

export type Complaint = {
  id: string;
  complaint_id: string;
  user_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  department_id: string | null;
  latitude: number;
  longitude: number;
  address: string;
  area: string | null;
  image_url: string | null;
  after_image_url?: string | null;
  remarks: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export type Department = { id: string; name: string; description: string | null };

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: "dept-roads",
    name: "Roads Department",
    description: "Road construction, pothole repairs, and pavement maintenance",
  },
  {
    id: "dept-electrical",
    name: "Electrical Department",
    description: "Streetlights, power infrastructure, and public lighting",
  },
  {
    id: "dept-drainage",
    name: "Drainage Department",
    description: "Stormwater drains, sewage blockages, and flood prevention",
  },
  {
    id: "dept-sanitation",
    name: "Sanitation Department",
    description: "Solid waste management, garbage collection, and cleanliness",
  },
  {
    id: "dept-water",
    name: "Water Department",
    description: "Drinking water supply pipelines, leakage repairs, and valves",
  },
  {
    id: "dept-pwd",
    name: "Public Works Department",
    description: "Public structures, street signage, traffic barriers, and municipal buildings",
  },
];

export const COMPLAINTS_CACHE_KEY = "infratrack_complaints_cache";
export const LOCAL_COMPLAINTS_KEY = "infratrack_local_complaints";
export const LOCAL_NOTIFICATIONS_KEY = "infratrack_notifications";

export type AppNotification = {
  id: string;
  user_id?: string | null;
  complaint_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
};

/** Read all locally stored / cached complaints (mirroring both local & remote) */
export function getLocalComplaints(): Complaint[] {
  if (typeof window === "undefined") return [];
  try {
    const rawCache = localStorage.getItem(COMPLAINTS_CACHE_KEY);
    const rawLocal = localStorage.getItem(LOCAL_COMPLAINTS_KEY);

    const cacheList: Complaint[] = rawCache ? JSON.parse(rawCache) : [];
    const localList: Complaint[] = rawLocal ? JSON.parse(rawLocal) : [];

    const map = new Map<string, Complaint>();
    for (const c of [...localList, ...cacheList]) {
      if (c && c.id) {
        map.set(c.id, { ...map.get(c.id), ...c });
      }
    }
    return Array.from(map.values());
  } catch (err) {
    console.warn("Could not read local complaints from localStorage", err);
    return [];
  }
}

/** Save or update a complaint in the unified persistent store */
export function saveLocalComplaint(complaint: Complaint): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalComplaints();
    const idx = existing.findIndex(
      (c) => c.id === complaint.id || (c.complaint_id && c.complaint_id === complaint.complaint_id),
    );
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...complaint, updated_at: new Date().toISOString() };
    } else {
      existing.unshift(complaint);
    }

    const payload = JSON.stringify(existing);
    localStorage.setItem(COMPLAINTS_CACHE_KEY, payload);
    localStorage.setItem(LOCAL_COMPLAINTS_KEY, payload);

    // Dispatch custom event for instant live-sync across open components/tabs
    window.dispatchEvent(new CustomEvent("infratrack-complaints-updated", { detail: complaint }));
  } catch (err) {
    console.warn("Could not persist local complaint (quota exceeded)", err);
  }
}

/** Update specific fields of a local complaint */
export function updateLocalComplaint(id: string, updates: Partial<Complaint>): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalComplaints();
    const idx = existing.findIndex((c) => c.id === id || c.complaint_id === id);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...updates, updated_at: new Date().toISOString() };
      const payload = JSON.stringify(existing);
      localStorage.setItem(COMPLAINTS_CACHE_KEY, payload);
      localStorage.setItem(LOCAL_COMPLAINTS_KEY, payload);
      window.dispatchEvent(new CustomEvent("infratrack-complaints-updated", { detail: existing[idx] }));
    }
  } catch (err) {
    console.warn("Could not update local complaint in localStorage", err);
  }
}

/** Retrieve a single complaint from local store by id or complaint_id */
export function getLocalComplaintById(id: string): Complaint | null {
  const existing = getLocalComplaints();
  return existing.find((c) => c.id === id || c.complaint_id === id) ?? null;
}

/** Fetch complaints: queries Supabase and seamlessly merges local/offline submissions with 2-way sync */
export async function fetchComplaints(filters?: { userId?: string }): Promise<Complaint[]> {
  let remoteData: Complaint[] = [];

  try {
    let q = supabase.from("complaints").select("*").order("created_at", { ascending: false });
    if (filters?.userId) q = q.eq("user_id", filters.userId);
    const { data, error } = await q;
    if (error) {
      console.warn("Supabase fetchComplaints failed, serving local store:", error);
    } else if (data) {
      remoteData = data as Complaint[];
      // Mirror remote data into cache to guarantee citizen & admin see same complaints
      if (typeof window !== "undefined" && !filters?.userId) {
        try {
          const currentLocal = getLocalComplaints();
          const mergedMap = new Map<string, Complaint>();
          for (const c of remoteData) {
            mergedMap.set(c.id, c);
          }
          for (const c of currentLocal) {
            if (!mergedMap.has(c.id)) {
              mergedMap.set(c.id, c);
            } else {
              // preserve any local after_image_url or offline remarks
              mergedMap.set(c.id, { ...mergedMap.get(c.id)!, ...c });
            }
          }
          localStorage.setItem(COMPLAINTS_CACHE_KEY, JSON.stringify(Array.from(mergedMap.values())));
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn("Network error during fetchComplaints, serving local store:", err);
  }

  // Merge locally saved complaints
  const localList = getLocalComplaints();
  const filteredLocal = filters?.userId
    ? localList.filter((c) => !c.user_id || c.user_id === filters.userId)
    : localList;

  // Deduplicate by ID and human complaint_id
  const seenIds = new Set<string>();
  const combined: Complaint[] = [];

  // Local/cached complaints are prioritized (user's immediate latest actions & photos)
  for (const c of filteredLocal) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      if (c.complaint_id) seenIds.add(c.complaint_id);
      combined.push(c);
    }
  }

  for (const c of remoteData) {
    if (!seenIds.has(c.id) && (!c.complaint_id || !seenIds.has(c.complaint_id))) {
      seenIds.add(c.id);
      if (c.complaint_id) seenIds.add(c.complaint_id);
      combined.push(c);
    }
  }

  // Sort by created_at descending
  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return combined;
}

/** Fetch departments with reliable default fallback */
export async function fetchDepartments(): Promise<Department[]> {
  try {
    const { data, error } = await supabase.from("departments").select("*").order("name");
    if (!error && data && data.length > 0) {
      return data as Department[];
    }
  } catch (err) {
    console.warn("Could not fetch departments from Supabase, using defaults:", err);
  }
  return DEFAULT_DEPARTMENTS;
}

/** Local notification store helpers */
export function getLocalNotifications(userId?: string | null): AppNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const list: AppNotification[] = JSON.parse(raw);
    if (userId) {
      return list.filter((n) => !n.user_id || n.user_id === userId);
    }
    return list;
  } catch {
    return [];
  }
}

export function saveLocalNotification(notification: AppNotification): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalNotifications();
    const idx = existing.findIndex((n) => n.id === notification.id);
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...notification };
    } else {
      existing.unshift(notification);
    }
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(existing.slice(0, 50)));
    // Dispatch event so the navbar/sidebar notification bell updates instantly
    window.dispatchEvent(
      new CustomEvent("infratrack-notification-event", { detail: notification }),
    );
  } catch (err) {
    console.warn("Could not save local notification", err);
  }
}

export function markLocalNotificationsRead(userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalNotifications();
    const updated = existing.map((n) =>
      !userId || n.user_id === userId ? { ...n, is_read: true } : n,
    );
    localStorage.setItem(LOCAL_NOTIFICATIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("infratrack-notification-event", { detail: { is_read: true } }));
  } catch {
    // ignore
  }
}

/** Create notification in both local store and Supabase */
export async function notify(
  userId: string,
  complaintId: string,
  message: string,
  complaintRef?: { id: string; complaint_id: string },
) {
  const notifObj: AppNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    complaint_id: complaintRef?.id || complaintId,
    message,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  // 1. Immediately save locally for 0ms perceived delay and offline resilience
  saveLocalNotification(notifObj);

  // 2. Sync to Supabase in background
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      complaint_id: complaintRef?.id || complaintId,
      message,
    });
  } catch (err) {
    console.warn("Notification insert skipped/failed:", err);
  }
}

/** Update a complaint's status, log history, attach after photo, and automatically notify the citizen. */
export async function updateStatus(
  complaint: Complaint,
  newStatus: Status,
  remarks: string,
  actorId: string,
  afterImageUrl?: string | null,
  lang: "en" | "hi" = "en",
) {
  const now = new Date().toISOString();
  const patch: Partial<Complaint> = {
    status: newStatus,
    remarks: remarks || complaint.remarks,
    resolved_at: newStatus === "resolved" ? now : complaint.resolved_at,
    updated_at: now,
  };

  if (afterImageUrl !== undefined) {
    patch.after_image_url = afterImageUrl;
  }

  // 1. Immediately update in unified local persistent store
  updateLocalComplaint(complaint.id, patch);

  // Cache after photo in localStorage keyed by both UUID and complaint code
  if (afterImageUrl) {
    try {
      localStorage.setItem(`infratrack_after_photo_${complaint.id}`, afterImageUrl);
      localStorage.setItem(`infratrack_resolution_photo_${complaint.id}`, afterImageUrl);
      if (complaint.complaint_id) {
        localStorage.setItem(`infratrack_after_photo_${complaint.complaint_id}`, afterImageUrl);
        localStorage.setItem(`infratrack_resolution_photo_${complaint.complaint_id}`, afterImageUrl);
      }
    } catch (e) {
      console.warn("Could not cache after photo in localStorage", e);
    }
  } else if (afterImageUrl === null) {
    try {
      localStorage.removeItem(`infratrack_after_photo_${complaint.id}`);
      localStorage.removeItem(`infratrack_resolution_photo_${complaint.id}`);
      if (complaint.complaint_id) {
        localStorage.removeItem(`infratrack_after_photo_${complaint.complaint_id}`);
        localStorage.removeItem(`infratrack_resolution_photo_${complaint.complaint_id}`);
      }
    } catch {
      // ignore
    }
  }

  // 2. Sync to Supabase in background
  try {
    const dbUpdate: Record<string, unknown> = {
      status: newStatus,
      remarks: remarks || complaint.remarks,
      resolved_at: newStatus === "resolved" ? now : complaint.resolved_at,
    };

    try {
      const payloadWithPhoto = afterImageUrl ? { ...dbUpdate, after_image_url: afterImageUrl } : dbUpdate;
      const { error } = await supabase
        .from("complaints")
        .update(payloadWithPhoto as any)
        .eq("id", complaint.id);

      if (error) {
        const { error: retryErr } = await supabase.from("complaints").update(dbUpdate).eq("id", complaint.id);
        if (retryErr) console.warn("Supabase updateStatus error:", retryErr);
      }
    } catch {
      await supabase.from("complaints").update(dbUpdate).eq("id", complaint.id);
    }

    await supabase.from("status_history").insert({
      complaint_id: complaint.id,
      old_status: complaint.status as Status,
      new_status: newStatus,
      changed_by: actorId,
      remarks: remarks || null,
    });
  } catch (err) {
    console.warn("Could not sync status update to Supabase (offline/network issue):", err);
  }

  // 3. Automatic Citizen Notification on Resolution or Status Change
  const targetUserId = complaint.user_id;
  if (targetUserId) {
    let notifMsg = "";
    if (newStatus === "resolved") {
      if (afterImageUrl) {
        notifMsg =
          lang === "hi"
            ? `आपकी शिकायत ${complaint.complaint_id} का फोटो प्रमाण सहित समाधान कर दिया गया है।`
            : `Your complaint ${complaint.complaint_id} has been resolved with photographic proof.`;
      } else {
        notifMsg =
          lang === "hi"
            ? `आपकी शिकायत ${complaint.complaint_id} का समाधान कर दिया गया है।`
            : `Your complaint ${complaint.complaint_id} has been resolved.`;
      }
    } else {
      notifMsg =
        lang === "hi"
          ? `आपकी शिकायत ${complaint.complaint_id} की स्थिति अब ${statusLabel(newStatus)} है।`
          : `Your complaint ${complaint.complaint_id} is now ${statusLabel(newStatus)}.`;
    }

    await notify(targetUserId, complaint.id, notifMsg, {
      id: complaint.id,
      complaint_id: complaint.complaint_id,
    });
  }
}

export {
  getBeforePhotoUrl,
  getAfterPhotoUrl,
  getComplaintBeforePhoto,
  resolveBeforePhotoUrl,
  resolveAfterPhotoUrl,
  getComplaintPhoto,
} from "@/lib/imageCompression";
