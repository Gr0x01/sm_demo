import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminStepsForFloorplan, getAdminOptionTree } from "@/lib/admin-queries";
import { FloorplanEditor } from "@/components/admin/FloorplanEditor";

export default async function AdminFloorplanDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id: floorplanId } = await params;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const supabase = await createSupabaseServer();

  // Fetch floorplan (user-scoped for ownership check)
  const { data: floorplan } = await supabase
    .from("floorplans")
    .select("id, org_id, name, slug, community, price_sheet_label, is_active")
    .eq("id", floorplanId)
    .eq("org_id", auth.orgId)
    .single();

  if (!floorplan) notFound();

  const [steps, categories] = await Promise.all([
    getAdminStepsForFloorplan(floorplanId, auth.orgId),
    getAdminOptionTree(auth.orgId),
  ]);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // Flatten subcategories for section assignment
  const allSubcategories = categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      id: sub.slug,
      name: sub.name,
      categoryName: cat.name,
    }))
  );

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-6xl space-y-6">
        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <a href={`/admin/${orgSlug}/floorplans`} className="hover:text-slate-900 transition-colors">
            Floorplans
          </a>
          <span>/</span>
            <span className="text-slate-800">{floorplan.name}</span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Edit Floorplan</p>
          <h1 className="text-3xl leading-tight tracking-tight mt-2">{floorplan.name}</h1>
          {floorplan.community && (
            <p className="text-slate-600 text-sm mt-2">{floorplan.community}</p>
          )}
        </div>

        <div className="border border-slate-200 bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm">
          <FloorplanEditor
            floorplan={floorplan}
            steps={steps}
            orgId={auth.orgId}
            orgSlug={orgSlug}
            isAdmin={auth.role === "admin"}
            allSubcategories={allSubcategories}
            supabaseUrl={supabaseUrl}
          />
        </div>
      </div>
    </div>
  );
}
