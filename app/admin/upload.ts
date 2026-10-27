export async function uploadImage(file: File) {
  if (!file.size || file.size > 3 * 1024 * 1024) throw new Error("Choose an image of 3 MB or smaller.");
  const body = new FormData();
  body.set("file", file);
  const response = await fetch("/api/admin/media", { method: "POST", body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to upload image.");
  return result.url as string;
}

export const projectImage = { alt: "Project image", maxLength: 30000, limitError: "Keep the project description under 30,000 characters." };
export const blogImage = { alt: "Blog image", maxLength: 300000, limitError: "Keep the article under 300,000 characters." };

export function insertContentImage(text: string, url: string, position: number, { alt, maxLength, limitError } = projectImage) {
  const image = `\n\n![${alt}](${url})\n\n`;
  const value = text.slice(0, position) + image + text.slice(position);
  if (value.length > maxLength) throw new Error(limitError);
  return { value, cursor: position + image.length };
}
