import { createClient } from "@/lib/supabase/client";

const BUCKET = "img-bucket";
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

// Resize and re-encode as JPEG so uploads stay small.
async function toJpeg(file: File, maxSize = 1280): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that image. Try a JPEG or PNG.");
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't process that image.");

  ctx.fillStyle = "#fff"; // PNG transparency becomes white instead of black
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't process that image."))),
      "image/jpeg",
      0.85,
    ),
  );
}

/** Uploads to img-bucket and returns the public URL. */
export async function uploadPhoto(file: File, folder: "items" | "crafts"): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You need to be signed in to upload photos.");

  const blob = await toJpeg(file);
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
  });
  if (error) {
    console.error("Photo upload failed", error.message);
    throw new Error("Couldn't upload that photo.");
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Best-effort cleanup of a previously uploaded photo. Never throws. */
export async function removePhoto(url: string | null | undefined) {
  if (!url) return;
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split("?")[0]);
  try {
    await createClient().storage.from(BUCKET).remove([path]);
  } catch {
    /* ignore */
  }
}