# Frontend Structure

## Dois tipos de componentes

### 1. Componentes escopados à rota (dentro de `app/`)

O primeiro nível de pasta deve ter prefixo `_` para que o Next.js não trate o diretório como segmento de rota. Subpastas internas usam nomes simples.

```
src/app/(system)/
├── (home)/
│   ├── page.tsx
│   └── _components/                    ← underscore obrigatório neste nível
│       └── CertificateEmissionsList/
│           ├── index.tsx
│           └── components/             ← subpastas não precisam de underscore
│               ├── List/
│               │   └── index.tsx
│               └── CreationForm/
│                   └── index.tsx
│
├── certificados/[id]/
│   ├── page.tsx
│   └── _components/
│       └── CertificatePageClient/
│           ├── index.tsx
│           └── components/
│               └── ...
```

### 2. Componentes globais (fora de `app/`)

`src/components/` é a camada global — usada em qualquer rota, incluindo contextos públicos e autenticados.

```
src/components/
├── ui/                   ← primitivos do shadcn/ui (button, card, dialog…)
├── FileSelector/
├── GoBackButton/
├── GoogleButton/
├── ThemeProvider/
├── Toast/
├── WarningPopover/
└── svg/                  ← ícones SVG como componentes React
```

## Regra de colocação

> Usado apenas por **um** arquivo na rota → `.../components/` no mesmo nível do arquivo.
> Usado por **dois ou mais** arquivos → `src/components/`.

Nunca crie componentes em `src/components/` que sejam usados por apenas um arquivo — eles poluem o espaço global e dificultam a identificação do escopo de impacto de uma mudança.

---

## Stack de UI

### shadcn/ui + Radix UI

Primitivos acessíveis e sem estilos impostos. Os componentes ficam em `src/components/ui/` e pertencem ao projeto (não são gerenciados pelo npm). Para adicionar um novo componente:

```bash
npx shadcn@latest add <component>
```

### Tailwind CSS v4

Estilização utility-first. Sem arquivos de configuração de tema separados — as variáveis de design são declaradas no CSS diretamente com `@theme`.

### React Query v5

Gerencia **server state**: fetching, caching, invalidação e sincronização com o servidor. Use para qualquer dado que venha de uma API ou server action com resultado.

```typescript
const { data } = useQuery({
  queryKey: certificateKeys.list(),
  queryFn: () => getCertificateEmissions(),
})
```

As query keys ficam centralizadas em `src/lib/query-keys.ts`.

### Zustand

Gerencia **client state**: dados que existem apenas no cliente e não precisam ser sincronizados com o servidor (ex.: estado de modais, seleção local, preferências de UI).

```typescript
const useStore = create<State>((set) => ({
  isModalOpen: false,
  openModal: () => set({ isModalOpen: true }),
}))
```

A store fica em `src/lib/store.ts`.

### react-hook-form + Zod + useMutation

Padrão para todos os formulários. O schema Zod define a validação client-side; o `useForm` gerencia o estado do formulário; o `useMutation` do React Query chama a server action e coordena loading, cache e feedback.

```typescript
const schema = z.object({
  name: z.string().min(1, 'Obrigatório').max(100),
})

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { name: '' },
})

const queryClient = useQueryClient()

const mutation = useMutation({
  mutationFn: async (data: z.infer<typeof schema>) => {
    const formData = new FormData()
    formData.append('name', data.name)
    const result = await createCertificateEmissionAction(null, formData)
    if (result?.success === false) throw result  // força onError
    return result
  },
  onSuccess: async () => {
    toast.success('Criado com sucesso!')
    await queryClient.invalidateQueries({ queryKey: queryKeys.certificateEmissions() })
  },
  onError: (error: any) => {
    if (isRedirectError(error)) return  // server action fez redirect — não tratar como erro
    toast.error('Algo deu errado.')
  },
})

// No JSX:
<form onSubmit={form.handleSubmit(data => mutation.mutate(data))}>
  <Input {...form.register('name')} />
  <Button disabled={mutation.isPending}>Criar</Button>
</form>
```

**Por que `isRedirectError`?** Quando a server action chama `redirect()` internamente (ex.: após criar uma entidade e navegar para ela), o Next.js lança um erro especial. O `onError` do `useMutation` captura esse erro — ignorar via `isRedirectError` evita exibir toast de erro numa navegação bem-sucedida.

Os schemas de validação do **frontend** ficam junto ao componente ou em um arquivo `schemas.ts` local à rota. Não importar os schemas de `src/backend/infrastructure/server-actions/schemas/` no frontend — esses são exclusivos do backend.

### Erros de autenticação via URL

Quando uma server action detecta sessão inválida ou expirada, faz `redirect('/entrar?error=<tipo>')`. O componente `<Toast />` em `src/components/Toast/index.tsx` é registrado no layout raiz e captura esse padrão globalmente:

```
Server Action                     <Toast /> (root layout)
  └── redirect('/entrar           └── useSearchParams() lê ?error=
        ?error=session-expired')  └── switch → toast.error(msg amigável)
                                  └── router.replace(url sem ?error)
```

Qualquer rota pode emitir `?error=<tipo>` em um redirect e o toast aparece automaticamente — sem precisar de lógica adicional no componente de destino.

### Sonner

Toasts. O componente `<Toaster />` fica no layout raiz (via `src/components/Toast/`). Para disparar um toast:

```typescript
import { toast } from 'sonner'

toast.success('Certificado criado!')
toast.error('Algo deu errado.')
```

---

## Hooks customizados

Ficam em `src/custom-hooks/`. Exemplos:

- `useSSE` — conecta ao endpoint SSE e chama `onEvent` a cada mensagem recebida
- `useGoogleRelogin` — fluxo de reconexão com Google quando o token expira
