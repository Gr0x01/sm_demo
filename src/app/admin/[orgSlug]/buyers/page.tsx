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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Buyer Sessions</h1>
        <p className="text-sm text-neutral-400 mt-1">
          {summaries.length} session{summaries.length !== 1 ? "s" : ""}
        </p>
      </div>

      {queryError ? (
        <div className="text-sm text-red-400 py-12 text-center">
          Failed to load buyer sessions. Please try refreshing the page.
        </div>
      ) : summaries.length === 0 ? (
        <div className="text-sm text-neutral-500 py-12 text-center">
          No buyer sessions yet. Sessions appear when buyers visit your floorplan pages.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 text-left">
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
                <tr key={s.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/50">
                  <td className="py-3 pr-4">
                    <Link href={`/admin/${orgSlug}/buyers/${s.id}`} className="text-blue-400 hover:underline">
                      {s.buyerEmail ?? <span className="text-neutral-500 italic">Anonymous</span>}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 text-neutral-300">{s.floorplanName}</td>
                  <td className="py-3 pr-4 text-right font-mono text-neutral-300">{formatPrice(s.totalPrice)}</td>
                  <td className="py-3 pr-4 text-right text-neutral-400">{s.selectionCount}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium ${
                      s.status === "submitted"
                        ? "bg-green-900/30 text-green-400"
                        : "bg-yellow-900/30 text-yellow-400"
                    }`}>
                      {s.status === "submitted" ? "Submitted" : "In Progress"}
                    </span>
                  </td>
                  <td className="py-3 text-neutral-400">{formatDate(s.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
