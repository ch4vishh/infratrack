import { supabase } from "@/integrations/supabase/client";

/**
 * Fast Client-Side Image Compression using HTML5 <canvas>.
 * Resizes down to max 800px width/height maintaining aspect ratio and encodes
 * at 0.70 JPEG quality, consistently keeping file sizes under ~100 KB
 * so uploads complete in under a second and fit reliably in DB columns and cross-device sync.
 */
export async function compressImage(
  file: File | Blob,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.7,
): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            maxHeight = height;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not create canvas context"));
          return;
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = "image/jpeg";
        const dataUrl = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              reject(new Error("Could not export canvas blob"));
            }
          },
          mimeType,
          quality,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Attempts to upload an image to Supabase Storage ('complaint-images' bucket).
 * Gracefully returns null if the bucket is missing, unconfigured, or offline,
 * so caller can fall back cleanly without throwing network errors.
 */
export async function uploadComplaintImage(
  fileOrBlob: File | Blob,
  filenamePrefix = "issue",
): Promise<string | null> {
  try {
    const ext =
      fileOrBlob instanceof File && fileOrBlob.name.includes(".")
        ? fileOrBlob.name.split(".").pop()
        : fileOrBlob.type.includes("png")
          ? "png"
          : "jpg";
    const filename = `${filenamePrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `complaints/${filename}`;

    const { data, error } = await supabase.storage
      .from("complaint-images")
      .upload(filePath, fileOrBlob, {
        contentType: fileOrBlob.type || "image/jpeg",
        upsert: false,
      });

    if (error || !data) {
      console.warn(
        "[Storage] Upload complaint image returned error (bucket missing or inaccessible):",
        error?.message,
      );
      return null;
    }

    const { data: pubData } = supabase.storage
      .from("complaint-images")
      .getPublicUrl(filePath);

    return pubData?.publicUrl || null;
  } catch (err) {
    console.warn(
      "[Storage] uploadComplaintImage network exception, falling back to data URL:",
      err,
    );
    return null;
  }
}

/**
 * Saves a complaint photo with instant localStorage persistence.
 */
export async function saveComplaintPhoto(
  file: File | Blob,
  complaintId: string,
  type: "before" | "after",
): Promise<string> {
  const { dataUrl } = await compressImage(file, 800, 800, 0.7);

  // Always save to localStorage immediately for instant offline/zero-config fallback
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`infratrack_${type}_photo_${complaintId}`, dataUrl);
      localStorage.setItem(
        type === "before" ? `infratrack_photo_${complaintId}` : `infratrack_resolution_photo_${complaintId}`,
        dataUrl,
      );
    } catch (err) {
      console.warn("Could not save to localStorage (quota exceeded)", err);
    }
  }

  return dataUrl;
}

/**
 * Unified Photo Resolution Helper for Citizen "Before" Issue Photo.
 * Required across all Citizen & Authority views:
 * - Citizen My Complaints & Complaint Detail
 * - Authority Admin Dashboard, Manage Complaints table/cards, and Complaint Detail / Resolution Modal
 * - City / Infrastructure Map popups
 */
export function getBeforePhotoUrl(
  complaint: unknown,
  fallbackUrl?: string | null,
): string | null {
  if (!complaint) return fallbackUrl || null;

  // If passed directly as a string (URL, data URL, or ID)
  if (typeof complaint === "string") {
    const trimmed = complaint.trim();
    if (isValidImageUrlOrDataUrl(trimmed)) {
      return trimmed;
    }
    return resolveFromLocalStorage(trimmed, "before") || fallbackUrl || null;
  }

  const rec = complaint as Record<string, unknown>;

  // 1. Direct image URL / data URL fields on the complaint record
  const candidateFields = [
    rec.image_url,
    rec.before_photo_url,
    rec.before_image,
    rec.photo_url,
    rec.evidence_url,
    rec.attachment_url,
  ];

  for (const candidate of candidateFields) {
    if (typeof candidate === "string" && candidate.trim()) {
      const trimmed = candidate.trim();

      // Reject ephemeral blob: URLs (they cannot be loaded across devices or sessions)
      if (trimmed.startsWith("blob:")) {
        continue;
      }

      // Check if it's a valid Data URL
      if (trimmed.startsWith("data:image/")) {
        if (isValidDataUrl(trimmed)) {
          return trimmed;
        }
        continue;
      }

      // Check if it's a persistent web URL (http, https, absolute path)
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("/")
      ) {
        return trimmed;
      }

      // Check if it's a relative Supabase Storage path
      if (
        trimmed.includes("/") ||
        trimmed.endsWith(".jpg") ||
        trimmed.endsWith(".png") ||
        trimmed.endsWith(".webp")
      ) {
        try {
          const cleanPath = trimmed.replace(/^complaint-images\//, "");
          const { data } = supabase.storage.from("complaint-images").getPublicUrl(cleanPath);
          if (data?.publicUrl) {
            return data.publicUrl;
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // 2. localStorage fallback keys (checks id, complaint_id, and infratrack_complaints_cache)
  const id = typeof rec.id === "string" ? rec.id : null;
  const complaintIdCode = typeof rec.complaint_id === "string" ? rec.complaint_id : null;

  const localPhoto =
    (id ? resolveFromLocalStorage(id, "before") : null) ||
    (complaintIdCode ? resolveFromLocalStorage(complaintIdCode, "before") : null);

  if (localPhoto) return localPhoto;

  return fallbackUrl || null;
}

/**
 * Backward-compatible aliases for getBeforePhotoUrl
 */
export const getComplaintBeforePhoto = getBeforePhotoUrl;
export const resolveBeforePhotoUrl = getBeforePhotoUrl;

/**
 * Unified Photo Resolution Helper for Authority "After" Resolution Proof Photo.
 */
export function getAfterPhotoUrl(
  complaint: unknown,
  fallbackUrl?: string | null,
): string | null {
  if (!complaint) return fallbackUrl || null;

  if (typeof complaint === "string") {
    const trimmed = complaint.trim();
    if (isValidImageUrlOrDataUrl(trimmed)) {
      return trimmed;
    }
    return resolveFromLocalStorage(trimmed, "after") || fallbackUrl || null;
  }

  const rec = complaint as Record<string, unknown>;

  const candidateFields = [
    rec.after_image_url,
    rec.after_photo_url,
    rec.resolution_image_url,
    rec.after_image,
    rec.resolution_photo_url,
    rec.resolved_image_url,
  ];

  for (const candidate of candidateFields) {
    if (typeof candidate === "string" && candidate.trim()) {
      const trimmed = candidate.trim();
      // Reject ephemeral blob: URLs
      if (trimmed.startsWith("blob:")) {
        continue;
      }
      if (trimmed.startsWith("data:image/")) {
        if (isValidDataUrl(trimmed)) return trimmed;
        continue;
      }
      if (
        trimmed.startsWith("http://") ||
        trimmed.startsWith("https://") ||
        trimmed.startsWith("/")
      ) {
        return trimmed;
      }
      if (trimmed.includes("/") || trimmed.endsWith(".jpg") || trimmed.endsWith(".png")) {
        try {
          const cleanPath = trimmed.replace(/^complaint-images\//, "");
          const { data } = supabase.storage.from("complaint-images").getPublicUrl(cleanPath);
          if (data?.publicUrl) return data.publicUrl;
        } catch {
          // ignore
        }
      }
    }
  }

  const id = typeof rec.id === "string" ? rec.id : null;
  const complaintIdCode = typeof rec.complaint_id === "string" ? rec.complaint_id : null;

  const localPhoto =
    (id ? resolveFromLocalStorage(id, "after") : null) ||
    (complaintIdCode ? resolveFromLocalStorage(complaintIdCode, "after") : null);

  if (localPhoto) return localPhoto;

  return fallbackUrl || null;
}

/**
 * Backward-compatible alias for getAfterPhotoUrl
 */
export const resolveAfterPhotoUrl = getAfterPhotoUrl;

/**
 * Helper to check localStorage and cache for a given complaint ID or code.
 */
function resolveFromLocalStorage(keyId: string, type: "before" | "after"): string | null {
  if (typeof window === "undefined" || !window.localStorage) return null;

  const keys = [
    `infratrack_${type}_photo_${keyId}`,
    type === "before" ? `infratrack_photo_${keyId}` : `infratrack_resolution_photo_${keyId}`,
    `infratrack_image_${keyId}`,
    `infratrack_evidence_${keyId}`,
    `infratrack_complaint_photo_${keyId}`,
  ];

  for (const k of keys) {
    try {
      const val = localStorage.getItem(k);
      if (val && typeof val === "string") {
        const trimmed = val.trim();
        if (trimmed.startsWith("blob:")) continue;
        if (trimmed.startsWith("data:image/")) {
          if (isValidDataUrl(trimmed)) return trimmed;
        } else if (
          trimmed.startsWith("http://") ||
          trimmed.startsWith("https://") ||
          trimmed.startsWith("/")
        ) {
          return trimmed;
        }
      }
    } catch {
      // ignore
    }
  }

  // Also check shared infratrack_complaints_cache and infratrack_local_complaints stores
  const storeKeys = ["infratrack_complaints_cache", "infratrack_local_complaints"];
  for (const storeKey of storeKeys) {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const found = parsed.find(
            (c: any) => c && (c.id === keyId || c.complaint_id === keyId),
          );
          if (found) {
            const candidate =
              type === "before"
                ? found.image_url || found.before_photo_url || found.before_image
                : found.after_image_url || found.after_photo_url || found.resolution_image_url || found.after_image;
            if (candidate && typeof candidate === "string") {
              const trimmed = candidate.trim();
              if (trimmed.startsWith("blob:")) continue;
              if (trimmed.startsWith("data:image/")) {
                if (isValidDataUrl(trimmed)) return trimmed;
              } else if (
                trimmed.startsWith("http://") ||
                trimmed.startsWith("https://") ||
                trimmed.startsWith("/")
              ) {
                return trimmed;
              }
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

/**
 * Validates that a string is a well-formed data URL and not truncated.
 */
function isValidDataUrl(str: string): boolean {
  if (!str.startsWith("data:image/")) return false;
  const commaIdx = str.indexOf(",");
  if (commaIdx === -1) return false;
  const base64Data = str.slice(commaIdx + 1);
  return base64Data.length > 200 && !base64Data.endsWith("...");
}

/**
 * Checks if a string is a valid web or data URL (never ephemeral blob).
 */
export function isValidImageUrlOrDataUrl(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  const trimmed = str.trim();
  if (trimmed.startsWith("blob:")) return false;
  if (trimmed.startsWith("data:image/")) {
    return isValidDataUrl(trimmed);
  }
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  );
}

/**
 * Retrieves a stored photo for a complaint (backwards-compatible wrapper).
 */
export function getComplaintPhoto(
  complaintIdOrObj: unknown,
  type: "before" | "after",
  fallbackUrl?: string | null,
): string | null {
  if (type === "after") {
    return getAfterPhotoUrl(complaintIdOrObj, fallbackUrl);
  }
  return getBeforePhotoUrl(complaintIdOrObj, fallbackUrl);
}
