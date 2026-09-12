import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Database access. Tables are created automatically the first time the app
// runs against a fresh database, and the roster from the FC CSM list is
// seeded — so deploying requires zero terminal commands.
// ---------------------------------------------------------------------------

// Simple typed signature: a tagged-template query returning rows.
export type Sql = (
  strings: TemplateStringsArray,
  ...params: any[]
) => Promise<any[]>;

function getSql(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Connect the Neon Postgres integration in Vercel (Storage tab) or set it in your environment."
    );
  }
  return neon(url) as unknown as Sql;
}

export const DEFAULT_PASSWORD = "FullCircle123";

const SEED_PEOPLE: {
  name: string;
  email: string;
  title: "CSM" | "CSA";
  assignments: { pod: string; kam: string; clients: string[] }[];
}[] = [
  {
    name: "Uswa Najam", email: "uswa@fullcircleagency.com", title: "CSM",
    assignments: [{ pod: "POD 1", kam: "Diptak", clients: ["theory11", "Carina Organics", "BK Beauty", "MioTetto", "The Standard Lab"] }],
  },
  {
    name: "Pooja Nandal", email: "pooja@fullcircleagency.com", title: "CSM",
    assignments: [
      { pod: "POD 13", kam: "Angie Lalla", clients: ["HiRelief"] },
      { pod: "POD 10", kam: "Evan Swanson", clients: ["Miles Lubricants", "Headbanger Lures"] },
    ],
  },
  {
    name: "Irfan Ullah", email: "irfan@fullcircleagency.com", title: "CSM",
    assignments: [{ pod: "POD 11", kam: "Evan Swanson", clients: ["Brush On Block", "Therapet MD", "The Black Forest LLC", "Pura Vida Moringa", "Altura", "Precious Petal"] }],
  },
  {
    name: "Qasim Karim", email: "qasim@fullcircleagency.com", title: "CSA",
    assignments: [
      { pod: "POD 5", kam: "Evan Swanson", clients: ["The Plug Drink"] },
      { pod: "POD 2", kam: "Jim Miller", clients: ["Bumpsuit"] },
    ],
  },
  {
    name: "Carina D", email: "carina@fullcircleagency.com", title: "CSM",
    assignments: [{ pod: "POD 20", kam: "Fanny", clients: ["City Beauty", "MyImmunity", "Locasnity", "NeuroMD", "Epic Gardening", "Sprinkle Nutrition LLC"] }],
  },
  {
    name: "Ahmed Galal Foad", email: "ahmed@fullcircleagency.com", title: "CSM",
    assignments: [{ pod: "POD 4", kam: "Jim Miller", clients: ["Alpha Lion", "Legion Athletics", "Allegiance Flag Supply", "Oculus Publishers"] }],
  },
  {
    name: "Hassan Ahmad", email: "hassan@fullcircleagency.com", title: "CSM",
    assignments: [{ pod: "POD 8", kam: "Jim Miller", clients: ["Naturealm", "Flux Footwear", "Promixx"] }],
  },
  {
    name: "Ani", email: "ani@fullcircleagency.com", title: "CSM",
    assignments: [{ pod: "POD 9", kam: "Rishi Phadke", clients: ["Hally hair", "Lonely Planet", "Clutch", "Swimline", "Game"] }],
  },
];

// Turns "Evan Swanson" into a login-friendly email like evan@fullcircleagency.com,
// disambiguating with a numeric suffix if that slug is already taken.
async function emailForKamName(sql: Sql, name: string): Promise<string> {
  const base = name
    .trim()
    .split(/\s+/)[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "kam";
  for (let n = 0; ; n++) {
    const candidate = `${base}${n === 0 ? "" : n}@fullcircleagency.com`;
    const rows = await sql`SELECT 1 FROM users WHERE LOWER(email) = LOWER(${candidate}) LIMIT 1`;
    if (rows.length === 0) return candidate;
  }
}

// Every unique KAM name still stored only as free text on an assignment gets
// a real login account, and the assignment is linked to it. Safe to re-run —
// only touches names that don't already have a linked account.
async function ensureKamAccounts(sql: Sql) {
  const unresolved = await sql`
    SELECT DISTINCT kam FROM assignments WHERE kam_user_id IS NULL AND kam IS NOT NULL AND kam <> ''`;
  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const row of unresolved as { kam: string }[]) {
    const name = row.kam.trim();
    if (!name) continue;

    const existing = await sql`
      SELECT id FROM users WHERE role = 'KAM' AND LOWER(name) = LOWER(${name}) LIMIT 1`;
    let kamId: number;
    if (existing.length > 0) {
      kamId = (existing[0] as { id: number }).id;
    } else {
      const email = await emailForKamName(sql, name);
      const rows = await sql`
        INSERT INTO users (email, name, password_hash, role, title)
        VALUES (${email}, ${name}, ${hash}, 'KAM', 'Key Account Manager')
        RETURNING id`;
      kamId = (rows[0] as { id: number }).id;
    }
    await sql`
      UPDATE assignments SET kam_user_id = ${kamId}
      WHERE kam_user_id IS NULL AND LOWER(kam) = LOWER(${name})`;
  }
}

async function initSchema(sql: Sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN','CEO','CSM')),
      title TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      pod TEXT NOT NULL,
      kam TEXT NOT NULL,
      clients JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS evaluations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      scores JSONB NOT NULL DEFAULT '{}',
      feedback TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','denied')),
      ceo_note TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ,
      decided_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, year, month)
    )`;

  // This is the CSM's own monthly self-score. It never goes through CEO
  // approval — it exists purely so the Director/CEO can compare it against
  // the KAM's score and the official Director score.
  await sql`
    CREATE TABLE IF NOT EXISTS self_evaluations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      scores JSONB NOT NULL DEFAULT '{}',
      notes JSONB NOT NULL DEFAULT '{}',
      submitted_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, year, month)
    )`;

  // The KAM's monthly score of one of their CSMs. Goes through the same
  // submit → CEO approve/deny flow as the Director's official evaluation,
  // but is a separate record — the Director's score stays the official one.
  await sql`
    CREATE TABLE IF NOT EXISTS kam_evaluations (
      id SERIAL PRIMARY KEY,
      kam_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csm_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      scores JSONB NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','denied')),
      ceo_note TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ,
      decided_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (kam_user_id, csm_user_id, year, month)
    )`;

  // The reverse: a CSM scoring their KAM. Visible only to Admin/CEO and the
  // CSM who wrote it — never shown to the KAM being rated. No free text.
  await sql`
    CREATE TABLE IF NOT EXISTS kam_feedback (
      id SERIAL PRIMARY KEY,
      csm_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kam_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
      scores JSONB NOT NULL DEFAULT '{}',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (csm_user_id, kam_user_id, year, month)
    )`;

  // Lightweight migrations for databases created by earlier versions.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT`;
  await sql`ALTER TABLE assignments ADD COLUMN IF NOT EXISTS kam_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`;
  await sql`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`;
  await sql`ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','CEO','CSM','KAM'))`;

  // Backfill: give every KAM named only in free text a real login account.
  await ensureKamAccounts(sql);

  const existing = await sql`SELECT COUNT(*)::int AS n FROM users`;
  if ((existing[0] as { n: number }).n > 0) return;

  const hash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  await sql`INSERT INTO users (email, name, password_hash, role, title)
            VALUES ('director@fullcircleagency.com', 'Director of Client Success', ${hash}, 'ADMIN', 'Director')`;
  await sql`INSERT INTO users (email, name, password_hash, role, title)
            VALUES ('ceo@fullcircleagency.com', 'CEO', ${hash}, 'CEO', 'CEO')`;

  for (const p of SEED_PEOPLE) {
    const rows = await sql`
      INSERT INTO users (email, name, password_hash, role, title)
      VALUES (${p.email}, ${p.name}, ${hash}, 'CSM', ${p.title})
      RETURNING id`;
    const id = (rows[0] as { id: number }).id;
    for (const a of p.assignments) {
      await sql`INSERT INTO assignments (user_id, pod, kam, clients)
                VALUES (${id}, ${a.pod}, ${a.kam}, ${JSON.stringify(a.clients)})`;
    }
  }

  // Create logins for the KAMs named in the freshly-seeded assignments.
  await ensureKamAccounts(sql);
}

// Memoise schema initialisation per serverless instance.
const g = globalThis as unknown as { __fcReady?: Promise<void> };

export async function db() {
  const sql = getSql();
  if (!g.__fcReady) {
    g.__fcReady = initSchema(sql).catch((e) => {
      g.__fcReady = undefined;
      throw e;
    });
  }
  await g.__fcReady;
  return sql;
}
