import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { getOrgBySlug } from "@/lib/db-queries";

export default async function AdminOrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) {
    redirect("/admin/login");
  }

  const org = await getOrgBySlug(orgSlug);
  if (!org) {
    redirect("/admin");
  }

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      <AdminSidebar orgSlug={orgSlug} orgName={org.name} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
