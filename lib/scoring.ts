// Shared scoring logic — safe to import from both server and client code.

export const CATEGORIES = [
  { key: "ownership", label: "Ownership" },
  { key: "communication", label: "Communication" },
  { key: "teamPlayer", label: "Team Player" },
  { key: "aiAdoption", label: "AI Adoption" },
  { key: "podManagement", label: "POD Management" },
  { key: "clientSentiment", label: "Client Sentiment" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
export type Scores = Record<CategoryKey, number>;

// Two extra KPIs that apply only to the CSM's self-evaluation and the KAM's
// evaluation of the CSM — the Director's official evaluation (and its
// banding) stays on the original six categories above.
export const EXTRA_SELF_KAM_CATEGORIES = [
  { key: "resultsDriven", label: "Results-Driven" },
  { key: "projectManagement", label: "Follow Through" },
] as const;

export const SELF_KAM_CATEGORIES = [
  ...CATEGORIES,
  ...EXTRA_SELF_KAM_CATEGORIES,
] as const;

export type SelfKamCategoryKey = (typeof SELF_KAM_CATEGORIES)[number]["key"];
export type SelfKamScores = Partial<Record<SelfKamCategoryKey, number>>;

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const QUARTERS: { name: string; months: number[] }[] = [
  { name: "Q1", months: [1, 2, 3] },
  { name: "Q2", months: [4, 5, 6] },
  { name: "Q3", months: [7, 8, 9] },
  { name: "Q4", months: [10, 11, 12] },
];

export function quarterOfMonth(month: number): string {
  return QUARTERS[Math.floor((month - 1) / 3)].name;
}

function averageOver(
  scores: Record<string, number> | null | undefined,
  categories: readonly { key: string }[]
): number | null {
  if (!scores) return null;
  const vals = categories.map((c) => scores[c.key]).filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v)
  );
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

// Director's official evaluation — always the original six categories.
export function average(scores: Partial<Scores> | null | undefined): number | null {
  return averageOver(scores, CATEGORIES);
}

// Self-evaluation and KAM evaluation — the six original categories plus
// Results-Driven and Follow Through.
export function averageSelfKam(scores: SelfKamScores | null | undefined): number | null {
  return averageOver(scores, SELF_KAM_CATEGORIES);
}

export function mean(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

// ---- Bands ----------------------------------------------------------------
// <3        critical
// 3 – <6    warn
// 6 – <8    good
// 8 – 10    top

export type BandKey = "critical" | "warn" | "good" | "top";

export function bandOf(score: number): BandKey {
  if (score < 3) return "critical";
  if (score < 6) return "warn";
  if (score < 8) return "good";
  return "top";
}

// Labels the ADMIN sees (decisive / action-oriented)
export const ADMIN_BAND: Record<BandKey, { label: string; action: string }> = {
  critical: {
    label: "PIP / Exit Risk",
    action: "Immediate PIP required. If no recovery, consider exit.",
  },
  warn: {
    label: "Needs Guidance",
    action: "Improvement required — assign a buddy and set a coaching plan.",
  },
  good: {
    label: "Good — Incentive Eligible",
    action: "Performing well. Qualifies for an incentive / bonus.",
  },
  top: {
    label: "Bonus + Promotion Candidate",
    action: "Outstanding. Award bonus/incentive and consider for promotion.",
  },
};

// Labels the CSM sees (softer, no employment decisions)
export const CSM_BAND: Record<BandKey, string> = {
  critical: "Coaching Required",
  warn: "Developing",
  good: "Good Performance",
  top: "Outstanding Performance",
};

// Per-score chip colour used on the baseball card (mirrors the mockup)
export function scoreChipBand(score: number): BandKey {
  if (score <= 3) return "critical";
  if (score <= 6) return "warn";
  if (score <= 8) return "good";
  return "top";
}

// ---- Streak rules ---------------------------------------------------------
// "Three consecutive scored months" rules, evaluated over the most recent
// three consecutively scored months of a year.

export type StreakResult = {
  months: number[]; // the 3 month numbers considered
  band: BandKey;
} | null;

export function lastThreeConsecutive(
  monthlyAverages: Map<number, number>
): StreakResult {
  // Find the latest run of 3 consecutive months that all have scores.
  for (let start = 10; start >= 1; start--) {
    const run = [start, start + 1, start + 2];
    const vals = run.map((m) => monthlyAverages.get(m));
    if (vals.every((v) => typeof v === "number")) {
      const nums = vals as number[];
      // Band of the streak: use the *worst-case consistent* reading —
      // if all three fall in the same band, that band; otherwise band of the mean.
      const bands = nums.map(bandOf);
      const band = bands.every((b) => b === bands[0])
        ? bands[0]
        : bandOf(mean(nums)!);
      return { months: run, band };
    }
  }
  return null;
}

export function fmtScore(n: number | null | undefined): string {
  return typeof n === "number" ? n.toFixed(1) : "—";
}

// ---- Word counting (notes, feedback, GWC remarks) --------------------------
// We count words rather than characters everywhere a person writes free
// text, so the limit tracks with how much they're actually saying.
export function wordCount(text: string | null | undefined): number {
  const t = (text || "").trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

// The Director's monthly note/feedback: capped at 500 words. The textarea
// turns red and submission is blocked past this.
export const MAX_NOTE_WORDS = 500;

// A CSM's self-evaluation note, per category: capped at 300 words — tighter
// than the Director's note since this is meant to be a quick justification,
// not a long narrative. Same red-border / blocked-submit behavior.
export const MAX_SELF_NOTE_WORDS = 300;

// A KAM's GWC remark (required only when they answer "No" to a GWC
// question) gets more room since it may need a couple of sentences, but is
// still capped so it stays a summary rather than an essay.
export const MAX_GWC_REMARK_WORDS = 150;

// Variance between a CSM's self-score and their KAM's score of them, per
// category. Used by the Director/CEO comparative analysis view.
export function variance(self: number | null | undefined, other: number | null | undefined): number | null {
  if (typeof self !== "number" || typeof other !== "number") return null;
  return Math.round((other - self) * 10) / 10;
}

// ---- CSM → KAM feedback rubric ---------------------------------------------
// Five parameters a CSM scores their KAM on, monthly, no free text.
// Every parameter uses the same plain 0/5/10 scale, shown as the numbers
// themselves (not descriptive words): 0 = bad, 5 = moderate, 10 = excellent —
// the same numeric feel as every other 0–10 score in the app.
export const KAM_UNIFIED_SCALE = [
  { value: 0, label: "0" },
  { value: 5, label: "5" },
  { value: 10, label: "10" },
] as const;

export const KAM_PARAMS = [
  { key: "coordination", label: "Coordination", scale: KAM_UNIFIED_SCALE, prefixLabel: "coordinative" },
  { key: "collaboration", label: "Collaboration", scale: KAM_UNIFIED_SCALE, prefixLabel: "collaborative" },
  { key: "leadership", label: "Leadership", scale: KAM_UNIFIED_SCALE, prefixLabel: "" },
  { key: "knowledgeSharing", label: "Knowledge Sharing", scale: KAM_UNIFIED_SCALE, prefixLabel: "" },
  { key: "meetingAvailability", label: "Meeting Availability", scale: KAM_UNIFIED_SCALE, prefixLabel: "" },
] as const;

export type KamParamKey = (typeof KAM_PARAMS)[number]["key"];
export type KamFeedbackScores = Partial<Record<KamParamKey, number>>;

export function kamScaleLabel(paramKey: KamParamKey, value: number | null | undefined): string {
  if (typeof value !== "number") return "—";
  const param = KAM_PARAMS.find((p) => p.key === paramKey);
  const found = param?.scale.find((s) => s.value === value);
  return found?.label ?? "—";
}

// A 0-1 "how positively is this KAM rated" reading, for a quick rollup chip.
// Normalises each parameter to its own scale's max before averaging.
export function kamFeedbackScore(scores: KamFeedbackScores): number | null {
  const parts: number[] = [];
  for (const p of KAM_PARAMS) {
    const v = scores[p.key];
    if (typeof v === "number") parts.push(v / p.scale[p.scale.length - 1].value);
  }
  if (parts.length === 0) return null;
  return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) / 100;
}

// ---- GWC framework -----------------------------------------------------
// When a KAM scores a CSM, they must also judge, for that CSM that month:
// does the CSM Get it, Want it, and Have the capability to do it. Each is a
// mandatory Yes/No call; picking "No" requires a short remark saying why.
// This is separate from — and required alongside — the 0-10 category
// scores on the same KAM evaluation.

export const GWC_ITEMS = [
  { key: "getsIt", label: "Gets It", question: "Does this CSM get it?" },
  { key: "wantsIt", label: "Wants It", question: "Does this CSM want it?" },
  { key: "capability", label: "Has The Capability", question: "Does this CSM have the capability to do it?" },
] as const;

export type GwcKey = (typeof GWC_ITEMS)[number]["key"];
export type GwcAnswer = { value?: "yes" | "no"; remark?: string };
export type GwcScores = Partial<Record<GwcKey, GwcAnswer>>;

// True only once every GWC item has a Yes/No answer, and every "No" answer
// carries a non-empty remark explaining why.
export function gwcComplete(gwc: GwcScores | null | undefined): boolean {
  if (!gwc) return false;
  return GWC_ITEMS.every((item) => {
    const a = gwc[item.key];
    if (!a || (a.value !== "yes" && a.value !== "no")) return false;
    if (a.value === "no" && !(a.remark && a.remark.trim())) return false;
    return true;
  });
}

// How many of the 3 GWC items are missing an answer (or a required remark) —
// used to drive the attention icon / count on the KAM's scoring screen.
export function gwcMissingCount(gwc: GwcScores | null | undefined): number {
  return GWC_ITEMS.filter((item) => {
    const a = gwc?.[item.key];
    if (!a || (a.value !== "yes" && a.value !== "no")) return true;
    if (a.value === "no" && !(a.remark && a.remark.trim())) return true;
    return false;
  }).length;
}
