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
    <div className="p-6 max-w-3xl">
      <Link href={`/admin/${orgSlug}/buyers`} className="text-sm text-neutral-400 hover:text-white mb-4 inline-block">
        &larr; All Buyers
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold">
          {session.buyer_email ?? <span className="text-neutral-500 italic">Anonymous Session</span>}
        </h1>
        <div className="flex gap-6 mt-2 text-sm text-neutral-400">
          <span>Floorplan: <span className="text-neutral-200">{floorplanName}</span></span>
          <span>Total: <span className="text-neutral-200 font-mono">${Number(session.total_price).toLocaleString()}</span></span>
          <span className={`inline-block px-2 py-0.5 text-xs font-medium ${
            session.status === "submitted"
              ? "bg-green-900/30 text-green-400"
              : "bg-yellow-900/30 text-yellow-400"
          }`}>
            {session.status === "submitted" ? "Submitted" : "In Progress"}
          </span>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          Last active: {formatDate(session.updated_at)} &middot; Created: {formatDate(session.created_at)}
        </p>
      </div>

      {/* Selections by step */}
      {stepSelections.length === 0 ? (
        <p className="text-sm text-neutral-500">No upgrades selected yet.</p>
      ) : (
        <div className="space-y-6">
          {stepSelections.map((step) => (
            <div key={step.stepName}>
              <h2 className="text-sm font-semibold text-neutral-300 mb-2 uppercase tracking-wider">
                {step.stepName}
              </h2>
              <div className="border border-neutral-800">
                {step.entries.map((entry, i) => (
                  <div
                    key={`${step.stepName}-${i}`}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                      i > 0 ? "border-t border-neutral-800/50" : ""
                    }`}
                  >
                    <div>
                      <span className="text-neutral-400">{entry.subName}:</span>{" "}
                      <span className="text-neutral-200">{entry.optionName}</span>
                      {entry.quantity > 1 && (
                        <span className="text-neutral-500 ml-1">&times;{entry.quantity}</span>
                      )}
                    </div>
                    <span className="font-mono text-neutral-300">
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
  );
}
