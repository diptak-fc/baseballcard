# Full Circle Agency — Client Success Performance Dashboard

A two-way performance evaluation dashboard for Full Circle's Client Success
team.

- **Director of Client Success (Admin)** — scores every CSM monthly across six
  categories, writes feedback, manages the roster (CSMs, PODs, KAMs, clients),
  submits evaluations to the CEO, and reviews the Comparative Analysis and KAM
  Feedback reports.
- **CEO** — reviews everything submitted for approval — the Director's
  evaluations **and** the KAMs' evaluations — and approves or denies each
  (with a note). Only approved evaluations are visible to the CSM they're
  about.
- **CSM / CSA** — signs in to see their own "baseball card" (monthly scores,
  quarterly averages, yearly view), scores themselves every month with
  optional notes, and rates the KAM(s) they work with.
- **KAM (Key Account Manager)** — signs in to score the CSM(s) assigned to
  them each month, using the same categories as the CSM's self-evaluation.

Built with Next.js, hosted on Vercel, data stored in Neon Postgres. The
database tables create and seed themselves on first run — **no terminal
commands are ever needed.**

### Latest update

- **Fixed:** picking a month or year on one screen and switching to another
  tab no longer silently snaps back to today's calendar month/year — the
  selection is now remembered across every tab and page until you change it
  again.
- **Added:** two new KPIs — **Results-Driven** and **Project Management** —
  scored 0–10 on both the CSM's self-evaluation and the KAM's evaluation of
  that CSM. The Director's official evaluation (the one banding/PIP/bonus
  decisions are based on) is unchanged and still uses the original six
  categories.

---

## Deploying / updating (no coding tools required)

This is the exact same process whether it's the very first deploy or you're
uploading a later update — GitHub doesn't care which files changed, it just
takes whatever you drag in.

### Step 1 — Put the code on GitHub

1. Open your repository on **github.com**.
2. Click **Add file → Upload files**.
3. On your computer, open the `fc-cs-dashboard` folder, select **everything
   inside it** (the `app`, `components`, `lib` folders and all the loose files),
   and drag them into the GitHub upload box.
   - If hidden files like `.gitignore` don't come along, that's fine — they
     aren't required for deployment.
   - GitHub will show the files that changed since last time; that's normal
     and expected for an update.
4. Click **Commit changes** and wait for the upload to finish.

### Step 2 — Let Vercel redeploy

- **First time ever:** go to **vercel.com**, sign in, click **Add New →
  Project**, import your GitHub repository, and click **Deploy**. Then do
  Step 3 (database) before anyone can sign in.
- **Every update after that:** nothing to click — Vercel watches your GitHub
  repository and redeploys automatically within a minute or two of your
  commit. You can watch it finish on the **Deployments** tab if you want to
  confirm.

### Step 3 — Connect the Neon Postgres database (first deploy only)

1. In your Vercel project, open the **Storage** tab.
2. Click **Create Database** (or **Browse Marketplace**) and choose
   **Neon (Serverless Postgres)**. The free plan is more than enough.
3. Accept the defaults and **connect it to this project**. Keep the custom
   prefix as **`DATABASE`** so it matches what the code expects, and leave
   **Sensitive** switched **on**.
4. Go to the **Deployments** tab and click **Redeploy** on the latest
   deployment so the app picks up the database.

*(Optional but recommended: in **Settings → Environment Variables**, add
`AUTH_SECRET` set to any long random sentence. It strengthens login cookie
signing. Redeploy after adding it.)*

You never need to touch the database again after this — every new feature,
including everything described below, creates and updates its own tables
automatically the first time the app runs after a deploy.

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

#### New: KAM logins

The KAM names already on your roster (from each CSM's POD assignment) were
automatically turned into their own login accounts the first time the app
ran with this update. Their email follows the same pattern as everyone
else's — first name, lowercase, `@fullcircleagency.com` — and their starting
password is also `FullCircle123`. Based on the KAM names already in your
roster, that includes logins such as:

| KAM | Email | Password |
|---|---|---|
| Diptak | `diptak@fullcircleagency.com` | `FullCircle123` |
| Angie | `angie@fullcircleagency.com` | `FullCircle123` |
| Evan | `evan@fullcircleagency.com` | `FullCircle123` |
| Fanny | `fanny@fullcircleagency.com` | `FullCircle123` |
| Jim | `jim@fullcircleagency.com` | `FullCircle123` |
| Rishi | `rishi@fullcircleagency.com` | `FullCircle123` |

You'll want to hand these out to the actual KAMs so they can sign in and
score their CSMs. You can double-check the exact list, and edit any KAM's
name, email, or password, from **Roster → KAMs** — if two KAMs happened to
share a first name, the second one's email got a number added (e.g.
`jim2@fullcircleagency.com`) so check there if a name looks unfamiliar.

---

## How the evaluation flow works (now a two-way / 360° process)

There are three separate scoring tracks each month. They never overwrite one
another — they sit side by side so the Director and CEO can compare them.

### 1. The Director's evaluation — the official score

This is unchanged from before, and it's still the **only score that counts**
for banding, PIPs, bonuses, and promotion decisions.

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

### 2. The CSM's self-evaluation

Under **My Self-Evaluation** on their own dashboard, each CSM can score
themselves 0–10 on eight categories every month — the Director's original
six (Ownership, Communication, Team Player, AI Adoption, POD Management,
Client Sentiment) plus two more that apply only to self- and KAM-evaluations:
**Results-Driven** and **Project Management** — and, for each category,
write up to 500 characters explaining why they gave themselves that score.
There's no submit/approval step here: a CSM can save or revise their
self-evaluation at any time, and it's visible to the Director and CEO right
away for comparison. It never changes the official score.

### 3. The KAM's evaluation of the CSM

Each KAM signs in and, under **Score My CSMs**, scores every CSM assigned to
them 0–10 on the same eight categories the CSM scores themselves on
(the Director's six, plus Results-Driven and Project Management — no written
feedback field). A KAM's evaluation goes through the **same submit → CEO
approve/deny queue** as the Director's, but it's clearly tagged as "Scored by
KAM: [name]" so it's never confused with the official Director score, which
stays on the original six categories. If a CSM has more than one KAM
(because they cover more than one POD), each KAM scores them separately and
both scores show up in the comparison.

### 4. The CSM's rating of their KAM(s) — confidential upward feedback

Under **Rate My KAM(s)**, each CSM rates every KAM they work with, once a
month, on five parameters using the exact scales the team uses day to day:

| Parameter | Scale |
|---|---|
| Coordination | Non-coordinative → Mildly → Very → Extremely coordinative |
| Collaboration | Non-collaborative → Mildly → Very → Extremely collaborative |
| Leadership | Non-collaborative → Mildly → Very → Extremely (same 4-point style) |
| Knowledge Sharing (incl. upskilling) | Not done / Done |
| Meeting Availability (internal & external) | Not present / Intermittent / Very present |

There is deliberately **no written comment field** here and **no approval
step** — the CSM just picks a value for each parameter and saves. This
feedback is only ever visible to the Director of Client Success and the CEO,
under **KAM Feedback**; the KAM being rated can never see it, by design, so
CSMs can be candid.

### Comparative Analysis (Director & CEO only)

Under **Comparative Analysis**, pick a CSM and a year to see, month by month:
their self-score, their KAM's score of them (combined if they have more than
one KAM, with each KAM's individual score shown too), the variance between
self and KAM score, and the Director's official score — plus quarterly and
annual rollups for all three, and the CSM's self-evaluation notes laid out by
month. Under **KAM Feedback**, pick a KAM and a year to see how their CSMs
have rated them each month, plus a quarterly/annual "how positively rated"
percentage.

### Scoring bands (monthly average, and 3-consecutive-month trend)

These bands apply only to the Director's official score.

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
- **Add / remove KAMs, edit names, emails, reset passwords** — Roster tab
  (KAMs section). Removing a KAM doesn't delete any assignment — it just
  clears that assignment's KAM until you assign a new one.
- **Add / edit / remove POD assignments (now pick the KAM from a dropdown of
  KAM accounts instead of typing a name) and client lists** — Roster tab,
  inside each person's card.
- **Deactivate** a CSM or KAM to pause scoring without deleting their
  history; **Remove** deletes them and their evaluations permanently.
- **Reset a password** — Roster tab; it resets to `FullCircle123`.

## Local development (optional, for developers)

```bash
npm install
# put your Neon connection string in .env.local as DATABASE_URL=...
npm run dev
```
