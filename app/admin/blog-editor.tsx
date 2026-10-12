"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import rehypeSanitize from "rehype-sanitize";
import { makeSlug, type BlogInput, type BlogPost } from "../lib/blog.ts";
import { contentUrl } from "../lib/content-schema.ts";
import { FallbackImage } from "../fallback-image";
import { uploadImage } from "./upload";
import { plainText } from "../lib/format-text.ts";

const MDEditor = dynamic(() => import("@uiw/react-md-editor/nohighlight"), { ssr: false, loading: () => <p>Loading editor…</p> });
type Draft = BlogInput & { id?: string; updated_at?: string };
const newDraft = (): Draft => ({ title: "", writer_name: "", slug: "", excerpt: "", main_image_url: "", main_image_alt: "", body: "", published: false });

export function BlogEditor({ posts, onPosts, onDirty }: {
  posts: BlogPost[]; onPosts: (posts: BlogPost[]) => void; onDirty: (dirty: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>(newDraft);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  function markDirty() { setDirty(true); onDirty(true); setNotice(""); setError(""); }
  function update(field: keyof BlogInput, value: string | boolean) {
    setDraft((current) => ({
      ...current, [field]: value,
      ...(field === "title" && !current.id && (!current.slug || current.slug === makeSlug(current.title)) ? { slug: makeSlug(String(value)) } : {}),
    }));
    markDirty();
  }
  function startNew() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setDraft(newDraft()); setDirty(false); onDirty(false); setNotice(""); setError("");
  }
  async function openPost(id: string) {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/posts/" + id);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDraft(result); setDirty(false); onDirty(false);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to load post."); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/posts" + (draft.id ? "/" + draft.id : ""), {
        method: draft.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDraft(newDraft()); onPosts([result, ...posts.filter((post) => post.id !== result.id)]);
      setDirty(false); onDirty(false);
      window.alert((result.published ? "Post saved and published." : "Draft saved.") + (result.slug !== draft.slug ? " URL adjusted to /blog/" + result.slug + "." : ""));
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save post."); }
    finally { setBusy(false); }
  }
  async function removePost() {
    if (!draft.id || !window.confirm("Permanently delete this blog post?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/posts/" + draft.id, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ updated_at: draft.updated_at }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onPosts(posts.filter((post) => post.id !== draft.id));
      setDraft(newDraft()); setDirty(false); onDirty(false); setNotice("Post deleted.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to delete post."); }
    finally { setBusy(false); }
  }
  async function attach(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError("");
    try {
      const url = await uploadImage(file);
      update("main_image_url", url);
      setNotice("Main image uploaded. Save the post to apply it.");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to upload image."); }
    finally { setBusy(false); }
  }
  return (
    <div>
      <div className="admin-section-heading"><div><h1>Blog</h1><p>Write an article, add images, and publish when ready.</p></div><button className="admin-secondary" type="button" onClick={startNew} disabled={busy}>+ New post</button></div>
      <div className="admin-content-layout admin-blog-layout">
        <aside className="admin-item-list" aria-label="Blog posts">
          {posts.map((post) => <button key={post.id} type="button" className={draft.id === post.id ? "active" : ""} disabled={busy} onClick={() => void openPost(post.id)}><span>{plainText(post.title)}</span><small>{post.published ? "Published" : "Draft"}</small></button>)}
          {!posts.length ? <p>No posts yet.</p> : null}
        </aside>
        <form className="admin-fields" onSubmit={save}>
          <div className="admin-item-heading"><h2>{draft.id ? "Edit post" : "New post"}</h2>{draft.id ? <button className="admin-danger" type="button" onClick={removePost} disabled={busy}>Delete post</button> : null}</div>
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          {notice ? <p className="admin-notice admin-toast" role="status" aria-atomic="true"><span>{notice}</span><button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></p> : null}
          <div className="admin-post-meta">
          <div className="admin-field"><label htmlFor="post-title">Title</label><input id="post-title" value={draft.title} onChange={(event) => update("title", event.target.value)} required maxLength={300} disabled={busy} /></div>
          <div className="admin-field"><label htmlFor="post-writer">Writer name</label><input id="post-writer" value={draft.writer_name} onChange={(event) => update("writer_name", event.target.value)} required maxLength={100} disabled={busy} /></div>
          <div className="admin-field"><label htmlFor="post-slug">Blog URL</label><div className="admin-slug"><span>/blog/</span><input id="post-slug" value={draft.slug} onChange={(event) => update("slug", event.target.value)} required maxLength={120} disabled={busy} /></div></div>
          <div className="admin-field"><label htmlFor="post-excerpt">Summary (Optional)</label><textarea id="post-excerpt" value={draft.excerpt} onChange={(event) => update("excerpt", event.target.value)} rows={2} maxLength={1000} disabled={busy} /></div>
          </div>
          <div className="admin-field"><label htmlFor="post-image-alt">Image description (Optional)</label><input id="post-image-alt" placeholder="Describe the main image" value={draft.main_image_alt} onChange={(event) => update("main_image_alt", event.target.value)} maxLength={500} disabled={busy} /></div>
          <div className="admin-field"><label htmlFor="post-image-url">Add main image (Optional)</label><input id="post-image-url" inputMode="url" placeholder="https://example.com/image.jpg" value={draft.main_image_url} onChange={(event) => update("main_image_url", event.target.value)} maxLength={2048} disabled={busy} /><label className="admin-upload-label" htmlFor="post-image">Or upload a file (Optional) <span>(JPEG, PNG, WebP or GIF · up to 3 MB)</span></label><input id="post-image" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { void attach(event.target.files?.[0]); event.target.value = ""; }} />{contentUrl(draft.main_image_url) ? <FallbackImage key={draft.main_image_url} src={draft.main_image_url} alt={draft.main_image_alt || "Main image preview"} className="admin-image-preview" /> : null}</div>
          <div className="admin-field" data-color-mode="light">
            <span className="admin-field-label" id="article-content-label">Article</span>
            <MDEditor value={draft.body} onChange={(value) => update("body", value || "")} preview="edit" height={340} visibleDragbar={false} previewOptions={{ rehypePlugins: [rehypeSanitize] }} textareaProps={{ "aria-labelledby": "article-content-label", disabled: busy }} />
          </div>
          <div className="admin-field admin-checkbox"><label htmlFor="post-published">Publish on website</label><input id="post-published" type="checkbox" checked={draft.published} onChange={(event) => update("published", event.target.checked)} disabled={busy} /></div>
          <div className="admin-post-actions"><button className="admin-primary" type="submit" disabled={busy || !dirty}>{busy ? "Please wait…" : draft.published ? "Save and publish" : "Save draft"}</button>{draft.id ? <Link href={"/admin/preview/" + draft.id} prefetch={false} target="_blank" rel="noreferrer">Preview saved post ↗</Link> : null}{draft.id && draft.published ? <Link href={"/blog/" + encodeURIComponent(draft.slug)} target="_blank" rel="noreferrer">View article ↗</Link> : null}<span>{dirty ? draft.id ? "Unsaved changes · Save to update preview" : "Unsaved changes" : ""}</span></div>
        </form>
      </div>
    </div>
  );
}
