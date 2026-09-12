import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";
import { navLinksFor } from "@/lib/nav";

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
      links={navLinksFor("ADMIN")}
    >
      {children}
    </Shell>
  );
}
