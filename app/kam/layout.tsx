import Shell from "@/components/Shell";
import { getSession } from "@/lib/auth";

export default async function KamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  return (
    <Shell
      name={session?.name || "KAM"}
      roleLabel="Key Account Manager"
      links={[{ href: "/kam", label: "Score My CSMs" }]}
    >
      {children}
    </Shell>
  );
}
