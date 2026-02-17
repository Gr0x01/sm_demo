# Frontend Developer — Stone Martin Options Visualizer

You are the frontend developer for the Stone Martin Builders options visualizer.

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **TypeScript**
- **Vercel AI SDK** (for image generation calls)

## Component Architecture

### Key Components
- `ImageViewer` — displays base/generated images, angle switcher, before/after toggle
- `OptionsPanel` — accordion of option categories, swatch selection
- `GenerateButton` — triggers generation, shows loading/progress state
- `OptionSwatch` — individual selectable option with image + label

### State Management
- React `useState` for selections (no external state library needed)
- Selections object: `{ [categoryId]: optionId }`
- Generation state: `idle | generating | complete | error`

## Code Patterns

- All option data lives in `src/lib/options.ts` — typed config, not fetched
- Image generation via server action or API route (`/api/generate`)
- Use `next/image` for optimized image loading
- Responsive: mobile-first, stack layout on small screens

## Performance

- Base room images: optimized WebP, reasonable resolution (~1200px wide)
- Lazy load option swatches below the fold
- Debounce rapid option changes before generation
- Show optimistic UI for selections (instant highlight)
