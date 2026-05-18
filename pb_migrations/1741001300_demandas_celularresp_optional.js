/// <reference path="../pb_data/types.d.ts" />

// Administradores ou responsáveis podem não ter telefone cadastrado. O telefone
// continua sendo salvo quando existir, mas não deve bloquear a criação.

migrate((app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  const celularResp = demandas.fields.getByName("celularResp");
  if (celularResp) {
    celularResp.required = false;
  }
  app.save(demandas);
}, (app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  const celularResp = demandas.fields.getByName("celularResp");
  if (celularResp) {
    celularResp.required = true;
  }
  app.save(demandas);
});
