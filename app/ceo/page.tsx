"use client";

import { ReviewQueue } from "@/components/reviewQueue";

export default function CeoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">CEO Review</h1>
        <p className="mt-1 text-sm text-ink-soft">
          One combined, KAM-derived score per CSM per month, published by the
          Director for your approval. Browse by CSM, get a consolidated
          summary (including GWC completion and the self vs. official
          comparison), then switch to the monthly view to bulk-approve,
          decline, or revert a decision — you can always change your mind
          later.
        </p>
      </div>
      <ReviewQueue canDecide={true} />
    </div>
  );
}
