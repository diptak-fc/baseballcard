"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner, EmptyState } from "@/components/ui";
import { Avatar, PhotoControl } from "@/components/photo";

type Assignment = { id: number; pod: string; kam: string; kam_user_id: number | null; clients: string[] };
type Person = {
  id: number;
  name: string;
  email: string;
  title: string;
  active: boolean;
  photo?: string | null;
  assignments: Assignment[];
};
type Kam = {
  id: number;
  name: string;
  email: string;
  title: string;
  active: boolean;
  photo?: string | null;
};

export default function RosterPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [kams, setKams] = useState<Kam[] | null>(null);
  const [showAdd, setShowAdd] = useState<null | "CSM" | "KAM">(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/roster").then((r) => r.json());
    setPeople(d.people || []);
    setKams(d.kams || []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Roster</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Manage your CSMs, CSAs and KAMs, their PODs and client lists.
            Everyone signs in with the email listed here — KAM accounts also
            score their CSMs each month from their own login.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setShowAdd("KAM")}>
            + Add KAM
          </button>
          <button className="btn-primary" onClick={() => setShowAdd("CSM")}>
            + Add CSM
          </button>
        </div>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg bg-band-topBg px-3 py-2 text-sm text-band-top">
          {notice}
        </p>
      )}

      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-muted">
        Client Success Managers
      </h2>
      {!people ? (
        <Spinner />
      ) : people.length === 0 ? (
        <EmptyState title="No CSMs yet" hint="Add your first CSM to get started." />
      ) : (
        <div className="space-y-4">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} kams={kams || []} onChanged={load} onNotice={setNotice} />
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-10 text-sm font-bold uppercase tracking-wide text-ink-muted">
        Key Account Managers
      </h2>
      {!kams ? (
        <Spinner />
      ) : kams.length === 0 ? (
        <EmptyState title="No KAMs yet" hint="Add a KAM, then link them to a CSM's POD assignment below." />
      ) : (
        <div className="space-y-3">
          {kams.map((k) => (
            <KamCard key={k.id} kam={k} onChanged={load} onNotice={setNotice} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPersonDialog
          role={showAdd}
          onClose={() => setShowAdd(null)}
          onAdded={(pw, roleAdded) => {
            setShowAdd(null);
            if (pw) setNotice(`${roleAdded} added. Their temporary password is “${pw}” — ask them to change it after first sign-in.`);
            load();
          }}
        />
      )}
    </div>
  );
}

function KamCard({
  kam,
  onChanged,
  onNotice,
}: {
  kam: Kam;
  onChanged: () => void;
  onNotice: (s: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(kam.name);
  const [email, setEmail] = useState(kam.email);
  const [busy, setBusy] = useState(false);

  async function saveDetails() {
    setBusy(true);
    const res = await fetch(`/api/roster/${kam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      onChanged();
    } else {
      const d = await res.json();
      alert(d.error || "Could not save");
    }
  }

  async function resetPassword() {
    if (!confirm(`Reset ${kam.name}'s password to the default?`)) return;
    const res = await fetch(`/api/roster/${kam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    const d = await res.json();
    if (res.ok) onNotice(`${kam.name}'s password was reset to “${d.resetTo}”.`);
  }

  async function toggleActive() {
    await fetch(`/api/roster/${kam.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !kam.active }),
    });
    onChanged();
  }

  async function removeKam() {
    if (
      !confirm(
        `Remove ${kam.name} permanently? Any POD assignments linked to them will need a new KAM. Their submitted scores stay on record.`
      )
    )
      return;
    await fetch(`/api/roster/${kam.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <section className={"card flex flex-wrap items-center justify-between gap-4 p-5 " + (!kam.active ? "opacity-60" : "")}>
      <div className="flex items-center gap-3">
        <Avatar name={kam.name} photo={kam.photo} size={44} />
        {editing ? (
          <div className="flex gap-2">
            <input className="input !w-40" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="input !w-56" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-ink">{kam.name}</span>
              <span className="chip bg-accent/10 text-accent">KAM</span>
              {!kam.active && <span className="chip bg-surface-alt text-ink-muted">Deactivated</span>}
            </div>
            <div className="text-xs text-ink-muted">{kam.email}</div>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {editing ? (
          <>
            <button className="btn-secondary !py-1.5 text-xs" onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn-primary !py-1.5 text-xs" disabled={busy} onClick={saveDetails}>
              {busy ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary !py-1.5 text-xs" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn-secondary !py-1.5 text-xs" onClick={resetPassword}>Reset password</button>
            <button className="btn-secondary !py-1.5 text-xs" onClick={toggleActive}>
              {kam.active ? "Deactivate" : "Reactivate"}
            </button>
            <button className="btn-danger !py-1.5 text-xs" onClick={removeKam}>Remove</button>
          </>
        )}
      </div>
    </section>
  );
}

function PersonCard({
  person,
  kams,
  onChanged,
  onNotice,
}: {
  person: Person;
  kams: Kam[];
  onChanged: () => void;
  onNotice: (s: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email);
  const [title, setTitle] = useState(person.title);
  const [busy, setBusy] = useState(false);
  const [addingAssign, setAddingAssign] = useState(false);

  async function saveDetails() {
    setBusy(true);
    const res = await fetch(`/api/roster/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, title }),
    });
    setBusy(false);
    if (res.ok) {
      setEditing(false);
      onChanged();
    } else {
      const d = await res.json();
      alert(d.error || "Could not save");
    }
  }

  async function resetPassword() {
    if (!confirm(`Reset ${person.name}'s password to the default?`)) return;
    const res = await fetch(`/api/roster/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    const d = await res.json();
    if (res.ok) onNotice(`${person.name}'s password was reset to “${d.resetTo}”.`);
  }

  async function toggleActive() {
    await fetch(`/api/roster/${person.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !person.active }),
    });
    onChanged();
  }

  async function removePerson() {
    if (
      !confirm(
        `Remove ${person.name} permanently? Their evaluations will be deleted too. If you just want to pause scoring, use Deactivate instead.`
      )
    )
      return;
    await fetch(`/api/roster/${person.id}`, { method: "DELETE" });
    onChanged();
  }

  return (
    <section className={"card p-6 " + (!person.active ? "opacity-60" : "")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-1 items-start gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <Avatar name={person.name} photo={person.photo} size={56} />
            <PhotoControl
              userId={person.id}
              hasPhoto={!!person.photo}
              onChanged={onChanged}
            />
          </div>
          {editing ? (
            <div className="grid max-w-xl gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">Title</label>
                <select className="input" value={title} onChange={(e) => setTitle(e.target.value)}>
                  <option value="CSM">CSM</option>
                  <option value="CSA">CSA</option>
                </select>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-ink">{person.name}</h2>
                <span className="chip bg-accent/10 text-accent">{person.title}</span>
                {!person.active && (
                  <span className="chip bg-surface-alt text-ink-muted">Deactivated</span>
                )}
              </div>
              <div className="text-sm text-ink-muted">{person.email}</div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button className="btn-secondary !py-1.5 text-xs" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary !py-1.5 text-xs" disabled={busy} onClick={saveDetails}>
                {busy ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary !py-1.5 text-xs" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn-secondary !py-1.5 text-xs" onClick={resetPassword}>
                Reset password
              </button>
              <button className="btn-secondary !py-1.5 text-xs" onClick={toggleActive}>
                {person.active ? "Deactivate" : "Reactivate"}
              </button>
              <button className="btn-danger !py-1.5 text-xs" onClick={removePerson}>
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {person.assignments.map((a) => (
          <AssignmentRow key={a.id} assignment={a} kams={kams} onChanged={onChanged} />
        ))}
        {addingAssign ? (
          <AssignmentForm
            kams={kams}
            onCancel={() => setAddingAssign(false)}
            onSave={async (pod, kamUserId, clients) => {
              await fetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: person.id, pod, kamUserId, clients }),
              });
              setAddingAssign(false);
              onChanged();
            }}
          />
        ) : (
          <button
            className="text-xs font-semibold text-accent hover:text-ink"
            onClick={() => setAddingAssign(true)}
            disabled={kams.length === 0}
            title={kams.length === 0 ? "Add a KAM first" : undefined}
          >
            + Add POD assignment
          </button>
        )}
      </div>
    </section>
  );
}

function AssignmentRow({
  assignment,
  kams,
  onChanged,
}: {
  assignment: Assignment;
  kams: Kam[];
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);

  async function remove() {
    if (!confirm(`Remove ${assignment.pod} (KAM ${assignment.kam})?`)) return;
    await fetch(`/api/assignments/${assignment.id}`, { method: "DELETE" });
    onChanged();
  }

  if (editing) {
    return (
      <AssignmentForm
        initial={assignment}
        kams={kams}
        onCancel={() => setEditing(false)}
        onSave={async (pod, kamUserId, clients) => {
          await fetch(`/api/assignments/${assignment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pod, kamUserId, clients }),
          });
          setEditing(false);
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-surface-line bg-surface-alt px-3 py-2 text-sm">
      <div>
        <span className="font-bold text-accent">{assignment.pod}</span>
        <span className="mx-1.5 text-ink-muted">·</span>
        <span className="font-semibold text-ink-soft">KAM: {assignment.kam}</span>
        <div className="mt-0.5 text-xs text-ink-muted">
          {(assignment.clients || []).join(", ") || "No clients listed"}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="text-xs font-semibold text-accent hover:text-ink"
          onClick={() => setEditing(true)}
        >
          Edit
        </button>
        <button
          className="text-xs font-semibold text-band-critical hover:opacity-80"
          onClick={remove}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

function AssignmentForm({
  initial,
  kams,
  onSave,
  onCancel,
}: {
  initial?: Assignment;
  kams: Kam[];
  onSave: (pod: string, kamUserId: number, clients: string[]) => void;
  onCancel: () => void;
}) {
  const [pod, setPod] = useState(initial?.pod || "");
  const [kamUserId, setKamUserId] = useState<number | "">(initial?.kam_user_id || (kams[0]?.id ?? ""));
  const [clients, setClients] = useState((initial?.clients || []).join(", "));

  return (
    <div className="rounded-lg border border-surface-line bg-surface-raise p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div>
          <label className="label">POD</label>
          <input className="input" placeholder="POD 1" value={pod} onChange={(e) => setPod(e.target.value)} />
        </div>
        <div>
          <label className="label">Reporting KAM</label>
          <select className="input" value={kamUserId} onChange={(e) => setKamUserId(Number(e.target.value))}>
            {kams.length === 0 && <option value="">Add a KAM first</option>}
            {kams.map((k) => (
              <option key={k.id} value={k.id}>{k.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Clients (comma-separated)</label>
          <input
            className="input"
            placeholder="Client A, Client B"
            value={clients}
            onChange={(e) => setClients(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-2 flex justify-end gap-2">
        <button className="btn-secondary !py-1 text-xs" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn-primary !py-1 text-xs"
          disabled={!pod.trim() || !kamUserId}
          onClick={() =>
            onSave(
              pod.trim(),
              Number(kamUserId),
              clients.split(",").map((c) => c.trim()).filter(Boolean)
            )
          }
        >
          Save
        </button>
      </div>
    </div>
  );
}

function AddPersonDialog({
  role,
  onClose,
  onAdded,
}: {
  role: "CSM" | "KAM";
  onClose: () => void;
  onAdded: (defaultPassword: string | undefined, roleAdded: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState(role === "KAM" ? "Key Account Manager" : "CSM");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, title, role }),
    });
    const d = await res.json();
    setBusy(false);
    if (res.ok) onAdded(d.defaultPassword, role === "KAM" ? "KAM" : "CSM");
    else setError(d.error || "Could not add");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="mb-4 text-lg font-bold text-ink">
          {role === "KAM" ? "Add a KAM" : "Add a CSM"}
        </h2>
        <label className="label">Full name</label>
        <input className="input mb-3" value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="label">Sign-in email</label>
        <input className="input mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {role === "CSM" ? (
          <>
            <label className="label">Title</label>
            <select className="input mb-4" value={title} onChange={(e) => setTitle(e.target.value)}>
              <option value="CSM">CSM — Client Success Manager</option>
              <option value="CSA">CSA — Client Success Associate</option>
            </select>
          </>
        ) : (
          <p className="mb-4 text-xs text-ink-muted">
            After adding, link this KAM to a CSM&rsquo;s POD assignment in the
            Roster below so the two-way scoring works.
          </p>
        )}
        {error && (
          <p className="mb-3 rounded-lg bg-band-criticalBg px-3 py-2 text-sm text-band-critical">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Adding…" : role === "KAM" ? "Add KAM" : "Add CSM"}
          </button>
        </div>
      </form>
    </div>
  );
}
