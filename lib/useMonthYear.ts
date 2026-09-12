"use client";

import { useEffect, useState } from "react";

// A month/year selection that's remembered across the whole app (in the
// browser's local storage), instead of each page resetting to today's
// calendar month/year the moment it mounts. This is what makes "I picked
// February, then switched tabs" keep showing February everywhere, for
// every role (CSM, KAM, Director, CEO).
//
// The very first render always uses today's month/year (so server-rendered
// and first-painted markup match exactly, avoiding a hydration mismatch);
// a moment later, an effect swaps in whatever was last picked, if anything.

const MONTH_KEY = "fc_selected_month";
const YEAR_KEY = "fc_selected_year";

function readStored(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null; // e.g. private browsing with storage disabled
  }
}

function writeStored(key: string, value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore — nothing we can do if storage is unavailable
  }
}

export function usePersistedMonth() {
  const [month, setMonthState] = useState(() => new Date().getMonth() + 1);

  useEffect(() => {
    const stored = readStored(MONTH_KEY);
    if (stored) setMonthState(stored);
  }, []);

  function setMonth(m: number) {
    setMonthState(m);
    writeStored(MONTH_KEY, m);
  }

  return [month, setMonth] as const;
}

export function usePersistedYear() {
  const [year, setYearState] = useState(() => new Date().getFullYear());

  useEffect(() => {
    const stored = readStored(YEAR_KEY);
    if (stored) setYearState(stored);
  }, []);

  function setYear(y: number) {
    setYearState(y);
    writeStored(YEAR_KEY, y);
  }

  return [year, setYear] as const;
}
