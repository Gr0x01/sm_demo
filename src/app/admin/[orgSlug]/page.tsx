import { redirect } from "next/navigation";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  // For now, redirect to options page — this becomes a dashboard later
  redirect(`/admin/${orgSlug}/options`);
}
