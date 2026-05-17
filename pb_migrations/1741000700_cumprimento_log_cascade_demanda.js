/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const log = app.findCollectionByNameOrId("cumprimento_log");
  const demandaField = log.fields.getByName("demanda");

  demandaField.cascadeDelete = true;
  app.save(log);
}, (app) => {
  const log = app.findCollectionByNameOrId("cumprimento_log");
  const demandaField = log.fields.getByName("demanda");

  demandaField.cascadeDelete = false;
  app.save(log);
});
