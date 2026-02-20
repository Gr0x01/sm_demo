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
    <div className="p-6 md:p-8">
      <div className="max-w-7xl space-y-6">
        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Catalog</p>
          <h1 className="text-3xl leading-tight tracking-tight mt-2">Options</h1>
          <p className="text-slate-600 text-sm mt-2">
            {categories.length} categories, {totalSubs} subcategories, {totalOptions} options
          </p>
        </div>

        <div className="border border-slate-200 bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm">
          <OptionTree
            categories={categories}
            orgId={auth.orgId}
            orgSlug={orgSlug}
            isAdmin={auth.role === "admin"}
            floorplans={floorplans.map((fp) => ({ id: fp.id, name: fp.name }))}
          />
        </div>
      </div>
    </div>
  );
}
