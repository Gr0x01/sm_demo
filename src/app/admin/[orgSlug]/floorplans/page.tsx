import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminFloorplans } from "@/lib/admin-queries";
import { FloorplanList } from "@/components/admin/FloorplanList";

export default async function AdminFloorplansPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const supabase = await createSupabaseServer();
  const floorplans = await getAdminFloorplans(supabase, auth.orgId);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-5xl space-y-6">
        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Inventory</p>
          <h1 className="text-3xl leading-tight tracking-tight mt-2">Floorplans</h1>
          <p className="text-slate-600 text-sm mt-2">
            {floorplans.length} floorplan{floorplans.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="border border-slate-200 bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm">
          <FloorplanList
            floorplans={floorplans}
            orgId={auth.orgId}
            orgSlug={orgSlug}
            isAdmin={auth.role === "admin"}
          />
        </div>
      </div>
    </div>
  );
}
