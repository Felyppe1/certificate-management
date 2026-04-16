# Server Actions

Live in `src/backend/infrastructure/server-actions/`. They are the entry point for mutations triggered by the frontend (forms, buttons).

## Standard structure

```typescript
'use server'

export async function addDataSourceByUploadAction(_: unknown, formData: FormData) {
  const rawData = {
    certificateId: formData.get('certificateId') as string,
    files: formData.getAll('files') as File[],
  }

  try {
    const { userId } = await validateSessionToken() // no argument — reads cookies from context

    const parsed = addDataSourceByUploadSchema.parse(rawData) // Zod — throws ValidationError on failure

    // Manual dependency injection
    const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
      new GcpBucket(),
      new PrismaCertificatesRepository(prisma),
      new PrismaDataSourceRowsRepository(prisma),
      new SpreadsheetContentExtractorFactory(),
      new PrismaTransactionManager(prisma),
    )

    await addDataSourceByUploadUseCase.execute({ userId, ...parsed })
    return { success: true }
  } catch (error: any) {
    if (error instanceof AuthenticationError) {
      await logoutAction()
      redirect(`/entrar?error=${error.type}`)
    }
    return { success: false, errorType: error.type }
  }
}
```

## Rules

- Always `'use server'` at the top of the file.
- Validate with Zod before calling any use case. All schemas live in `server-actions/schemas/index.ts`.
- `validateSessionToken()` with no argument (reads cookies from Next.js context). In route handlers, pass `request` explicitly.
- Expired/invalid sessions → `logoutAction()` + `redirect()`.
- Return shape: `{ success: true }` or `{ success: false, errorType: string }`. Never throw to the client.
- No business logic here — delegate to use cases.
