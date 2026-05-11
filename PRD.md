# PRD — Controle de Links (App Web)

## 1. Visão Geral

**Problema:** A planilha atual exige acesso ao Google Sheets para gerenciar demandas e acompanhar o cumprimento de atividades dos participantes de um curso. Isso dificulta a operação no dia a dia, não oferece notificações e não é amigável em mobile.

**Solução:** Um app web Next.js que substitui a planilha com uma interface moderna, rápida e responsiva, mantendo toda a lógica existente e adicionando funcionalidades de UX relevantes.

---

## 2. Contexto da Planilha

A planilha tem 3 abas:

| Aba | Função |
|-----|--------|
| **Configuração (ADICIONAR LINKS)** | Cada linha define uma "Demanda": nome, link do Google Form, prazo, hora-limite, responsável, celular do responsável e se está ativa |
| **Lista de Participantes** | Nº Curso, Nome Completo, Celular — 28 alunos (751–778) |
| **Progresso** | Mesma lista + coluna `% Cumprimento` por aluno + linha TOTAL |

**Lógica central:** cada Demanda é uma tarefa que os alunos devem cumprir submetendo um Google Form. O sistema rastreia quem cumpriu o quê e calcula o percentual de cumprimento individual e geral.

---

## 3. Stack Recomendada

**Next.js 14+ (App Router)** — roteamento, SSR e API routes em um único projeto, sem backend separado.

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS |
| Componentes | shadcn/ui |
| Banco de dados | SQLite via Prisma (local) ou Supabase (hosted) |
| Autenticação | NextAuth.js com Credentials Provider |
| Hash de senha | bcryptjs |

> **Por que Next.js e não React puro?** A planilha tem dados persistentes que precisam de um backend. Next.js entrega API routes no mesmo projeto, sem precisar de um servidor separado. Deploy gratuito no Vercel.

---

## 4. Autenticação e Controle de Acesso

### Todos os usuários fazem login

O app é **totalmente autenticado** — não existe área pública. Todo acesso exige email e senha.

### Perfis (Roles)

| Role | Quem é | O que pode fazer |
|------|--------|-----------------|
| `ADMIN` | Responsável geral do sistema | Tudo: criar/editar demandas, gerenciar participantes, criar usuários, ver dashboard completo |
| `GESTOR` | Responsável por inserir links | Criar e editar demandas (links, prazo, hora), ver dashboard completo, **não** gerencia usuários |
| `PARTICIPANTE` | Aluno do curso (751–778) | Vê apenas suas próprias demandas pendentes, acessa o link do form, confirma o cumprimento |

### Fluxo de autenticação (todos os perfis)

```
ADMIN cria usuário (nome + email + role) → senha provisória "tpcefs2026"
         ↓
Usuário acessa /login → informa email + senha provisória
         ↓
Sistema detecta firstLogin = true
         ↓
Redireciona para /alterar-senha (obrigatório, não pode pular)
         ↓
Usuário define nova senha → firstLogin = false
         ↓
Middleware verifica role → redireciona para a home correta:
  ADMIN/GESTOR  → /dashboard  (tabela cruzada completa)
  PARTICIPANTE  → /minhas-demandas  (lista individual)
```

### Entidade: Usuário

```ts
{
  id: string
  email: string
  senhaHash: string           // bcryptjs
  nome: string
  role: 'ADMIN' | 'GESTOR' | 'PARTICIPANTE'
  firstLogin: boolean         // true = ainda usa senha provisória
  ativo: boolean
  participanteId: number | null  // FK → Participante (somente role=PARTICIPANTE)
  criadoEm: Date
}
```

### O que cada perfil vê após login

#### ADMIN e GESTOR — `/dashboard`
- Cards de resumo (demandas ativas, % médio, total participantes)
- Tabela cruzada completa: todos os participantes × todas as demandas ativas
- Checkboxes para marcar/desmarcar cumprimento de qualquer participante
- Filtros, exportar CSV, botões WhatsApp

#### GESTOR (diferença do ADMIN)
- Acessa `/demandas` para criar/editar links
- **Não** acessa `/usuarios` (gestão de usuários é exclusiva do ADMIN)

#### PARTICIPANTE — `/minhas-demandas`
- Lista das demandas ativas **somente para ele**
- Cada demanda mostra: título, prazo, status (pendente / cumprido)
- Botão **"Acessar formulário"** → abre o link do Google Form em nova aba
- Botão **"Confirmar cumprimento"** → marca como cumprido (pode desfazer enquanto não venceu o prazo)
- Não vê dados de outros participantes

### Regras de senha

- Senha provisória padrão: `tpcefs2026`
- Nova senha: mínimo 8 caracteres
- Sessão bloqueada enquanto `firstLogin = true` — sempre redireciona para `/alterar-senha`
- Após troca: sessão JWT com validade de 8 horas

### Matriz de permissões

| Ação | ADMIN | GESTOR | PARTICIPANTE |
|------|:-----:|:------:|:------------:|
| Ver dashboard completo | ✅ | ✅ | ❌ |
| Ver suas próprias demandas | ✅ | ✅ | ✅ |
| Criar / editar demanda | ✅ | ✅ | ❌ |
| Ativar / desativar demanda | ✅ | ✅ | ❌ |
| Marcar cumprimento (qualquer participante) | ✅ | ✅ | ❌ |
| Confirmar cumprimento (próprio) | ✅ | ✅ | ✅ |
| Gerenciar participantes | ✅ | ❌ | ❌ |
| Criar / desativar usuários | ✅ | ❌ | ❌ |

### Telas de autenticação e gestão de usuários

| Rota | Perfil | Tela |
|------|--------|------|
| `/login` | Todos | Formulário email + senha |
| `/alterar-senha` | Todos | Troca de senha obrigatória no 1º login |
| `/usuarios` | ADMIN | Tabela: nome, email, role, status, data de criação |
| `/usuarios/novo` | ADMIN | Formulário: nome, email, role → cria com senha `tpcefs2026` |

---

## 5. Entidades de Dados

### Participante
```ts
{
  id: number          // Nº Curso (ex: 751)
  nome: string        // Nome completo
  celular: string     // (31) 99668-0419
}
```

### Demanda
```ts
{
  id: string
  titulo: string      // Nome da demanda
  linkForm: string    // URL do Google Form
  prazo: Date         // Data limite
  horaLimite: string  // "18:00"
  responsavel: string // Nome do responsável
  celularResp: string // Celular do responsável
  ativa: boolean      // Visível ou não nas abas de tracking
}
```

### Cumprimento
```ts
{
  participanteId: number
  demandaId: string
  cumprido: boolean
  dataRegistro: Date | null
}
```

---

## 6. Funcionalidades (Escopo MVP)

### F1 — Dashboard de Progresso (ADMIN / GESTOR)
- Cards de resumo: total de demandas ativas, % médio de cumprimento, número de participantes
- Tabela cruzada **Participantes × Demandas** com checkboxes (cumprido/pendente)
- Linha de totais por demanda (coluna) e por participante (linha)
- Filtro rápido: mostrar só pendentes / só cumpridos
- Barra de progresso visual por participante

### F2 — Gerenciar Demandas (ADMIN / GESTOR)
- Listagem de demandas com badge Ativa/Inativa
- Formulário CRUD: criar, editar e arquivar demanda
- Campos: Título, Link do Form, Prazo (date picker), Hora-Limite, Responsável, Celular
- Toggle Ativa/Inativa sem excluir

### F3 — Gerenciar Participantes (ADMIN)
- Tabela com Nº Curso, Nome, Celular
- Formulário de adição/edição de participante
- Importar participantes via CSV (colagem direta)

### F4 — Registro de Cumprimento pelo Gestor (ADMIN / GESTOR)
- Clicar no checkbox na tabela cruzada marca como cumprido com timestamp
- Botão "Marcar todos" por demanda ou por participante
- Desfazer marcação (toggle)

### F5 — Minhas Demandas (PARTICIPANTE)
- Lista das demandas ativas do participante logado, ordenada por prazo
- Cada item exibe: título da demanda, prazo, hora-limite, status visual (pendente / cumprido / atrasado)
- Botão **"Acessar formulário"** → abre o link em nova aba
- Botão **"Confirmar cumprimento"** → registra com timestamp; disponível até o vencimento do prazo
- Contador de progresso pessoal: "X de Y demandas cumpridas"

### F6 — Ações Rápidas via WhatsApp (ADMIN / GESTOR)
- Botão em cada linha de participante no dashboard: abre `wa.me/<celular>` com mensagem pré-formatada listando as demandas pendentes
- Botão em cada demanda: copia lista de quem ainda não cumpriu

### F7 — Exportar Relatório (ADMIN / GESTOR)
- Exportar a tabela de progresso como CSV

---

## 7. Telas e Rotas

```
/login                        → Login (todos)
/alterar-senha                → Troca de senha obrigatória no 1º login (todos)

── ADMIN / GESTOR ────────────────────────────────────────────
/dashboard                    → Tabela cruzada + cards de resumo
/demandas                     → Lista de demandas
/demandas/nova                → Criar demanda
/demandas/[id]                → Editar demanda

── ADMIN apenas ──────────────────────────────────────────────
/participantes                → Lista de participantes
/participantes/[id]           → Detalhe + progresso individual
/usuarios                     → Listar usuários
/usuarios/novo                → Criar usuário (nome, email, role)

── PARTICIPANTE ──────────────────────────────────────────────
/minhas-demandas              → Lista pessoal de demandas + confirmar cumprimento
```

---

## 8. UI/UX

- **Mobile-first:** a planilha é acessada pelo celular — a tabela cruzada deve ter scroll horizontal em telas pequenas, com a coluna do nome fixada (sticky)
- **Cores de status:** verde (cumprido), amarelo (perto do prazo), vermelho (atrasado/pendente)
- **Dark mode:** suportado via Tailwind + shadcn
- **Totalmente autenticado:** não existe área pública; o middleware redireciona para `/login` se não houver sessão
- **Home por role:** após login, ADMIN/GESTOR vai para `/dashboard`; PARTICIPANTE vai para `/minhas-demandas`
- **Feedback imediato:** atualização otimista ao clicar no checkbox, sem reload de página

---

## 9. API Routes (Next.js)

```
── Auth ──────────────────────────────────────────────────────
POST   /api/auth/[...nextauth]         → NextAuth (login, logout, session)
POST   /api/auth/alterar-senha         → troca de senha (requer sessão)

── ADMIN + GESTOR ────────────────────────────────────────────
GET    /api/demandas                   → listar demandas
POST   /api/demandas                   → criar demanda
PATCH  /api/demandas/[id]              → editar / ativar / desativar
DELETE /api/demandas/[id]              → arquivar

GET    /api/cumprimento                → tabela cruzada completa
POST   /api/cumprimento                → marcar cumprido { participanteId, demandaId }
DELETE /api/cumprimento                → desmarcar { participanteId, demandaId }

── ADMIN apenas ──────────────────────────────────────────────
GET    /api/participantes              → listar participantes
POST   /api/participantes              → criar participante
PATCH  /api/participantes/[id]         → editar participante

GET    /api/usuarios                   → listar usuários
POST   /api/usuarios                   → criar usuário (nome, email, role)
PATCH  /api/usuarios/[id]              → ativar / desativar

── PARTICIPANTE ──────────────────────────────────────────────
GET    /api/minhas-demandas            → demandas ativas do participante logado
POST   /api/minhas-demandas/confirmar  → confirmar próprio cumprimento { demandaId }
DELETE /api/minhas-demandas/confirmar  → desfazer confirmação { demandaId }
```

---

## 10. Critérios de Aceitação (MVP)

**Auth**
- [ ] Login com email + senha funciona para os três perfis
- [ ] Primeiro login com `tpcefs2026` redireciona obrigatoriamente para `/alterar-senha`
- [ ] Nenhuma rota é acessível sem sessão válida
- [ ] Sessão com `firstLogin=true` só acessa `/alterar-senha`
- [ ] Após login, ADMIN/GESTOR vai para `/dashboard`; PARTICIPANTE vai para `/minhas-demandas`
- [ ] GESTOR não consegue acessar `/usuarios` nem `/participantes`
- [ ] PARTICIPANTE não consegue acessar `/dashboard`, `/demandas` nem `/participantes`

**ADMIN / GESTOR**
- [ ] Tabela cruzada mostra todos os 28 participantes × todas as demandas ativas
- [ ] Clicar no checkbox persiste o cumprimento imediatamente
- [ ] % de cumprimento por participante e total são calculados automaticamente
- [ ] CRUD de demandas funciona sem recarregar a página
- [ ] Botão WhatsApp abre app com número e mensagem pré-preenchidos
- [ ] Exportar CSV da tabela de progresso
- [ ] Interface funciona bem no celular (scroll horizontal com nome fixo)

**ADMIN**
- [ ] ADMIN consegue criar usuários com qualquer role e senha `tpcefs2026`
- [ ] ADMIN consegue ativar/desativar usuários

**PARTICIPANTE**
- [ ] Participante logado vê apenas suas próprias demandas ativas
- [ ] Botão "Acessar formulário" abre o link correto em nova aba
- [ ] Botão "Confirmar cumprimento" registra com timestamp e muda status visual
- [ ] Confirmação pode ser desfeita enquanto o prazo não venceu

---

## 11. Fora do Escopo (MVP)

- Login social (Google, GitHub, etc.)
- Recuperação de senha por e-mail (reset via link)
- Integração direta com Google Forms (webhooks de submissão automática)
- Notificações push ou e-mail
- Histórico de alterações / audit log
- Multi-turma / multi-curso

---

## 12. Dados Iniciais (Seed)

Os 28 participantes já cadastrados na planilha (Nº 751–778) devem ser populados no seed do banco ao iniciar o projeto, para que o app já inicie com os dados reais.

O usuário ADMIN master é criado no seed com:
- Email: via variável de ambiente `ADMIN_EMAIL`
- Senha hash: `bcrypt("tpcefs2026")`
- `role: "ADMIN"`, `firstLogin: true`

Os 28 participantes da planilha são criados na tabela `Participante`. Contas de usuário para eles são criadas pelo ADMIN via `/usuarios/novo` com `role: "PARTICIPANTE"`, vinculando o `participanteId` correspondente.

---

## 13. Estimativa de Desenvolvimento

| Fase | Descrição | Esforço estimado |
|------|-----------|-----------------|
| Setup | Next.js + Prisma + shadcn + seed | 2h |
| Auth | NextAuth + login + troca de senha + middleware por role | 4h |
| Usuários | CRUD de usuários com seleção de role | 1h |
| F1 | Dashboard (tabela cruzada ADMIN/GESTOR) | 4h |
| F2 | CRUD de demandas | 2h |
| F3 | CRUD de participantes + import CSV | 2h |
| F4 | Registro de cumprimento (gestor via checkbox) | 2h |
| F5 | Minhas Demandas (view do PARTICIPANTE) | 2h |
| F6 | Botões WhatsApp | 1h |
| F7 | Exportar CSV | 1h |
| **Total** | | **~21h** |
