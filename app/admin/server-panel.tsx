"use client";

import { useEffect, useState } from "react";
import { FallbackImage } from "../fallback-image";

// Neon Free plan storage limit (checked 2026-10); update if the plan changes.
const STORAGE_LIMIT = 1024 ** 3;
type Usage = {
  database_bytes: number;
  tables: { name: string; bytes: number }[];
  media: { count: number; bytes: number };
  unused: { id: string; content_type: string; bytes: number; created_at: string }[];
};

function size(bytes: number) {
  return bytes < 1024 * 1024 ? Math.round(bytes / 1024) + " kB" : (bytes / 1024 / 1024).toFixed(1) + " MB";
}

async function request(init?: RequestInit) {
  const response = await fetch("/api/admin/server", init);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Unable to reach the server.");
  return result;
}

export function ServerPanel() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  function load() {
    return request().then(setUsage, (error) => setError(error instanceof Error ? error.message : "Unable to load server usage.")).finally(() => setBusy(false));
  }
  useEffect(() => { void load(); }, []);
  async function removeImages(images: Usage["unused"]) {
    if (!images.length) return;
    const total = size(images.reduce((sum, image) => sum + image.bytes, 0));
    if (!window.confirm(`Permanently delete ${images.length === 1 ? "this unused image" : images.length + " unused images"} (${total})? This cannot be undone.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const { deleted } = await request({ method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: images.map((image) => image.id) }) });
      setNotice((deleted.length === 1 ? "1 image" : deleted.length + " images") + " removed." + (deleted.length < images.length ? " Images that came into use meanwhile were kept." : ""));
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to remove images."); }
    await load();
  }
  const unusedBytes = usage?.unused.reduce((sum, image) => sum + image.bytes, 0) ?? 0;
  return (
    <>
      <div className="admin-section-heading"><div><h1>Server</h1><p>Database storage and uploaded images.</p></div><div className="admin-section-actions"><button className="admin-secondary" type="button" disabled={busy} onClick={() => { setBusy(true); setNotice(""); setError(""); void load(); }}>Refresh</button></div></div>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
      {!usage ? <p>{busy ? "Loading…" : null}</p> : <>
        <h2 className="admin-settings-heading">Storage</h2>
        <label className="admin-field-label" htmlFor="server-storage">Database: {size(usage.database_bytes)} of {size(STORAGE_LIMIT)} ({(usage.database_bytes / STORAGE_LIMIT * 100).toFixed(1)}%)</label>
        <meter id="server-storage" className="admin-server-meter" min={0} max={STORAGE_LIMIT} high={STORAGE_LIMIT * 0.8} value={usage.database_bytes} />
        <p className="admin-server-hint">Compared with the Neon Free plan limit. PostgreSQL itself uses a few MB; the Neon console can show more because it includes change history.</p>
        <ul className="admin-server-list">
          {usage.tables.map((table) => <li key={table.name}><span>{table.name}{table.name === "media" ? ` · ${usage.media.count} images (${size(usage.media.bytes)})` : ""}</span><span>{size(table.bytes)}</span></li>)}
        </ul>
        <h2 className="admin-settings-heading">Unused images</h2>
        <p className="admin-server-hint">Uploaded more than a day ago and not used by any content section or blog post, including drafts. Replaced images stay stored until removed here.</p>
        {usage.unused.length ? <>
          <ul className="admin-server-images">
            {usage.unused.map((image) => <li key={image.id}>
              <FallbackImage src={"/media/" + image.id} alt="Unused uploaded image" className="admin-image-preview" />
              <small>{size(image.bytes)} · {image.created_at.slice(0, 10)}</small>
              <button className="admin-secondary admin-server-remove-one" type="button" disabled={busy} onClick={() => removeImages([image])} aria-label={`Remove unused image from ${image.created_at.slice(0, 10)} (${size(image.bytes)})`}>Remove</button>
            </li>)}
          </ul>
          <button className="admin-primary admin-server-remove" type="button" disabled={busy} onClick={() => removeImages(usage.unused)}>Remove all {usage.unused.length} unused images ({size(unusedBytes)})</button>
        </> : <p>No unused images.</p>}
      </>}
    </>
  );
}
