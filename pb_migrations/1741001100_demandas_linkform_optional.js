/// <reference path="../pb_data/types.d.ts" />

// Algumas demandas servem apenas para ciência/confirmação no app e não têm
// formulário externo. Mantemos o campo URL, mas sem obrigatoriedade.

migrate((app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  const linkForm = demandas.fields.getByName("linkForm");
  if (linkForm) {
    linkForm.required = false;
  }
  app.save(demandas);
}, (app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  const linkForm = demandas.fields.getByName("linkForm");
  if (linkForm) {
    linkForm.required = true;
  }
  app.save(demandas);
});
