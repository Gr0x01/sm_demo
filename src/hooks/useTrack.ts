import { useCallback, useRef } from "react";
import { usePostHog } from "posthog-js/react";

interface TrackContext {
  orgSlug?: string;
  floorplanSlug?: string;
  sessionId?: string;
}

/**
 * Thin wrapper around PostHog capture that auto-attaches org/floorplan/session
 * context and calls posthog.group("org", orgSlug) for per-tenant analytics.
 */
export function useTrack(ctx: TrackContext = {}) {
  const posthog = usePostHog();
  const groupedRef = useRef<string | null>(null);

  return useCallback(
    (event: string, properties?: Record<string, unknown>) => {
      if (!posthog) return;

      // Set org group once per orgSlug change
      if (ctx.orgSlug && ctx.orgSlug !== groupedRef.current) {
        posthog.group("org", ctx.orgSlug);
        groupedRef.current = ctx.orgSlug;
      }

      posthog.capture(event, {
        ...(ctx.orgSlug ? { orgSlug: ctx.orgSlug } : {}),
        ...(ctx.floorplanSlug ? { floorplanSlug: ctx.floorplanSlug } : {}),
        ...(ctx.sessionId ? { sessionId: ctx.sessionId } : {}),
        ...properties,
      });
    },
    [posthog, ctx.orgSlug, ctx.floorplanSlug, ctx.sessionId],
  );
}
