import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { getAdminOptionTree, getAdminFloorplans, getAdminAllStepsForOrg } from "@/lib/admin-queries";
import { OptionTree } from "@/components/admin/OptionTree";

export default async function AdminOptionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const [categories, floorplans, allSteps] = await Promise.all([
    getAdminOptionTree(auth.orgId),
    getAdminFloorplans(auth.orgId),
    getAdminAllStepsForOrg(auth.orgId),
  ]);

  // Build step groups: each step → set of category IDs whose subcategories appear in it
  const multipleFloorplans = new Set(allSteps.map((s) => s.floorplan_id)).size > 1;
  const assignedCategoryIds = new Set<string>();
  const stepGroups: { label: string; categoryIds: string[] }[] = [];

  for (const step of allSteps) {
    const subSlugs = new Set(step.sections.flatMap((s) => s.subcategory_ids));
    const catIds: string[] = [];
    for (const cat of categories) {
      if (cat.subcategories.some((sub) => subSlugs.has(sub.slug))) {
        catIds.push(cat.id);
        assignedCategoryIds.add(cat.id);
      }
    }
    if (catIds.length > 0) {
      const label = multipleFloorplans ? `${step.floorplan_name} — ${step.name}` : step.name;
      stepGroups.push({ label, categoryIds: catIds });
    }
  }

  // Categories not assigned to any step
  const unassignedIds = categories.filter((c) => !assignedCategoryIds.has(c.id)).map((c) => c.id);
  if (unassignedIds.length > 0) {
    stepGroups.push({ label: "Unassigned", categoryIds: unassignedIds });
  }

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
            stepGroups={stepGroups}
          />
        </div>
      </div>
    </div>
  );
}
