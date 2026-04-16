# Route Handlers

## Which routes exist

Only three categories of route handlers are used. User mutations (create, delete, add template/datasource, etc.) go through **Server Actions**, not POST/PATCH/DELETE handlers.

**Authenticated GETs** — validated by user session:
- `/api/certificate-emissions` and sub-routes (`[id]`, `events`, `generations`, `zip`, `metrics`)
- `/api/users/me`
- `/api/auth/sessions`

**Google Auth** (OAuth 2.0):
- `GET /api/auth/google` — redirects to Google
- `GET /api/auth/google/callback` — processes the OAuth callback
- `GET /api/auth/google/access-token` — refreshes the user's access token

**Internals** — called by Cloud Tasks or Cloud Functions, never by the browser:
- `GET /api/internal/auth/google/access-token` — token refresh for GCP services
- `PATCH /api/internal/emails/[emailId]` — Cloud Function reports email delivery status
- `PATCH /api/internal/data-source-rows/[id]/generations` — Cloud Function reports generation status
- `POST /api/internal/users/reset-credits` — periodic credit reset via Cloud Scheduler

## Standard GET pattern

```typescript
export async function GET(request: NextRequest): Promise<NextResponse<Response | HandleErrorResponse>> {
  try {
    const { userId } = await validateSessionToken(request) // pass request explicitly

    const useCase = new GetAllCertificateEmissionsUseCase(
      new PrismaCertificatesRepository(prisma),
    )
    const result = await useCase.execute({ userId })

    return NextResponse.json(result)
  } catch (error: unknown) {
    return await handleError(error)
  }
}
```

## Available middleware (in `_middleware/`)

- `validateSessionToken(request)` — validates cookie or `Authorization: Bearer` header. Returns `{ userId, token }`.
- `validateServiceAccountToken(request)` — validates Cloud Tasks/Cloud Functions JWT. Used exclusively in `/api/internal/`.

## Error handling (`_utils/handle-error.ts`)

`handleError(error)` maps domain errors to HTTP responses following RFC 9457:

```json
{ "type": "not-found", "title": "Resource not found", "detail": "..." }
```

| Domain error           | Status |
|------------------------|--------|
| `ValidationError` Zod  | 400    |
| `AuthenticationError`  | 401    |
| `ForbiddenError`       | 403    |
| `NotFoundError`        | 404    |
| `ConflictError`        | 409    |
| `ValidationError` dom. | 422    |
| generic                | 500    |

## SSE

`GET /api/certificate-emissions/[id]/events` keeps the connection open and streams generation progress updates. Uses Redis pub/sub internally to receive notifications from Cloud Functions.
