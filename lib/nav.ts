import type { NavLink } from "@/components/Shell";
import type { Role } from "@/lib/auth";

// Centralised so every layout (admin, ceo, reports) shows the same
// consistent set of links for a given role, regardless of which section
// the user is currently in.
export function navLinksFor(role: Role): NavLink[] {
  if (role === "ADMIN") {
    return [
      { href: "/admin", label: "Monthly Review" },
      { href: "/admin/insights", label: "Performance Insights" },
      { href: "/reports", label: "Comparative Analysis" },
      { href: "/reports/kam-feedback", label: "KAM Feedback" },
      { href: "/admin/roster", label: "Roster" },
    ];
  }
  if (role === "CEO") {
    return [
      { href: "/ceo", label: "Approvals" },
      { href: "/reports", label: "Comparative Analysis" },
      { href: "/reports/kam-feedback", label: "KAM Feedback" },
    ];
  }
  if (role === "KAM") {
    return [{ href: "/kam", label: "Score My CSMs" }];
  }
  return [{ href: "/me", label: "My Baseball Card" }];
}
