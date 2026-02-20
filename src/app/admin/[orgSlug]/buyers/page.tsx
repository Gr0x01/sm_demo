import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { BuyerSessionSummary } from "@/types";

function formatPrice(price: number): string {
  return price === 0 ? "$0" : `$${price.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminBuyersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const supabase = await createSupabaseServer();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: sessions, error: queryError } = await supabase
    .from("buyer_sessions")
    .select("id, buyer_email, total_price, generation_count, status, updated_at, selections, floorplans(name)")
    .eq("org_id", auth.orgId)
    .or(`buyer_email.not.is.null,updated_at.gte.${thirtyDaysAgo}`)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (queryError) {
    console.error("[admin/buyers] Query error:", queryError);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summaries: BuyerSessionSummary[] = (sessions ?? []).map((s: any) => ({
    id: s.id,
    buyerEmail: s.buyer_email,
    floorplanName: s.floorplans?.name ?? "Unknown",
    totalPrice: Number(s.total_price),
    selectionCount: Object.keys(s.selections ?? {}).length,
    generationCount: s.generation_count,
    status: s.status,
    updatedAt: s.updated_at,
  }));

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl space-y-6">
        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Pipeline</p>
          <h1 className="text-3xl leading-tight tracking-tight mt-2">Buyer Sessions</h1>
          <p className="text-sm text-slate-600 mt-2">
            {summaries.length} session{summaries.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="border border-slate-200 bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm">
          {queryError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 py-8 text-center">
              Failed to load buyer sessions. Please try refreshing the page.
            </div>
          ) : summaries.length === 0 ? (
            <div className="text-sm text-slate-500 py-12 text-center">
              No buyer sessions yet. Sessions appear when buyers visit your floorplan pages.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 text-left">
                    <th className="pb-3 pr-4 font-medium">Email</th>
                    <th className="pb-3 pr-4 font-medium">Floorplan</th>
                    <th className="pb-3 pr-4 font-medium text-right">Total</th>
                    <th className="pb-3 pr-4 font-medium text-right">Selections</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 font-medium">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.id} className="border-b border-slate-200/70 hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <Link href={`/admin/${orgSlug}/buyers/${s.id}`} className="text-slate-700 hover:text-slate-900 underline decoration-slate-300">
                          {s.buyerEmail ?? <span className="text-slate-500 italic">Anonymous</span>}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{s.floorplanName}</td>
                      <td className="py-3 pr-4 text-right font-mono text-slate-700">{formatPrice(s.totalPrice)}</td>
                      <td className="py-3 pr-4 text-right text-slate-600">{s.selectionCount}</td>
                      <td className="py-3 pr-4">
                        <span className={`inline-block px-2 py-0.5 text-xs font-medium border ${
                          s.status === "submitted"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {s.status === "submitted" ? "Submitted" : "In Progress"}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">{formatDate(s.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
