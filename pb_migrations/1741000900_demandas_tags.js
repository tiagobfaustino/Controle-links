/// <reference path="../pb_data/types.d.ts" />

// Adiciona campo `tags` em `demandas`. Formato: string separada por
// vírgulas, ex: "form,prova,reuniao". Mantemos texto (em vez de JSON) por
// simplicidade — a busca client-side já é suficiente para o volume atual.

migrate((app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  demandas.fields.add(new Field({
    name: "tags",
    type: "text",
  }));
  app.save(demandas);
}, (app) => {
  const demandas = app.findCollectionByNameOrId("demandas");
  const tagsField = demandas.fields.getByName("tags");
  if (tagsField) demandas.fields.remove(tagsField);
  app.save(demandas);
});
