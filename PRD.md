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
| Autenticação | NextAuth.js (opcional, login simples por senha) |

> **Por que Next.js e não React puro?** A planilha tem dados persistentes que precisam de um backend. Next.js entrega API routes no mesmo projeto, sem precisar de um servidor separado. Deploy gratuito no Vercel.

---

## 4. Entidades de Dados

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

## 5. Funcionalidades (Escopo MVP)

### F1 — Dashboard de Progresso (tela inicial)
- Cards de resumo: total de demandas ativas, % médio de cumprimento, número de participantes
- Tabela cruzada **Participantes × Demandas** com checkboxes (cumprido/pendente)
- Linha de totais por demanda (coluna) e por participante (linha)
- Filtro rápido: mostrar só pendentes / só cumpridos
- Barra de progresso visual por participante

### F2 — Gerenciar Demandas (Admin)
- Listagem de demandas com badge Ativa/Inativa
- Formulário CRUD: criar, editar e arquivar demanda
- Campos: Título, Link do Form, Prazo (date picker), Hora-Limite, Responsável, Celular
- Toggle Ativa/Inativa sem excluir

### F3 — Gerenciar Participantes
- Tabela com Nº Curso, Nome, Celular
- Formulário de adição/edição de participante
- Importar participantes via CSV (colagem direta)

### F4 — Registro de Cumprimento
- Clicar no checkbox na tabela cruzada marca como cumprido com timestamp
- Botão "Marcar todos" por demanda ou por participante
- Desfazer marcação (toggle)

### F5 — Ações Rápidas via WhatsApp
- Botão em cada linha de participante: abre `wa.me/<celular>` com mensagem pré-formatada contendo o link da demanda pendente
- Botão em cada linha de demanda: abre lista de quem ainda não cumpriu com link para copiar/enviar

### F6 — Exportar Relatório
- Exportar a tabela de progresso como CSV ou imagem (print-friendly)

---

## 6. Telas e Rotas

```
/                        → Dashboard (tabela cruzada + resumo)
/demandas                → Lista de demandas
/demandas/nova           → Criar demanda
/demandas/[id]           → Editar demanda
/participantes           → Lista de participantes
/participantes/[id]      → Detalhe do participante (progresso individual)
```

---

## 7. UI/UX

- **Mobile-first:** a planilha é acessada pelo celular — a tabela cruzada deve ter scroll horizontal em telas pequenas, com a coluna do nome fixada (sticky)
- **Cores de status:** verde (cumprido), amarelo (perto do prazo), vermelho (atrasado/pendente)
- **Dark mode:** suportado via Tailwind + shadcn
- **Sem login no MVP:** acesso direto, sem autenticação (pode ser adicionado depois)
- **Feedback imediato:** atualização otimista ao clicar no checkbox, sem reload de página

---

## 8. API Routes (Next.js)

```
GET    /api/participantes            → listar participantes
POST   /api/participantes            → criar participante
PATCH  /api/participantes/[id]       → editar participante

GET    /api/demandas                 → listar demandas
POST   /api/demandas                 → criar demanda
PATCH  /api/demandas/[id]            → editar / ativar / desativar
DELETE /api/demandas/[id]            → arquivar

GET    /api/cumprimento              → tabela cruzada completa
POST   /api/cumprimento              → marcar cumprido { participanteId, demandaId }
DELETE /api/cumprimento              → desmarcar { participanteId, demandaId }
```

---

## 9. Critérios de Aceitação (MVP)

- [ ] A tabela cruzada mostra todos os 28 participantes × todas as demandas ativas
- [ ] Clicar no checkbox persiste o cumprimento imediatamente
- [ ] % de cumprimento por participante e total são calculados automaticamente
- [ ] CRUD de demandas funciona sem recarregar a página
- [ ] Botão WhatsApp abre app com número e mensagem pré-preenchidos
- [ ] Funciona bem no celular (scroll horizontal com nome fixo)
- [ ] Exportar CSV da tabela de progresso

---

## 10. Fora do Escopo (MVP)

- Autenticação / controle de acesso por usuário
- Integração direta com Google Forms (webhooks de submissão automática)
- Notificações push ou e-mail
- Histórico de alterações / audit log
- Multi-turma / multi-curso

---

## 11. Dados Iniciais (Seed)

Os 28 participantes já cadastrados na planilha (Nº 751–778) devem ser populados no seed do banco ao iniciar o projeto, para que o app já inicie com os dados reais.

---

## 12. Estimativa de Desenvolvimento

| Fase | Descrição | Esforço estimado |
|------|-----------|-----------------|
| Setup | Next.js + Prisma + shadcn + seed de participantes | 2h |
| F1 | Dashboard com tabela cruzada | 4h |
| F2 | CRUD de demandas | 2h |
| F3 | CRUD de participantes + import CSV | 2h |
| F4 | Registro de cumprimento (API + UI) | 2h |
| F5 | Botões WhatsApp | 1h |
| F6 | Exportar CSV | 1h |
| **Total** | | **~14h** |
