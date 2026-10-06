import { cookies } from "next/headers";
import { adminConfigured, SESSION_COOKIE, validSession } from "../lib/admin-auth.ts";
import { listPosts, readAllContent } from "../lib/database.ts";
import { AdminLogin } from "./login";
import { AdminDashboard } from "./dashboard";
import "./admin.css";

export const metadata = { title: "Admin", robots: { index: false, follow: false } };
export default async function AdminPage() {
  if (!validSession((await cookies()).get(SESSION_COOKIE)?.value)) return <AdminLogin configured={adminConfigured()} />;
  const [content, posts] = await Promise.all([readAllContent(), listPosts(true)]);
  return <AdminDashboard initialContent={content} initialPosts={posts} />;
}
