"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: fields.get("username"), password: fields.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }
  return (
    <main className="admin-login-page">
      <Link className="admin-home-link" href="/">← Back to website</Link>
      <div className="admin-login-card">
        <span className="admin-eyebrow">EUSUN HAN&apos;S LAB</span>
        <h1>Administrator sign in</h1>
        <p>Manage website content and blog posts.</p>
        <form onSubmit={login}>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" autoComplete="username" required maxLength={100} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
          {error ? <p className="admin-error" role="alert">{error}</p> : null}
          {!configured ? <p className="admin-error">Administrator access is not configured.</p> : null}
          <button className="admin-primary" disabled={busy || !configured} type="submit">{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </div>
    </main>
  );
}
