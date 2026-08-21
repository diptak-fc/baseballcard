import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";

export default async function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <Shell
      name={session?.name || "CSM"}
      roleLabel="Client Success"
      links={[{ href: "/me", label: "My Baseball Card" }]}
    >
      {children}
    </Shell>
  );
}
