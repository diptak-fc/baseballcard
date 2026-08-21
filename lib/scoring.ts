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

export function average(scores: Partial<Scores> | null | undefined): number | null {
  if (!scores) return null;
  const vals = CATEGORIES.map((c) => scores[c.key]).filter(
    (v): v is number => typeof v === "number" && !Number.isNaN(v)
  );
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
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
