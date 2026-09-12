import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { navLinksFor } from "@/lib/nav";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const role = session?.role || "ADMIN";
  return (
    <Shell
      name={session?.name || "Director"}
      roleLabel={role === "CEO" ? "Chief Executive Officer" : "Director of Client Success"}
      links={navLinksFor(role)}
    >
      {children}
    </Shell>
  );
}
