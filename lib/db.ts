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

  // Lightweight migrations for databases created by earlier versions.
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT`;

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
