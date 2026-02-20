import { redirect, notFound } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminStepPhotos } from "@/lib/admin-queries";
import { PhotoManager } from "@/components/admin/PhotoManager";

export default async function AdminPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { orgSlug, id: floorplanId } = await params;
  const { step: initialStepId } = await searchParams;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const supabase = await createSupabaseServer();

  // Verify floorplan exists and belongs to org
  const { data: floorplan } = await supabase
    .from("floorplans")
    .select("id, name")
    .eq("id", floorplanId)
    .eq("org_id", auth.orgId)
    .single();

  if (!floorplan) notFound();

  const steps = await getAdminStepPhotos(supabase, floorplanId, auth.orgId);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-neutral-400 mb-2">
          <a href={`/admin/${orgSlug}/floorplans`} className="hover:text-white transition-colors">
            Floorplans
          </a>
          <span>/</span>
          <a href={`/admin/${orgSlug}/floorplans/${floorplanId}`} className="hover:text-white transition-colors">
            {floorplan.name}
          </a>
          <span>/</span>
          <span className="text-white">Photos</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Room Photos</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Upload and manage room photos for AI visualization
        </p>
      </div>
      <PhotoManager
        steps={steps}
        orgId={auth.orgId}
        orgSlug={orgSlug}
        supabaseUrl={supabaseUrl}
        initialStepId={initialStepId}
      />
    </div>
  );
}
