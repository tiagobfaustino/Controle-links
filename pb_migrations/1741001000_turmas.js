/// <reference path="../pb_data/types.d.ts" />

// F3.3 — Multi-turma:
// 1) cria collection `turmas`
// 2) seeda "CEFS 2026 — Turma P" como turma padrão
// 3) adiciona FK `turma` (opcional) em `users` e `demandas`
// 4) backfill: registros existentes recebem a turma padrão
//
// A FK fica opcional para não quebrar criações/edições que ainda não
// passam pelo seletor. Quando o app evoluir, pode-se torná-la required.

migrate((app) => {
  // 1) Collection turmas
  const turmas = new Collection({ type: "base", name: "turmas" });
  app.save(turmas);

  turmas.listRule = "";              // pública (necessário para login mostrar seletor)
  turmas.viewRule = "";
  turmas.createRule = "@request.auth.role = 'ADMIN'";
  turmas.updateRule = "@request.auth.role = 'ADMIN'";
  turmas.deleteRule = "@request.auth.role = 'ADMIN'";

  turmas.fields.add(new Field({ name: "nome", type: "text", required: true }));
  turmas.fields.add(new Field({ name: "sigla", type: "text", required: true }));
  turmas.fields.add(new Field({ name: "ativa", type: "bool" }));
  app.save(turmas);

  turmas.indexes.push(
    "CREATE UNIQUE INDEX `idx_turmas_sigla` ON `turmas` (`sigla`)"
  );
  app.save(turmas);

  // 2) Seed turma padrão
  const turmaDefault = new Record(turmas);
  turmaDefault.set("nome", "CEFS 2026 — Turma P");
  turmaDefault.set("sigla", "CEFS2026-P");
  turmaDefault.set("ativa", true);
  app.save(turmaDefault);

  // 3) FK em users
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new Field({
    name: "turma",
    type: "relation",
    maxSelect: 1,
    collectionId: turmas.id,
  }));
  app.save(users);

  // 4) FK em demandas
  const demandas = app.findCollectionByNameOrId("demandas");
  demandas.fields.add(new Field({
    name: "turma",
    type: "relation",
    maxSelect: 1,
    collectionId: turmas.id,
  }));
  app.save(demandas);

  // 5) Backfill
  const allUsers = app.findRecordsByFilter("users", "", "", 1000, 0);
  for (const u of allUsers) {
    if (!u.getString("turma")) {
      u.set("turma", turmaDefault.id);
      app.save(u);
    }
  }
  const allDemandas = app.findRecordsByFilter("demandas", "", "", 1000, 0);
  for (const d of allDemandas) {
    if (!d.getString("turma")) {
      d.set("turma", turmaDefault.id);
      app.save(d);
    }
  }
}, (app) => {
  try {
    const users = app.findCollectionByNameOrId("users");
    const f = users.fields.getByName("turma");
    if (f) users.fields.remove(f);
    app.save(users);
  } catch (_) {}

  try {
    const demandas = app.findCollectionByNameOrId("demandas");
    const f = demandas.fields.getByName("turma");
    if (f) demandas.fields.remove(f);
    app.save(demandas);
  } catch (_) {}

  try {
    const turmas = app.findCollectionByNameOrId("turmas");
    app.delete(turmas);
  } catch (_) {}
});
