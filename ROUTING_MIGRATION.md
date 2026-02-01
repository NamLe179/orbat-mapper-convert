# Vue Router to Next.js App Router Migration Guide

## Overview

Next.js 14+ uses file-system based routing instead of Vue Router's configuration-based approach. Routes are automatically created based on the folder structure in the `app/` directory.

## Route Mapping

### Vue Router → Next.js App Router

| Vue Route | Next.js File Path | Status |
|-----------|-------------------|--------|
| `/` | `app/page.tsx` | ✅ Complete |
| `/scenario/:scenarioId` | `app/scenario/[scenarioId]/page.tsx` | ✅ Complete |
| `/scenario/:scenarioId/grid-edit` | `app/scenario/[scenarioId]/grid-edit/page.tsx` | ✅ Complete |
| `/scenario/:scenarioId/chart-edit` | `app/scenario/[scenarioId]/chart-edit/page.tsx` | ✅ Complete |
| `/newscenario` | `app/scenario/new/page.tsx` | ✅ Complete |
| `/storymode` | `app/storymode/page.tsx` | ✅ Complete |
| `/chart` | `app/chart/page.tsx` | ✅ Complete |
| `/text-to-orbat` | `app/text-to-orbat/page.tsx` | ✅ Complete |
| `/import` | `app/import/page.tsx` | ✅ Complete |
| `/testcomponents` | `app/test/components/page.tsx` | ✅ Complete |
| `/testgeo` | `app/test/geo/page.tsx` | ✅ Complete |
| `/testgrid` | `app/test/grid/page.tsx` | ⚠️ Needs creation |
| `/testgrid2` | `app/test/grid2/page.tsx` | ⚠️ Needs creation |

## Required File Structure

```
app/
├── page.tsx                              # Landing page (/)
├── layout.tsx                            # Root layout
├── scenario/
│   ├── new/
│   │   └── page.tsx                      # New scenario (/scenario/new)
│   └── [scenarioId]/
│       ├── layout.tsx                    # Scenario editor wrapper
│       ├── page.tsx                      # Map edit mode (default)
│       ├── grid-edit/
│       │   └── page.tsx                  # Grid edit mode
│       └── chart-edit/
│           └── page.tsx                  # Chart edit mode
├── storymode/
│   └── page.tsx                          # Story mode view
├── chart/
│   └── page.tsx                          # ORBAT chart view
├── text-to-orbat/
│   └── page.tsx                          # ✅ Already exists
├── import/
│   └── page.tsx                          # ✅ Already exists
└── test/
    ├── components/
    │   └── page.tsx                      # ✅ Already exists
    ├── geo/
    │   └── page.tsx                      # ✅ Already exists
    ├── grid/
    │   └── page.tsx                      # Grid test
    └── grid2/
        └── page.tsx                      # Tanstack grid test
```

## Migration Steps

### 1. Replace NProgress with Next.js Features

**Before (Vue Router):**
```typescript
beforeEnter: (to, from) => {
  NProgress.start();
}

router.afterEach(() => {
  NProgress.done();
});
```

**After (Next.js):**

Create `app/loading.tsx` for global loading state:
```tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );
}
```

Or use route-specific `loading.tsx` in each folder.

### 2. Convert Nested Routes to Layouts

**Before (Vue Router):**
```typescript
{
  path: "/scenario/:scenarioId",
  component: ScenarioEditorWrapper,
  children: [...]
}
```

**After (Next.js):**

Create `app/scenario/[scenarioId]/layout.tsx`:
```tsx
"use client";

import { ReactNode } from "react";
import ScenarioEditorWrapper from "@/modules/scenarioeditor/ScenarioEditorWrapper";

export default function ScenarioLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { scenarioId: string };
}) {
  return (
    <ScenarioEditorWrapper scenarioId={params.scenarioId}>
      {children}
    </ScenarioEditorWrapper>
  );
}
```

### 3. Access Route Parameters

**Before (Vue Router):**
```typescript
// In component
const route = useRoute();
const scenarioId = route.params.scenarioId;
```

**After (Next.js):**
```tsx
// In page.tsx
export default function Page({ params }: { params: { scenarioId: string } }) {
  const scenarioId = params.scenarioId;
  // ...
}
```

### 4. Route Metadata (Help URLs)

**Before (Vue Router):**
```typescript
meta: { helpUrl: "https://docs.orbat-mapper.app/guide/map-edit-mode" }
```

**After (Next.js):**

Use Next.js Metadata API in each `page.tsx`:
```tsx
export const metadata = {
  openGraph: {
    title: 'Map Edit Mode',
    description: 'Edit your scenario on the map',
  },
};

// Or store help URLs in a constant
export const HELP_URL = "https://docs.orbat-mapper.app/guide/map-edit-mode";
```

### 5. Navigation

**Before (Vue Router):**
```typescript
import { useRouter } from "vue-router";
const router = useRouter();
router.push("/scenario/123");
```

**After (Next.js):**
```tsx
import { useRouter } from "next/navigation";
const router = useRouter();
router.push("/scenario/123");
```

### 6. Scroll Behavior

**Before (Vue Router):**
```typescript
scrollBehavior(to, from, savedPosition) {
  if (savedPosition) {
    return savedPosition;
  } else {
    return { top: 0 };
  }
}
```

**After (Next.js):**

This is handled automatically by Next.js. To customize:
- Add `scroll={false}` to `<Link>` components to prevent scroll
- Use `window.scrollTo()` manually if needed
- Or create a custom scroll restoration hook

## Implementation Priority

### Phase 1: Core Routes (High Priority)
1. ✅ Landing page - Already exists at `app/page.tsx`
2. Create `app/scenario/new/page.tsx` - New scenario view
3. Create `app/scenario/[scenarioId]/layout.tsx` - Scenario editor wrapper
4. Create `app/scenario/[scenarioId]/page.tsx` - Map edit mode

### Phase 2: Nested Routes
5. Create `app/scenario/[scenarioId]/grid-edit/page.tsx`
6. Create `app/scenario/[scenarioId]/chart-edit/page.tsx`

### Phase 3: Additional Views
7. Create `app/storymode/page.tsx`
8. Create `app/chart/page.tsx`

### Phase 4: Test Routes (Low Priority)
9. Create `app/test/grid/page.tsx`
10. Create `app/test/grid2/page.tsx`

## Component Reuse

All existing Vue components in `modules/` can be converted to React and reused:
- `ScenarioEditorWrapper.vue` → Already converted
- `NewScenarioView.vue` → Already converted
- `ScenarioEditorMap.vue` → Already converted
- `ChartEditView.vue` → Already converted
- etc.

## Notes

1. **Dynamic Imports**: Next.js automatically code-splits by route, so you don't need lazy imports like Vue Router
2. **Loading States**: Use `loading.tsx` files for loading UI instead of NProgress
3. **Error Handling**: Create `error.tsx` files for error boundaries
4. **Route Groups**: Use `(group)` folders to organize routes without affecting the URL
5. **Parallel Routes**: Use `@folder` syntax for advanced layouts (if needed)

## Removing Old Files

Once migration is complete:
1. Delete `router/index.ts` (this file)
2. Delete `router/names.ts` (if exists)
3. Remove `vue-router` from `package.json`
4. Remove `nprogress` from `package.json` (optional, can keep for other uses)

## Testing Checklist

- [ ] All routes are accessible
- [ ] Dynamic route parameters work correctly
- [ ] Nested routes render within layouts
- [ ] Browser back/forward navigation works
- [ ] Loading states appear during navigation
- [ ] Scroll position is preserved/reset as expected
- [ ] Route metadata (titles, descriptions) is correct
- [ ] Deep links work correctly
