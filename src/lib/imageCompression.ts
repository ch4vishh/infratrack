import { supabase } from "@/integrations/supabase/client";

/**
 * Compresses an image file client-side using an HTML5 <canvas>.
 * Resizes down to max dimensions (maintaining aspect ratio) and encodes as JPEG.
 */
export async function compressImage(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82,
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

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              reject(new Error("Could not export canvas blob"));
            }
          },
          "image/jpeg",
          quality,
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads a complaint photo with seamless localStorage fallback.
 */
export async function saveComplaintPhoto(
  file: File,
  complaintId: string,
  type: "before" | "after",
): Promise<string> {
  const { dataUrl, blob } = await compressImage(file);

  // Always save to localStorage immediately for instant offline/zero-config fallback
  try {
    localStorage.setItem(`infratrack_${type}_photo_${complaintId}`, dataUrl);
  } catch (err) {
    console.warn("Could not save to localStorage (quota exceeded)", err);
  }

  // Try to upload to Supabase storage if the bucket exists
  try {
    const fileName = `${complaintId}/${type}-${Date.now()}.jpg`;
    const { data, error } = await supabase.storage.from("complaint-images").upload(fileName, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

    if (!error && data) {
      const { data: pubData } = supabase.storage.from("complaint-images").getPublicUrl(data.path);
      if (pubData?.publicUrl) {
        return pubData.publicUrl;
      }
    }
  } catch (err) {
    console.warn("Supabase Storage upload fallback to local dataUrl", err);
  }

  return dataUrl;
}

/**
 * Retrieves a stored photo for a complaint (from localStorage or database fallback).
 */
export function getComplaintPhoto(
  complaintId: string,
  type: "before" | "after",
  fallbackUrl?: string | null,
): string | null {
  try {
    const local = localStorage.getItem(`infratrack_${type}_photo_${complaintId}`);
    if (local) return local;
  } catch {
    // ignore
  }
  return fallbackUrl || null;
}
