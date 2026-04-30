# Route Handlers

## Categorias de rotas

Mutações de usuário (criar, deletar, adicionar template/datasource, etc.) vão por **Server Actions**, nunca por POST/PATCH/DELETE handlers. Route handlers existem apenas nas três categorias abaixo.

### GETs autenticados — validados por sessão de usuário

```
GET /api/certificate-emissions
GET /api/certificate-emissions/[id]
GET /api/certificate-emissions/[id]/events       ← SSE
GET /api/certificate-emissions/[id]/generations
GET /api/certificate-emissions/[id]/zip
GET /api/certificate-emissions/metrics
GET /api/users/me
GET /api/auth/sessions
```

### Auth Google (OAuth 2.0)

```
GET /api/auth/google                  ← redireciona para Google
GET /api/auth/google/callback         ← processa o callback OAuth
GET /api/auth/google/access-token     ← renova o access token do usuário
```

### Internos — chamados por Cloud Tasks ou Cloud Functions, nunca pelo browser

```
GET  /api/internal/auth/google/access-token           ← renovação de token para serviços GCP
PATCH /api/internal/emails/[emailId]                  ← Cloud Function reporta status de envio
PATCH /api/internal/data-source-rows/[id]/generations ← Cloud Function reporta status de geração
POST  /api/internal/users/reset-credits               ← Cloud Scheduler reseta créditos
```

---

## Padrão GET autenticado

```typescript
export async function GET(request: NextRequest): Promise<NextResponse<Response | HandleErrorResponse>> {
  try {
    const { userId } = await validateSessionToken(request) // pass request explicitamente

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

---

## Middleware disponível (`_middleware/`)

| Função | Uso |
|--------|-----|
| `validateSessionToken(request)` | Valida cookie ou header `Authorization: Bearer`. Retorna `{ userId, token }`. Usado nas rotas autenticadas. |
| `validateServiceAccountToken(request)` | Valida JWT de Cloud Tasks / Cloud Functions. Usado exclusivamente em `/api/internal/`. |

---

## Mapeamento de erros (`_utils/handle-error.ts`)

`handleError(error)` mapeia erros do domínio para respostas HTTP seguindo RFC 9457:

```json
{ "type": "not-found", "title": "Resource not found", "detail": "Certificate not found" }
```

| Domain error | Status |
|---|---|
| `ValidationError` (Zod) | 400 |
| `AuthenticationError` | 401 |
| `ForbiddenError` | 403 |
| `NotFoundError` | 404 |
| `ConflictError` | 409 |
| `ValidationError` (domínio) | 422 |
| `ServiceUnavailableError` | 503 |
| genérico | 500 |

---

## SSE — Server-Sent Events

`GET /api/certificate-emissions/[id]/events` mantém a conexão aberta e envia atualizações de progresso da geração em tempo real.

**Implementação:** broker in-memory singleton em `src/backend/infrastructure/sse/index.ts` (`SSEBroker`). Mantém um `Map<resourceId, Client[]>` com os controllers de streams abertas.

**Fluxo:**
1. Browser conecta via `EventSource` (hook `useSSE` em `src/custom-hooks/use-sse.tsx`)
2. Route handler cria um `ReadableStream` e registra o controller no `sseBroker`
3. Quando uma internal route processa uma atualização (geração de PDF ou envio de e-mail), ela chama `sseBroker.sendEvent(resourceId, data)` diretamente
4. O broker encaminha o evento para todos os clients registrados naquele `resourceId`
5. Ao desconectar, o stream cancellation handler remove o client do broker

**Limitação:** funciona apenas com uma única instância do Next.js. Em múltiplos servidores, clientes em instâncias diferentes não se comunicariam.
