/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const usersCol = app.findCollectionByNameOrId("users");
  const demandasCol = app.findCollectionByNameOrId("demandas");

  const log = new Collection({ type: "base", name: "cumprimento_log" });
  app.save(log);

  // Append-only: qualquer autenticado lista/visualiza; ninguém escreve via API.
  // As entradas são criadas exclusivamente pelos hooks em pb_hooks/cumprimento-log.pb.js.
  log.listRule = "@request.auth.id != ''";
  log.viewRule = "@request.auth.id != ''";
  log.createRule = null;
  log.updateRule = null;
  log.deleteRule = null;

  log.fields.add(new Field({
    name: "action",
    type: "select",
    required: true,
    maxSelect: 1,
    values: ["create", "delete"],
  }));

  log.fields.add(new Field({
    name: "demanda",
    type: "relation",
    required: true,
    maxSelect: 1,
    collectionId: demandasCol.id,
  }));

  log.fields.add(new Field({
    name: "targetUser",
    type: "relation",
    required: true,
    maxSelect: 1,
    collectionId: usersCol.id,
  }));

  log.fields.add(new Field({
    name: "actor",
    type: "relation",
    maxSelect: 1,
    collectionId: usersCol.id,
  }));

  app.save(log);

  log.indexes.push(
    "CREATE INDEX `idx_cumprimento_log_demanda` ON `cumprimento_log` (`demanda`)"
  );
  log.indexes.push(
    "CREATE INDEX `idx_cumprimento_log_targetUser` ON `cumprimento_log` (`targetUser`)"
  );
  app.save(log);
}, (app) => {
  try {
    const log = app.findCollectionByNameOrId("cumprimento_log");
    app.delete(log);
  } catch (_) {}
});
