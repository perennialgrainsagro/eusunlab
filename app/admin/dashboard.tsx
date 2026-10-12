"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { contentTabs, type ContentRecord, type ContentTab } from "../lib/content-schema.ts";
import type { BlogPost } from "../lib/blog.ts";
import { ContentEditor } from "./content-editor";
import { BlogEditor } from "./blog-editor";

export function AdminDashboard({ initialContent, initialPosts }: { initialContent: ContentRecord[]; initialPosts: BlogPost[] }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [posts, setPosts] = useState(initialPosts);
  const [tab, setTab] = useState<ContentTab | "Blog">("Settings");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function switchTab(next: ContentTab | "Blog") {
    if (next === tab || (dirty && !window.confirm("Discard unsaved changes?"))) return;
    setDirty(false);
    setTab(next);
    window.scrollTo({ top: 0 });
  }
  async function logout() {
    if (dirty && !window.confirm("Discard unsaved changes and sign out?")) return;
    setDirty(false);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });
      if (!response.ok && response.status !== 401) throw new Error();
      router.refresh();
    } catch { setError("Unable to sign out. Please try again."); }
  }
  const record = content.find((record) => record.tab === tab);
  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div><span className="admin-eyebrow">EUSUN HAN&apos;S LAB</span><strong>Content dashboard</strong></div>
        <div className="admin-header-links"><button type="button" onClick={logout}>Sign out</button></div>
      </header>
      <div className="admin-layout">
        <nav className="admin-sidebar" aria-label="Content sections">
          {(Object.keys(contentTabs) as ContentTab[]).map((name) => <button className={tab === name ? "active" : ""} aria-current={tab === name ? "page" : undefined} key={name} type="button" onClick={() => switchTab(name)}>{contentTabs[name].label}</button>)}
          <button className={tab === "Blog" ? "active" : ""} aria-current={tab === "Blog" ? "page" : undefined} type="button" onClick={() => switchTab("Blog")}>Blog</button>
        </nav>
        <main className="admin-main">
          <p className="admin-formatting-hint">Text fields support <code>**text**</code> for bold and <code>[text](https://example.com)</code> for links. Formatting appears on the website after saving. Enter URLs, email addresses, and dates in their usual format.</p>
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          {tab === "Blog" ? <BlogEditor posts={posts} onPosts={setPosts} onDirty={setDirty} /> : record ? (
            <ContentEditor key={record.tab} record={record} onDirty={setDirty} onSaved={(saved) => {
              setContent((records) => records.map((record) => record.tab === saved.tab ? saved : record));
            }} />
          ) : <p>This content section has not been imported yet.</p>}
        </main>
      </div>
    </div>
  );
}
