# Full Circle Agency — Client Success Performance Dashboard

A performance evaluation dashboard for Full Circle's Client Success team.

- **Director of Client Success (Admin)** — scores every CSM monthly across six
  categories, writes feedback, manages the roster (CSMs, PODs, KAMs, clients),
  and submits evaluations to the CEO.
- **CEO** — reviews submitted evaluations and approves or denies them (with a
  note). Only approved evaluations are visible to CSMs.
- **CSM / CSA** — signs in to see their own "baseball card": monthly scores and
  Director feedback, quarterly averages, and a yearly view.

Built with Next.js, hosted on Vercel, data stored in Neon Postgres. The
database tables create and seed themselves on first run — **no terminal
commands are ever needed.**

---

## Deploying (no coding tools required)

### Step 1 — Put the code on GitHub

1. Open your repository on **github.com**.
2. Click **Add file → Upload files**.
3. On your computer, open the `fc-cs-dashboard` folder, select **everything
   inside it** (the `app`, `components`, `lib` folders and all the loose files),
   and drag them into the GitHub upload box.
   - If hidden files like `.gitignore` don't come along, that's fine — they
     aren't required for deployment.
4. Click **Commit changes** and wait for the upload to finish.

### Step 2 — Deploy on Vercel

1. Go to **vercel.com**, sign in, and click **Add New → Project**.
2. Import your GitHub repository. Vercel detects Next.js automatically — don't
   change any build settings. Click **Deploy**.
3. The first deploy will build successfully, but the app needs its database
   before it can sign anyone in — that's Step 3.

### Step 3 — Connect the Neon Postgres database

1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database** (or **Browse Marketplace**) and choose
   **Neon (Serverless Postgres)**. The free plan is more than enough.
3. Accept the defaults and **connect it to this project**. Vercel automatically
   adds the `DATABASE_URL` environment variable.
4. Go to the **Deployments** tab and click **Redeploy** on the latest
   deployment so the app picks up the database.

*(Optional but recommended: in **Settings → Environment Variables**, add
`AUTH_SECRET` set to any long random sentence. It strengthens login cookie
signing. Redeploy after adding it.)*

### Step 4 — First sign-in

Open your Vercel URL. The first visit creates the tables and seeds the roster
from the FC CSM list. Sign in with:

| Who | Email | Password |
|---|---|---|
| Director (Admin) | `director@fullcircleagency.com` | `FullCircle123` |
| CEO | `ceo@fullcircleagency.com` | `FullCircle123` |
| Uswa Najam | `uswa@fullcircleagency.com` | `FullCircle123` |
| Pooja Nandal | `pooja@fullcircleagency.com` | `FullCircle123` |
| Irfan Ullah | `irfan@fullcircleagency.com` | `FullCircle123` |
| Qasim Karim (CSA) | `qasim@fullcircleagency.com` | `FullCircle123` |
| Carina D | `carina@fullcircleagency.com` | `FullCircle123` |
| Ahmed Galal Foad | `ahmed@fullcircleagency.com` | `FullCircle123` |
| Hassan Ahmad | `hassan@fullcircleagency.com` | `FullCircle123` |
| Ani | `ani@fullcircleagency.com` | `FullCircle123` |

> **Everyone should change their password after first sign-in** (the
> "Password" button in the top bar). The Admin can also edit each person's
> sign-in email and reset passwords from the Roster tab.

---

## How the evaluation flow works

1. **Score** — Each month, the Director scores every CSM 0–10 in: Ownership,
   Communication, Team Player, AI Adoption, POD Management, and Client
   Sentiment, plus written feedback. Drafts can be saved anytime.
2. **Submit** — When all six scores are in, the Director submits the
   evaluation. It moves to the CEO's queue.
3. **Approve / Deny** — The CEO approves (result is published to the CSM and
   locked) or denies with a note (it returns to the Director for revision).
4. **CSM view** — CSMs only ever see approved results: their monthly card,
   quarterly averages (US calendar quarters: Q1 = Jan–Mar … Q4 = Oct–Dec), and
   a yearly view. The annual verdict appears only after all 12 months are
   reviewed.

### Scoring bands (monthly average, and 3-consecutive-month trend)

| Average | Admin sees | CSM sees |
|---|---|---|
| below 3 | PIP / Exit Risk — immediate PIP, consider exit | Coaching Required |
| 3 – 6 | Needs Guidance — assign a buddy, coaching plan | Developing |
| 6 – 8 | Good — incentive eligible | Good Performance |
| 8 – 10 | Bonus + promotion candidate | Outstanding Performance |

The **Performance Insights** tab applies these bands to the latest three
consecutively-scored months (the trend call) and to the annual average
(provisional until all 12 months are scored).

---

## Everyday administration

- **Add / remove CSMs, edit names, emails, titles** — Roster tab.
- **Add / edit / remove POD assignments, KAMs and client lists** — Roster tab,
  inside each person's card.
- **Deactivate** a CSM to pause scoring without deleting their history;
  **Remove** deletes them and their evaluations permanently.
- **Reset a password** — Roster tab; it resets to `FullCircle123`.

## Local development (optional, for developers)

```bash
npm install
# put your Neon connection string in .env.local as DATABASE_URL=...
npm run dev
```
