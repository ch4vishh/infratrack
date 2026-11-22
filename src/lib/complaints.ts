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

export const LOCAL_COMPLAINTS_KEY = "infratrack_local_complaints";

/** Read all locally stored / offline submitted complaints */
export function getLocalComplaints(): Complaint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_COMPLAINTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Complaint[]) : [];
  } catch (err) {
    console.warn("Could not read local complaints from localStorage", err);
    return [];
  }
}

/** Save or update a complaint in the local persistent store */
export function saveLocalComplaint(complaint: Complaint): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getLocalComplaints();
    const idx = existing.findIndex(
      (c) => c.id === complaint.id || (c.complaint_id && c.complaint_id === complaint.complaint_id),
    );
    if (idx >= 0) {
      existing[idx] = { ...existing[idx], ...complaint };
    } else {
      existing.unshift(complaint);
    }
    localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(existing));
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
      localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(existing));
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

/** Fetch complaints: queries Supabase and seamlessly merges local/offline submissions */
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

  // Local complaints are prioritized (user's immediate latest actions)
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

export async function notify(userId: string, complaintId: string, message: string) {
  try {
    await supabase.from("notifications").insert({
      user_id: userId,
      complaint_id: complaintId,
      message,
    });
  } catch (err) {
    console.warn("Notification insert skipped/failed:", err);
  }
}

/** Update a complaint's status, log history and notify the reporter. */
export async function updateStatus(
  complaint: Complaint,
  newStatus: Status,
  remarks: string,
  actorId: string,
) {
  // 1. Immediately update in local persistent store
  updateLocalComplaint(complaint.id, {
    status: newStatus,
    remarks: remarks || complaint.remarks,
    resolved_at: newStatus === "resolved" ? new Date().toISOString() : complaint.resolved_at,
    updated_at: new Date().toISOString(),
  });

  // 2. Sync to Supabase if connected
  try {
    const { error } = await supabase
      .from("complaints")
      .update({
        status: newStatus,
        remarks: remarks || complaint.remarks,
        resolved_at: newStatus === "resolved" ? new Date().toISOString() : complaint.resolved_at,
      })
      .eq("id", complaint.id);

    if (error) {
      console.warn("Supabase updateStatus error:", error);
    }

    await supabase.from("status_history").insert({
      complaint_id: complaint.id,
      old_status: complaint.status as Status,
      new_status: newStatus,
      changed_by: actorId,
      remarks: remarks || null,
    });

    if (complaint.user_id) {
      await notify(
        complaint.user_id,
        complaint.id,
        `${complaint.complaint_id} is now ${statusLabel(newStatus)}.`,
      );
    }
  } catch (err) {
    console.warn("Could not sync status update to Supabase (offline/network issue):", err);
  }
}

export { getComplaintBeforePhoto, resolveBeforePhotoUrl } from "@/lib/imageCompression";
