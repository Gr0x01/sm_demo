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

  // Fetch floorplan
  const { data: floorplan } = await supabase
    .from("floorplans")
    .select("id, org_id, name, slug, community, price_sheet_label, is_active")
    .eq("id", floorplanId)
    .eq("org_id", auth.orgId)
    .single();

  if (!floorplan) notFound();

  const [steps, categories] = await Promise.all([
    getAdminStepsForFloorplan(supabase, floorplanId, auth.orgId),
    getAdminOptionTree(supabase, auth.orgId),
  ]);

  // Flatten subcategories for section assignment
  const allSubcategories = categories.flatMap((cat) =>
    cat.subcategories.map((sub) => ({
      id: sub.slug,
      name: sub.name,
      categoryName: cat.name,
    }))
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
          <a href={`/admin/${orgSlug}/floorplans`} className="hover:text-white transition-colors">
            Floorplans
          </a>
          <span>/</span>
          <span className="text-white">{floorplan.name}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{floorplan.name}</h1>
        {floorplan.community && (
          <p className="text-neutral-400 text-sm mt-1">{floorplan.community}</p>
        )}
      </div>
      <FloorplanEditor
        floorplan={floorplan}
        steps={steps}
        orgId={auth.orgId}
        orgSlug={orgSlug}
        isAdmin={auth.role === "admin"}
        allSubcategories={allSubcategories}
      />
    </div>
  );
}
