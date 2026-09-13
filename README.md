# Full Circle Agency — Client Success Performance Dashboard

A two-way performance evaluation dashboard for Full Circle's Client Success
team.

- **Director of Client Success (Admin)** — no longer scores CSMs directly.
  Each month they review every CSM's self-evaluation and their KAM's scoring
  (including the GWC panel), then **publish** the KAM-derived combined record
  to the CEO for approval. They also manage the roster (CSMs, PODs, KAMs,
  clients) and review the Comparative Analysis and KAM Feedback reports.
- **CEO** — reviews the single combined record the Director publishes for
  each CSM each month (KAM-derived score, self-evaluation for comparison, and
  the contributing KAM's GWC panel) and approves or denies it (with a note).
  Only approved months are visible to the CSM they're about. Decisions can be
  reverted at any time.
- **CSM / CSA** — signs in to see their own "baseball card" (monthly scores,
  quarterly averages, yearly view), scores themselves every month with
  optional notes, and rates the KAM(s) they work with on a simple 0/5/10 scale.
- **KAM (Key Account Manager)** — signs in to score the CSM(s) assigned to
  them each month, using the same categories as the CSM's self-evaluation,
  plus the mandatory GWC panel. This score is what becomes the CSM's official
  record once the Director publishes it.

Built with Next.js, hosted on Vercel, data stored in Neon Postgres. The
database tables create and seed themselves on first run — **no terminal
commands are ever needed.**

### Latest update

- **Changed — the Director no longer scores.** The Director's role is now to
  review what the CSM said about themselves and what the KAM scored them,
  then click **Publish to CEO** on the Director's **Monthly Review** page.
  The "official" score is the mean of the CSM's KAM evaluation(s) for that
  month across all eight categories — the Director can attach an optional
  note (their own commentary, not a score), and can re-publish (refreshing
  the combined score) any month the CEO hasn't approved yet.
- **Changed — the CEO's approval queue is now one item per CSM per month.**
  Since the Director no longer scores independently, there's nothing to
  approve on the KAM's evaluation as a separate line item — the CEO approves
  the single combined record, which still shows the self-evaluation for
  comparison and every contributing KAM's name, scores, and GWC panel. The
  "By KAM" grouping is gone since every item now belongs to one CSM.
- **Changed — Comparative Analysis** now shows the self-evaluation next to
  the **official (KAM-derived)** score in place of the old "Director's
  official" score.
- **Changed — Rate My KAM(s)** uses one unified 0/5/10 scale for every
  parameter (Coordination, Collaboration, Leadership, Knowledge Sharing,
  Meeting Availability): **0** = not available on this dimension, **5** =
  somewhat available (a midpoint), **10** = fully available. This replaces
  the old mix of 2-, 3-, and 4-point scales.
- **Changed — the CSM's self-evaluation note cap is 300 words** (down from
  500); the Director's own note stays capped at 500 words.
- **Renamed:** the "Project Management" KPI is now **Follow Through** (same
  scoring, new name) on the self-evaluation, the KAM's evaluation, and
  everywhere else it's scored.
- **Fixed:** the CEO's and Director's dashboards show every KPI that's live
  on the CSM's side — Follow Through, Results-Driven, and the rest —
  everywhere a KAM's evaluation is displayed.
- **Added — real KAM logins:** each named KAM has the specific login email
  you provided (see the table below), not an auto-generated one.
- **Added — the GWC framework:** every KAM evaluation has a mandatory Gets
  It / Wants It / Has The Capability panel (Yes/No per item, with a required
  short remark on any "No"). It can't be submitted until all three are
  answered, and it's visible to the Director and CEO alongside the scores.
- **Changed — word counts, not character counts:** every text box counts
  words, turns the box red past its limit, and blocks saving until it's
  trimmed.

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

#### KAM logins

Each named KAM has their own login. As of this update, their email is the
exact address you provided (not an auto-generated one), and the password is
reset to the default so it's guaranteed to work:

| KAM | Email | Password |
|---|---|---|
| Angie | `araja@fullcircleagency.com` | `FullCircle123` |
| Diptak | `diptak@fullcircleagency.com` | `FullCircle123` |
| Evan | `ERSwanson@fullcircleagency.com` | `FullCircle123` |
| Fanny | `fdchaubey@fullcircleagency.com` | `FullCircle123` |
| Jim | `jmiller@fullcircleagency.com` | `FullCircle123` |
| Rishi | `rphadke@fullcircleagency.com` | `FullCircle123` |

Emails aren't case-sensitive when signing in. You can double-check the exact
list, and edit any KAM's name, email, or password, from **Roster → KAMs**.

> Worth a glance: Angie's email above (`araja@...`) doesn't obviously match
> her first name the way the others do — if that wasn't intentional, it's a
> one-line fix in **Roster → KAMs**.

---

## How the evaluation flow works (now a two-way / 360° process)

The Director no longer scores CSMs independently. The **official** score is
now the mean of whatever the CSM's KAM(s) scored them — the Director's job is
to review that alongside the CSM's own self-evaluation, then **publish** it
to the CEO for approval.

### 1. The CSM's self-evaluation

Under **My Self-Evaluation** on their own dashboard, each CSM can score
themselves 0–10 on eight categories every month — the original six
(Ownership, Communication, Team Player, AI Adoption, POD Management, Client
Sentiment) plus two more: **Results-Driven** and **Follow Through** — and,
for each category, write up to 300 words explaining why they gave themselves
that score (the box turns red and blocks saving past 300 words). There's no
submit/approval step here: a CSM can save or revise their self-evaluation at
any time, and it's visible to the Director and CEO right away for
comparison. It never becomes the official score by itself.

### 2. The KAM's evaluation of the CSM — this becomes the official score

Each KAM signs in and, under **Score My CSMs**, scores every CSM assigned to
them 0–10 on the same eight categories the CSM scores themselves on, plus a
mandatory **GWC panel** (see below). Once a KAM submits their score for a
CSM/month, it's ready for the Director to review. If a CSM has more than one
KAM (because they cover more than one POD), each KAM scores them separately
and the official score is the mean across all of them.

Every KAM evaluation also requires a **GWC panel** — Gets It, Wants It, Has
The Capability — answered Yes or No for that CSM that month. Picking "No" on
any of the three opens a required remark field (a sentence or two is enough;
capped at 150 words) explaining why. A KAM can save a draft with GWC
incomplete, but an attention icon (⚠) marks it and submitting is blocked
until all three are answered. The GWC panel is visible to the Director and
CEO alongside the scores.

### 3. The Director's Monthly Review — review and publish, not score

Under **Monthly Review**, for each CSM the Director sees (read-only): the
CSM's self-evaluation, every contributing KAM's score and GWC panel, and a
live preview of the **combined score** that would be published (the mean of
that CSM's submitted KAM evaluation(s), category by category). The Director
can add an optional note of their own (up to 500 words — commentary, not a
score) and then click **Publish to CEO**. Publishing is disabled until at
least one KAM has submitted a score for that CSM that month; re-publishing
before the CEO approves simply refreshes the combined score and re-submits
it. Once the CEO approves a month, it's locked.

### 4. The CSM's rating of their KAM(s) — confidential upward feedback

Under **Rate My KAM(s)**, each CSM rates every KAM they work with, once a
month, on five parameters using one unified scale:

| Parameter |
|---|
| Coordination |
| Collaboration |
| Leadership |
| Knowledge Sharing |
| Meeting Availability |

Every parameter uses the same **0 / 5 / 10** scale: **0** = the KAM was not
available on this dimension, **5** = somewhat available (the midpoint), and
**10** = fully available. There is deliberately **no written comment field**
here and **no approval step** — the CSM just picks a value for each
parameter and saves. This feedback is only ever visible to the Director of
Client Success and the CEO, under **KAM Feedback**; the KAM being rated can
never see it, by design, so CSMs can be candid.

### The CEO's approval queue — bulk approve, decline, and revert

The CEO opens **Approvals**, which now shows one combined item per CSM per
month (there's no more "By KAM" grouping, since the Director no longer scores
independently and there's nothing separate to approve on the KAM's side):

- A grid of CSM cards, each showing how many of their published months are
  still pending (and a ⚠ icon if any pending month has an incomplete GWC
  panel on a contributing KAM evaluation). Click a card to drill in.
- Inside a card, toggle **Consolidated** (an overview: pending/approved/
  denied counts, the overall score band, the self vs. official comparison for
  that CSM, and a GWC completion summary) or **Monthly** (every individual
  month, expandable for the full score grid, self-eval comparison, every
  contributing KAM's scores, and their GWC answers).
- In the Monthly view: check the boxes for the months you want to act on,
  then **Approve selected**, **Decline selected**, or use **Approve all
  pending** as a one-click shortcut. Declining opens a small dialog with
  three one-tap reasons ("I don't think I align with the KPIs.", "I don't
  think this is a fair review.", "This review requires further
  discussion.") that you can pick or replace with your own note.
- Changed your mind? **Revert to pending** (single) or **Revert all
  decided** (bulk) puts an approved/denied month back to pending — useful
  when circumstances change. Reverting an approved month also hides it from
  the CSM again until it's re-approved.

### Comparative Analysis (Director & CEO only)

Under **Comparative Analysis**, pick a CSM and a year to see, month by month:
their self-score, their KAM's score of them (combined if they have more than
one KAM, with each KAM's individual score shown too), the variance between
self and KAM score, and the **official (KAM-derived) score** the Director
published — plus quarterly and annual rollups for all three, and the CSM's
self-evaluation notes laid out by month. Under **KAM Feedback**, pick a KAM
and a year to see how their CSMs have rated them each month, plus a
quarterly/annual "how positively rated" percentage.

### Scoring bands (monthly average, and 3-consecutive-month trend)

These bands apply only to the official (KAM-derived, Director-published) score.

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
