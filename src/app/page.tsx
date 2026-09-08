import { redirect } from "next/navigation";
import { GalaxyGrid } from "@/components/galaxy-grid";
import { getCurrentUser } from "@/lib/auth/session";
import { countUsers } from "@/lib/auth/user-repo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // First run: no accounts yet → force administrator creation.
  if (countUsers() === 0) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <GalaxyGrid user={user} />
    </main>
  );
}
