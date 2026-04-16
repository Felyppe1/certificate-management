# Frontend Structure

## Two types of components

### 1. Route-scoped components (inside `app/`)

The first-level folder must be prefixed with `_` so Next.js does not treat it as a route segment. Sub-folders inside it are plain names.

```
src/app/(system)/
├── (home)/
│   ├── page.tsx
│   └── _components/               ← underscore required at this level only
│       └── CertificateEmissionsList/
│           ├── index.tsx
│           └── components/        ← no underscore needed for nested folders
│               ├── List/
│               │   ├── index.tsx
│               └── CreationForm/
│               │   └── index.tsx
│
├── certificados/[id]/
│   ├── page.tsx
│   └── _components/
│       └── CertificatePageClient/
│           ├── index.tsx
│           └── components/
│               └── ...
```

### 2. Global components (outside `app/`)

`src/components/` is the global layer — used across any route, including public and authenticated contexts.

```
src/components/
├── ui/                  ← shadcn/ui primitives (button, card, dialog…)
├── FileSelector/
├── GoBackButton/
├── GoogleButton/
├── ThemeProvider/
├── Toast/
├── WarningPopover/
└── svg/                 ← SVG icons as React components
```

## Placement rule

> Used by one route → `_components/` inside that route.  
> Used by two or more routes → `src/components/`.

## UI stack

- **shadcn/ui** + **Radix UI** for accessible primitives
- **Tailwind CSS v4** for styling
- **React Query** for server state (fetching, caching, invalidation)
- **Zustand** for client state (no server involvement)
- **react-hook-form** + **Zod** for forms
- **Sonner** for toasts
