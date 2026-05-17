/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
  const demandas = app.findCollectionByNameOrId("demandas");

  const rule = "@request.auth.role = \"ADMIN\" || responsavel = @request.auth.nomeFuncional || responsavel = @request.auth.name";
  demandas.updateRule = rule;
  demandas.deleteRule = rule;

  app.save(demandas);
}, (app) => {
  const demandas = app.findCollectionByNameOrId("demandas");

  demandas.updateRule = "@request.auth.id != ''";
  demandas.deleteRule = "@request.auth.role = \"ADMIN\"";

  app.save(demandas);
});
