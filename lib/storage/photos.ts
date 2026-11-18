import { createClient } from "@/lib/supabase/client";

// TODO: confirm all three with your teammates
export const PHOTO_BUCKET = "photos";
const BUCKET_IS_PUBLIC = true; // if false, see the note below
const MAX_DIMENSION = 1280; // px, longest side
const JPEG_QUALITY = 0.8;

export class PhotoError extends Error {}

/** Shrinks any image to a JPEG blob (also fine for /api/scan: JPEG, well under 10 MB). */
export async function downscaleImage(file: Blob): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // "from-image" applies EXIF rotation, so phone photos aren't sideways
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError("That image format isn't supported. Try a JPEG or PNG.");
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Could not process the image.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) throw new PhotoError("Could not process the image.");
  return blob;
}

/** Downscales, uploads to Supabase Storage, and returns the string to send as photo_url. */
export async function uploadPhoto(file: Blob): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new PhotoError("You need to be signed in to upload photos.");

  const jpeg = await downscaleImage(file);
  const path = `${user.id}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, jpeg, { contentType: "image/jpeg" });
  if (error) throw new PhotoError("Could not upload the photo. Try again.");

  if (BUCKET_IS_PUBLIC) {
    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
  }
  return path; // private bucket: store the path, and turn it into a signed URL when displaying
}