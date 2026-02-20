import { redirect } from "next/navigation";
import { getUserOrgs } from "@/lib/auth";
import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

const ADMIN_NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Try It", href: "/try" },
];

function AdminScaffold({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-theme min-h-screen bg-white">
      <SiteNav
        links={ADMIN_NAV_LINKS}
        cta={{ label: "Builder Demo", href: "/stonemartin/kinkade" }}
      />

      <section className="relative overflow-hidden px-6 py-14 md:py-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-36 right-0 h-[420px] w-[420px] rounded-full bg-sky-100/45 blur-3xl" />
          <div className="absolute top-24 -left-20 h-[300px] w-[300px] rounded-full bg-slate-100 blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">{children}</div>
      </section>
    </div>
  );
}

export default async function AdminOrgPickerPage() {
  const orgs = await getUserOrgs();

  // Single org → redirect directly
  if (orgs.length === 1) {
    redirect(`/admin/${orgs[0].orgSlug}`);
  }

  // No orgs → user is authenticated but has no org memberships
  if (orgs.length === 0) {
    return (
      <AdminScaffold>
        <div className="border border-slate-200 bg-white shadow-sm p-8 md:p-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-4">
            Finch Admin
          </p>
          <h1 className="text-3xl md:text-4xl leading-tight tracking-tight text-slate-900">No Access</h1>
          <p className="text-sm md:text-base text-slate-600 mt-3">
            Your account has no organization memberships. Contact your administrator.
          </p>
        </div>
      </AdminScaffold>
    );
  }

  return (
    <AdminScaffold>
      <div className="border border-slate-200 bg-white shadow-sm p-8 md:p-10">
        <div className="mb-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-semibold mb-4">
            Finch Admin
          </p>
          <h1 className="text-3xl md:text-4xl leading-tight tracking-tight text-slate-900">
            Select Organization
          </h1>
          <p className="text-sm md:text-base text-slate-600 mt-3">
            Choose which builder account to manage.
          </p>
        </div>

        <div className="space-y-2.5">
          {orgs.map((org) => (
            <Link
              key={org.orgId}
              href={`/admin/${org.orgSlug}`}
              className="group flex items-center justify-between w-full px-4 py-3 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors"
            >
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900 truncate">{org.orgName}</span>
                <span className="block text-xs text-slate-500 mt-0.5 capitalize">{org.role} access</span>
              </span>
              <span className="text-slate-400 group-hover:text-slate-700 transition-colors">View</span>
            </Link>
          ))}
        </div>
      </div>
    </AdminScaffold>
  );
}
