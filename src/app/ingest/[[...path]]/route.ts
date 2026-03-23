import { NextRequest } from "next/server";

const POSTHOG_HOST = "https://us.i.posthog.com";
const POSTHOG_ASSETS = "https://us-assets.i.posthog.com";

export const runtime = "edge";

async function handler(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/^\/ingest/, "");
  const search = request.nextUrl.search;

  // Static assets (recorder.js, etc.) go to the assets host
  const isStatic = path.startsWith("/static/");
  const origin = isStatic ? POSTHOG_ASSETS : POSTHOG_HOST;
  const destination = `${origin}${path}${search}`;

  const headers = new Headers();
  // Forward content-type so PostHog can parse the body
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  // PostHog needs the origin for CORS
  headers.set("host", new URL(origin).host);

  const res = await fetch(destination, {
    method: request.method,
    headers,
    body: request.method === "POST" ? request.body : undefined,
  });

  return new Response(res.body, {
    status: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "application/json",
    },
  });
}

export const GET = handler;
export const POST = handler;
