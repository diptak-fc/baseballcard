import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <Shell
      name={session?.name || "Director"}
      roleLabel="Director of Client Success"
      links={[
        { href: "/admin", label: "Monthly Scoring" },
        { href: "/admin/insights", label: "Performance Insights" },
        { href: "/admin/roster", label: "Roster" },
      ]}
    >
      {children}
    </Shell>
  );
}
