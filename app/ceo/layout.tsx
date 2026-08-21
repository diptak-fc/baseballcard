import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";

export default async function CeoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <Shell
      name={session?.name || "CEO"}
      roleLabel="Chief Executive Officer"
      links={[{ href: "/ceo", label: "Approvals" }]}
    >
      {children}
    </Shell>
  );
}
