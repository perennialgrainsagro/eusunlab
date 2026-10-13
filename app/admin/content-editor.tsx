"use client";

import dynamic from "next/dynamic";
import rehypeSanitize from "rehype-sanitize";
import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import { choiceField, contentOptions, contentTabs, contentUrl, DEFAULT_STUDENT_PHOTO_URL, fieldKind, fieldLabel, markdownUrl, renameContentOption, reorderList, reorderRows, validateOptions, type ContentRecord } from "../lib/content-schema.ts";
import type { SheetRow } from "../lib/types.ts";
import { FallbackImage } from "../fallback-image";
import { insertContentImage, uploadImage } from "./upload";
import { plainText } from "../lib/format-text.ts";

const MDEditor = dynamic(() => import("@uiw/react-md-editor/nohighlight"), { ssr: false, loading: () => <p>Loading editor…</p> });

function visible(value: unknown) {
  return !["false", "0", "no", "hidden"].includes(String(value).trim().toLowerCase());
}
function dateValue(value: unknown) {
  const text = String(value || "");
  const parts = /^Date\((\d{4}),(\d{1,2}),(\d{1,2})\)$/.exec(text);
  if (parts) return parts[1] + "-" + String(Number(parts[2]) + 1).padStart(2, "0") + "-" + parts[3].padStart(2, "0");
  return text.slice(0, 10);
}
function rowName(row: SheetRow, index: number) {
  return plainText(String(row.title || row.name || row.section || row.content || "Item " + (index + 1))).slice(0, 100);
}
type SortTarget = { kind: "item" | "option"; index: number };

export function ContentEditor({ record, onSaved, onDirty }: {
  record: ContentRecord; onSaved: (record: ContentRecord) => void; onDirty: (dirty: boolean) => void;
}) {
  const [rows, setRows] = useState(record.rows);
  const [selected, setSelected] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const managedField = choiceField(record.tab);
  const [options, setOptions] = useState(() => contentOptions(record));
  const [optionName, setOptionName] = useState("");
  const [optionError, setOptionError] = useState("");
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const optionInput = useRef<HTMLInputElement>(null);
  const detailsTextarea = useRef<HTMLTextAreaElement | null>(null);
  const contentImageInput = useRef<HTMLInputElement>(null);
  const optionsDialog = useRef<HTMLDialogElement>(null);
  const dragged = useRef<SortTarget | null>(null);
  const [dropTarget, setDropTarget] = useState<SortTarget | null>(null);
  const sortable = record.tab !== "Settings" && record.tab !== "Professor";
  function markDirty() {
    setDirty(true); onDirty(true); setNotice(""); setError("");
  }
  function changeRows(next: SheetRow[]) {
    setRows(next); markDirty();
  }
  function updateCell(index: number, field: string, value: unknown) {
    setRows((current) => current.map((row, position) => position === index ? { ...row, [field]: value } : row));
    markDirty();
  }
  function addRow() {
    const row: SheetRow = Object.fromEntries(contentTabs[record.tab].fields.map((field) => [field, field === managedField ? options[0] || "" : field === "visible" ? true : field === "display_order" || field === "order" ? rows.length + 1 : ""]));
    if (record.tab === "Students") row.photo_url = DEFAULT_STUDENT_PHOTO_URL;
    if (record.tab === "News") {
      const today = new Date();
      row.month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    }
    changeRows(reorderRows(record.tab, [...rows, row], rows.length, 0)); setSelected(0);
  }
  function deleteRow() {
    if (!window.confirm("Remove this item? It will be deleted when you save.")) return;
    changeRows(rows.filter((_, index) => index !== selected));
    setSelected(Math.max(0, selected - 1));
  }
  function moveRow(from: number, to: number) {
    if (busy) return;
    const next = reorderRows(record.tab, rows, from, to);
    if (next === rows) return;
    changeRows(next);
    setSelected(selected === from ? to : selected + (from < selected && selected <= to ? -1 : to <= selected && selected < from ? 1 : 0));
    setNotice("Item moved to position " + (to + 1) + ". Save changes to apply the new order.");
  }
  function pointerTarget(event: PointerEvent<HTMLButtonElement>, kind: SortTarget["kind"]) {
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-" + kind + "-index]");
    return row ? Number(row.getAttribute("data-" + kind + "-index")) : null;
  }
  function moveOption(from: number, to: number) {
    if (busy) return;
    const next = reorderList(options, from, to);
    if (next === options) return;
    setOptions(next); setOptionError(""); markDirty();
  }
  function dragHandle(kind: SortTarget["kind"], index: number, count: number) {
    return <button className="admin-drag-handle" type="button" aria-label={"Drag " + (kind === "item" ? "item " + (index + 1) : managedField + " " + options[index]) + " to reorder"} aria-describedby={count > 1 ? kind === "item" ? "item-sort-hint" : "option-sort-hint" : undefined} disabled={busy || count < 2}
      onPointerDown={(event) => { if (!event.isPrimary || event.button !== 0) return; event.preventDefault(); dragged.current = { kind, index }; setDropTarget({ kind, index }); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => { if (event.isPrimary && dragged.current?.kind === kind) { const target = pointerTarget(event, kind); setDropTarget(target === null ? null : { kind, index: target }); } }}
      onPointerUp={(event) => { if (!event.isPrimary) return; const target = pointerTarget(event, kind); if (dragged.current?.kind === kind && target !== null) (kind === "item" ? moveRow : moveOption)(dragged.current.index, target); dragged.current = null; setDropTarget(null); }}
      onPointerCancel={(event) => { if (event.isPrimary) { dragged.current = null; setDropTarget(null); } }}><span aria-hidden="true">⠿</span></button>;
  }
  function submitOption(event: FormEvent) {
    event.preventDefault();
    try {
      if (editingOption === null) {
        setOptions(validateOptions(record.tab, [...options, optionName], rows));
      } else {
        const renamed = renameContentOption(record.tab, options, rows, editingOption, optionName);
        setOptions(renamed.options); setRows(renamed.rows);
      }
      setEditingOption(null); setOptionName(""); setOptionError(""); markDirty();
    } catch (error) { setOptionError(error instanceof Error ? error.message : "Unable to save this name."); }
  }
  function deleteOption(name: string) {
    try {
      setOptions(validateOptions(record.tab, options.filter((option) => option !== name), rows));
      if (editingOption === name) { setEditingOption(null); setOptionName(""); }
      setOptionError(""); markDirty();
    } catch (error) { setOptionError(error instanceof Error ? error.message : "Unable to delete this name."); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/content/" + record.tab, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, updated_at: record.updated_at, ...(managedField ? { options } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setRows(result.rows); onDirty(false); setDirty(false); setNotice("Changes saved."); onSaved(result);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save."); }
    finally { setBusy(false); }
  }
  async function attach(file: File | undefined, index: number, field: string) {
    if (!file) return;
    const contentImage = record.tab === "Projects" && field === "details";
    const text = String(rows[index].details || "");
    const textarea = detailsTextarea.current?.isConnected && detailsTextarea.current.id === `Projects-${index}-details` ? detailsTextarea.current : null;
    const position = textarea?.selectionEnd ?? text.length;
    setBusy(true); setError("");
    try {
      const url = await uploadImage(file);
      if (contentImage) {
        const insertion = insertContentImage(text, url, position);
        updateCell(index, "details", insertion.value);
        requestAnimationFrame(() => {
          textarea?.focus();
          textarea?.setSelectionRange(insertion.cursor, insertion.cursor);
        });
      } else updateCell(index, field, url);
    }
    catch (error) { setError(error instanceof Error ? error.message : "Unable to upload."); }
    finally { setBusy(false); }
  }
  function field(index: number, name: string, label = fieldLabel(name)) {
    const row = rows[index];
    const settingKey = name === "value" ? String(row.key) : name;
    const kind = fieldKind(settingKey);
    const id = record.tab + "-" + index + "-" + name;
    const image = ["image_url", "preview_image_url", "photo_url", "hero_image_url"].includes(settingKey);
    const previewImage = record.tab === "Projects" && name === "preview_image_url";
    const projectDetails = record.tab === "Projects" && name === "details";
    return (
      <div className={"admin-field " + (kind === "checkbox" ? "admin-checkbox" : "")} key={id} data-color-mode="light">
        <label htmlFor={id}>{label}</label>
        {projectDetails ? <MDEditor value={String(row[name] ?? "")} onChange={(value) => updateCell(index, name, value || "")} preview="live" height={340} visibleDragbar={false} previewOptions={{ rehypePlugins: [rehypeSanitize], urlTransform: markdownUrl }} textareaProps={{ id, disabled: busy, maxLength: 30000, onFocus: (event) => { detailsTextarea.current = event.currentTarget; }, onSelect: (event) => { detailsTextarea.current = event.currentTarget; } }} commandsFilter={(command) => command.name === "image" ? {
          ...command,
          buttonProps: { ...command.buttonProps, "aria-label": "Upload and insert image", title: "Upload and insert image", disabled: busy },
          execute: () => { if (!busy) contentImageInput.current?.click(); },
        } : command} /> : name === managedField ? <select id={id} value={String(row[name] ?? "").trim()} disabled={busy} onChange={(event) => updateCell(index, name, event.target.value)}><option value="">Select a {managedField}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select> : kind === "checkbox" ? <input id={id} type="checkbox" checked={visible(row[name])} onChange={(event) => updateCell(index, name, event.target.checked)} /> :
          kind === "textarea" || (name === "value" && ["introduction", "research_intro", "publications_intro"].includes(settingKey)) ? (
            <textarea id={id} value={String(row[name] ?? "")} rows={4} onChange={(event) => updateCell(index, name, event.target.value)} maxLength={30000} aria-describedby={name === "short_bio" ? id + "-hint" : undefined} placeholder={name === "short_bio" ? "Introduce this member and describe their research or role in the lab." : undefined} />
          ) : <input id={id} type={kind === "url" ? "text" : kind} inputMode={kind === "url" ? "url" : undefined} value={kind === "date" ? dateValue(row[name]) : String(row[name] ?? "")} onChange={(event) => updateCell(index, name, event.target.value)} aria-describedby={previewImage ? id + "-hint" : undefined} />}
        {previewImage ? <p id={id + "-hint"}>Optional. Used in the Projects list. If empty, the cover or first image in Details is used. With no images, the list shows Preview coming soon.</p> : null}
        {name === "short_bio" ? <p id={id + "-hint"}>Optional. Shown in the Members list. Put each paragraph on a new line; use **text** for bold and [text](url) for links.</p> : null}
        {projectDetails ? <div className="admin-image-field">
          <p>Place the cursor in Details, then use the image toolbar button or upload below to insert an image there. The preview shows the uploaded image. Save changes to keep it in the project.</p>
          <label htmlFor={id + "-file"} className="admin-upload-label">Insert content image <span>(JPEG, PNG, WebP or GIF · up to 3 MB)</span></label>
          <input ref={contentImageInput} id={id + "-file"} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { void attach(event.target.files?.[0], index, name); event.target.value = ""; }} />
        </div> : null}
        {record.tab === "Projects" && name === "video_url" ? <p>Paste a YouTube link or a direct MP4, WebM, or Ogg file URL. The player appears below the description.</p> : null}
        {record.tab === "Projects" && name === "video_captions_url" ? <p>Optional WebVTT (.vtt) captions for direct video files with spoken content.</p> : null}
        {image ? (
          <div className="admin-image-field">
            {row[name] && contentUrl(String(row[name])) ? <FallbackImage key={String(row[name])} src={String(row[name])} alt="Selected image preview" className="admin-image-preview" /> : null}
            <label htmlFor={id + "-file"} className="admin-upload-label">{previewImage ? "Upload preview image" : "Upload image"} <span>(JPEG, PNG, WebP or GIF · up to 3 MB)</span></label>
            <input id={id + "-file"} type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={(event) => { void attach(event.target.files?.[0], index, name); event.target.value = ""; }} />
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <>
    <form onSubmit={save}>
      <div className="admin-section-heading"><div><h1>{contentTabs[record.tab].label}</h1><p>{dirty ? "Unsaved changes" : "Edit content, then save to update the website."}</p></div><div className="admin-section-actions">{managedField ? <button className="admin-secondary" type="button" disabled={busy} onClick={() => { setEditingOption(null); setOptionName(""); setOptionError(""); optionsDialog.current?.showModal(); }}>Manage {managedField === "group" ? "groups" : "categories"}</button> : null}<button className="admin-primary" type="submit" disabled={busy || !dirty}>{busy ? "Please wait…" : "Save changes"}</button></div></div>
      {record.tab === "Research" ? <p>The first three visible research items also appear as Home cards, ordered by Display order.</p> : null}
      {record.tab === "Projects" ? <p>Introduce each project with a summary, a Markdown description with images, and an optional video. Replace the example content with your actual projects.</p> : null}
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      {notice ? <p className="admin-notice" role="status">{notice}</p> : null}
      {record.tab === "Settings" ? <div className="admin-settings-grid">{rows.map((row, index) => field(index, "value", fieldLabel(String(row.key))))}</div> : (
        <div className="admin-content-layout">
          <aside className="admin-item-list" aria-label="Items">
            {sortable ? <button className="admin-secondary" type="button" onClick={addRow} disabled={busy}>+ Add item</button> : null}
            {sortable && rows.length > 1 ? <p className="admin-sort-hint" id="item-sort-hint">Drag the handles or use the arrows to reorder, then save.</p> : null}
            {rows.map((row, index) => (
              <div key={index} data-item-index={index} className={"admin-item-row " + (dropTarget?.kind === "item" && dropTarget.index === index ? "drop-target" : "")}>
                {sortable ? dragHandle("item", index, rows.length) : null}
                <button className={"admin-item-select " + (selected === index ? "active" : "")} aria-pressed={selected === index} type="button" onClick={() => setSelected(index)} disabled={busy}>
                  <span>{rowName(row, index)}</span>
                  {!visible(row.visible) ? <small>Hidden</small> : null}
                </button>
                {sortable ? <div className="admin-order-buttons"><button type="button" aria-label={"Move item " + (index + 1) + " up"} disabled={busy || index === 0} onClick={() => moveRow(index, index - 1)}>↑</button><button type="button" aria-label={"Move item " + (index + 1) + " down"} disabled={busy || index === rows.length - 1} onClick={() => moveRow(index, index + 1)}>↓</button></div> : null}
              </div>
            ))}
          </aside>
          {rows[selected] ? <div className="admin-fields"><div className="admin-item-heading"><h2>Item {selected + 1}</h2>{sortable ? <button className="admin-danger" type="button" disabled={busy} onClick={deleteRow}>Remove item</button> : null}</div>{contentTabs[record.tab].fields.map((name) => field(selected, name))}</div> : <div className="admin-empty">{sortable ? "No items yet. Add an item to get started." : "Professor profile has not been imported yet."}</div>}
        </div>
      )}
    </form>
    {managedField ? <dialog ref={optionsDialog} className="admin-options-dialog" aria-labelledby="options-title">
      <div className="admin-item-heading"><h2 id="options-title">Manage {managedField === "group" ? "groups" : "categories"}</h2><button className="admin-secondary" type="button" onClick={() => optionsDialog.current?.close()}>Close</button></div>
      <p>Renaming also updates items that use the name. Changes apply when you save this section. Reassign items before deleting a name they use.</p>
      {options.length > 1 ? <p className="admin-sort-hint" id="option-sort-hint">Drag the handles or use the arrows to reorder groups or categories. This order also applies on the website.</p> : null}
      <ul className="admin-option-list">
        {options.map((option, index) => {
          const count = rows.filter((row) => String(row[managedField] ?? "").trim() === option).length;
          return <li key={option} data-option-index={index} className={dropTarget?.kind === "option" && dropTarget.index === index ? "drop-target" : undefined}>{dragHandle("option", index, options.length)}<span>{option}<small>{count ? count + (count === 1 ? " item" : " items") + " · In use" : "Unused"}</small></span><div className="admin-order-buttons"><button type="button" aria-label={"Move " + managedField + " " + option + " up"} disabled={busy || index === 0} onClick={() => moveOption(index, index - 1)}>↑</button><button type="button" aria-label={"Move " + managedField + " " + option + " down"} disabled={busy || index === options.length - 1} onClick={() => moveOption(index, index + 1)}>↓</button></div><div className="admin-option-actions"><button className="admin-secondary" type="button" aria-label={"Rename " + managedField + " " + option} disabled={busy} onClick={() => { setEditingOption(option); setOptionName(option); setOptionError(""); optionInput.current?.focus(); }}>Rename</button><button className="admin-danger" type="button" aria-label={"Delete " + managedField + " " + option} disabled={count > 0 || busy} onClick={() => deleteOption(option)}>Delete</button></div></li>;
        })}
      </ul>
      {!options.length ? <p>No {managedField === "group" ? "groups" : "categories"} yet. Add one below.</p> : null}
      <form onSubmit={submitOption}>
        <div className="admin-field"><label htmlFor="new-content-option">{editingOption === null ? "New " + managedField : 'New name for "' + editingOption + '"'}</label><div className="admin-option-add"><input ref={optionInput} id="new-content-option" value={optionName} onChange={(event) => { setOptionName(event.target.value); setOptionError(""); }} maxLength={200} required disabled={busy} aria-invalid={!!optionError} aria-describedby={optionError ? "content-option-error" : undefined} /><button className="admin-primary" type="submit" disabled={busy}>{editingOption === null ? "Add " : "Rename "}{managedField}</button></div></div>
        {editingOption !== null ? <button className="admin-secondary" type="button" disabled={busy} onClick={() => { setEditingOption(null); setOptionName(""); setOptionError(""); }}>Cancel rename</button> : null}
        {optionError ? <p id="content-option-error" className="admin-error" role="alert">{optionError}</p> : null}
      </form>
    </dialog> : null}
    </>
  );
}
