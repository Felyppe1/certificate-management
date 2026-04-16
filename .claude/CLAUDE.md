# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

Next.js 15 + TypeScript application for bulk certificate generation. Clean Architecture with DDD throughout `src/backend/`.

```
src/
├── app/                    # Next.js App Router (routes, API handlers, server actions)
├── backend/
│   ├── domain/             # Entities, aggregates, value objects, domain events, errors
│   ├── application/        # Use cases + repository interfaces
│   └── infrastructure/     # Prisma repos, GCP clients, server actions, factories
├── components/             # Global UI components (shadcn/ui + custom)
├── custom-hooks/           # React hooks (Google relogin, SSE)
└── lib/                    # cn(), React Query keys, Zustand store

cloud-functions/            # Python Cloud Functions
├── generate-pdfs/          # Triggered by Pub/Sub; renders templates with LibreOffice
└── send-certificate-emails/ # Triggered by Cloud Tasks; sends via Resend API

terraform/                  # GCP infrastructure (Cloud Run, Cloud Functions, Cloud Tasks, GCS)
```

## Rules

@.claude/rules/ddd.md — when working on domain entities, aggregates, use cases, or repositories
@.claude/rules/server-actions.md — when adding or modifying server actions
@.claude/rules/route-handlers.md — when working on API routes or internal endpoints
@.claude/rules/frontend-structure.md — when creating or moving React components
@.claude/rules/cicd.md — when changing the deployment pipeline or environment variables
@.claude/rules/terraform.md — when modifying or adding GCP infrastructure
