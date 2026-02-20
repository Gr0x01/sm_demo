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
    <div className="admin-theme flex min-h-screen bg-slate-50 text-slate-900">
      <AdminSidebar orgSlug={orgSlug} orgName={org.name} />
      <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_8%_12%,rgba(186,230,253,0.24),transparent_35%),radial-gradient(circle_at_90%_8%,rgba(226,232,240,0.36),transparent_38%)]">
        {children}
      </main>
    </div>
  );
}
