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
    <div className="p-6 md:p-8">
      <div className="max-w-6xl space-y-6">
        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
            <a href={`/admin/${orgSlug}/floorplans`} className="hover:text-slate-900 transition-colors">
            Floorplans
          </a>
          <span>/</span>
            <a href={`/admin/${orgSlug}/floorplans/${floorplanId}`} className="hover:text-slate-900 transition-colors">
            {floorplan.name}
          </a>
          <span>/</span>
            <span className="text-slate-800">Photos</span>
          </div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Media</p>
          <h1 className="text-3xl leading-tight tracking-tight mt-2">Room Photos</h1>
          <p className="text-slate-600 text-sm mt-2">
            Upload and manage room photos for AI visualization.
          </p>
        </div>

        <div className="border border-slate-200 bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm">
          <PhotoManager
            steps={steps}
            orgId={auth.orgId}
            orgSlug={orgSlug}
            supabaseUrl={supabaseUrl}
            initialStepId={initialStepId}
          />
        </div>
      </div>
    </div>
  );
}
