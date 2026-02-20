import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminOptionTree, getAdminFloorplans } from "@/lib/admin-queries";
import { OptionTree } from "@/components/admin/OptionTree";

export default async function AdminOptionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const supabase = await createSupabaseServer();
  const [categories, floorplans] = await Promise.all([
    getAdminOptionTree(supabase, auth.orgId),
    getAdminFloorplans(supabase, auth.orgId),
  ]);

  const totalOptions = categories.reduce(
    (sum, cat) => sum + cat.subcategories.reduce((s, sub) => s + sub.options.length, 0),
    0
  );
  const totalSubs = categories.reduce((sum, cat) => sum + cat.subcategories.length, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Options</h1>
        <p className="text-neutral-400 text-sm mt-1">
          {categories.length} categories, {totalSubs} subcategories, {totalOptions} options
        </p>
      </div>
      <OptionTree
        categories={categories}
        orgId={auth.orgId}
        orgSlug={orgSlug}
        isAdmin={auth.role === "admin"}
        floorplans={floorplans.map((fp) => ({ id: fp.id, name: fp.name }))}
      />
    </div>
  );
}
