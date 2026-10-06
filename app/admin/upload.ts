export async function uploadImage(file: File) {
  if (!file.size || file.size > 3 * 1024 * 1024) throw new Error("Choose an image of 3 MB or smaller.");
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/admin/media", { method: "POST", body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to upload image.");
  return result.url as string;
}
