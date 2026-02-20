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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Floorplans</h1>
        <p className="text-neutral-400 text-sm mt-1">
          {floorplans.length} floorplan{floorplans.length !== 1 ? "s" : ""}
        </p>
      </div>
      <FloorplanList
        floorplans={floorplans}
        orgId={auth.orgId}
        orgSlug={orgSlug}
        isAdmin={auth.role === "admin"}
      />
    </div>
  );
}
