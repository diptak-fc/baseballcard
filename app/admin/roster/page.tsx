"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner, EmptyState } from "@/components/ui";
import { Avatar, PhotoControl } from "@/components/photo";

type Assignment = { id: number; pod: string; kam: string; clients: string[] };
type Person = {
  id: number;
  name: string;
  email: string;
  title: string;
  active: boolean;
  photo?: string | null;
  assignments: Assignment[];
};

export default function RosterPage() {
  const [people, setPeople] = useState<Person[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const d = await fetch("/api/roster").then((r) => r.json());
    setPeople(d.people || []);
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
            Manage your CSMs and CSAs, their PODs, reporting KAMs and client
            lists. Each person signs in with the email listed here.
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>
          + Add CSM
        </button>
      </div>

      {notice && (
        <p className="mb-4 rounded-lg bg-band-topBg px-3 py-2 text-sm text-band-top">
          {notice}
        </p>
      )}

      {!people ? (
        <Spinner />
      ) : people.length === 0 ? (
        <EmptyState title="No CSMs yet" hint="Add your first CSM to get started." />
      ) : (
        <div className="space-y-4">
          {people.map((p) => (
            <PersonCard key={p.id} person={p} onChanged={load} onNotice={setNotice} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPersonDialog
          onClose={() => setShowAdd(false)}
          onAdded={(pw) => {
            setShowAdd(false);
            if (pw) setNotice(`CSM added. Their temporary password is “${pw}” — ask them to change it after first sign-in.`);
            load();
          }}
        />
      )}
    </div>
  );
}

function PersonCard({
  person,
  onChanged,
  onNotice,
}: {
  person: Person;
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
          <AssignmentRow key={a.id} assignment={a} onChanged={onChanged} />
        ))}
        {addingAssign ? (
          <AssignmentForm
            onCancel={() => setAddingAssign(false)}
            onSave={async (pod, kam, clients) => {
              await fetch("/api/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: person.id, pod, kam, clients }),
              });
              setAddingAssign(false);
              onChanged();
            }}
          />
        ) : (
          <button
            className="text-xs font-semibold text-accent hover:text-ink"
            onClick={() => setAddingAssign(true)}
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
  onChanged,
}: {
  assignment: Assignment;
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
        onCancel={() => setEditing(false)}
        onSave={async (pod, kam, clients) => {
          await fetch(`/api/assignments/${assignment.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pod, kam, clients }),
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
  onSave,
  onCancel,
}: {
  initial?: Assignment;
  onSave: (pod: string, kam: string, clients: string[]) => void;
  onCancel: () => void;
}) {
  const [pod, setPod] = useState(initial?.pod || "");
  const [kam, setKam] = useState(initial?.kam || "");
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
          <input className="input" placeholder="KAM name" value={kam} onChange={(e) => setKam(e.target.value)} />
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
          onClick={() =>
            onSave(
              pod.trim(),
              kam.trim(),
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
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (defaultPassword?: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("CSM");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/roster", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, title }),
    });
    const d = await res.json();
    setBusy(false);
    if (res.ok) onAdded(d.defaultPassword);
    else setError(d.error || "Could not add");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <form className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2 className="mb-4 text-lg font-bold text-ink">Add a CSM</h2>
        <label className="label">Full name</label>
        <input className="input mb-3" value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="label">Sign-in email</label>
        <input className="input mb-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="label">Title</label>
        <select className="input mb-4" value={title} onChange={(e) => setTitle(e.target.value)}>
          <option value="CSM">CSM — Client Success Manager</option>
          <option value="CSA">CSA — Client Success Associate</option>
        </select>
        {error && (
          <p className="mb-3 rounded-lg bg-band-criticalBg px-3 py-2 text-sm text-band-critical">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" disabled={busy}>
            {busy ? "Adding…" : "Add CSM"}
          </button>
        </div>
      </form>
    </div>
  );
}
