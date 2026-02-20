---
name: frontend-design
description: Finch frontend design system and implementation guidance. Use when creating or modifying React components, pages, and visual UI so output matches Finch homepage, /try demo, and floorplan demo patterns.
---

# Finch Frontend Design System (2026)

## Core Direction

Practical editorial SaaS.
The UI should feel confident, clear, and buyer-ready:

- Image-first layouts
- Slate and white surfaces
- Strong serif headlines
- Tight uppercase micro-labels
- Direct, useful copy

This is not playful startup UI and not glossy AI gradients.

## Canonical Finch References

Before writing UI code, check these files:

- `src/app/page.tsx` (homepage structure, hierarchy, CTA treatment)
- `src/app/try/DemoClient.tsx` (two-column interactive demo shell)
- `src/app/try/DemoViewer.tsx` (generation overlays and staged wait states)
- `src/app/[orgSlug]/[floorplanSlug]/DemoPageClient.tsx` (tenant flow + theme variables)
- `src/components/SiteNav.tsx` (sticky nav and mobile menu pattern)
- `src/components/LandingHero.tsx` (entry flow and resume behavior)
- `src/components/StepHero.tsx` (hero imagery + generation reveal)
- `src/app/globals.css` (global tokens + animation primitives)

## Color System

```css
:root {
  /* Finch brand tokens */
  --color-navy: #1b2d4e;
  --color-navy-hover: #172742;
  --color-accent: #2767b1;
  --color-secondary: #c5a572;

  /* Neutral working palette */
  --slate-900: #0f172a;
  --slate-700: #334155;
  --slate-500: #64748b;
  --slate-300: #cbd5e1;
  --slate-200: #e2e8f0;
  --slate-100: #f1f5f9;
  --slate-50: #f8fafc;
  --white: #ffffff;
}
```

### Usage

- Primary action: navy (`--color-navy` or `bg-slate-900` depending on context)
- Accent text/markers: `--color-accent`
- Warm brand highlight only where needed: `--color-secondary`
- Core surfaces: white and slate-50 with slate-200 borders

## Typography

- Headlines: `Iowan Old Style`, `Baskerville`, `Times New Roman`, serif
- Body/UI: `Avenir Next`, `Segoe UI`, `Helvetica Neue`, Helvetica, sans-serif
- Labels: uppercase, small size, wide tracking

### Type Hierarchy

- Hero statement: large, tight, high contrast
- Section heading: clear and compact
- Body copy: readable and direct
- Metadata: small and muted

Do not introduce unrelated display fonts for Finch pages.

## Layout Patterns

### Pattern 1: Marketing (Homepage)

- Big statement headline + concise subhead
- Proof card or visual artifact near hero
- Alternating white and slate-50 sections
- Repeated CTA moments tied to context

### Pattern 2: Interactive Demo (`/try`)

- Desktop split:
  - Left: sticky viewer
  - Right: scrollable selection panel
- Mobile:
  - Stack sections
  - Keep key actions obvious and reachable
- Viewer remains the visual center of gravity

### Pattern 3: Floorplan Demo (Tenant Flow)

- Clear step progression
- Persistent theming via CSS vars
- Hero image as functional context
- Selection and generation flow should feel operational, not decorative

## Component Rules

### Nav

- Sticky top bar
- Thin bottom border
- Light blur allowed on nav only when helpful (`bg-white/90 backdrop-blur`)

### Cards

- White background
- 1px slate border
- Subtle shadow only when hierarchy needs it
- Mostly square corners or mild rounding

### Buttons

- Primary: dark fill + white text + uppercase tracking
- Secondary: outlined neutral button
- Disabled states must be visually obvious
- Press feedback should feel tactile (`active:scale-[0.98]` where appropriate)

### Badges/Labels

- Use compact uppercase labels for context and section framing
- Keep copy short and specific

### Modals

- Strong backdrop dim
- Centered panel
- Fast fade/slide entrance

## Motion and Feedback

Use existing primitives from `globals.css`:

- `data-reveal` and `in-view`
- `demo-enter` sequence classes
- `animate-fade-in`
- `animate-fade-slide-in`
- `animate-image-reveal`

Guidelines:

- Prefer purposeful motion over constant animation
- Generation flow should use staged progress copy, not spinner-only UX
- Respect reduced motion settings

### Animation Recipes (Required Finch Patterns)

Use these patterns directly when building new Finch UI:

#### 1) Section Reveal on Scroll

- Apply `data-reveal` on sections/cards
- Set stagger with inline `--reveal-delay` style (e.g. 80ms, 140ms, 200ms)
- Add `in-view` when observed by IntersectionObserver

Expected feel: soft upward entrance, fast settle, no bounce.

#### 2) Demo Page Entrance Stagger

- Apply `demo-enter` to major panels
- Use `demo-enter-delay-1` and `demo-enter-delay-2` to sequence viewer then controls

Expected feel: operational and calm, not flashy.

#### 3) Generation Overlay

- Use full-surface overlay with fade (`overlay-enter` / `animate-fade-in`)
- Show staged copy during wait (not only a spinner)
- Include shimmer progress bar using `progress-slide`

Expected feel: trustworthy status communication during 20-60s waits.

#### 4) Generated Image Reveal

- On fresh generation, layer the new image and apply `animate-image-reveal`
- Do not replay reveal when user revisits a step with an already generated image

Expected feel: clear visual transition from baseline to generated output.

#### 5) Modal and Panel Entrances

- Modals: backdrop fade + panel `animate-fade-slide-in`
- Lightweight status messages/toasts: `animate-fade-in`

Expected feel: crisp state change, no large motion distance.

#### 6) Expand/Collapse Content

- Use grid-row accordion pattern (`accordion-content` with `data-open`)
- Avoid jump cuts and avoid spring/bounce effects

Expected feel: smooth open/close at short duration.

#### 7) Numeric Feedback Moments

- Use `animate-price-pulse` only when totals materially change
- Keep pulse brief; do not loop

Expected feel: tactile confirmation, not attention hijacking.

### Timing and Easing

- Default entrance timing: 250-500ms
- Loading/progress transitions: 400-700ms
- Preferred easing: `cubic-bezier(0.22, 1, 0.36, 1)` for entrance transitions
- Keep repeated animation loops limited to progress contexts only

### Reduced Motion Contract

- Respect `prefers-reduced-motion: reduce`
- Disable reveal/enter animations and set final visible states immediately
- Never block comprehension when animations are off

## Copy Style (In Product)

- Direct and concrete
- Practical, not hype
- Builder and buyer language, not AI jargon
- Prefer "what changed" and "what to do next"

Examples:

- Good: "Drop a photo here, then pick finishes on the right."
- Bad: "Experience our AI-powered photorealistic transformation engine."

## What to Avoid

- Generic AI landing aesthetics
- Purple/cyan gradient branding
- Glass-heavy panels and blur-everywhere UI
- Over-rounded components
- Dense dashboard clutter for buyer-facing flows
- Vague copy with no operational meaning
- Introducing a new font system when Finch tokens already exist

## Implementation Checklist

Before shipping, verify:

- [ ] Visual direction clearly matches Finch archetypes (homepage, /try, floorplan demo)
- [ ] Uses Finch tokens and slate/white surface language
- [ ] Headline/body typography matches Finch stacks
- [ ] Image remains the hero in demo flows
- [ ] CTA hierarchy is clear on desktop and mobile
- [ ] Motion uses existing utilities and stays restrained
- [ ] Includes required motion patterns for context (reveal, generation, or modal transitions)
- [ ] Reduced-motion behavior is implemented and tested
- [ ] Accessibility basics are covered (labels, states, focus, reduced-motion)
- [ ] Final result does not look like a generic AI template

## Decision Protocol

Before writing code, confirm:

1. Which Finch archetype is this closest to?
2. What is the primary action on this screen?
3. Is visual hierarchy obvious in under 5 seconds?
4. Does the design support the generation workflow without visual noise?
