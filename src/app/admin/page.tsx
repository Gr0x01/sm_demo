import { redirect } from "next/navigation";
import { getUserOrgs } from "@/lib/auth";
import Link from "next/link";

export default async function AdminOrgPickerPage() {
  const orgs = await getUserOrgs();

  // Single org → redirect directly
  if (orgs.length === 1) {
    redirect(`/admin/${orgs[0].orgSlug}`);
  }

  // No orgs → user is authenticated but has no org memberships
  if (orgs.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">No Access</h1>
          <p className="text-sm text-neutral-400 mt-2">Your account has no organization memberships. Contact your administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">Select Organization</h1>
          <p className="text-sm text-neutral-400 mt-1">Choose which builder account to manage</p>
        </div>

        <div className="space-y-2">
          {orgs.map((org) => (
            <Link
              key={org.orgId}
              href={`/admin/${org.orgSlug}`}
              className="block w-full px-4 py-3 bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 hover:border-neutral-700 transition-colors"
            >
              <span className="font-medium">{org.orgName}</span>
              <span className="text-neutral-500 text-sm ml-2">({org.role})</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
