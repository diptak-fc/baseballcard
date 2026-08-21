"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type NavLink = { href: string; label: string };

export default function Shell({
  name,
  roleLabel,
  links,
  children,
}: {
  name: string;
  roleLabel: string;
  links: NavLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pwOpen, setPwOpen] = useState(false);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-surface-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-ink">
              FC
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-ink">Full Circle Agency</div>
              <div className="text-[11px] text-ink-muted">Client Success Dashboard</div>
            </div>
          </div>

          <nav className="ml-4 flex flex-1 items-center gap-1 overflow-x-auto">
            {links.map((l) => {
              const active =
                l.href === pathname ||
                (l.href !== "/" && pathname.startsWith(l.href + "/")) ||
                pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors " +
                    (active
                      ? "bg-accent/10 text-accent"
                      : "text-ink-soft hover:bg-surface-alt hover:text-accent")
                  }
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-sm font-semibold">{name}</div>
              <div className="text-[11px] text-ink-muted">{roleLabel}</div>
            </div>
            <button
              className="btn-secondary !px-3 !py-1.5 text-xs"
              onClick={() => setPwOpen(true)}
            >
              Password
            </button>
            <button className="btn-primary !px-3 !py-1.5 text-xs" onClick={signOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>

      {pwOpen && <PasswordDialog onClose={() => setPwOpen(false)} />}

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-ink-muted">
        Full Circle Agency · Client Success performance evaluation
      </footer>
    </div>
  );
}

function PasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setMsg({ ok: true, text: "Password updated." });
      setCurrent("");
      setNext("");
    } else {
      setMsg({ ok: false, text: data.error || "Could not update password" });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <form
        className="card w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 className="mb-4 text-lg font-bold text-ink">Change password</h2>
        <label className="label">Current password</label>
        <input
          className="input mb-3"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
        <label className="label">New password (min 8 characters)</label>
        <input
          className="input mb-4"
          type="password"
          value={next}
          minLength={8}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        {msg && (
          <p
            className={
              "mb-3 rounded-lg px-3 py-2 text-sm " +
              (msg.ok
                ? "bg-band-goodBg text-band-good"
                : "bg-band-criticalBg text-band-critical")
            }
          >
            {msg.text}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}
