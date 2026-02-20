import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Validate next param to prevent open redirect
  // Constrain redirect to /admin paths only to prevent abuse
  const rawNext = searchParams.get("next") ?? "/admin";
  const next = rawNext.startsWith("/admin") ? rawNext : "/admin";

  const redirectTo = request.nextUrl.clone();
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("next");

  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      redirectTo.pathname = next;
      return NextResponse.redirect(redirectTo);
    }
  }

  // Auth failed — send back to login with error context
  redirectTo.pathname = "/admin/login";
  redirectTo.searchParams.set("error", "link_expired");
  return NextResponse.redirect(redirectTo);
}
