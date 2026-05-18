# PRD v2 — Controle de Links (Evolução)

> Documento de evolução do [PRD.md](PRD.md) original. Reflete o estado atual do código (pós-migração Next.js → Vite + PocketBase) e prioriza as melhorias do próximo ciclo.

---

## 1. Contexto

O MVP está em produção e cobre o caso de uso central: dashboard cruzado de Usuários × Demandas, com marcação manual de cumprimento, WhatsApp pré-formatado e relatório PDF por demanda. A operação validou o app, mas três fricções recorrentes apareceram:

1. **Cobrança ainda é manual** — quem precisa lembrar do prazo é o responsável, no WhatsApp, um a um.
2. **Marcação 1-a-1 é tediosa** — para 28 alunos × várias demandas, o responsável clica muito. Marcar/desmarcar em lote e filtrar por pendentes economiza tempo.
3. **Reset de senha gargala no admin** — todo esquecimento vira mensagem privada.

> **Sobre os Google Forms:** os formulários são gerados pela coordenação do curso, não pelos gestores do app. Integração automática (webhook do Forms) está fora de escopo por essa razão — está fora do nosso controle.

Este PRD endereça essas três fricções, alinha o documento com o código real e descreve a dívida técnica acumulada na migração.

---

## 2. Estado atual (o que JÁ existe)

| Área                   | Implementado                                                                                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack                  | Vite + React 19 + React Router 6 + PocketBase 0.38 + Tailwind 4 + shadcn                                                                                          |
| Auth                   | Login email/senha, troca obrigatória no 1º acesso, sessão via cookie PB                                                                                           |
| Roles                  | `ADMIN`, `GESTOR` (o `PARTICIPANTE` previsto no PRD original foi descartado — todo usuário com login é GESTOR de si mesmo e das demandas das quais é responsável) |
| Dashboard              | Tabela cruzada com sticky column, % por usuário e por demanda, destaque da própria linha, WhatsApp por usuário e por responsável                                  |
| Visão pública          | `GET /api/public-dashboard` ([pb_hooks/public-dashboard.pb.js](pb_hooks/public-dashboard.pb.js)) — leitura sem login, polling de 30s                              |
| Demandas               | CRUD completo, toggle ativa/inativa, exclusão com cascade em `cumprimento`, relatório PDF                                                                         |
| Usuários               | CRUD individual, reset de senha pelo admin, edição inline                                                                                                         |
| Auditoria              | Collection `cumprimento_log` append-only, hook PB grava actor + alvo a cada create/delete em `cumprimento`, rota `/demandas/:id/historico` (ADMIN)                |
| Recuperação de senha   | Self-service via e-mail (`/recuperar-senha` + `/recuperar-senha/confirmar/:token`), SMTP Gmail                                                                    |
| Lembretes              | Rota `/lembretes` agrega pendentes por responsável com links wa.me prontos (sem cron — sob demanda)                                                               |
| PWA                    | Manifest + service worker básico + botão de instalação                                                                                                            |
| Realtime (autenticado) | Subscription PocketBase em `cumprimento`                                                                                                                          |

### Modelo de dados atual

```
users         id, email, name, nomeFuncional, role, firstLogin, disabled,
              celular, numeroCurso, numPM
demandas      id, titulo, linkForm, prazo, horaLimite, responsavel, celularResp, ativa
cumprimento   id, user (FK), demanda (FK), dataRegistro
```

---

## 3. Roadmap — 3 fases

### Fase 1 — Reduzir trabalho manual ✅ concluída

1. F1.1 — Reset de senha self-service ✅
2. F1.2 — Audit log de cumprimento ✅
3. F1.3 — Erros visíveis no dashboard ✅
4. F1.4 — Lembretes wa.me agregados (versão sob demanda, sem cron) ✅

### Fase 2 — Filtros e ações em massa

5. F2.3 — Filtros e ordenação no dashboard
6. F2.4 — Bulk actions (marcar todos / nudge em massa)

> Os itens F2.1 (Google Forms webhook) e F2.2 (importação CSV de usuários) foram removidos:
>
> - **F2.1:** os formulários vêm da coordenação do curso, não dos gestores do app — não controlamos o lado do Forms para colar o Apps Script.
> - **F2.2:** cadastro em lote não é necessidade recorrente — o cadastro individual atual cobre o ritmo da operação.

### Fase 3 — Escala e UX

7. F3.1 — Rota "Minhas pendências" (mobile-first)
8. F3.2 — Timeline/calendário de demandas
9. F3.3 — Multi-turma
10. F3.4 — Push notifications via PWA
11. F3.5 — Tags/categorias em demandas

### Transversal — Dívida técnica

- Atualizar [README.md](README.md) (ainda menciona Next.js)
- Remover boilerplate Next em `public/` (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`)
- Hardening de cookie/CSP
- Substituir polling público por SSE quando possível
- Padronizar tratamento de erro (eliminar `catch {}` silenciosos)

---

## 4. Especificações por funcionalidade

### F1.1 — Reset de senha self-service

**Problema:** Toda recuperação de senha hoje gargala no ADMIN ([src/routes/usuarios/index.tsx:139-164](src/routes/usuarios/index.tsx#L139-L164)).

**Solução:** Link "Esqueci minha senha" na tela de login → tela de pedido de reset → envia e-mail com token via PocketBase nativo (`pb.collection('users').requestPasswordReset(email)`) → tela de confirmação com nova senha.

**Escopo:**

- Nova rota `/recuperar-senha` (pedir e-mail)
- Nova rota `/recuperar-senha/confirmar` (consumir token, definir nova senha)
- Configurar SMTP no PocketBase
- Template de e-mail em pt-BR

**Fora de escopo:** SMS, magic link, recuperação por celular.

**Critérios de aceitação:**

- [ ] Link "Esqueci minha senha" visível em [src/routes/login.tsx](src/routes/login.tsx)
- [ ] E-mail chega em até 2 min com link de reset
- [ ] Token expira em 1h
- [ ] Após reset, usuário é direcionado para `/login`
- [ ] Usuário com `firstLogin=true` ainda precisa trocar a senha provisória (não pula esse fluxo)

**Esforço:** ~2h

---

### F1.2 — Audit log de cumprimento

**Problema:** Quando alguém desmarca um cumprimento, perde-se quem marcou e quando. Disputas viram "minha palavra contra a sua".

**Solução:** Collection append-only `cumprimento_log` registra toda ação (criar/deletar) com autor, alvo e timestamp.

**Modelo:**

```
cumprimento_log
  id, action ('create' | 'delete'), demanda (FK), targetUser (FK),
  actor (FK users), createdAt, sourceIp?
```

**Escopo:**

- Migration para a collection
- Hook PB `onRecordAfterCreateRequest("cumprimento")` e `onRecordAfterDeleteRequest("cumprimento")` populam o log
- Tela `/demandas/:id/historico` (somente ADMIN) lista entradas
- Tooltip no dashboard mostrando "marcado por X em DD/MM HH:mm" no hover (autenticado)

**Critérios de aceitação:**

- [ ] Criar/excluir cumprimento gera entrada no log automaticamente
- [ ] Log é imutável (sem update/delete via API pública)
- [ ] ADMIN vê histórico completo de uma demanda
- [ ] Usuário autenticado vê quem marcou seu próprio cumprimento

**Esforço:** ~3h

---

### F1.3 — Erros visíveis no dashboard

**Problema:** [src/routes/dashboard.tsx:239](src/routes/dashboard.tsx#L239) engole erros (`catch {}`); usuário não sabe se a tabela está desatualizada por falha de rede.

**Solução:** Estado de erro explícito + banner "Falha ao carregar — tentar novamente".

**Escopo:**

- Estado `error: Error | null` em `DashboardPage`
- Banner sticky no topo da tabela quando `error != null`
- Botão "Tentar novamente" dispara `fetchData()`
- Logar o erro no console com contexto (`console.error('dashboard fetch', err)`)
- Mesma abordagem em [src/routes/demandas/index.tsx](src/routes/demandas/index.tsx) e [src/routes/usuarios/index.tsx](src/routes/usuarios/index.tsx)

**Critérios de aceitação:**

- [ ] Desligar a rede e recarregar a página mostra banner de erro
- [ ] Religar a rede + clicar "Tentar novamente" restaura os dados
- [ ] Erros 401/403 redirecionam para `/login` em vez de mostrar banner

**Esforço:** ~1h

---

### F1.4 — Lembretes automáticos

**Problema:** Cobrança é 100% manual. Responsável tem que abrir o dashboard, clicar no WA de cada pendente, todo dia.

**Solução:** Job PocketBase (`cronAdd`) que roda a cada 30 min e dispara mensagem para pendentes em janelas configuráveis (T-24h, T-3h, T-0).

**Canais:**

- **WhatsApp** via API Business (preferencial) ou link `wa.me` agregado (fallback manual)
- **E-mail** como fallback

**Modelo (configuração):**

```
notification_config
  id, demanda (FK opcional, null = global),
  enabled, channels (json: ['wa', 'email']),
  windows (json: [{ offsetMinutes: -1440, template: '...' }, ...])

notification_log
  id, demanda, targetUser, channel, sentAt, status, error
```

**Escopo:**

- Migration das duas collections
- `pb_hooks/notify-cron.pb.js` com `cronAdd("notify", "*/30 * * * *", ...)`
- Tela `/demandas/:id/notificacoes` para configurar janelas e templates
- Variáveis de template: `{nome}`, `{titulo}`, `{prazo}`, `{horaLimite}`, `{linkForm}`

**Fora de escopo (v1):** SMS, retry automático, throttling por usuário entre demandas.

**Critérios de aceitação:**

- [ ] Demanda com prazo amanhã 18h → mensagem dispara hoje entre 17:30-18:00
- [ ] Cumprimento marcado entre disparos cancela o envio das janelas restantes
- [ ] `notification_log` registra tentativa e status (sucesso/erro)
- [ ] Tela de config permite ativar/desativar por demanda
- [ ] Janelas globais (default) aplicam a toda demanda sem config própria

**Esforço:** ~6h (WhatsApp via link `wa.me` agregado) / ~12h (API Business com aprovação Meta)

---

### F2.3 — Filtros e ordenação no dashboard

**Problema:** Tabela hoje tem ordenação fixa `numeroCurso, name` e mostra tudo. Difícil focar em quem está pendente.

**Solução:** Toolbar acima da tabela com:

- Toggle "Apenas pendentes" (oculta usuários 100%)
- Toggle "Apenas vencidas" (filtra colunas de demanda)
- Select de ordenação: `numeroCurso ↑`, `% cumprimento ↓`, `nome A-Z`
- Filtro de busca por nome
- Filtro por responsável (chips clicáveis)

**Estado persistido em URL** (`?sort=pct&pending=1`) para compartilhamento.

**Critérios de aceitação:**

- [ ] Ativar "Apenas pendentes" e recarregar → toggle continua ativo (via URL)
- [ ] Ordenar por % decrescente coloca quem tem 0% no topo
- [ ] Busca filtra por `name` e `nomeFuncional`

**Esforço:** ~3h

---

### F2.4 — Bulk actions

**Problema:** Para 28 alunos, marcar 1 a 1 ou abrir 28 WhatsApps é trabalhoso.

**Solução:** Menu por coluna de demanda (responsável):

- "Marcar todos como cumpridos"
- "Desmarcar todos"
- "Copiar lista de pendentes" (clipboard)
- "Abrir WhatsApp para todos os pendentes" (abre uma aba por contato — limitado a 10 por vez)

**Permissão:** ADMIN sempre, GESTOR apenas para demandas onde é `responsavel`.

**Critérios de aceitação:**

- [ ] "Marcar todos" cria N `cumprimentos` em uma transação
- [ ] Confirmação obrigatória antes de marcar (modal)
- [ ] GESTOR não vê o menu em demandas de terceiros
- [ ] Cada ação é registrada no `cumprimento_log` (F1.2)

**Esforço:** ~2h

---

### F3.1 — Rota "Minhas pendências"

**Problema:** Tabela cruzada é apertada em celular. Aluno só quer ver o que falta para ele.

**Solução:** Rota `/minhas-pendencias` mobile-first, lista vertical de cards de demandas pendentes ordenadas por prazo, cada uma com botão "Abrir Form" e "Marcar cumprida".

**Critérios de aceitação:**

- [ ] Acessível pelo menu do navbar
- [ ] Mostra apenas demandas ativas onde `cumprimento` não existe para o usuário logado
- [ ] Cor por urgência: vermelho (vencida), amarelo (≤24h), verde (>24h)
- [ ] Marcar cumprida atualiza otimisticamente e some o card

**Esforço:** ~2h

---

### F3.2 — Timeline/calendário de demandas

**Problema:** Ao criar demanda nova, é difícil ver se há sobreposição de prazos.

**Solução:** Rota `/demandas/calendario` com visualização mensal, demandas plotadas no dia do `prazo`, com tooltip de % cumprimento.

**Esforço:** ~4h

---

### F3.3 — Multi-turma

**Problema:** Strings "CEFS 2026 - T. P" hard-coded em [navbar.tsx:106](src/components/navbar.tsx#L106) e [login.tsx:54](src/routes/login.tsx#L54).

**Solução:** Collection `turmas` (id, nome, sigla, ativa). `users` ganha FK `turma`. ADMIN troca de contexto via dropdown no navbar.

**Esforço:** ~6h (data model + UI + ajustes em todas as queries)

---

### F3.4 — Push notifications via PWA

**Problema:** PWA já instala, mas não notifica nada.

**Solução:** Solicitar permissão de notificação após login. Backend envia push via VAPID quando:

- Demanda nova é criada para o usuário (todas as demandas ativas afetam todos)
- T-1h do prazo de uma demanda pendente

**Esforço:** ~5h (VAPID keys + service worker push handler + backend dispatch)

---

### F3.5 — Tags/categorias em demandas

**Problema:** Volume cresce, mistura "doc", "form", "reunião". Filtrar fica difícil.

**Solução:** Campo `demandas.tags` (json array de strings). Chips de filtro na lista e no dashboard.

**Esforço:** ~2h

---

## 5. Dívida técnica (paralela ao roadmap)

| Item                                                                               | Onde                                                             | Esforço                 |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------- |
| Atualizar README (ainda diz Next.js)                                               | [README.md](README.md)                                           | 15min                   |
| Remover SVGs Next                                                                  | [public/](public/)                                               | 5min                    |
| Atualizar [PRD.md](PRD.md) ou marcá-lo como obsoleto (referenciando este)          | raiz                                                             | 10min                   |
| Padronizar tratamento de erro (eliminar `catch {}`)                                | [dashboard.tsx:239](src/routes/dashboard.tsx#L239), demais rotas | 1h                      |
| CSP estrito + revisar `httpOnly:false` no cookie                                   | [auth.tsx:79](src/contexts/auth.tsx#L79)                         | 2h (depende de hosting) |
| Substituir polling público (30s) por SSE                                           | [dashboard.tsx:254](src/routes/dashboard.tsx#L254) + hook PB     | 2h                      |
| Centralizar `pb.authStore.loadFromCookie(document.cookie)` (repetido em cada rota) | criar helper em [src/lib/pocketbase.ts](src/lib/pocketbase.ts)   | 30min                   |

---

## 6. Mudanças no modelo de dados (consolidado)

```
+ cumprimento_log         (F1.2) ✅ criada
+ turmas                  (F3.3)

users           + turma (FK)                          (F3.3)
demandas        + tags (json)                         (F3.5)
                + turma (FK)                          (F3.3)
```

> Nota: o spec original previa `notification_config` / `notification_log` (F1.4 com cron) e `forms_orphan` (F2.1). Ambos foram descartados — F1.4 virou rota sob demanda sem persistência, e F2.1 saiu do escopo.

---

## 7. Métricas de sucesso (3 meses pós-deploy)

| Métrica                                                 | Hoje (estimado) | Meta                     |
| ------------------------------------------------------- | --------------- | ------------------------ |
| Tickets de "esqueci minha senha" para o admin / semana  | ~3              | 0                        |
| Cliques no botão WhatsApp na rota `/lembretes` / semana | 0 (rota nova)   | medir baseline e crescer |
| % de demandas com 100% de cumprimento até o prazo       | ? (medir)       | +20pp                    |
| DAU mobile / DAU total                                  | ? (medir)       | ≥60%                     |
| Cliques em "Marcar todos" (após F2.4) / semana          | 0               | medir adoção             |

---

## 8. Fora de escopo deste ciclo

- **Integração automática com Google Forms (Apps Script webhook)** — os formulários são criados pela coordenação do curso, não pelos gestores do app; não temos como instalar o Apps Script no lado deles
- **Importação CSV de usuários** — cadastro individual atende o ritmo da operação
- **Lembretes automáticos por cron (envio direto via WhatsApp Business API ou e-mail)** — F1.4 entregou a versão sob demanda com links wa.me; envio agendado fica para um ciclo futuro se a operação pedir
- App nativo iOS/Android (PWA cobre)
- Integração com Microsoft Forms / Typeform
- Dashboard de tendências históricas (gráficos de evolução por semana)
- SSO corporativo
- API pública versionada para terceiros

---

## 9. Estimativa total

| Fase                              | Esforço                   | Status                  |
| --------------------------------- | ------------------------- | ----------------------- |
| Fase 1 — Reduzir trabalho manual  | ~12h                      | ✅ concluída            |
| Fase 2 — Filtros e ações em massa | ~5h (F2.3: 3h + F2.4: 2h) | a fazer                 |
| Fase 3 — Escala e UX              | ~19h                      | a fazer                 |
| Dívida técnica                    | ~6h                       | parcialmente endereçada |
| **Total restante**                | **~30h**                  |                         |

Fase 2 deve ser executada na ordem listada: **F2.3 (filtros) antes de F2.4 (bulk actions)** — a barra de filtros é onde os toggles "marcar todos" naturalmente se encaixam, e implementar bulk sem filtros gera UX confusa (qual conjunto está sendo marcado?).
