import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getAuthenticatedUser } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCategoriesWithOptions, getStepsWithConfig } from "@/lib/db-queries";
import type { SubCategory } from "@/types";

function formatPrice(price: number): string {
  return price === 0 ? "Included" : `+$${price.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminBuyerDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const auth = await getAuthenticatedUser(orgSlug);
  if (!auth) redirect("/admin/login");

  const supabase = await createSupabaseServer();

  const { data: session, error: queryError } = await supabase
    .from("buyer_sessions")
    .select("*, floorplans(name, slug, id)")
    .eq("id", id)
    .eq("org_id", auth.orgId)
    .single();

  if (queryError) {
    console.error("[admin/buyers/detail] Query error:", queryError);
  }
  if (!session) notFound();

  // Get categories and steps for display
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const floorplanId = (session as any).floorplans?.id ?? session.floorplan_id;
  const [categories, steps] = await Promise.all([
    getCategoriesWithOptions(auth.orgId),
    getStepsWithConfig(floorplanId),
  ]);

  // Build subcategory + option lookup
  const subMap = new Map<string, SubCategory>();
  for (const cat of categories) {
    for (const sub of cat.subCategories) {
      subMap.set(sub.id, sub);
    }
  }

  const selections = (session.selections ?? {}) as Record<string, string>;
  const quantities = (session.quantities ?? {}) as Record<string, number>;

  // Group selections by step
  const stepSelections = steps.map((step) => {
    const stepSubIds = new Set(step.sections.flatMap((s) => s.subCategoryIds));
    const entries: { subName: string; optionName: string; price: number; quantity: number }[] = [];

    for (const [subId, optId] of Object.entries(selections)) {
      if (!stepSubIds.has(subId)) continue;
      const sub = subMap.get(subId);
      if (!sub) continue;
      const option = sub.options.find((o) => o.id === optId);
      if (!option) continue;
      const qty = sub.isAdditive ? (quantities[subId] || 0) : 1;
      if (option.price === 0 && !sub.isAdditive) continue; // skip included defaults
      entries.push({
        subName: sub.name,
        optionName: option.name,
        price: option.price,
        quantity: qty,
      });
    }

    return { stepName: step.name, entries };
  }).filter((s) => s.entries.length > 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const floorplanName = (session as any).floorplans?.name ?? "Unknown";

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-4xl space-y-6">
        <Link href={`/admin/${orgSlug}/buyers`} className="text-sm text-slate-500 hover:text-slate-900 inline-block">
          &larr; All Buyers
        </Link>

        <div className="border border-slate-200 bg-white/90 backdrop-blur px-5 py-5 md:px-6 md:py-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400 font-semibold">Session Detail</p>
          <h1 className="text-2xl md:text-3xl leading-tight tracking-tight mt-2">
            {session.buyer_email ?? <span className="text-slate-500 italic">Anonymous Session</span>}
          </h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-slate-600">
            <span>Floorplan: <span className="text-slate-900">{floorplanName}</span></span>
            <span>Total: <span className="text-slate-900 font-mono">${Number(session.total_price).toLocaleString()}</span></span>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium border ${
              session.status === "submitted"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}>
              {session.status === "submitted" ? "Submitted" : "In Progress"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Last active: {formatDate(session.updated_at)} &middot; Created: {formatDate(session.created_at)}
          </p>
        </div>

        {stepSelections.length === 0 ? (
          <div className="border border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm">
            No upgrades selected yet.
          </div>
        ) : (
          <div className="space-y-6">
            {stepSelections.map((step) => (
              <div key={step.stepName} className="border border-slate-200 bg-white shadow-sm">
                <h2 className="text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-[0.14em] border-b border-slate-200">
                  {step.stepName}
                </h2>
                <div>
                  {step.entries.map((entry, i) => (
                    <div
                      key={`${step.stepName}-${i}`}
                      className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                        i > 0 ? "border-t border-slate-200/80" : ""
                      }`}
                    >
                      <div>
                        <span className="text-slate-500">{entry.subName}:</span>{" "}
                        <span className="text-slate-800">{entry.optionName}</span>
                        {entry.quantity > 1 && (
                          <span className="text-slate-500 ml-1">&times;{entry.quantity}</span>
                        )}
                      </div>
                      <span className="font-mono text-slate-700">
                        {formatPrice(entry.price * entry.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
